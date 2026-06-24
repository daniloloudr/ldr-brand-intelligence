// ════════════════════════════════════════════════════════════════════
// _studio.js — núcleo compartilhado do Studio
// - brand context (resolve + compila) reaproveitado por generate e campaign
// - submissão de geração (fal + insert + poll dev)
// - finalização (baixa do fal → R2 → update) + conclusão de campanha
// ════════════════════════════════════════════════════════════════════
import { putObject, storageConfigured } from './_storage.js'
import { isDev } from './_ai.js'
import { submitImageJob } from './_image.js'

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export function siteBase() {
  // Netlify injeta URL/DEPLOY_PRIME_URL em prod. Em dev, localhost.
  return (process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888').replace(/\/$/, '')
}

// ── Brand context ────────────────────────────────────────────────────
const arr = x => Array.isArray(x) ? x.filter(Boolean) : (x ? [x] : [])

export function compileBrandContext({ brandBook, tokens, brandNome }) {
  const v  = brandBook?.verbal_identity || {}
  const vi = brandBook?.visual_identity || {}

  const cores = (tokens || [])
    .filter(t => /^color/i.test(t.nome || '') || t.categoria === 'color')
    .map(t => t.valor).filter(Boolean)
  const paleta = arr(vi.paleta).map(p => p?.hex || p?.valor || p).filter(Boolean)
  const todasCores = [...new Set([...paleta, ...cores])].slice(0, 8)

  const personalidade = [...new Set([...arr(v.personalidade), ...arr(v.tom_atributos)].filter(Boolean))]
  const tipografia = [vi.tipo_principal_nome, vi.tipo_secundario_nome, vi.tipo_display].filter(Boolean)
  const estetica = [vi.foto_mood, vi.foto_luz_edicao, vi.foto_enquadramento, vi.ilustracao_estilo, vi.icone_estilo].filter(Boolean)
  const evitar = [v.tom_evitar, arr(vi.usos_proibidos).join('; '), arr(vi.foto_dont).join('; ')].filter(Boolean)

  const linhas = []
  linhas.push(`Marca: ${brandNome || ''}`)
  if (v.posicionamento || v.proposta_valor) linhas.push(`Posicionamento: ${v.posicionamento || v.proposta_valor}`)
  if (personalidade.length) linhas.push(`Personalidade: ${personalidade.join(', ')} — a peça deve transmitir isso`)
  if (v.tom_voz) linhas.push(`Tom: ${v.tom_voz}`)
  if (todasCores.length) linhas.push(`Paleta (use como cores dominantes): ${todasCores.join(', ')}`)
  if (tipografia.length) linhas.push(`Tipografia (se houver texto): ${tipografia.join(', ')}`)
  if (estetica.length) linhas.push(`Estética visual: ${estetica.join('; ')}`)
  if (evitar.length) linhas.push(`Evitar: ${evitar.join('; ')}`)

  const prefix = `[BRAND CONTEXT]\n${linhas.join('\n')}`
  const snapshot = { verbal: v, visual: vi, cores: todasCores, personalidade, tipografia, estetica }
  return { prefix, snapshot }
}

/** Lê brand_book (linha mais recente) + tokens e compila o brand context. */
export async function resolveBrandContext(supabase, brand_id, brandNome) {
  const [{ data: bbRows }, { data: tokens }] = await Promise.all([
    supabase.from('brand_books').select('verbal_identity, visual_identity')
      .eq('brand_id', brand_id).order('updated_at', { ascending: false }).limit(1),
    supabase.from('design_tokens').select('nome, valor, categoria').eq('brand_id', brand_id),
  ])
  return compileBrandContext({ brandBook: bbRows?.[0] || null, tokens, brandNome })
}

// ── Submissão de uma geração (fal + insert + poll dev) ───────────────
export async function submitGeneration(supabase, {
  workspace_id, brand_id, workflow_id = null, node_id = null, campaign_id = null,
  promptFinal, snapshot, formato, references = [], mode,
}) {
  const webhookUrl = isDev() ? null : `${siteBase()}/.netlify/functions/studio-webhook`
  let job
  try {
    job = await submitImageJob({ prompt: promptFinal, references, format: formato, mode, webhookUrl })
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

  // Dev: sem webhook em localhost → dispara o poll-background (fire-and-forget)
  if (isDev()) {
    fetch(`${siteBase()}/.netlify/functions/studio-poll-background`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generation_id: gen.id, model: job.model, request_id: job.request_id }),
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

  await maybeCompleteCampaign(supabase, gen.campaign_id)
}

export async function failGeneration(supabase, genId, msg) {
  const { data } = await supabase.from('studio_generations')
    .update({ status: 'error', error: msg }).eq('id', genId).select('campaign_id').single()
  await maybeCompleteCampaign(supabase, data?.campaign_id)
}

/** Marca a campanha como concluída quando nenhuma peça está mais processando. */
async function maybeCompleteCampaign(supabase, campaign_id) {
  if (!campaign_id) return
  const { count } = await supabase.from('studio_generations')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id).eq('status', 'processing')
  if ((count || 0) === 0) {
    await supabase.from('studio_campaigns').update({ status: 'concluida' }).eq('id', campaign_id)
  }
}

/** Busca a geração pelo request_id do fal. */
export async function findGenerationByRequest(supabase, requestId) {
  const { data } = await supabase.from('studio_generations')
    .select('id, workspace_id, brand_id, campaign_id, status').eq('provider_request_id', requestId).maybeSingle()
  return data
}
