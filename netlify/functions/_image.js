// ════════════════════════════════════════════════════════════════════
// _image.js — geração de imagem via fal.ai (queue API + webhook)
// Catálogo ABERTO: o model id vem por request (qualquer modelo do fal).
// O IMAGE_MODELS abaixo é só atalho de UX, não limita o que dá pra usar.
// Spec: specs/features/studio.md — Modelos & Provider
// ════════════════════════════════════════════════════════════════════

const FAL_KEY  = process.env.FAL_KEY
const FAL_BASE = 'https://queue.fal.run'

export const DEFAULT_MODEL = process.env.FAL_IMAGE_MODEL || 'fal-ai/gemini-25-flash-image'

// Catálogo curado — só para UX (nomes amigáveis + quais aceitam referência).
// Qualquer id do fal funciona via "ID custom" no frontend.
export const IMAGE_MODELS = [
  { id: 'fal-ai/gemini-25-flash-image', label: 'Nano Banana (Gemini)', refs: true  },
  { id: 'fal-ai/flux/dev',              label: 'Flux dev',             refs: false },
  { id: 'fal-ai/flux-pro/v1.1',         label: 'Flux Pro 1.1',         refs: false },
  { id: 'fal-ai/ideogram/v2',           label: 'Ideogram v2 (texto)',  refs: false },
  { id: 'fal-ai/recraft-v3',            label: 'Recraft v3 (design)',  refs: false },
]

export const falConfigured = () => !!FAL_KEY

function authHeaders() {
  return { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' }
}

/**
 * Resolve o endpoint efetivo. Gemini/Nano Banana usa /edit quando há
 * referência (image-to-image). Outros modelos: usa o id como veio — escolha
 * um modelo i2i específico se precisar de referência.
 */
export function modelFor(model, { references = [], mode } = {}) {
  const base = model || DEFAULT_MODEL
  const isNano = /gemini-25-flash-image|nano-banana/.test(base) && !/\/edit$/.test(base)
  const wantsEdit = (references && references.length > 0) || ['edit', 'variation', 'adapt'].includes(mode)
  return (isNano && wantsEdit) ? `${base}/edit` : base
}

/**
 * Submete um job na fila do fal com webhook. Retorna { request_id, model (endpoint), ... }.
 * Payload tolerante: prompt sempre; image_urls se refs; aspect_ratio best-effort;
 * `extra` (JSON) mesclado por cima para params específicos do modelo.
 */
export async function submitImageJob({ model, prompt, references = [], format, mode, extra, input, webhookUrl }) {
  const endpoint = modelFor(model, { references, mode })
  // `input` (override) é usado pelos apps (upscale/remove-bg/variation) que têm
  // schema próprio (ex. image_url singular). Caso contrário, monta o default.
  let body
  if (input) {
    body = input
  } else {
    body = { prompt, num_images: 1 }
    if (format)             body.aspect_ratio = format       // "1:1" | "9:16" | "16:9"
    if (references?.length) body.image_urls   = references
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

/** Status do job (dev fallback sem webhook). */
export async function getJobStatus(model, requestId) {
  const res = await fetch(`${FAL_BASE}/${model}/requests/${requestId}/status`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`fal status ${res.status}`)
  return res.json()
}

/** Resultado final do job — payload do modelo. */
export async function getJobResult(model, requestId) {
  const res = await fetch(`${FAL_BASE}/${model}/requests/${requestId}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`fal result ${res.status}`)
  return res.json()
}

/** Extrai a 1ª URL de imagem do payload do fal (webhook.payload ou result). */
export function firstImageUrl(payload) {
  const imgs = payload?.images || payload?.data?.images
  return imgs?.[0]?.url || payload?.image?.url || null
}
