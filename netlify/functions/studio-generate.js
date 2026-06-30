// ════════════════════════════════════════════════════════════════════
// studio-generate.js — dispatch SÍNCRONO (<1s) de UMA geração
// Compila o brand context server-side, submete o job no fal e grava a linha.
// Spec: specs/features/studio.md §1
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { falConfigured } from './_image.js'
import { resolveBrandContext, submitGeneration } from './_studio.js'
import { creditsForImage, debitCredits, refundCredits, minPlanoModelo, planoPermite, PLAN_LABEL } from './_credits.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  const { brand_id, workflow_id, node_id, prompt, formato = '1:1', references = [], campaign_id = null, mode, model, extra, brand_facets } = body
  const useBrand = body.use_brand !== false   // marca opcional — default ligada
  // facets opcional: ['verbal','visual'] (Workflow). Ausente = ambas.
  const facets = Array.isArray(brand_facets) && brand_facets.length
    ? { verbal: brand_facets.includes('verbal'), visual: brand_facets.includes('visual') }
    : undefined
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

  // Gating + débito (admin bypassa ambos)
  const amount = creditsForImage(model)
  if (!platformAdmin) {
    const { data: ws } = await supabase.from('workspaces').select('plano').eq('id', workspace_id).single()
    const minP = minPlanoModelo(model)
    if (!planoPermite(ws?.plano, minP)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: `Este modelo requer o plano ${PLAN_LABEL[minP]} ou superior.`, minPlano: minP }) }
    }
    const r = await debitCredits(supabase, { workspace_id, amount, operacao: 'image', modelo: model || 'auto', user_id: user.id })
    if (r.insufficient) return { statusCode: 402, headers, body: JSON.stringify({ error: 'Créditos insuficientes para esta geração.', need: amount }) }
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: r.error || 'Falha ao debitar créditos' }) }
  }

  // Marca como referência OPCIONAL — só injeta se useBrand
  let snapshot = null, prefix = ''
  if (useBrand) ({ prefix, snapshot } = await resolveBrandContext(supabase, brand_id, brand.nome, facets))
  const promptFinal = useBrand
    ? `${prefix}\n\n[PEDIDO]\n${prompt}\n\n[FORMATO]\n${formato}`
    : `${prompt}\n\n[FORMATO]\n${formato}`

  const { gen, request_id, error } = await submitGeneration(supabase, {
    workspace_id, brand_id, workflow_id, node_id, campaign_id,
    promptFinal, snapshot, formato, references, mode, model, extra,
  })
  if (error) {
    if (!platformAdmin) await refundCredits(supabase, { workspace_id, amount, operacao: 'image' })
    return { statusCode: 502, headers, body: JSON.stringify({ error }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ generation_id: gen.id, request_id, status: 'processing' }) }
}
