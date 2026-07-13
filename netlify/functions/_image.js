// ════════════════════════════════════════════════════════════════════
// _image.js — geração de imagem via fal.ai (queue API + webhook)
// Catálogo ABERTO: o model id vem por request (qualquer modelo do fal).
// O IMAGE_MODELS abaixo é só atalho de UX, não limita o que dá pra usar.
// Spec: .spec/features/studio.md — Modelos & Provider
// ════════════════════════════════════════════════════════════════════

const FAL_KEY  = process.env.FAL_KEY
const FAL_BASE = 'https://queue.fal.run'

export const DEFAULT_MODEL = process.env.FAL_IMAGE_MODEL || 'fal-ai/gemini-25-flash-image'

// Catálogo curado de UX vive em src/lib/studioModels.js (fonte única do seletor).
// Qualquer id do fal funciona via "ID custom" no frontend — este arquivo só cuida
// do roteamento de endpoint (text-to-image vs. edição/i2i no mapa I2I abaixo).

export const falConfigured = () => !!FAL_KEY

function authHeaders() {
  return { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' }
}

// Mapa de image-to-image por modelo: cada um tem seu endpoint e campo de imagem.
// `field: 'image_url'` = singular (usa só a 1ª referência); 'image_urls' = array.
const I2I = {
  // Google / Gemini (Nano Banana) — endpoints de edição dedicados, multi-referência
  'fal-ai/nano-banana-pro':                       { endpoint: 'fal-ai/nano-banana-pro/edit',                field: 'image_urls' },
  'fal-ai/gemini-25-flash-image':                 { endpoint: 'fal-ai/gemini-25-flash-image/edit',          field: 'image_urls' },
  // OpenAI
  'openai/gpt-image-2':                           { endpoint: 'openai/gpt-image-2/edit',                    field: 'image_urls' },
  // ByteDance Seedream
  'fal-ai/bytedance/seedream/v4/text-to-image':   { endpoint: 'fal-ai/bytedance/seedream/v4/edit',          field: 'image_urls' },
  'fal-ai/bytedance/seedream/v4.5/text-to-image': { endpoint: 'fal-ai/bytedance/seedream/v4.5/edit',        field: 'image_urls' },
  // FLUX — kontext e flux-2-pro já aceitam imagem no mesmo endpoint (mapeia p/ si)
  'fal-ai/flux-2-pro':                            { endpoint: 'fal-ai/flux-2-pro',                          field: 'image_urls' },
  'fal-ai/flux-pro/kontext':                      { endpoint: 'fal-ai/flux-pro/kontext',                    field: 'image_url'  },
  'fal-ai/flux/dev':                              { endpoint: 'fal-ai/flux/dev/image-to-image',             field: 'image_url'  },
  'fal-ai/flux-pro/v1.1':                         { endpoint: 'fal-ai/flux-pro/v1.1/redux',                 field: 'image_url'  },
  'fal-ai/flux-pro/v1.1-ultra':                   { endpoint: 'fal-ai/flux-pro/v1.1-ultra/redux',           field: 'image_url'  },
  // Qwen
  'fal-ai/qwen-image':                            { endpoint: 'fal-ai/qwen-image-edit',                     field: 'image_url'  },
  // Design & tipografia
  'fal-ai/ideogram/v2':                           { endpoint: 'fal-ai/ideogram/v2/remix',                   field: 'image_url'  },
  'fal-ai/recraft-v3':                            { endpoint: 'fal-ai/recraft/v3/image-to-image',           field: 'image_url'  },
}

// Endpoints de edição (i2i) que aceitam `aspect_ratio` no modo edição (família
// Gemini/Nano Banana — verificado: respeita 16:9 mesmo com referência). Os demais
// modelos inferem o tamanho da imagem de entrada (Seedream/GPT/Qwen/Flux usam
// `image_size`, e mandar aspect_ratio neles daria 422).
const EDIT_ACCEPTS_ASPECT = new Set([
  'fal-ai/gemini-25-flash-image',
  'fal-ai/nano-banana-pro',
])

const wantsEditMode = (references, mode) => (references && references.length > 0) || ['edit', 'variation', 'adapt'].includes(mode)
const ALREADY_I2I = /\/(edit|image-to-image|redux|remix)$/

/**
 * Resolve o endpoint efetivo. Com referência (image-to-image), roteia para o
 * endpoint de edição/i2i do modelo (mapa I2I) — senão o text-to-image ignora a
 * imagem. Sem mapa conhecido, mantém o id como veio.
 */
export function modelFor(model, { references = [], mode } = {}) {
  const base = model || DEFAULT_MODEL
  if (!wantsEditMode(references, mode) || ALREADY_I2I.test(base)) return base
  return I2I[base]?.endpoint || base
}

// Campo de imagem que o endpoint i2i do modelo espera (image_url | image_urls)
export function imageField(model) {
  const base = model || DEFAULT_MODEL
  return I2I[base]?.field || 'image_urls'
}

/**
 * Submete um job na fila do fal com webhook. Retorna { request_id, model (endpoint), ... }.
 * Payload tolerante: prompt sempre; image_urls se refs; aspect_ratio best-effort;
 * `extra` (JSON) mesclado por cima para params específicos do modelo.
 */
export async function submitImageJob({ model, prompt, references = [], format, mode, extra, input, webhookUrl }) {
  const endpoint = modelFor(model, { references, mode })
  // FASHN Try-On (piloto Hering): schema próprio — veste a PEÇA real no MODELO.
  // Convenção de referências: 1ª = modelo (pessoa), 2ª = peça (roupa).
  if (/fashn\/tryon/.test(endpoint)) {
    if ((references || []).length < 2)
      throw new Error('Try-on precisa de 2 imagens conectadas: 1ª = modelo (pessoa), 2ª = peça (roupa)')
    const body = { model_image: references[0], garment_image: references[1], category: 'auto', ...(extra || {}) }
    const url = webhookUrl ? `${FAL_BASE}/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}` : `${FAL_BASE}/${endpoint}`
    const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
    if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`fal submit ${res.status}: ${txt.slice(0, 300)}`) }
    const data = await res.json()
    return { ...data, model: endpoint }
  }
  // `input` (override) é usado pelos apps (upscale/remove-bg/variation) que têm
  // schema próprio (ex. image_url singular). Caso contrário, monta o default.
  let body
  if (input) {
    body = input
  } else {
    const hasRefs = references?.length > 0
    body = { prompt, num_images: 1 }
    // Em t2i sempre envia aspect_ratio. Em edição (com referência), só para os
    // modelos que aceitam — senão o tamanho é inferido da imagem de entrada.
    const sendAspect = format && (!hasRefs || EDIT_ACCEPTS_ASPECT.has(model || DEFAULT_MODEL))
    if (sendAspect) body.aspect_ratio = format               // "1:1" | "9:16" | "16:9"
    if (hasRefs) {
      const field = imageField(model)
      if (field === 'image_url') body.image_url = references[0]   // endpoint singular
      else                       body.image_urls = references     // endpoint em array
    }
    if (extra && typeof extra === 'object') Object.assign(body, extra)
  }

  const url = webhookUrl
    ? `${FAL_BASE}/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}`
    : `${FAL_BASE}/${endpoint}`

  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`fal submit ${res.status}: ${txt.slice(0, 300)}`)
  }
  const data = await res.json()
  return { ...data, model: endpoint }                        // { request_id, status_url, ... }
}

// A rota de queue do fal usa o APP base, não o endpoint de operação. Reconstruir
// `${model}/requests/...` quebra (405) quando o endpoint tem subrota (ex. /edit,
// /text-to-image). Por isso preferimos sempre a URL que o próprio fal devolve no
// submit (statusUrl/resultUrl); a reconstrução fica só como fallback de compat.
const stripOp = model => String(model).replace(/\/(edit|text-to-image|image-to-image)$/, '')

/** Status do job (dev fallback sem webhook). */
export async function getJobStatus(model, requestId, statusUrl) {
  const url = statusUrl || `${FAL_BASE}/${stripOp(model)}/requests/${requestId}/status`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`fal status ${res.status}`)
  return res.json()
}

/** Resultado final do job — payload do modelo. */
export async function getJobResult(model, requestId, resultUrl) {
  const url = resultUrl || `${FAL_BASE}/${stripOp(model)}/requests/${requestId}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`fal result ${res.status}`)
  return res.json()
}

/** Extrai a 1ª URL de imagem do payload do fal (webhook.payload ou result). */
export function firstImageUrl(payload) {
  const imgs = payload?.images || payload?.data?.images
  return imgs?.[0]?.url || payload?.image?.url || null
}
