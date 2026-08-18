import { createClient } from '@supabase/supabase-js'
import { extractJSON, MODELS, logAiUsage } from './_ai.js'
import { renderSmartbrand } from './_smartbrand.js'

const ANTHROPIC_BASE  = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_FILES = 'https://api.anthropic.com/v1/files'
const BETA_FILES      = 'files-api-2025-04-14'

// Manual de marca vai pela Files API, não em base64 dentro da mensagem.
// Motivo concreto: base64 infla 33%, e o corpo da requisição tem teto de
// 32 MB — o manual da PES (100 páginas, 36,5 MB) estourava em 413 e falhou
// três vezes em produção sem que ninguém entendesse por quê. Pelo file_id o
// PDF sobe separado, com teto de 500 MB, e o modelo continua ENXERGANDO as
// páginas (que é o ponto: manual de marca é documento visual).
const TETO_MB = 400

// O que a API responde vs. o que a pessoa que subiu o PDF precisa ler.
const HUMANIZAR = [
  [/exceed|too large|413/i, 'O PDF é grande demais para processar de uma vez. Divida o manual em partes e suba uma de cada vez.'],
  [/page.{0,20}(limit|count)|too many pages/i, 'O PDF tem páginas demais para uma leitura só. Divida o manual em partes.'],
  [/encrypted|password/i,   'O PDF está protegido por senha. Suba uma versão sem proteção.'],
  [/credit|balance/i,       'Instabilidade no provedor de IA. Tente de novo em alguns minutos.'],
]
const humanizar = (bruto) => {
  const achado = HUMANIZAR.find(([re]) => re.test(bruto))
  return achado ? achado[1] : `Falha ao ler o manual: ${bruto.slice(0, 180)}`
}

/* ─── Duas leituras do mesmo PDF ─────────────────────────────────────
   Um manual de marca diz duas coisas ao mesmo tempo, e elas não são a mesma:
   o que está ESCRITO (a regra, o texto, a hierarquia declarada) e o que está
   MOSTRADO (como a marca aparece de fato aplicada nas páginas). Uma extração
   só de campos estruturados captura a primeira e perde a segunda — e é a
   segunda que responde "com o que essa marca se parece", que é o que o Studio
   e o Copiloto precisam para gerar peça on-brand.

   Por isso são duas passadas sobre o MESMO arquivo enviado. A segunda lê o
   documento do cache (o bloco do PDF é idêntico nas duas), então o custo dela
   é ~10% do que seria reenviar as páginas. */

/* Cabeçalho comum a todas as leituras do texto. Repetido em cada bloco de
   propósito: cada chamada é uma conversa independente, e a regra de não
   inventar precisa valer em todas. */
const REGRAS = `Você está lendo o brand manual desta marca.

NÃO invente. Campo sem lastro no manual: string vazia ou array vazio. Um brand book
meio inventado é pior que um incompleto — a destilação aprende a invenção.

Responda APENAS com o JSON pedido, sem markdown e sem texto em volta.`

/* Um bloco por leitura. O documento está no cache: o que muda entre as
   chamadas é a pergunta, e cada resposta cabe folgada no seu teto. */
