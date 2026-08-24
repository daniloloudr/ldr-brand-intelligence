// trends-cron.js — Scheduled (netlify.toml). DESPACHANTE puro (fan-out da meta
// 30 marcas, 2026-07-13): 1 worker em background POR workspace com setor.
// Antes: loop serial numa função só — estourava o teto de 15 min com ~15
// workspaces (e o teto síncrono do scheduled muito antes disso).
import { createClient } from '@supabase/supabase-js'
import { withHeartbeat } from './_watchdog.js'
import { siteBase } from './_studio.js'
import { internalHeaders } from './_interno.js'

const run = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: wss } = await supabase.from('workspaces').select('id').not('setor', 'is', null)

  const results = await Promise.allSettled((wss || []).map(ws =>
    fetch(`${siteBase()}/.netlify/functions/trends-workspace-background`, {
      method: 'POST', headers: internalHeaders(),
      body: JSON.stringify({ workspace_id: ws.id, jitter: true }),
    })
  ))
  const falhas = results.filter(r => r.status === 'rejected').length
  if (falhas) console.error(`[trends-cron] ${falhas} disparo(s) falharam`)
  console.log(`[trends-cron] fan-out: ${wss?.length || 0} workspace(s) despachado(s)`)
  return { statusCode: 200, body: JSON.stringify({ despachados: wss?.length || 0, falhas }) }
}

export const handler = withHeartbeat('trends-cron', run)
