// ════════════════════════════════════════════════════════════════════
// _studio.js — núcleo compartilhado do Studio
// - submissão de geração (fal + insert + poll dev)
// - finalização (baixa do fal → R2 → update) + conclusão de campanha
// Contexto de marca vive no cérebro (_brain.js → resolveBrandIntelligence).
// ════════════════════════════════════════════════════════════════════
import { putObject, storageConfigured } from './_storage.js'
import { isDev } from './_ai.js'
import { submitImageJob, firstImageUrl } from './_image.js'
import { submitVideoJob, firstVideoUrl } from './_video.js'
import { resolveBrandIntelligence } from './_brain.js'

const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
}

// Extrai a URL da mídia do payload do fal conforme o tipo (vídeo ou imagem).
export const extractMediaUrl = (payload, mediaType) =>
  mediaType === 'video' ? firstVideoUrl(payload) : firstImageUrl(payload)

export function siteBase() {
  // Netlify injeta URL/DEPLOY_PRIME_URL em prod. Em dev, localhost.
  return (process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888').replace(/\/$/, '')
}

// ── Submissão de uma geração (fal + insert + poll dev) ───────────────
export async function submitGeneration(supabase, {
  workspace_id, brand_id, workflow_id = null, node_id = null, campaign_id = null,
  promptFinal, snapshot, formato, references = [], mode, model, extra, input,
}) {
  const webhookUrl = isDev() ? null : `${siteBase()}/.netlify/functions/studio-webhook`
  let job
  try {
    job = await submitImageJob({ model, prompt: promptFinal, references, format: formato, mode, extra, input, webhookUrl })
  } catch (e) {
    return { error: `Falha ao submeter no fal: ${e.message}` }
  }

  const { data: gen, error } = await supabase.from('studio_generations').insert({
    workspace_id, brand_id, workflow_id, node_id, campaign_id,
    prompt_final: promptFinal, brand_context: snapshot,
    provider: job.model, provider_request_id: job.request_id,
    formato, status: 'processing',
  }).select().single()
  if (error) return { error: error.message }

  // Dev: sem webhook em localhost → dispara o poll-background (fire-and-forget).
  // Passa as URLs que o fal devolveu (status_url/response_url) p/ evitar reconstruir
  // a rota — multi-path como /edit ou /text-to-image quebram na reconstrução (405).
  if (isDev()) {
    fetch(`${siteBase()}/.netlify/functions/studio-poll-background`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_id: gen.id, model: job.model, request_id: job.request_id,
        status_url: job.status_url, response_url: job.response_url,
      }),
    }).catch(() => {})
  }
  return { gen, request_id: job.request_id }
}

// ── Submissão de geração de VÍDEO (fal + insert + poll dev) ──────────
export async function submitVideoGeneration(supabase, {
  workspace_id, brand_id, workflow_id = null, node_id = null,
  promptFinal, snapshot, modelKey, imageUrl = null, endImageUrl = null, duration, aspectRatio,
}) {
  const webhookUrl = isDev() ? null : `${siteBase()}/.netlify/functions/studio-webhook`
  let job
  try {
    job = await submitVideoJob({ modelKey, prompt: promptFinal, imageUrl, endImageUrl, duration, aspectRatio, webhookUrl })
  } catch (e) {
    return { error: `Falha ao submeter vídeo no fal: ${e.message}` }
  }

  const { data: gen, error } = await supabase.from('studio_generations').insert({
    workspace_id, brand_id, workflow_id, node_id,
    prompt_final: promptFinal, brand_context: snapshot,
    provider: job.model, provider_request_id: job.request_id,
    formato: aspectRatio || null, media_type: 'video', status: 'processing',
  }).select().single()
  if (error) return { error: error.message }

  // Dev: sem webhook em localhost → poll-background (sabe que é vídeo p/ extrair a URL).
  if (isDev()) {
    fetch(`${siteBase()}/.netlify/functions/studio-poll-background`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_id: gen.id, model: job.model, request_id: job.request_id,
        status_url: job.status_url, response_url: job.response_url, media_type: 'video',
      }),
    }).catch(() => {})
  }
  return { gen, request_id: job.request_id }
}

