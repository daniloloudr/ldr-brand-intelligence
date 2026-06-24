// ════════════════════════════════════════════════════════════════════
// studio-poll-background.js — fallback de DEV (webhook não alcança localhost)
// Polla o status do job no fal e faz o mesmo trabalho do webhook.
// Em produção o webhook cuida disso; aqui é só netlify dev.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { getJobStatus, getJobResult, firstImageUrl } from './_image.js'
import { finalizeGeneration, failGeneration } from './_studio.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { generation_id, model, request_id } = body
  if (!generation_id || !model || !request_id) return { statusCode: 400 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: gen } = await supabase.from('studio_generations')
    .select('id, workspace_id, brand_id, campaign_id, status').eq('id', generation_id).single()
  if (!gen) return { statusCode: 404 }

  const MAX_WAIT = 180_000
  const start = Date.now()
  try {
    while (Date.now() - start < MAX_WAIT) {
      const st = await getJobStatus(model, request_id)
      if (st.status === 'COMPLETED') {
        const result = await getJobResult(model, request_id)
        await finalizeGeneration(supabase, gen, firstImageUrl(result))
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
