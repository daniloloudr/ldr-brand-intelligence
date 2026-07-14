// ════════════════════════════════════════════════════════════════════
// cron-watchdog.js — Scheduled (hora em hora, netlify.toml).
// O alarme que faltou em 06-08/jul e 13/jul: cron que não roda é invisível
// até alguém auditar na mão. Confere o heartbeat de cada scheduled
// (cron_runs) contra a cadência esperada e acusa:
//   silêncio — não bateu dentro do prazo (cron não disparou / morreu antes
//              do heartbeat) · morte — bateu mas nunca terminou (teto
//              síncrono, crash sem catch).
// Período de graça: cron sem batida NENHUMA só alerta depois que o próprio
// watchdog existe há mais tempo que a cadência dele (evita tempestade de
// alerta na estreia). Dedup de 24h por cron+tipo no sendAlert.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { withHeartbeat, sendAlert } from './_watchdog.js'

// maxSilencioMin = cadência + tolerância (schedules em UTC no netlify.toml)
const ESPERADOS = {
  'diagnostico-reaper':            { cadencia: 'a cada 15 min', maxSilencioMin: 120 },
  'brand-distill-cron':            { cadencia: 'diário 7h',     maxSilencioMin: 26 * 60 },
  'concorrente-diagnosticar-cron': { cadencia: 'segunda 6h',    maxSilencioMin: 8.5 * 24 * 60 },
  'cron-monitor':                  { cadencia: 'segunda 8h',    maxSilencioMin: 8.5 * 24 * 60 },
  'concorrente-clipping-cron':     { cadencia: 'segunda 9h',    maxSilencioMin: 8.5 * 24 * 60 },
  'trends-cron':                   { cadencia: 'segunda 10h',   maxSilencioMin: 8.5 * 24 * 60 },
}
const MORTO_MIN     = 20  // scheduled tem teto síncrono de SEGUNDOS; 20 min sem finished = morreu
const RETENCAO_DIAS = 60

const run = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const agora = Date.now()
  const alertas = []

  // baseline do período de graça = primeira batida do próprio watchdog
  const { data: primeira } = await supabase.from('cron_runs')
    .select('started_at').eq('cron', 'cron-watchdog')
    .order('started_at', { ascending: true }).limit(1)
  const baseline = primeira?.length ? new Date(primeira[0].started_at).getTime() : agora

  for (const [cron, { cadencia, maxSilencioMin }] of Object.entries(ESPERADOS)) {
    const { data: ultima } = await supabase.from('cron_runs')
      .select('started_at, finished_at, ok').eq('cron', cron)
      .order('started_at', { ascending: false }).limit(1)

    const maxMs = maxSilencioMin * 60_000

    if (!ultima?.length) {
      if (agora - baseline > maxMs &&
          await sendAlert(cron, 'silencio', `${cron} (${cadencia}) não bateu NENHUMA vez desde a instrumentação — cron não está disparando`))
        alertas.push(cron)
      continue
    }

    const { started_at, finished_at } = ultima[0]
    const silencioMin = Math.round((agora - new Date(started_at).getTime()) / 60_000)

    if (silencioMin * 60_000 > maxMs) {
      if (await sendAlert(cron, 'silencio', `${cron} (${cadencia}) não roda há ${Math.round(silencioMin / 60)}h — última batida ${started_at}`))
        alertas.push(cron)
    } else if (!finished_at && silencioMin > MORTO_MIN) {
      if (await sendAlert(cron, 'morte', `${cron} começou ${started_at} e não terminou em ${silencioMin} min — morto no meio (teto síncrono?)`))
        alertas.push(cron)
    }
  }

  // retenção: batidas antigas não têm valor de auditoria
  await supabase.from('cron_runs').delete()
    .lt('started_at', new Date(agora - RETENCAO_DIAS * 86400_000).toISOString())

  console.log(`[watchdog] ${Object.keys(ESPERADOS).length} cron(s) conferidos, ${alertas.length} alerta(s) novo(s)${alertas.length ? ': ' + alertas.join(', ') : ''}`)
  return { statusCode: 200, body: JSON.stringify({ conferidos: Object.keys(ESPERADOS).length, alertas }) }
}

export const handler = withHeartbeat('cron-watchdog', run)
