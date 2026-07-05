// concorrente-clipping-cron.js — Scheduled (netlify.toml). Clipping semanal dos
// concorrentes de TODOS os workspaces (em série, deduplicando por url).
import { createClient } from '@supabase/supabase-js'
import { coletarClippingWorkspace } from './_clipping.js'

export const handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const res = await coletarClippingWorkspace(supabase, { max: 8 })
  console.log(`[clipping-cron] ${res.inseridos} itens de ${res.concorrentes} concorrentes`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
