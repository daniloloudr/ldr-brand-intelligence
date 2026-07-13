// art-review.js — o DIRETOR DE ARTE como serviço (F2 · Copiloto com mãos).
// Julga uma peça (imagem por URL) contra o cérebro da marca e devolve veredito
// estruturado. É o MESMO juiz do chat, como portão automático do Workflow —
// e o embrião do juiz de fidelidade do piloto Hering.
// Síncrona (multimodal ~5-15s). Cada parecer vira sinal art_review (peso 0.8).
import { createClient } from '@supabase/supabase-js'
import { callAI, MODELS, isDev, extractJSON } from './_ai.js'
import { resolveBrandIntelligence, emitSignal } from './_brain.js'

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
    '"aprovada" = produto idêntico no que está visível; "aprovada_com_ressalvas" = diferenças pequenas (elemento levemente reposicionado, detalhe ocluso); "reprovada" = elemento inventado/removido/alterado, texto ilegível ou divergente, cor errada.',
    criterio ? `CRITÉRIO ADICIONAL: ${String(criterio).slice(0, 400)}` : '',
    'Responda APENAS com JSON estrito: {"veredito":"aprovada|aprovada_com_ressalvas|reprovada","resumo":"<1 frase>","ajustes":["<divergência concreta>", "..."]}',
  ].join('\n') : [
    `Você é o DIRETOR DE ARTE da marca ${brand.nome}. Julga peças visuais contra o contexto da marca abaixo (brand book + o que ela APRENDEU com o uso).`,
    brandCtx,
    criterio ? `\nCRITÉRIO ADICIONAL DESTE PORTÃO: ${String(criterio).slice(0, 400)}` : '',
    '\nRegras: seja específico (cite cores, composição, elementos reais da imagem); "aprovada_com_ressalvas" quando o núcleo sustenta mas há desvios pequenos; "reprovada" quando foge da paleta/estética/do-dont da marca ou tem texto/logo indevidos.',
    'Responda APENAS com JSON estrito: {"veredito":"aprovada|aprovada_com_ressalvas|reprovada","resumo":"<1 frase>","ajustes":["<ajuste concreto>", "..."]}',
  ].join('\n')

  let out
  try {
    const { text } = await callAI({
      model: isDev() ? MODELS.fast : MODELS.medium,
      maxTokens: 800, retries: 1, retryDelay: 2000, timeoutMs: 25000,
      system,
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
  const VEREDITOS = ['aprovada', 'aprovada_com_ressalvas', 'reprovada']
  if (!out || !VEREDITOS.includes(out.veredito))
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'parecer inválido do juiz' }) }

  const parecer = {
    veredito: out.veredito,
    resumo: String(out.resumo || '').slice(0, 400),
    ajustes: (Array.isArray(out.ajustes) ? out.ajustes : []).map(a => String(a).slice(0, 250)).slice(0, 6),
  }

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
