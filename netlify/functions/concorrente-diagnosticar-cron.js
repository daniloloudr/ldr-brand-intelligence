// concorrente-diagnosticar-cron.js — Scheduled (netlify.toml). DESPACHANTE puro
// (fan-out da meta 30 marcas, 2026-07-13): 1 worker em background POR workspace
// com concorrentes ativos. Antes: diagnosticava inline em série — scheduled tem
// teto SÍNCRONO de segundos (não 15 min!), morria no 1º diagnóstico com web
// search. Evidência: segunda 13/jul, 0 diagnósticos com 9 dias de staleness.
import { createClient } from '@supabase/supabase-js'
import { withHeartbeat } from './_watchdog.js'
import { siteBase } from './_studio.js'
import { internalHeaders } from './_interno.js'

const run = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: concs } = await supabase.from('concorrentes').select('workspace_id').eq('ativo', true)
  const wss = [...new Set((concs || []).map(c => c.workspace_id).filter(Boolean))]

  const results = await Promise.allSettled(wss.map(workspace_id =>
    fetch(`${siteBase()}/.netlify/functions/diagnostico-concorrentes-workspace-background`, {
      method: 'POST', headers: internalHeaders(),
      body: JSON.stringify({ workspace_id, jitter: true }),
    })
  ))
  const falhas = results.filter(r => r.status === 'rejected').length
  if (falhas) console.error(`[diag-conc-cron] ${falhas} disparo(s) falharam`)
  console.log(`[diag-conc-cron] fan-out: ${wss.length} workspace(s) despachado(s)`)
  return { statusCode: 200, body: JSON.stringify({ despachados: wss.length, falhas }) }
}

export const handler = withHeartbeat('concorrente-diagnosticar-cron', run)
