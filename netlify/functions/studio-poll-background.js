// ════════════════════════════════════════════════════════════════════
// studio-poll-background.js — fallback de DEV (webhook não alcança localhost)
// Polla o status do job no fal e faz o mesmo trabalho do webhook.
// Em produção o webhook cuida disso; aqui é só netlify dev.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { getJobStatus, getJobResult } from './_image.js'
import { finalizeGeneration, failGeneration, extractMediaUrl } from './_studio.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { generation_id, model, request_id, status_url, response_url, media_type } = body
  if (!generation_id || !model || !request_id) return { statusCode: 400 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: gen } = await supabase.from('studio_generations')
    .select('id, workspace_id, brand_id, campaign_id, status').eq('id', generation_id).single()
  if (!gen) return { statusCode: 404 }

  const MAX_WAIT = 600_000   // 10 min — GPT Image / Seedream podem demorar bastante
  const start = Date.now()
  try {
    while (Date.now() - start < MAX_WAIT) {
      const st = await getJobStatus(model, request_id, status_url)
      if (st.status === 'COMPLETED') {
        const result = await getJobResult(model, request_id, response_url)
        await finalizeGeneration(supabase, gen, extractMediaUrl(result, media_type))
        return { statusCode: 200 }
      }
      await sleep(3000)
    }
    await failGeneration(supabase, gen.id, 'timeout aguardando o fal (dev poll)')
  } catch (e) {
    await failGeneration(supabase, gen.id, `dev poll: ${e.message}`)
  }
  return { statusCode: 200 }
}