const BLOCOS = [
  {
    chave: 'verbal_identity', tag: 'verbal', max: 12000,
    prompt: `${REGRAS}

Extraia a IDENTIDADE VERBAL — quem a marca diz que é e como ela fala.

{
  "tagline": "", "proposito": "", "manifesto": "", "missao": "", "visao": "",
  "valores": [], "arquetipo": "", "personalidade": [],
  "tom_voz": "", "tom_atributos": [], "tom_evitar": "",
  "narrativa_origem": "", "boilerplate": "",
  "marcos": [{ "ano": "", "titulo": "", "descricao": "" }],
  "posicionamento": "", "proposta_valor": "", "mensagem_central": "",
  "publico_alvo": "",
  "personas": [{ "nome": "", "demografia": "", "dor": "", "motivacao": "", "objecoes": "" }],
  "vocabulario_aprovado": [], "termos_proprios": [], "vocabulario_proibido": [],
  "situacoes": [{ "situacao": "", "como_falar": "", "evitar": "" }],
  "exemplos_headlines": [{ "titulo": "", "contexto": "" }],
  "exemplos_ctas": [{ "cta": "", "contexto": "" }]
}

Capture missão, visão e valores LITERAIS quando houver redação clara.
Tom de voz: descrição mais os atributos como itens curtos.
Personas: só as que o manual descrever, com dor e motivação se houver.`,
  },
  {
    chave: 'textos_referencia', dentro: 'verbal_identity', tag: 'textos', max: 16000,
    prompt: `${REGRAS}

Capture TODOS os exemplos de TEXTO LONGO que o manual mostrar: e-mails completos,
posts de blog e de LinkedIn, anúncios, releases, newsletters, roteiros.

Cole o texto INTEGRAL, sem resumir. É deste material que o RAG tira a voz da marca —
um resumo aqui vira uma imitação pobre lá na frente.

{ "textos_referencia": [
  { "tipo": "e-mail|blog|linkedin|newsletter|anuncio|press_release|pitch|outro",
    "titulo": "", "publico": "", "texto": "", "notas": "" } ] }

Se o manual não trouxer texto longo nenhum, devolva a lista vazia.`,
  },
  {
    chave: 'visual_identity', tag: 'visual-declarado', max: 12000,
    prompt: `${REGRAS}

Extraia a IDENTIDADE VISUAL — as REGRAS que o manual escreve sobre a forma.
(O que as páginas mostram aplicado é outra leitura; aqui é o que está declarado.)

{
  "logos": [{ "versao": "", "descricao": "", "url": "", "regras_uso": "" }],
  "area_protecao": "", "tamanho_minimo": "", "usos_proibidos": [],
  "paleta": [{ "nome": "", "hex": "#RRGGBB", "tipo": "primária|secundária|neutra|acento", "uso": "" }],
  "tipo_principal_nome": "", "tipo_principal_pesos": "", "tipo_principal_link": "", "tipo_principal_uso": "",
  "tipo_secundario_nome": "", "tipo_secundario_pesos": "", "tipo_secundario_link": "", "tipo_secundario_uso": "",
  "tipo_display": "",
  "tipo_hierarquia": [{ "nivel": "", "tamanho": "", "peso": "", "uso": "" }],
  "icone_estilo": "", "icone_grid": "", "icone_biblioteca": "", "icone_exemplos": [],
  "ilustracao_estilo": "", "ilustracao_paleta": "", "ilustracao_exemplos": [],
  "foto_mood": "", "foto_luz_edicao": "", "foto_enquadramento": "", "foto_do": [], "foto_dont": [], "foto_exemplos": [],
  "video_estilo": "", "video_timing": "", "video_abertura": "", "video_fechamento": "",
  "padroes": [{ "nome": "", "descricao": "", "url": "" }],
  "grid_descricao": "", "grid_regras": "",
  "aplicacoes": [{ "tipo": "", "descricao": "", "url": "" }]
}

Cores sempre em #RRGGBB. Extraia TODAS as variantes de logo (principal, símbolo,
horizontal, monocromática, negativa…) e TODA a paleta — neutros e semânticas inclusive.
Tipografia completa: pesos disponíveis, hierarquia, quando usar cada uma.`,
  },
  {
    chave: 'design_system', tag: 'design', max: 10000,
    prompt: `${REGRAS}

Extraia o SISTEMA DE DESIGN — só o que o manual especificar. Muitos manuais de
marca não têm esta parte; nesse caso devolva os campos vazios, sem preencher por
analogia com o que "costuma ser".

{
  "colors": { "primary": "", "secondary": "", "success": "", "warning": "", "error": "", "info": "", "background": "", "surface": "" },
  "neutral_colors": { "gray_50": "", "gray_100": "", "gray_300": "", "gray_500": "", "gray_700": "", "gray_900": "", "white": "", "black": "" },
  "spacing": { "xs": "", "sm": "", "md": "", "lg": "", "xl": "", "2xl": "" },
  "font_sizes": { "caption": "", "body": "", "h6": "", "h5": "", "h4": "", "h3": "", "h2": "", "h1": "" },
  "border_radius": { "none": "", "sm": "", "md": "", "lg": "", "full": "" },
  "shadows": { "none": "", "sm": "", "md": "", "lg": "" },
  "breakpoints": { "xs": "", "sm": "", "md": "", "lg": "", "xl": "" },
  "components": [{ "nome": "", "variantes": "", "tamanhos": "", "estados": "", "regras_uso": "" }],
  "state_hover": "", "state_focus": "", "state_disabled": "", "state_error": "",
  "motion": { "durations": "", "easings": "", "padroes": "" },
  "accessibility": { "contraste": "", "foco": "", "aria": "", "regras_extras": [] },
  "density": { "mobile": "", "desktop": "" },
  "grid": { "colunas": "", "gutter": "", "container": "", "regras": "" },
  "ux_patterns": [{ "nome": "", "descricao": "" }]
}`,
  },
  {
    chave: '_catalogo', tag: 'catalogo', max: 8000,
    prompt: `${REGRAS}

Liste os ATIVOS e TOKENS que o manual nomeia, para virarem registro consultável.

{
  "assets": [{ "tipo": "logo|cor|tipografia|icone|padrao|outro", "nome": "", "descricao": "", "valor": "" }],
  "tokens": [{ "nome": "color-primary", "valor": "#RRGGBB", "categoria": "color|typography|spacing|border-radius|shadow|outro", "descricao": "" }]
}

"valor": hex para cor, nome da família para tipografia, descrição curta para o resto.`,
  },
]