// ── Finalização ──────────────────────────────────────────────────────
/** Baixa a imagem do fal e sobe no R2; marca a geração como done. Idempotente. */
export async function finalizeGeneration(supabase, gen, falImageUrl) {
  if (gen.status === 'done') return                      // idempotência (webhook duplicado)
  if (!falImageUrl) return failGeneration(supabase, gen.id, 'fal não retornou imagem')
  if (!storageConfigured()) return failGeneration(supabase, gen.id, 'R2 não configurado')

  const res = await fetch(falImageUrl)
  if (!res.ok) return failGeneration(supabase, gen.id, `download da imagem falhou (${res.status})`)
  const contentType = res.headers.get('content-type') || 'image/png'
  const ext = EXT[contentType] || 'png'
  const buffer = Buffer.from(await res.arrayBuffer())

  const key = `${gen.workspace_id}/${gen.brand_id}/${gen.id}.${ext}`
  let imageUrl
  try {
    imageUrl = await putObject(key, buffer, contentType)
  } catch (e) {
    return failGeneration(supabase, gen.id, `upload R2 falhou: ${e.message}`)
  }

  // thumbnail_url = full-res por ora (thumbnailing real no passe de egress)
  await supabase.from('studio_generations').update({
    status: 'done', image_url: imageUrl, thumbnail_url: imageUrl, error: null,
  }).eq('id', gen.id)

  await onGenerationSettled(supabase, gen)
}

export async function failGeneration(supabase, genId, msg) {
  const { data } = await supabase.from('studio_generations')
    .update({ status: 'error', error: msg }).eq('id', genId).select('id, campaign_id').single()
  await onGenerationSettled(supabase, data || { id: genId })
}

// Progresso de campanha: dispara o fan-out de adaptações (modo adapt) quando o
// hero conclui, e marca concluida quando nenhuma peça está mais processando.
async function onGenerationSettled(supabase, gen) {
  if (!gen?.campaign_id) return
  const { data: camp } = await supabase.from('studio_campaigns').select('*').eq('id', gen.campaign_id).single()
  if (!camp) return

  // Modo adapt: o HERO concluiu → adapta os demais formatos usando-o como referência
  if (camp.mode === 'adapt' && gen.id === camp.hero_generation_id && !camp.adapt_started) {
    // claim atômico — evita disparo duplo em retry de webhook
    const { data: claimed } = await supabase.from('studio_campaigns')
      .update({ adapt_started: true }).eq('id', camp.id).eq('adapt_started', false).select('id')
    if (claimed?.length) {
      const { data: hero } = await supabase.from('studio_generations')
        .select('image_url, status').eq('id', gen.id).single()
      if (hero?.status === 'done' && hero.image_url) {
        const { data: brand } = await supabase.from('brands').select('nome').eq('id', camp.brand_id).single()
        const { prefix, snapshot } = await resolveBrandIntelligence(supabase, camp.brand_id, brand?.nome || '')
        for (const formato of (camp.formatos || []).slice(1)) {
          const promptFinal = `${prefix}\n\n[CONCEITO DA CAMPANHA]\n${camp.conceito}\n\n[ADAPTAÇÃO]\nAdapte a peça de referência para o formato ${formato}, mantendo EXATAMENTE a mesma direção de arte, composição, paleta, elementos e estética. Apenas reenquadre/recomponha para ${formato}.`
          await submitGeneration(supabase, {
            workspace_id: camp.workspace_id, brand_id: camp.brand_id, workflow_id: camp.workflow_id,
            campaign_id: camp.id, promptFinal, snapshot, formato, references: [hero.image_url], mode: 'adapt',
          })
        }
        return  // ainda não conclui — aguarda as adaptações
      }
      // hero falhou → encerra a campanha
      await supabase.from('studio_campaigns').update({ status: 'rascunho' }).eq('id', camp.id)
      return
    }
  }

  // Conclui quando nenhuma peça está mais processando
  const { count } = await supabase.from('studio_generations')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', camp.id).eq('status', 'processing')
  if ((count || 0) === 0) {
    // adapt: só conclui depois que o fan-out das adaptações começou
    if (camp.mode === 'adapt' && !camp.adapt_started) return
    await supabase.from('studio_campaigns').update({ status: 'concluida' }).eq('id', camp.id)
  }
}

/** Busca a geração pelo request_id do fal. */
export async function findGenerationByRequest(supabase, requestId) {
  const { data } = await supabase.from('studio_generations')
    .select('id, workspace_id, brand_id, campaign_id, status, media_type').eq('provider_request_id', requestId).maybeSingle()
  return data
}
