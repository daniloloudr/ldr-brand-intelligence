// trends-workspace-background.js — WORKER por workspace (fan-out da meta 30
// marcas): radar de tendências de UM workspace no seu próprio orçamento de
// 15 min. Disparado pelo cron (sem JWT — padrão do distill; hardening no backlog).
import { createClient } from '@supabase/supabase-js'
import { coletarTendenciasWorkspace } from './_trends.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { workspace_id, jitter = false } = body
  if (!workspace_id) return { statusCode: 400 }

  if (jitter) await sleep(Math.floor(Math.random() * 45_000))

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const res = await coletarTendenciasWorkspace(supabase, { workspace_id })
  console.log(`[trends-worker] ws ${workspace_id}: ${res.status}, ${res.inseridos} tendências`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
