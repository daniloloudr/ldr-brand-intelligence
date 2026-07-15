// ════════════════════════════════════════════════════════════════════
// studio-edit.js — apps de transformação de imagem (Workflow)
// op: upscale | removebg | variation. Recebe uma image_url (saída de outro
// nó) e produz uma nova imagem. Mesmo padrão fila + webhook.
// Spec: .spec/features/studio.md — Bloco Workflow (apps)
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { falConfigured } from './_image.js'
import { submitGeneration } from './_studio.js'
import { creditsForOp, debitCredits, refundCredits } from './_credits.js'
import { putObject, storageConfigured } from './_storage.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

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
  if (!cfg && op !== 'crop') return { statusCode: 400, headers, body: JSON.stringify({ error: `op inválida: ${op}` }) }
  if (!image_url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'image_url obrigatória' }) }

  const { data: brand } = await supabase.from('brands').select('id, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Marca não encontrada' }) }
  const workspace_id = brand.workspace_id

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  // ── Recortar (crop determinístico com sharp): local, síncrono, 0 crédito.
  // Corta/redimensiona em px exato (fit cover + ponto focal, inclusive smart
  // crop 'attention') e grava como geração DONE — o poll do canvas pega no
  // próximo tick. É o tijolo determinístico do motor de formatos.
  if (op === 'crop') {
    if (!storageConfigured()) return { statusCode: 503, headers, body: JSON.stringify({ error: 'Storage não configurado' }) }
    const width  = Math.min(4096, Math.max(64, Math.round(+body.width  || 1080)))
    const height = Math.min(4096, Math.max(64, Math.round(+body.height || 1080)))
    const FOCAIS = ['attention', 'entropy', 'centre', 'top', 'bottom', 'left', 'right']
    const focal = FOCAIS.includes(body.focal) ? body.focal : 'attention'
    try {
      const { default: sharp } = await import('sharp')
      const res = await fetch(image_url)
      if (!res.ok) throw new Error(`não consegui baixar a imagem de origem (${res.status})`)
      const buf = Buffer.from(await res.arrayBuffer())
      const out = await sharp(buf).resize(width, height, { fit: 'cover', position: focal }).webp({ quality: 92 }).toBuffer()
      const genId = crypto.randomUUID()
      const url = await putObject(`${workspace_id}/${brand_id}/${genId}.webp`, out, 'image/webp')
      const { data: gen, error: insErr } = await supabase.from('studio_generations').insert({
        id: genId, workspace_id, brand_id, workflow_id, node_id,
        provider: 'local/recorte', formato: `${width}x${height}`, media_type: 'image',
        prompt_final: `[recorte ${width}×${height} · foco ${focal}]`,
        image_url: url, thumbnail_url: url, status: 'done', custo_estimado: 0,
      }).select('id').single()
      if (insErr) throw insErr
      return { statusCode: 200, headers, body: JSON.stringify({ generation_id: gen.id, status: 'done' }) }
    } catch (e) {
      console.error('[studio-edit] crop falhou:', e.message)
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Recorte falhou: ${e.message}` }) }
    }
  }

  const amount = creditsForOp(op)
  if (!platformAdmin) {
    const r = await debitCredits(supabase, { workspace_id, amount, operacao: op, modelo: cfg.model, user_id: user.id })
    if (r.insufficient) return { statusCode: 402, headers, body: JSON.stringify({ error: 'Créditos insuficientes para esta operação.', need: amount }) }
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: r.error || 'Falha ao debitar créditos' }) }
  }

  const { gen, request_id, error } = await submitGeneration(supabase, {
    workspace_id, brand_id, workflow_id, node_id,
    promptFinal: `[${op}]`, snapshot: null, formato: null,
    model: cfg.model, input: cfg.input(image_url),
  })
  if (error) {
    if (!platformAdmin) await refundCredits(supabase, { workspace_id, amount, operacao: op })
    return { statusCode: 502, headers, body: JSON.stringify({ error }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ generation_id: gen.id, request_id, status: 'processing' }) }
}
