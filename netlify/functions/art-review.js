// art-review.js — o DIRETOR DE ARTE como serviço (F2 · Copiloto com mãos).
// Julga uma peça (imagem por URL) contra o cérebro da marca e devolve veredito
// estruturado. É o MESMO juiz do chat, como portão automático do Workflow —
// e o embrião do juiz de fidelidade do piloto Hering.
// Síncrona (multimodal ~5-15s). Cada parecer vira sinal art_review (peso 0.8).
//
// E0b (31/ago/2026) — o contrato virou o da spec §2.2: {veredito, texto}.
//   · vocabulário: aprovado · rechecar · reprovado (era aprovada /
//     aprovada_com_ressalvas / reprovada — ver _parecer.js para o de-para)
//   · texto de até 300 caracteres, um campo só. `ajustes[]` MORREU: a §2.2
//     define a saída em dois campos, e o conserto agora é dito dentro do texto.
//   · sem score, e continua sem — a §2.2 chama nota de "precisão falsa"
//   · os quatro eixos fixos (§2.3) passam a ser NOMEADOS no prompt.
import { createClient } from '@supabase/supabase-js'
import { callAI, MODELS, isDev, extractJSON } from './_ai.js'
import { resolveBrandIntelligence, emitSignal } from './_brain.js'
import { VEREDITOS, TEXTO_MAX } from './_parecer.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers } }
  const { brand_id, image_url, generation_id = null, criterio = null, reference_url = null, modo = null } = body
  if (!brand_id || !image_url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'brand_id e image_url obrigatórios' }) }

  const { data: brand } = await supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers }
  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', brand.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers }

  const { prefix: brandCtx } = await resolveBrandIntelligence(supabase, brand_id, brand.nome)

  // Modo FIDELIDADE (piloto Hering): julga a peça contra o PRODUTO DE REFERÊNCIA
  // (estampa/texto/cor/modelagem idênticos), IGNORANDO a estética da marca do
  // workspace — o produto é do cliente, não nosso.
  const fidelidade = modo === 'fidelidade' && reference_url
  const system = fidelidade ? [
    'Você é um INSPETOR DE FIDELIDADE DE PRODUTO para catálogo de moda/e-commerce.',
    'Você recebe DUAS imagens: a 1ª é a PEÇA GERADA por IA; a 2ª é o PRODUTO ORIGINAL (foto real de referência).',
    'Julgue APENAS a fidelidade da roupa/produto entre as duas: estampa e posição dos elementos, TEXTO (letra por letra), cores exatas, botões/aviamentos, costuras e modelagem. IGNORE estética de marca, fundo, pose ou qualidade artística.',
    '"aprovado" = produto idêntico no que está visível; "rechecar" = diferenças pequenas (elemento levemente reposicionado, detalhe ocluso); "reprovado" = elemento inventado/removido/alterado, texto ilegível ou divergente, cor errada.',
    criterio ? `CRITÉRIO ADICIONAL: ${String(criterio).slice(0, 400)}` : '',
    `TEXTO: no máximo ${TEXTO_MAX} caracteres, com a divergência concreta e o conserto.`,
    'Responda APENAS com JSON estrito: {"veredito":"aprovado|rechecar|reprovado","texto":"<até 300 caracteres>"}',
  ].join('\n') : [
    `Você é o DIRETOR DE ARTE da marca ${brand.nome}. Julga peças visuais contra o contexto da marca abaixo (brand book + o que ela APRENDEU com o uso).`,
    brandCtx,
    // Os quatro eixos fixos do §2.3. Nomeá-los muda o parecer de impressão
    // geral para verificação: o modelo tem que percorrer os quatro, e dizer
    // qual falhou — dentro do texto, que é o único campo que sobrou.
    `\nVERIFIQUE OS QUATRO EIXOS, nesta ordem:
1. FIDELIDADE — o que foi inserido continua igual? ${reference_url ? 'Compare com a imagem de referência.' : 'SEM material de entrada nesta peça: diga que não é verificável e não invente divergência.'}
2. MARCA — atende ao que a marca já aprendeu com aprovações e recusas anteriores?
3. ESCOPO — atende ao direcional e ao objetivo do escopo em que a peça nasceu?
4. EXECUÇÃO — o que foi pedido foi feito?`,
    criterio ? `\nCRITÉRIO ADICIONAL DESTE PORTÃO (soma aos quatro eixos, nunca os substitui): ${String(criterio).slice(0, 400)}` : '',
    `\nVEREDITO: "aprovado" = os quatro eixos sustentam; "rechecar" = o núcleo sustenta mas há desvio que exige olho humano; "reprovado" = foge da paleta/estética/do-dont da marca, ou tem texto/logo indevidos.`,
    `TEXTO: no máximo ${TEXTO_MAX} caracteres. Diga qual eixo falhou e qual é o conserto concreto — cite cores, composição e elementos reais da imagem. Sem nota, sem score.`,
    'Responda APENAS com JSON estrito: {"veredito":"aprovado|rechecar|reprovado","texto":"<até 300 caracteres>"}',
  ].join('\n')

  let out
  try {
    const { text } = await callAI({
      model: isDev() ? MODELS.fast : MODELS.medium,
      maxTokens: 800, retries: 1, retryDelay: 2000, timeoutMs: 25000,
      system, supabase, tag: 'diretor-de-arte',
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'url', url: image_url } },
        ...(reference_url ? [{ type: 'image', source: { type: 'url', url: reference_url } }] : []),
        { type: 'text', text: reference_url ? 'A 1ª imagem é a peça gerada; a 2ª é o produto original de referência. Julgue.' : 'Julgue esta peça.' },
      ] }],
    })
    out = extractJSON(text)
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: `juiz falhou: ${e.message}` }) }
  }
  // Sem normalizar aqui de propósito: o vocabulário antigo vindo do MODELO seria
  // sinal de prompt desalinhado, e engolir isso esconde o defeito. A leitura
  // dupla existe para o que já está GRAVADO, não para a resposta de agora.
  if (!out || !VEREDITOS.includes(out.veredito))
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'parecer inválido do juiz' }) }

  const parecer = {
    veredito: out.veredito,
    texto: String(out.texto || '').slice(0, TEXTO_MAX),
  }

  // ── O parecer GANHA LUGAR (migration 054) ─────────────────────────
  // Antes disto o veredito existia por segundos na tela e sumia: o juiz
  // devolvia e emitia sinal, sem `insert`. A §2.2 diz que a função real do juiz
  // é ORDENAR A FILA — e não havia fila, porque não havia de onde ler.
  //
  // `eixos` registra o que era VERIFICÁVEL, não o que o modelo disse (o
  // contrato é {veredito, texto}, sem campo por eixo). Isso é conhecimento do
  // servidor e vale guardar: seis meses depois dá para saber se a fidelidade
  // chegou a ser checada, ou se não havia material de entrada.
  //
  // Não-fatal, e isso É uma escolha: a peça não pode deixar de ser entregue
  // porque o banco soluçou. Quando o D6 (não existe geração sem parecer) entrar,
  // esta gravação vira caminho crítico e o tratamento muda junto.
  try {
    const { error: errParecer } = await supabase.from('parecer').insert({
      workspace_id: brand.workspace_id,
      brand_id,
      generation_id: generation_id || null,
      image_url,
      veredito: parecer.veredito,
      texto: parecer.texto,
      eixos: {
        fidelidade: !!reference_url,   // sem material de entrada, não há o que comparar
        marca: !fidelidade,            // o modo fidelidade IGNORA a estética da marca, de propósito
        escopo: false,                 // ⚠️ cego até o E1 ligar objetivo/direcional da campanha
        execucao: true,
      },
      modo: fidelidade ? 'fidelidade' : 'marca',
      criterio: criterio ? String(criterio).slice(0, 400) : null,
      fonte: 'workflow',
    })
    if (errParecer) console.error('[art-review] parecer não gravado (não-fatal):', errParecer.message)
  } catch (e) { console.error('[art-review] parecer não gravado (não-fatal):', e.message) }

  // Parecer vira sinal (peso 0.8 — julgamento de IA, não humano). Não-fatal.
  try {
    await emitSignal(supabase, {
      brand_id, workspace_id: brand.workspace_id, tipo: 'art_review', fonte: 'workflow',
      ref_id: generation_id, peso: 0.8,
      payload: { ...parecer, image_url, modo: fidelidade ? 'fidelidade' : 'marca' },
    })
  } catch (e) { console.error('[art-review] signal falhou (não-fatal):', e.message) }

  return { statusCode: 200, headers, body: JSON.stringify(parecer) }
}
