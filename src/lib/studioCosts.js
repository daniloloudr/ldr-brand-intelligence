// ════════════════════════════════════════════════════════════════════
// studioCosts.js — estima o CUSTO (créditos → USD/R$) de uma geração do
// Studio a partir do provider (slug do fal) gravado em studio_generations.
// Base: mapa de créditos (credits.js). A regra do produto é
//   créditos = ⌈18 × custo_USD⌉  →  custo_USD ≈ créditos / 18 (aproximação).
// custo_estimado não é persistido no banco; derivamos aqui pro dashboard.
// ════════════════════════════════════════════════════════════════════
import { IMAGE_CREDITS, VIDEO_CREDITS } from './credits.js'

export const USD_PER_CREDIT = 1 / 18   // inverte ⌈18 × custo_USD⌉
export const BRL_PER_USD    = 5.5      // câmbio de referência (planos.md)

// slug de vídeo do fal → key do videoModels (pra achar os créditos)
const VIDEO_KEY_BY_SLUG = [
  [/seedance-2\.0\/fast|seedance-2-fast/i, 'seedance-2-fast'],
  [/seedance-2\.0|seedance-2-pro/i,        'seedance-2-pro'],
  [/seedance\/v1\/pro|seedance-1-pro/i,    'seedance-1-pro'],
  [/kling/i,                               'kling-25-turbo'],
  [/hailuo/i,                              'hailuo-02'],
  [/veo3\/fast|veo3-fast/i,                'veo3-fast'],
  [/veo3/i,                                'veo3'],
  [/wan/i,                                 'wan-22'],
]

function videoKey(slug = '') {
  for (const [re, key] of VIDEO_KEY_BY_SLUG) if (re.test(slug)) return key
  return null
}

// menor duração como referência (duração real não é persistida na geração)
function videoCredits(key) {
  const m = VIDEO_CREDITS[key]
  if (!m) return 8
  if (m.default) return m.default
  const vals = Object.values(m).filter(Number.isFinite)
  return vals.length ? Math.min(...vals) : 8
}

// Créditos estimados de uma geração pelo provider + media_type.
export function creditsForProvider(provider = '', mediaType = 'image') {
  if (mediaType === 'video') return videoCredits(videoKey(provider))
  if (IMAGE_CREDITS[provider]) return IMAGE_CREDITS[provider]
  const base = provider.replace(/\/(edit|redux|image-to-image|text-to-image|remix)$/i, '')
  return IMAGE_CREDITS[base] ?? 1
}

export const usdFromCredits = c => c * USD_PER_CREDIT
export const brlFromCredits = c => c * USD_PER_CREDIT * BRL_PER_USD

// Rótulo curto e legível do modelo a partir do slug.
export function modelLabel(provider = '') {
  return provider
    .replace(/^fal-ai\//, '')
    .replace(/\/(edit|redux|remix|text-to-image|image-to-image|text-to-video|image-to-video)$/i, '')
    || '—'
}