const PROMPT_VISUAL = `Você está OLHANDO as páginas deste brand manual. Sua tarefa não é ler as regras escritas — é DESCREVER o que se vê.

A pergunta que tudo aqui responde: **com o que esta marca se parece?** Alguém que nunca viu o manual precisa conseguir, só com a sua descrição, produzir uma peça que pareça desta marca e não de outra.

Descreva o que está VISÍVEL nas páginas. Isso é observação, não invenção: você está relatando o que a página mostra. Mas nunca extrapole para o que ela não mostra — se o manual não traz nenhuma peça aplicada, diga isso em vez de imaginar uma.

Sempre que possível, cite o número da página que sustenta a descrição.

Retorne APENAS JSON válido sem markdown, no formato:
{
  "assinatura_visual": "",
  "uso_do_logo": "",
  "uso_da_cor": "",
  "uso_da_tipografia": "",
  "tratamento_fotografico": "",
  "ilustracao_e_grafismos": "",
  "composicao_e_layout": "",
  "densidade_e_respiro": "",
  "aplicacoes_observadas": [
    { "pagina": "", "peca": "", "descricao": "", "cores_dominantes": [], "tipografia_aparente": "", "composicao": "" }
  ],
  "recorrencias": [],
  "contrastes_com_a_regra": []
}

O que cada campo quer:
- "assinatura_visual": o parágrafo que resume o jeito desta marca. O que faz uma peça ser reconhecida como dela — a combinação de cor, forma, tipo, ritmo e clima. Escreva denso e concreto, não genérico: "fundo preto quase integral, tipografia condensada em caixa alta ocupando dois terços da largura, um único verde ácido em um elemento pequeno" vale; "moderna e elegante" não vale nada.
- "uso_do_logo": como o logo APARECE aplicado — onde é posto na composição, em que tamanho relativo, sobre que fundos, qual versão em cada situação.
- "uso_da_cor": as proporções reais. Qual cor domina a área, qual é apoio, como o acento entra (em quê, em que quantidade), o que nunca aparece colorido.
- "uso_da_tipografia": o que se vê nos títulos e no texto — peso, largura, caixa, alinhamento, quebras de linha, relação de tamanho entre título e corpo.
- "tratamento_fotografico": enquadramento, luz, cor, pós-produção, o que as fotos retratam, como a foto convive com texto por cima.
- "ilustracao_e_grafismos": formas, texturas, padrões, elementos gráficos recorrentes, molduras, linhas.
- "composicao_e_layout": onde as coisas se sentam, alinhamentos, margens, se é centrado ou ancorado, como o grid se manifesta.
- "densidade_e_respiro": quanta área fica vazia, o quanto a peça é cheia ou arejada.
- "aplicacoes_observadas": UMA entrada para CADA peça aplicada que o manual mostrar (cartaz, post, embalagem, papelaria, fachada, camiseta, site, anúncio, mockup). Descreva a peça como ela é, não a regra.
- "recorrencias": o que se repete em várias páginas — os padrões que fazem o sistema.
- "contrastes_com_a_regra": onde o que está mostrado diverge do que está escrito. Só preencha se realmente observar divergência.

Campo sem base visual: string vazia ou array vazio. NUNCA invente.`

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }

  const { brand_id, file_path, job_id } = body
  if (!brand_id || !file_path || !job_id) return { statusCode: 400 }

  const markError = async (msg) => {
    await supabase.from('brand_manual_jobs').update({ status: 'error', error: msg }).eq('id', job_id)
  }

  // Auth check
  const { data: brand } = await supabase
    .from('brands').select('id, nome, workspace_id').eq('id', brand_id).single()
  if (!brand) { await markError('Marca não encontrada'); return { statusCode: 200 } }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role')
      .eq('workspace_id', brand.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) { await markError('Sem permissão'); return { statusCode: 200 } }

  // Download PDF from Supabase Storage
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('brand-manuals').download(file_path)

  if (dlErr) { await markError(`Erro ao baixar arquivo: ${dlErr.message}`); return { statusCode: 200 } }

  // Pré-voo: melhor uma frase que a pessoa entende do que um 413 da API
  // quinze minutos depois.
  const tamanhoMB = (fileData.size || 0) / (1024 * 1024)
  if (tamanhoMB > TETO_MB) {
    await markError(`O PDF tem ${tamanhoMB.toFixed(0)} MB — o limite é ${TETO_MB} MB. Divida o manual em partes.`)
    return { statusCode: 200 }
  }

  const auth = {
    'x-api-key':         process.env.ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta':    BETA_FILES,
  }

  // 1) Sobe o PDF (fora do corpo da mensagem — ver comentário do TETO_MB)
  let fileId
  try {
    const form = new FormData()
    form.append('file', fileData, file_path.split('/').pop() || 'manual.pdf')
    const up = await fetch(ANTHROPIC_FILES, { method: 'POST', headers: auth, body: form })
    if (!up.ok) {
      await markError(humanizar(`${up.status}: ${await up.text()}`))
      return { statusCode: 200 }
    }
    fileId = (await up.json()).id
  } catch (e) {
    await markError(`Erro ao enviar o manual: ${e.message}`)
    return { statusCode: 200 }
  }
  console.log(`[brand-manual] PDF enviado (${tamanhoMB.toFixed(1)} MB) → ${fileId}`)

  // O arquivo fica na conta da Anthropic até ser apagado. Sem esta limpeza,
  // cada reprocessamento deixaria um manual de dezenas de MB para trás.
  const apagarArquivo = async () => {
    try { await fetch(`${ANTHROPIC_FILES}/${fileId}`, { method: 'DELETE', headers: auth }) }
    catch { /* limpeza nunca derruba a extração */ }
  }

  // 2) Lê — Opus pela qualidade: o manual é a base do RAG da marca
  const model = MODELS.opus

  // O bloco do PDF é IDÊNTICO nas duas passadas e leva o cache_control: a
  // primeira chamada escreve o documento no cache, a segunda lê a 10% do
  // preço. Trocar a ordem dos blocos ou mexer no documento entre as duas
  // quebraria o prefixo e o cache junto.
  //
  // TTL de 1h, não os 5 min padrão, e isso é medição e não preferência: o
  // manual da PES tem 313 páginas e 592 mil tokens de entrada; só o prefill
  // passa de 2 min, e a primeira passada ainda gera até 16 mil tokens depois
  // disso. Com 5 min o cache expirava no meio da própria extração — a segunda
  // passada pagaria o documento inteiro de novo E esperaria outro prefill,
  // encostando no teto de 15 min da background function. A escrita custa 2x
  // em vez de 1,25x; a leitura continua 10%.
  const documento = {
    type: 'document',
    source: { type: 'file', file_id: fileId },
    cache_control: { type: 'ephemeral', ttl: '1h' },
  }

  const ler = async (prompt, maxTokens, tag) => {
    const resp = await fetch(ANTHROPIC_BASE, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: [documento, { type: 'text', text: prompt }] }],
      }),
    })
    if (!resp.ok) throw new Error(`${resp.status}: ${await resp.text()}`)

    const data = await resp.json()
    await logAiUsage(supabase, { model, usage: data.usage, tag })
    console.log(`[brand-manual] ${tag}: ${JSON.stringify(data.usage || {})}`)

    // Truncamento tem nome próprio. Antes ele chegava aqui disfarçado de
    // "extractJSON falhou", que manda procurar no lugar errado: o JSON estava
    // impecável — só parou no meio porque a resposta bateu no teto.
    if (data.stop_reason === 'max_tokens') {
      console.error(`[brand-manual] ${tag}: resposta truncada no teto de ${maxTokens} tokens`)
      return null
    }

    const texto = data.content?.find(b => b.type === 'text')?.text || ''
    const json = extractJSON(texto)
    if (!json) console.log(`[brand-manual] ${tag}: extractJSON falhou. Texto:`, texto.slice(0, 1500))
    return json
  }

  // ── As leituras ────────────────────────────────────────────────────
  // Sequencial, e é o cache que torna isso barato: a primeira chamada escreve
  // o documento, todas as outras leem a 10%. Em paralelo, nenhuma leria o
  // cache que as outras ainda estão escrevendo — o PDF sairia caro N vezes.
  //
  // Vários blocos em vez de um: no manual da PES, uma leitura só bateu os
  // 16 mil tokens de saída ainda dentro da identidade verbal. O documento não
  // mudou de tamanho; o que mudou foi o tamanho de cada pergunta.
  const extracted = {}
  const falharam = []
  try {
    for (const b of BLOCOS) {
      const json = await ler(b.prompt, b.max, b.tag)
      if (!json) { falharam.push(b.tag); continue }
      if (b.dentro)                 Object.assign(extracted[b.dentro] ||= {}, json)
      else if (b.chave === '_catalogo') Object.assign(extracted, json)
      else                          extracted[b.chave] = json[b.chave] || json
    }
    const visual = await ler(PROMPT_VISUAL, 8000, 'visual-aplicado')
    if (visual) extracted.visual_reading = visual
    else falharam.push('visual-aplicado')
  } catch (e) {
    await apagarArquivo()
    await markError(humanizar(e.message))
    return { statusCode: 200 }
  }
  await apagarArquivo()

  // Um bloco que falha vira lacuna, não naufrágio: o smartbrand já trata
  // ausência como informação. Só o vazio total é erro.
  if (falharam.length) console.warn(`[brand-manual] blocos sem retorno: ${falharam.join(', ')}`)
  if (falharam.length === BLOCOS.length + 1) {
    await markError('Não foi possível extrair dados estruturados do manual')
    return { statusCode: 200 }
  }

  console.log(`[brand-manual] Chaves no JSON:`, Object.keys(extracted))
  console.log(`[brand-manual] verbal_identity tem ${Object.keys(extracted.verbal_identity || {}).length} chaves`)
  console.log(`[brand-manual] visual_identity tem ${Object.keys(extracted.visual_identity || {}).length} chaves`)
  console.log(`[brand-manual] design_system tem ${Object.keys(extracted.design_system || {}).length} chaves`)

  // Busca a row mais recente (não maybeSingle, que falha com duplicatas)
  const { data: existingBooks } = await supabase
    .from('brand_books').select('id, version').eq('brand_id', brand_id)
    .order('created_at', { ascending: false }).limit(1)
  const existingBook = existingBooks?.[0] || null
  console.log(`[brand-manual] Existing book:`, existingBook?.id, 'version:', existingBook?.version)

  // smartbrand.md — o manual virado documento. Renderizado por código de
  // propósito: só entra o que o manual disse, e o que faltou fica em branco
  // e vira lacuna. Quem preenche lacuna é o Copiloto, quando o cliente pedir.
  const smart = renderSmartbrand(extracted, { marca: brand.nome })
  console.log(`[brand-manual] smartbrand: ${smart.preenchidos}/${smart.total} campos · ${smart.lacunas.length} lacuna(s)`)

  const campos = {
    verbal_identity: extracted.verbal_identity || {},
    visual_identity: extracted.visual_identity || {},
    design_system:   extracted.design_system   || {},
    smartbrand:      smart.markdown,
    smartbrand_gaps: smart.lacunas,
  }

  // Se este código subir antes da migration 047, a coluna `smartbrand` não
  // existe e o Postgres derruba a escrita INTEIRA — perdendo uma extração que
  // já foi paga. Nesse caso salva o que existia antes e avisa alto.
  const semSmartbrand = (erro) => /smartbrand/i.test(erro?.message || '')
  const { smartbrand, smartbrand_gaps, ...camposBase } = campos
  const gritar = () => console.error(
    '[brand-manual] migration 047 ainda não rodou: brand book salvo SEM o smartbrand'
  )

  if (existingBook?.id) {
    const alvo = supabase.from('brand_books')
    const patch = { version: (existingBook.version || 1) + 1, updated_at: new Date().toISOString() }
    let { error: upErr } = await alvo.update({ ...campos, ...patch }).eq('id', existingBook.id)
    if (semSmartbrand(upErr)) {
      gritar()
      ;({ error: upErr } = await alvo.update({ ...camposBase, ...patch }).eq('id', existingBook.id))
    }
    if (upErr) console.error(`[brand-manual] UPDATE falhou:`, upErr.message)
    else       console.log(`[brand-manual] UPDATE concluído em ${existingBook.id}`)
  } else {
    const criar = (c) => supabase.from('brand_books').insert({ brand_id, ...c }).select('id').single()
    let { data: newBook, error: insErr } = await criar(campos)
    if (semSmartbrand(insErr)) {
      gritar()
      ;({ data: newBook, error: insErr } = await criar(camposBase))
    }
    if (insErr) console.error(`[brand-manual] INSERT falhou:`, insErr.message)
    else        console.log(`[brand-manual] INSERT criou:`, newBook?.id)
  }

  // Replace assets — apenas os que ESTA extração criou.
  // Antes o delete varria `brand_id` inteiro: reimportar um manual apagava da
  // biblioteca as peças salvas do Studio e os arquivos que o cliente subiu.
  if (extracted.assets?.length) {
    await supabase.from('brand_assets').delete()
      .eq('brand_id', brand_id).eq('metadata->>origem', 'extracao')
    await supabase.from('brand_assets').insert(
      extracted.assets
        .filter(a => a.nome)
        .map(a => ({
          brand_id,
          tipo:      a.tipo      || 'outro',
          nome:      a.nome,
          descricao: a.descricao || '',
          valor:     a.valor     || '',
          metadata:  { origem: 'extracao' },
        }))
    )
  }

  // O PDF fica na biblioteca como referência da marca.
  // Não é cópia: aponta para o arquivo que já está no bucket `brand-manuals`
  // (privado — daí o `bucket` no metadata, que a biblioteca usa para assinar a
  // URL na hora de abrir). `tipo: documento` o coloca em "Referências da
  // marca", ao lado do que define o que a marca É.
  const nomeArquivo = file_path.split('/').pop() || 'manual-da-marca.pdf'
  const referencia = {
    brand_id,
    tipo:       'documento',
    nome:       nomeArquivo,
    descricao:  `Manual da marca — origem do smartbrand (lido em ${new Date().toLocaleDateString('pt-BR')})`,
    valor:      '',
    file_path,
    mime_type:  'application/pdf',
    size_bytes: fileData.size || null,
    metadata:   { origem: 'manual', bucket: 'brand-manuals', reference: true },
  }
  // Reimportar o mesmo arquivo atualiza a entrada em vez de duplicá-la.
  const { data: jaExiste } = await supabase.from('brand_assets')
    .select('id').eq('brand_id', brand_id).eq('file_path', file_path).limit(1)
  const { error: refErr } = jaExiste?.length
    ? await supabase.from('brand_assets').update(referencia).eq('id', jaExiste[0].id)
    : await supabase.from('brand_assets').insert(referencia)
  if (refErr) console.error('[brand-manual] não consegui guardar o PDF na biblioteca:', refErr.message)
  else        console.log(`[brand-manual] PDF na biblioteca como referência: ${nomeArquivo}`)

  // Replace design tokens
  if (extracted.tokens?.length) {
    await supabase.from('design_tokens').delete().eq('brand_id', brand_id)
    await supabase.from('design_tokens').insert(
      extracted.tokens
        .filter(t => t.nome && t.valor)
        .map(t => ({
          brand_id,
          nome:      t.nome,
          valor:     t.valor,
          categoria: t.categoria || 'outro',
          descricao: t.descricao || '',
        }))
    )
  }

  await supabase.from('brand_manual_jobs').update({ status: 'done' }).eq('id', job_id)
  console.log(`[brand-manual] Extração concluída para brand ${brand_id}`)

  return { statusCode: 200 }
}
