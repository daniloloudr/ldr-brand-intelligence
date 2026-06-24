// ════════════════════════════════════════════════════════════════════
// _studio.js — finalização de geração (compartilhado por webhook e poll-dev)
// Baixa a imagem do fal → sobe no R2 → atualiza studio_generations.
// ════════════════════════════════════════════════════════════════════
import { putObject, storageConfigured } from './_storage.js'

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

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
}

export async function failGeneration(supabase, genId, msg) {
  await supabase.from('studio_generations').update({ status: 'error', error: msg }).eq('id', genId)
}

/** Busca a geração pelo request_id do fal. */
export async function findGenerationByRequest(supabase, requestId) {
  const { data } = await supabase.from('studio_generations')
    .select('id, workspace_id, brand_id, status').eq('provider_request_id', requestId).maybeSingle()
  return data
}
