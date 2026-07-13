// diagnostico-concorrentes-workspace-background.js — WORKER por workspace
// (fan-out da meta 30 marcas): re-diagnostica os concorrentes PENDENTES de um
// workspace (staleDays 7) em série (prompt cache), cap 4 por ciclo — cada
// workspace com seu próprio orçamento de 15 min. Disparado pelo cron.
import { createClient } from '@supabase/supabase-js'
import { concorrentesPendentes, diagnosticarEmSerie } from './_diagnostico.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { workspace_id, jitter = false } = body
  if (!workspace_id) return { statusCode: 400 }

  if (jitter) await sleep(Math.floor(Math.random() * 45_000))

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const pendentes = await concorrentesPendentes(supabase, { workspace_id })
  const res = await diagnosticarEmSerie(supabase, pendentes, { max: 4 })
  console.log(`[diag-conc-worker] ws ${workspace_id}: ${res.ok}/${res.tentados} gerados, ${res.restantes} restam`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
