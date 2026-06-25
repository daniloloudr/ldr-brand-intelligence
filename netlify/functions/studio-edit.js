// ════════════════════════════════════════════════════════════════════
// studio-edit.js — apps de transformação de imagem (Workflow)
// op: upscale | removebg | variation. Recebe uma image_url (saída de outro
// nó) e produz uma nova imagem. Mesmo padrão fila + webhook.
// Spec: specs/features/studio.md — Bloco Workflow (apps)
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { falConfigured } from './_image.js'
import { submitGeneration } from './_studio.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const STUDIO_PLANS  = ['pro', 'enterprise']
const MONTHLY_LIMIT = parseInt(process.env.STUDIO_MONTHLY_LIMIT || '1000', 10)

// op → { model (endpoint exato do fal), input(url) }
const OPS = {
  upscale:   { model: process.env.FAL_UPSCALE_MODEL  || 'fal-ai/clarity-upscaler', input: url => ({ image_url: url }) },
  removebg:  { model: process.env.FAL_REMOVEBG_MODEL || 'fal-ai/birefnet',         input: url => ({ image_url: url }) },
  variation: { model: process.env.FAL_VARIATION_MODEL || 'fal-ai/gemini-25-flash-image/edit',
               input: url => ({ prompt: 'Crie uma variação criativa desta imagem, mantendo o mesmo estilo, paleta e composição geral.', image_urls: [url], num_images: 1 }) },
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

  const { brand_id, op, image_url, workflow_id = null, node_id = null } = body
  const cfg = OPS[op]
  if (!brand_id)  return { statusCode: 400, headers, body: JSON.stringify({ error: 'brand_id obrigatório' }) }
  if (!cfg)       return { statusCode: 400, headers, body: JSON.stringify({ error: `op inválida: ${op}` }) }
  if (!image_url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'image_url obrigatória' }) }

  const { data: brand } = await supabase.from('brands').select('id, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Marca não encontrada' }) }
  const workspace_id = brand.workspace_id

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  if (!platformAdmin) {
    const { data: ws } = await supabase.from('workspaces').select('plano').eq('id', workspace_id).single()
    if (!STUDIO_PLANS.includes(ws?.plano)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Studio requer plano Pro ou superior' }) }
    const inicioMes = new Date(); inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase.from('studio_generations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id).gte('created_at', inicioMes.toISOString())
    if ((count || 0) >= MONTHLY_LIMIT) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Limite mensal atingido' }) }
  }

  const { gen, request_id, error } = await submitGeneration(supabase, {
    workspace_id, brand_id, workflow_id, node_id,
    promptFinal: `[${op}]`, snapshot: null, formato: null,
    model: cfg.model, input: cfg.input(image_url),
  })
  if (error) return { statusCode: 502, headers, body: JSON.stringify({ error }) }

  return { statusCode: 200, headers, body: JSON.stringify({ generation_id: gen.id, request_id, status: 'processing' }) }
}
