// ════════════════════════════════════════════════════════════════════
// studio-generate-video.js — dispatch SÍNCRONO de UMA geração de vídeo
// Mesma fundação do studio-generate (auth + gate Pro + quota), mas roteia
// para os modelos de vídeo (t2v/i2v) via _video.js. Spec: studio.md §Vídeo
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { falVideoConfigured, VIDEO_MODELS, videoSupportsEndFrame } from './_video.js'
import { resolveBrandIntelligence } from './_brain.js'
import { submitVideoGeneration } from './_studio.js'
import { creditsForVideo, debitCredits, refundCredits } from './_credits.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}


export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers }

  if (!falVideoConfigured()) return { statusCode: 503, headers, body: JSON.stringify({ error: 'FAL_KEY não configurada' }) }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) } }

  const { brand_id, workflow_id, node_id, prompt, model, image_url = null, end_image_url = null, duration, aspect_ratio, brand_facets } = body
  const useBrand = body.use_brand !== false
  const facets = Array.isArray(brand_facets) && brand_facets.length
    ? { verbal: brand_facets.includes('verbal'), visual: brand_facets.includes('visual') }
    : undefined

  if (!brand_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'brand_id obrigatório' }) }
  if (!prompt)   return { statusCode: 400, headers, body: JSON.stringify({ error: 'prompt obrigatório' }) }
  if (!model || !VIDEO_MODELS[model]) return { statusCode: 400, headers, body: JSON.stringify({ error: 'modelo de vídeo inválido' }) }

  // i2v exige que o modelo suporte imagem; t2v exige que suporte texto
  const m = VIDEO_MODELS[model]
  if (image_url && !m.i2v) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Este modelo não aceita imagem de origem (image-to-video)' }) }
  if (!image_url && !m.t2v) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Este modelo exige uma imagem de origem (image-to-video)' }) }
  // frame final: exige modelo compatível + frame inicial
  const endImageUrl = end_image_url && image_url && videoSupportsEndFrame(model) ? end_image_url : null
  if (end_image_url && !endImageUrl) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Frame final requer um modelo compatível (Kling/Hailuo/Seedance) e um frame inicial' }) }

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

  // Débito (vídeo escala com a duração; todo modelo é acessível). Admin bypassa o débito.
  const amount = creditsForVideo(model, duration)
  if (!platformAdmin) {
    const r = await debitCredits(supabase, { workspace_id, amount, operacao: 'video', modelo: model, user_id: user.id })
    if (r.insufficient) return { statusCode: 402, headers, body: JSON.stringify({ error: 'Créditos insuficientes para este vídeo.', need: amount }) }
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: r.error || 'Falha ao debitar créditos' }) }
  }

  // Marca como referência OPCIONAL
  let snapshot = null, prefix = ''
  if (useBrand) ({ prefix, snapshot } = await resolveBrandIntelligence(supabase, brand_id, brand.nome, facets))
  const promptFinal = useBrand ? `${prefix}\n\n[PEDIDO — VÍDEO]\n${prompt}` : prompt

  const { gen, request_id, error } = await submitVideoGeneration(supabase, {
    workspace_id, brand_id, workflow_id, node_id,
    promptFinal, snapshot, modelKey: model, imageUrl: image_url, endImageUrl, duration, aspectRatio: aspect_ratio,
  })
  if (error) {
    if (!platformAdmin) await refundCredits(supabase, { workspace_id, amount, operacao: 'video' })
    return { statusCode: 502, headers, body: JSON.stringify({ error }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ generation_id: gen.id, request_id, status: 'processing' }) }
}
