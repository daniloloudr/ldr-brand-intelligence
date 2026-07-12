// ════════════════════════════════════════════════════════════════════
// studio-generate.js — dispatch SÍNCRONO (<1s) de UMA geração
// Compila o brand context server-side, submete o job no fal e grava a linha.
// Spec: .spec/features/studio.md §1
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { falConfigured } from './_image.js'
import { resolveBrandIntelligence, emitSignal } from './_brain.js'
import { submitGeneration } from './_studio.js'
import { creditsForImage, debitCredits, refundCredits } from './_credits.js'

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

  const { brand_id, workflow_id, node_id, prompt, formato = '1:1', references = [], campaign_id = null, mode, model, extra, brand_facets, regen = false, regen_of = null } = body
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

  // Débito por crédito do modelo (todo modelo é acessível; admin bypassa o débito)
  const amount = creditsForImage(model)
  if (!platformAdmin) {
    const r = await debitCredits(supabase, { workspace_id, amount, operacao: 'image', modelo: model || 'auto', user_id: user.id })
    if (r.insufficient) return { statusCode: 402, headers, body: JSON.stringify({ error: 'Créditos insuficientes para esta geração.', need: amount }) }
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: r.error || 'Falha ao debitar créditos' }) }
  }

  // Marca como referência OPCIONAL — só injeta se useBrand
  let snapshot = null, prefix = ''
  if (useBrand) ({ prefix, snapshot } = await resolveBrandIntelligence(supabase, brand_id, brand.nome, facets))
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

  // Regenerar = reprovação IMPLÍCITA da peça anterior → sinal pro cérebro
  // (mais fraco que 👎 explícito). Acha a peça anterior por id ou pelo nó. Não-fatal.
  if (regen || regen_of) {
    try {
      let q = supabase.from('studio_generations').select('id, provider, formato, media_type, prompt_final')
      q = regen_of
        ? q.eq('id', regen_of).eq('workspace_id', workspace_id)
        : q.eq('workflow_id', workflow_id).eq('node_id', node_id).eq('status', 'done').neq('id', gen.id).order('created_at', { ascending: false }).limit(1)
      const { data: orig } = await q.maybeSingle()
      if (orig) await emitSignal(supabase, {
        brand_id, workspace_id, tipo: 'image_regen', fonte: 'studio', ref_id: orig.id, peso: 1,
        payload: { provider: orig.provider, formato: orig.formato, media_type: orig.media_type || 'image',
          prompt: (orig.prompt_final || '').slice(0, 1000) },
      })
    } catch (e) { console.error('[regen] signal falhou (não-fatal):', e.message) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ generation_id: gen.id, request_id, status: 'processing' }) }
}
