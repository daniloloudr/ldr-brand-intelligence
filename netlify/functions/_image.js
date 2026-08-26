// ════════════════════════════════════════════════════════════════════
// _image.js — geração de imagem via fal.ai (queue API + webhook)
// Catálogo ABERTO: o model id vem por request (qualquer modelo do fal).
// O IMAGE_MODELS abaixo é só atalho de UX, não limita o que dá pra usar.
// Spec: .spec/features/studio.md — Modelos & Provider
// ════════════════════════════════════════════════════════════════════

import { alertIfBalanceError, MSG_INSTABILIDADE } from './_watchdog.js'

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

/** Submete um body pronto num endpoint do fal e trata erro/saldo de forma única. */
async function submitFal(endpoint, body, webhookUrl) {
  const url = webhookUrl ? `${FAL_BASE}/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}` : `${FAL_BASE}/${endpoint}`
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    if (await alertIfBalanceError('fal', res.status, txt)) throw new Error(MSG_INSTABILIDADE)
    throw new Error(`fal submit ${res.status}: ${txt.slice(0, 300)}`)
  }
  const data = await res.json()
  return { ...data, model: endpoint }
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
  // Seedream 5 — ATENÇÃO: sem o prefixo `fal-ai/` (o 4.x tem). Mesmo schema do
  // 4.5 (prompt + image_urls + image_size), então cai no caminho default.
  'bytedance/seedream/v5/pro/text-to-image':      { endpoint: 'bytedance/seedream/v5/pro/edit',             field: 'image_urls' },
  'bytedance/seedream/v5/lite/text-to-image':     { endpoint: 'bytedance/seedream/v5/lite/edit',            field: 'image_urls' },
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
  // FLUX Virtual Try-On — troca a PEÇA numa foto que já existe, preservando
  // pessoa, pose, calça, calçado e fundo. A diferença decisiva para o FASHN:
  // aceita PROMPT, então dá para descrever modelagem. No piloto Hering (19/08)
  // foi o que eliminou a fenda lateral que vazava da regata da foto de casting —
  // o FASHN, sem prompt, não tinha como ser corrigido.
  // Mesma convenção de referências: 1ª = modelo (pessoa), 2ª = peça (roupa).
  if (/flux-pro\/v1\/vto/.test(endpoint)) {
    if ((references || []).length < 2)
      throw new Error('Try-on precisa de 2 imagens conectadas: 1ª = modelo (pessoa), 2ª = peça (roupa)')
    const body = {
      human_image_url:   references[0],
      garment_image_url: references[1],
      prompt: prompt || 'a peça de roupa da imagem de referência, fiel em cor, estampa, gola, mangas e barra',
      ...(extra || {}),
    }
    // schema estrito: campos de geração comum vazados por `extra` causam 422
    delete body.num_images; delete body.aspect_ratio; delete body.image_size; delete body.image_urls
    return submitFal(endpoint, body, webhookUrl)
  }
  if (/fashn\/tryon/.test(endpoint)) {
    if ((references || []).length < 2)
      throw new Error('Try-on precisa de 2 imagens conectadas: 1ª = modelo (pessoa), 2ª = peça (roupa)')
    const body = { model_image: references[0], garment_image: references[1], category: 'auto', ...(extra || {}) }
    // schema estrito: o FASHN rejeita campos de geração comum vazados por extra
    delete body.prompt; delete body.num_images; delete body.aspect_ratio
    return submitFal(endpoint, body, webhookUrl)
  }
  // Bria Product Shot: schema próprio — coloca o PRODUTO real (1ª ref) numa cena
  // descrita no prompt (scene_description). Dados licenciados = seguro comercial.
  // Opcional: 2ª ref = imagem de fundo (ref_image_url). placement automático.
  if (/bria\/product-shot/.test(endpoint)) {
    if (!(references || []).length)
      throw new Error('Bria Product Shot precisa da imagem do produto conectada (1ª referência).')
    const body = {
      image_url: references[0],
      ...(prompt ? { scene_description: prompt } : {}),
      ...(references[1] ? { ref_image_url: references[1] } : { placement_type: 'automatic' }),
      ...(extra || {}),
    }
    return submitFal(endpoint, body, webhookUrl)
  }
  // Seedream Layerize: schema próprio — recebe UMA imagem e devolve suas camadas
  // separadas (sujeito, fundo, elementos). `images` é a mesma lista de `layers`,
  // achatada para galeria, então o caminho normal de leitura já funciona.
  // `image_size` aqui é STRING (auto | ...), não objeto — por isso o extra do nó
  // de formato personalizado é descartado.
  if (/seedream\/v5\/pro\/layerize/.test(endpoint)) {
    if (!(references || []).length)
      throw new Error('Layerize precisa da imagem conectada (1ª referência).')
    const body = { image_url: references[0], ...(prompt ? { prompt } : {}), ...(extra || {}) }
    delete body.num_images; delete body.aspect_ratio; delete body.image_urls
    if (body.image_size && typeof body.image_size !== 'string') delete body.image_size
    return submitFal(endpoint, body, webhookUrl)
  }
  // IC-Light V2: schema próprio — reilumina a imagem (1ª ref) conforme o prompt
  // de luz/cena. Ótimo para dar acabamento de estúdio a packshot chapado.
  if (/iclight-v2/.test(endpoint)) {
    if (!(references || []).length)
      throw new Error('IC-Light precisa da imagem conectada (1ª referência).')
    const body = { image_url: references[0], prompt: prompt || 'professional studio lighting', ...(extra || {}) }
    return submitFal(endpoint, body, webhookUrl)
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
    // Formato personalizado: extra.image_size manda em px exatos e o
    // aspect_ratio NÃO vai (format vira "1080x1350", que não é proporção).
    const sendAspect = format && /^\d+:\d+$/.test(format) && !(extra && extra.image_size)
      && (!hasRefs || EDIT_ACCEPTS_ASPECT.has(model || DEFAULT_MODEL))
    if (sendAspect) body.aspect_ratio = format               // "1:1" | "9:16" | "16:9"
    if (hasRefs) {
      const field = imageField(model)
      if (field === 'image_url') body.image_url = references[0]   // endpoint singular
      else                       body.image_urls = references     // endpoint em array
    }
    if (extra && typeof extra === 'object') Object.assign(body, extra)
  }

  return submitFal(endpoint, body, webhookUrl)               // { request_id, status_url, ... }
}

