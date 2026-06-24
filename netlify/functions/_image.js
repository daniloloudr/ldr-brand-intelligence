// ════════════════════════════════════════════════════════════════════
// _image.js — geração de imagem abstraída (espelha o aiConfig do _ai.js)
// Gateway atual: fal.ai (queue API + webhook). Trocar de modelo/provider
// é mudança de config, não de código.
// Spec: specs/features/studio.md — Provider de Geração de Imagem + §1
// ════════════════════════════════════════════════════════════════════

const FAL_KEY  = process.env.FAL_KEY
const FAL_BASE = 'https://queue.fal.run'

// Modelo inicial: Gemini 2.5 Flash Image (Nano Banana) — consistência entre
// peças + aceita referências da marca via image_urls. Trocável por env.
//   text→image : fal-ai/gemini-25-flash-image   (ou fal-ai/flux/dev)
//   image→image: fal-ai/gemini-25-flash-image/edit  (referências em image_urls)
const MODEL = process.env.FAL_IMAGE_MODEL || 'fal-ai/gemini-25-flash-image'

export const falConfigured = () => !!FAL_KEY

function authHeaders() {
  return { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' }
}

/** Modelo efetivo: usa o endpoint /edit quando há referências de marca. */
export function modelFor({ references = [], mode } = {}) {
  const useEdit = (references && references.length > 0) || mode === 'edit' || mode === 'variation'
  return useEdit ? `${MODEL}/edit` : MODEL
}

/**
 * Submete um job na fila do fal com webhook. Retorna { request_id, model, ... }.
 * Não espera a geração — o webhook (ou o poll de dev) conclui.
 */
export async function submitImageJob({ prompt, references = [], format, mode, webhookUrl }) {
  const model = modelFor({ references, mode })
  const input = { prompt, num_images: 1 }
  if (format)               input.aspect_ratio = format       // "1:1" | "9:16" | "16:9"
  if (references?.length)    input.image_urls   = references    // assets/refs da marca

  const url = webhookUrl
    ? `${FAL_BASE}/${model}?fal_webhook=${encodeURIComponent(webhookUrl)}`
    : `${FAL_BASE}/${model}`

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`fal submit ${res.status}: ${txt.slice(0, 300)}`)
  }
  const data = await res.json()
  return { ...data, model }                                    // { request_id, status_url, response_url, ... }
}

/** Status do job (dev fallback sem webhook). */
export async function getJobStatus(model, requestId) {
  const res = await fetch(`${FAL_BASE}/${model}/requests/${requestId}/status`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`fal status ${res.status}`)
  return res.json()                                            // { status: IN_QUEUE | IN_PROGRESS | COMPLETED }
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
