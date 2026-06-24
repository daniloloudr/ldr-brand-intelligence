// ════════════════════════════════════════════════════════════════════
// studio-generate.js — dispatch SÍNCRONO (<1s) da geração de imagem
// Compila o brand context server-side, submete o job no fal (queue+webhook)
// e grava a linha em studio_generations. NÃO espera a geração.
// Spec: specs/features/studio.md §1 + "Brand context resolvido server-side"
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { isDev } from './_ai.js'
import { submitImageJob, falConfigured, modelFor } from './_image.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const STUDIO_PLANS  = ['pro', 'enterprise']
const MONTHLY_LIMIT = parseInt(process.env.STUDIO_MONTHLY_LIMIT || '1000', 10)

function siteBase() {
  // Netlify injeta URL/DEPLOY_PRIME_URL em prod. Em dev, localhost.
  return (process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888').replace(/\/$/, '')
}

// ── Compila o prefixo de marca a partir dos dados estruturados ───────
function compileBrandContext({ brandBook, tokens, brand }) {
  const v = brandBook?.verbal_identity || {}
  const vi = brandBook?.visual_identity || {}
  const arr = x => Array.isArray(x) ? x.filter(Boolean) : (x ? [x] : [])

  const cores = (tokens || [])
    .filter(t => /^color/i.test(t.nome || '') || t.categoria === 'color')
    .map(t => t.valor).filter(Boolean)
  const paleta = arr(vi.paleta).map(p => p?.hex || p?.valor || p).filter(Boolean)
  const todasCores = [...new Set([...paleta, ...cores])].slice(0, 8)

  const personalidade = [...new Set([...arr(v.personalidade), ...arr(v.tom_atributos)].filter(Boolean))]
  const tipografia = [vi.tipo_principal_nome, vi.tipo_secundario_nome, vi.tipo_display].filter(Boolean)
  const estetica = [vi.foto_mood, vi.foto_luz_edicao, vi.foto_enquadramento, vi.ilustracao_estilo, vi.icone_estilo].filter(Boolean)
  const evitar = [v.tom_evitar, arr(vi.usos_proibidos).join('; '), arr(vi.foto_dont).join('; ')].filter(Boolean)

  const linhas = []
  linhas.push(`Marca: ${brand?.nome || ''}`)
  if (v.posicionamento || v.proposicao_valor || v.proposta_valor) linhas.push(`Posicionamento: ${v.posicionamento || v.proposta_valor}`)
  if (personalidade.length) linhas.push(`Personalidade: ${personalidade.join(', ')} — a peça deve transmitir isso`)
  if (v.tom_voz) linhas.push(`Tom: ${v.tom_voz}`)
  if (todasCores.length) linhas.push(`Paleta (use como cores dominantes): ${todasCores.join(', ')}`)
  if (tipografia.length) linhas.push(`Tipografia (se houver texto): ${tipografia.join(', ')}`)
  if (estetica.length) linhas.push(`Estética visual: ${estetica.join('; ')}`)
  if (evitar.length) linhas.push(`Evitar: ${evitar.join('; ')}`)

  const prefix = `[BRAND CONTEXT]\n${linhas.join('\n')}`
  const snapshot = { verbal: v, visual: vi, cores: todasCores, personalidade, tipografia, estetica }
  return { prefix, snapshot }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers }

  if (!falConfigured()) return { statusCode: 503, headers, body: JSON.stringify({ error: 'FAL_KEY não configurada' }) }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) } }

  const { brand_id, workflow_id, node_id, prompt, formato = '1:1', references = [], campaign_id = null, mode } = body
  if (!brand_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'brand_id obrigatório' }) }
  if (!prompt)   return { statusCode: 400, headers, body: JSON.stringify({ error: 'prompt obrigatório' }) }

  // Brand → workspace (fonte autoritativa)
  const { data: brand } = await supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Marca não encontrada' }) }
  const workspace_id = brand.workspace_id

  // Acesso: membro do workspace OU platform_admin
  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  // Gate de plano (Studio = Pro+) + quota mensal — admin bypassa
  if (!platformAdmin) {
    const { data: ws } = await supabase.from('workspaces').select('plano').eq('id', workspace_id).single()
    if (!STUDIO_PLANS.includes(ws?.plano)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Studio requer plano Pro ou superior' }) }

    const inicioMes = new Date(); inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase.from('studio_generations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id).gte('created_at', inicioMes.toISOString())
    if ((count || 0) >= MONTHLY_LIMIT) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Limite mensal de gerações atingido' }) }
  }

  // Compila brand context (estruturado: verbal + visual + tokens)
  // Pega a linha de brand_book MAIS RECENTE — resiliente a duplicatas de brand_id
  // (a tabela deveria ter unique(brand_id), mas hoje há linhas duplicadas).
  const [{ data: bbRows }, { data: tokens }] = await Promise.all([
    supabase.from('brand_books').select('verbal_identity, visual_identity').eq('brand_id', brand_id).order('updated_at', { ascending: false }).limit(1),
    supabase.from('design_tokens').select('nome, valor, categoria').eq('brand_id', brand_id),
  ])
  const brandBook = bbRows?.[0] || null
  const { prefix, snapshot } = compileBrandContext({ brandBook, tokens, brand })

  const promptFinal = `${prefix}\n\n[PEDIDO]\n${prompt}\n\n[FORMATO]\n${formato}`

  // Submete no fal — webhook em prod, sem webhook em dev (poll fallback)
  const webhookUrl = isDev() ? null : `${siteBase()}/.netlify/functions/studio-webhook`
  let job
  try {
    job = await submitImageJob({ prompt: promptFinal, references, format: formato, mode, webhookUrl })
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: `Falha ao submeter no fal: ${e.message}` }) }
  }

  // Grava o registro do job (status processing)
  const { data: gen, error: genErr } = await supabase.from('studio_generations').insert({
    workspace_id, brand_id,
    workflow_id: workflow_id || null,
    node_id:     node_id || null,
    campaign_id,
    prompt_final: promptFinal,
    brand_context: snapshot,
    provider: job.model,
    provider_request_id: job.request_id,
    formato,
    status: 'processing',
  }).select().single()
  if (genErr) return { statusCode: 500, headers, body: JSON.stringify({ error: genErr.message }) }

  // Dev: sem webhook em localhost → dispara o poll-background (fire-and-forget)
  if (isDev()) {
    fetch(`${siteBase()}/.netlify/functions/studio-poll-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generation_id: gen.id, model: job.model, request_id: job.request_id }),
    }).catch(() => {})
  }

  return { statusCode: 200, headers, body: JSON.stringify({ generation_id: gen.id, request_id: job.request_id, status: 'processing' }) }
}