// A rota de queue do fal usa o APP base, não o endpoint de operação. Reconstruir
// `${model}/requests/...` quebra (405) quando o endpoint tem subrota (ex. /edit,
// /text-to-image). Por isso preferimos sempre a URL que o próprio fal devolve no
// submit (statusUrl/resultUrl); a reconstrução fica só como fallback de compat.
const stripOp = model => String(model).replace(/\/(edit|text-to-image|image-to-image)$/, '')

/**
 * A URL do job só vale se for do fal — porque estes dois fetch mandam a NOSSA
 * chave no header `Authorization`.
 *
 * Achado no security gate de 26/08, antes de subir: `studio-poll-background`
 * recebia `status_url`/`response_url` do corpo do request e passava direto para
 * cá. Host e protocolo eram de quem chamasse, então bastava apontar para um
 * servidor próprio para receber `Key <FAL_KEY>` no primeiro fetch — e passar a
 * gastar na nossa conta, fora do sistema de créditos. Apontar para
 * 169.254.169.254 alcançava o metadata da Lambda.
 *
 * A guarda mora AQUI, e não só no chamador, porque é aqui que a chave entra no
 * fetch: qualquer caminho futuro que reuse estas funções nasce protegido.
 */
export function urlDeJobDoFal(url) {
  if (!url) return null
  let u
  try { u = new URL(String(url)) } catch { throw new Error('URL de job do fal inválida') }
  if (u.origin !== FAL_BASE) throw new Error(`URL de job fora do fal (${u.origin}) — recusada`)
  return u.toString()
}

/** Status do job (dev fallback sem webhook). */
export async function getJobStatus(model, requestId, statusUrl) {
  const url = urlDeJobDoFal(statusUrl) || `${FAL_BASE}/${stripOp(model)}/requests/${requestId}/status`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`fal status ${res.status}`)
  return res.json()
}

/** Resultado final do job — payload do modelo. */
export async function getJobResult(model, requestId, resultUrl) {
  const url = urlDeJobDoFal(resultUrl) || `${FAL_BASE}/${stripOp(model)}/requests/${requestId}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    // 422 = o job falhou na validação DENTRO do fal — o corpo traz o motivo real
    // (ex.: try-on sem pose detectável). Propagar o detalhe, não só o status.
    const txt = await res.text().catch(() => '')
    let motivo = ''
    try { motivo = (JSON.parse(txt)?.detail || []).map(d => d?.msg).filter(Boolean).join('; ') } catch { motivo = txt.slice(0, 200) }
    throw new Error(`fal result ${res.status}${motivo ? `: ${motivo}` : ''}`)
  }
  return res.json()
}

/** Extrai a 1ª URL de imagem do payload do fal (webhook.payload ou result). */
export function firstImageUrl(payload) {
  const imgs = payload?.images || payload?.data?.images
  return imgs?.[0]?.url || payload?.image?.url || null
}
