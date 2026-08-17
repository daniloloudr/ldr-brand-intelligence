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

const EXTRACTION_PROMPT = `Analise este brand manual e extraia EXAUSTIVAMENTE todas as informações de marca.

Quanto mais campos preenchidos, melhor. NÃO invente informação — se algo não estiver no manual, deixe vazio.

Retorne APENAS JSON válido sem markdown, no formato:
{
  "verbal_identity": {
    "tagline": "",
    "proposito": "",
    "manifesto": "",
    "missao": "",
    "visao": "",
    "valores": [],
    "arquetipo": "",
    "personalidade": [],
    "tom_voz": "",
    "tom_atributos": [],
    "tom_evitar": "",
    "narrativa_origem": "",
    "boilerplate": "",
    "marcos": [{ "ano": "", "titulo": "", "descricao": "" }],
    "posicionamento": "",
    "proposta_valor": "",
    "mensagem_central": "",
    "publico_alvo": "",
    "personas": [{ "nome": "", "demografia": "", "dor": "", "motivacao": "", "objecoes": "" }],
    "vocabulario_aprovado": [],
    "termos_proprios": [],
    "vocabulario_proibido": [],
    "exemplos_headlines": [{ "titulo": "", "contexto": "" }],
    "exemplos_posts": [{ "canal": "", "objetivo": "", "texto": "" }],
    "exemplos_ctas": [{ "cta": "", "contexto": "" }],
    "situacoes": [{ "situacao": "", "como_falar": "", "evitar": "" }],
    "textos_referencia": [
      { "tipo": "e-mail|blog|linkedin|newsletter|anuncio|press_release|pitch|outro",
        "titulo": "", "publico": "", "texto": "", "notas": "" }
    ]
  },
  "visual_identity": {
    "logos": [{ "versao": "", "descricao": "", "url": "", "regras_uso": "" }],
    "area_protecao": "",
    "tamanho_minimo": "",
    "usos_proibidos": [],
    "paleta": [{ "nome": "", "hex": "#RRGGBB", "tipo": "primária|secundária|neutra|acento", "uso": "" }],
    "tipo_principal_nome": "",
    "tipo_principal_pesos": "",
    "tipo_principal_link": "",
    "tipo_principal_uso": "",
    "tipo_secundario_nome": "",
    "tipo_secundario_pesos": "",
    "tipo_secundario_link": "",
    "tipo_secundario_uso": "",
    "tipo_display": "",
    "tipo_hierarquia": [{ "nivel": "", "tamanho": "", "peso": "", "uso": "" }],
    "icone_estilo": "",
    "icone_grid": "",
    "icone_biblioteca": "",
    "icone_exemplos": [],
    "ilustracao_estilo": "",
    "ilustracao_paleta": "",
    "ilustracao_exemplos": [],
    "foto_mood": "",
    "foto_luz_edicao": "",
    "foto_enquadramento": "",
    "foto_do": [],
    "foto_dont": [],
    "foto_exemplos": [],
    "video_estilo": "",
    "video_timing": "",
    "video_abertura": "",
    "video_fechamento": "",
    "padroes": [{ "nome": "", "descricao": "", "url": "" }],
    "grid_descricao": "",
    "grid_regras": "",
    "aplicacoes": [{ "tipo": "", "descricao": "", "url": "" }]
  },
  "design_system": {
    "colors": {
      "primary": "", "secondary": "",
      "success": "", "warning": "", "error": "", "info": "",
      "background": "", "surface": ""
    },
    "neutral_colors": {
      "gray_50": "", "gray_100": "", "gray_300": "", "gray_500": "",
      "gray_700": "", "gray_900": "", "white": "", "black": ""
    },
    "spacing":    { "xs": "", "sm": "", "md": "", "lg": "", "xl": "", "2xl": "" },
    "font_sizes": { "caption": "", "body": "", "h6": "", "h5": "", "h4": "", "h3": "", "h2": "", "h1": "" },
    "border_radius": { "none": "", "sm": "", "md": "", "lg": "", "full": "" },
    "shadows":  { "none": "", "sm": "", "md": "", "lg": "" },
    "breakpoints": { "xs": "", "sm": "", "md": "", "lg": "", "xl": "" },
    "components": [
      { "nome": "", "variantes": "", "tamanhos": "", "estados": "", "regras_uso": "" }
    ],
    "state_hover": "", "state_focus": "", "state_disabled": "", "state_error": "",
    "motion": { "durations": "", "easings": "", "padroes": "" },
    "accessibility": { "contraste": "", "foco": "", "aria": "", "regras_extras": [] },
    "density": { "mobile": "", "desktop": "" },
    "grid": { "colunas": "", "gutter": "", "container": "", "regras": "" },
    "ux_patterns": [{ "nome": "", "descricao": "" }]
  },
  "assets": [
    { "tipo": "logo|cor|tipografia|icone|padrao|outro", "nome": "", "descricao": "", "valor": "" }
  ],
  "tokens": [
    { "nome": "color-primary", "valor": "#RRGGBB", "categoria": "color|typography|spacing|border-radius|shadow|outro", "descricao": "" }
  ]
}

Regras:
- Informação ausente: string vazia ou array vazio. NUNCA invente.
- Cores sempre em #RRGGBB hexadecimal.
- Extraia TODAS as variantes de logo mencionadas (principal, símbolo, horizontal, monocromática, negativa…).
- Extraia TODA a paleta de cores (não só primária/secundária — neutros, acentos, semânticas).
- Extraia tipografia COMPLETA: pesos disponíveis, hierarquia, quando usar cada uma.
- Para storytelling, capture missão/visão/valores LITERAIS quando houver redação clara.
- Para tom de voz, capture descrição + atributos como chips (corajosa, calorosa, etc).
- Personas: extraia perfis com dor + motivação se mencionados.
- Para acessibilidade e padrões UX: só preencha se o manual mencionar.
- IMPORTANTE: Em "textos_referencia", capture TODOS os exemplos de TEXTO LONGO que o manual mostrar — e-mails completos, posts de blog, posts de LinkedIn, anúncios, releases, newsletters. Cole o texto INTEGRAL. Isso é crítico pro RAG conseguir replicar a voz.`

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

  // 2) Extrai — Opus pela qualidade: o manual é a base do RAG da marca
  const model = MODELS.opus

  let claudeResp
  try {
    claudeResp = await fetch(ANTHROPIC_BASE, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'file', file_id: fileId } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    })
  } catch (e) {
    await apagarArquivo()
    await markError(`Erro na API: ${e.message}`)
    return { statusCode: 200 }
  }

  if (!claudeResp.ok) {
    const errBody = await claudeResp.text()
    await apagarArquivo()
    await markError(humanizar(`${claudeResp.status}: ${errBody}`))
    return { statusCode: 200 }
  }

  const claudeData = await claudeResp.json()
  await apagarArquivo()
  // Extração de manual é a operação mais cara do produto e até aqui não
  // aparecia no painel de custo.
  await logAiUsage(supabase, { model, usage: claudeData.usage, tag: 'brand-manual' })
  const text = claudeData.content?.find(b => b.type === 'text')?.text || ''

  console.log(`[brand-manual] Claude usage:`, JSON.stringify(claudeData.usage || {}))
  console.log(`[brand-manual] Resposta crua (primeiros 500 chars):`, text.slice(0, 500))
  console.log(`[brand-manual] Resposta crua (últimos 500 chars):`, text.slice(-500))

  const extracted = extractJSON(text)

  if (!extracted) {
    console.log(`[brand-manual] extractJSON falhou. Texto completo:`, text)
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

  if (existingBook?.id) {
    const { error: upErr } = await supabase.from('brand_books').update({
      ...campos,
      version:    (existingBook.version || 1) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', existingBook.id)
    if (upErr) console.error(`[brand-manual] UPDATE falhou:`, upErr.message)
    else       console.log(`[brand-manual] UPDATE concluído em ${existingBook.id}`)
  } else {
    const { data: newBook, error: insErr } = await supabase.from('brand_books')
      .insert({ brand_id, ...campos }).select('id').single()
    if (insErr) console.error(`[brand-manual] INSERT falhou:`, insErr.message)
    else        console.log(`[brand-manual] INSERT criou:`, newBook?.id)
  }

  // Replace assets
  if (extracted.assets?.length) {
    await supabase.from('brand_assets').delete().eq('brand_id', brand_id)
    await supabase.from('brand_assets').insert(
      extracted.assets
        .filter(a => a.nome)
        .map(a => ({
          brand_id,
          tipo:      a.tipo      || 'outro',
          nome:      a.nome,
          descricao: a.descricao || '',
          valor:     a.valor     || '',
        }))
    )
  }

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
