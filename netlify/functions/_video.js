// ════════════════════════════════════════════════════════════════════
// _video.js — geração de vídeo via fal.ai (mesma fila/webhook do _image.js)
// Cada família de modelo tem endpoints (t2v/i2v) e params próprios — por isso
// o catálogo carrega um descritor por modelo e buildVideoInput adapta.
// Slugs/params verificados na fal (jun/2026). Spec: studio.md §Bloco Vídeo
// ════════════════════════════════════════════════════════════════════

const FAL_KEY  = process.env.FAL_KEY
const FAL_BASE = 'https://queue.fal.run'

// Catálogo de roteamento. `t2v`/`i2v` = endpoint por modo (ausente = modo não
// suportado). `durations` = valores EXATOS aceitos pelo modelo no campo `duration`
// (já no formato que o fal espera: '8s' p/ Veo, '5'/'10' p/ Kling etc.).
// `aspects` = aspect_ratios suportados (null = inferido da imagem, não envia).
export const VIDEO_MODELS = {
  veo3: {
    t2v: 'fal-ai/veo3',
    durations: ['4s', '6s', '8s'], aspects: ['16:9', '9:16'],
  },
  'veo3-fast': {
    t2v: 'fal-ai/veo3/fast',
    durations: ['4s', '6s', '8s'], aspects: ['16:9', '9:16'],
  },
  'kling-25-turbo': {
    i2v: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    durations: ['5', '10'], aspects: null, endField: 'tail_image_url',   // frame final
  },
  'hailuo-02': {
    t2v: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
    i2v: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
    durations: ['6', '10'], aspects: null, endField: 'end_image_url',
  },
  'seedance-1-pro': {
    t2v: 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
    i2v: 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
    durations: ['5', '10'], aspects: ['16:9', '9:16', '1:1'], endField: 'end_image_url',
  },
  'wan-22': {
    t2v: 'fal-ai/wan/v2.2-a14b/text-to-video',
    i2v: 'fal-ai/wan/v2.2-a14b/image-to-video',
    durations: null, aspects: ['16:9', '9:16', '1:1'],   // Wan usa num_frames; deixa default
  },
}

export const falVideoConfigured = () => !!FAL_KEY
export const videoSupportsEndFrame = modelKey => !!VIDEO_MODELS[modelKey]?.endField

function authHeaders() {
  return { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' }
}

/** Endpoint efetivo: i2v se houver imagem e o modelo suportar, senão t2v. */
export function videoEndpoint(modelKey, { hasImage } = {}) {
  const m = VIDEO_MODELS[modelKey]
  if (!m) return null
  if (hasImage && m.i2v) return m.i2v
  return m.t2v || m.i2v || null
}

/** Monta o input adaptado aos params que cada família aceita. */
function buildVideoInput(modelKey, { prompt, imageUrl, endImageUrl, duration, aspectRatio }) {
  const m = VIDEO_MODELS[modelKey] || {}
  const input = { prompt }
  if (imageUrl) input.image_url = imageUrl
  // frame final (interpolação início→fim) — só se o modelo suporta E há frame inicial
  if (endImageUrl && imageUrl && m.endField) input[m.endField] = endImageUrl
  // só envia duration se o modelo declara valores e o pedido bate com um deles
  if (m.durations && duration && m.durations.includes(String(duration))) input.duration = String(duration)
  // aspect_ratio só quando o modelo suporta e não há imagem ditando o enquadramento
  if (m.aspects && !imageUrl && aspectRatio && m.aspects.includes(aspectRatio)) input.aspect_ratio = aspectRatio
  return input
}

/**
 * Submete um job de vídeo na fila do fal (mesma mecânica do _image.js).
 * Retorna { request_id, status_url, response_url, model (endpoint) }.
 */
export async function submitVideoJob({ modelKey, prompt, imageUrl, endImageUrl, duration, aspectRatio, webhookUrl }) {
  const endpoint = videoEndpoint(modelKey, { hasImage: !!imageUrl })
  if (!endpoint) throw new Error(`Modelo de vídeo desconhecido ou modo não suportado: ${modelKey}`)

  const body = buildVideoInput(modelKey, { prompt, imageUrl, endImageUrl, duration, aspectRatio })
  const url = webhookUrl
    ? `${FAL_BASE}/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}`
    : `${FAL_BASE}/${endpoint}`

  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`fal submit ${res.status}: ${txt.slice(0, 300)}`)
  }
  const data = await res.json()
  return { ...data, model: endpoint }
}

/** Extrai a 1ª URL de vídeo do payload do fal (webhook.payload ou result). */
export function firstVideoUrl(payload) {
  const p = payload?.data || payload || {}
  return p.video?.url || p.video_url || p.videos?.[0]?.url || null
}
