// ════════════════════════════════════════════════════════════════════
// _watchdog.js — observabilidade dos crons (Gap 1)
// Duas peças: withHeartbeat() registra início/fim de cada scheduled em
// cron_runs (o heartbeat nunca derruba o cron); sendAlert() acusa problema
// com dedup de 24h por cron+tipo em cron_alerts, e replica para Sentry
// (SENTRY_DSN, via store API — sem SDK) e webhook (ALERT_WEBHOOK_URL,
// payload {text} compatível com Slack/Discord/ntfy).
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export const withHeartbeat = (cron, fn) => async (event, context) => {
  const supabase = sb()
  let runId = null
  try {
    const { data } = await supabase.from('cron_runs').insert({ cron }).select('id').single()
    runId = data?.id
  } catch { /* sem batida ≠ sem cron */ }

  try {
    const res = await fn(event, context)
    const ok = !res?.statusCode || res.statusCode < 400
    let detalhe = null
    try { detalhe = res?.body ? JSON.parse(res.body) : null } catch { /* body não-JSON */ }
    if (runId) await supabase.from('cron_runs')
      .update({ finished_at: new Date().toISOString(), ok, detalhe }).eq('id', runId)
    return res
  } catch (e) {
    console.error(`[${cron}] erro não tratado:`, e.message)
    try {
      if (runId) await supabase.from('cron_runs')
        .update({ finished_at: new Date().toISOString(), ok: false, detalhe: { error: e.message } }).eq('id', runId)
      await sendAlert(cron, 'erro', `${cron} lançou erro não tratado: ${e.message}`)
    } catch { /* alerta nunca mascara o erro original */ }
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}

// ── Saldo de provedor (fal/Anthropic) ───────────────────────────────
// O 403 "Exhausted balance" da fal derruba TODA geração silenciosamente
// (descoberto no ensaio do pilotinho Hering, 14/jul). Quem detecta chama
// alertIfBalanceError: true = era saldo/billing (alerta disparado, dedup
// 24h) → o caller lança MSG_INSTABILIDADE pro usuário, nunca o erro cru.
const SALDO_RE = /exhausted balance|user is locked|insufficient credit|credit balance|payment required|billing|quota exceeded/i

export const MSG_INSTABILIDADE =
  'Estamos com uma instabilidade no sistema de geração. A equipe já foi alertada — tente novamente em alguns minutos.'

/**
 * Avisa quando o PROVEDOR está fora do ar. Existia alerta para saldo e nenhum
 * para indisponibilidade — 5xx e 529 passavam mudos, e a queda era descoberta
 * pelo cliente ligando.
 *
 * Dedup de 24h por tipo (no sendAlert) evita que uma instabilidade de 10 min
 * vire 200 alertas: o primeiro conta a história, os outros são ruído.
 * `sobreviveu` distingue a falha que a reserva absorveu da que chegou ao
 * usuário — as duas interessam, com urgências diferentes.
 */
export async function alertIfProviderDown(provider, status, detail, { sobreviveu = false } = {}) {
  if (![429, 500, 502, 503, 504, 529].includes(Number(status))) return false
  const grave = !sobreviveu
  console.error(`[${provider}] indisponível (HTTP ${status})${sobreviveu ? ' — absorvido pela reserva' : ''}`)
  try {
    await sendAlert(provider, sobreviveu ? 'instavel' : 'fora-do-ar',
      `${grave ? 'FORA DO AR' : 'instável'}: ${provider} respondeu HTTP ${status}. `
      + (sobreviveu ? 'A reserva atendeu — operação não foi perdida.' : 'A operação FALHOU para o usuário.')
      + ` ${String(detail || '').slice(0, 200)}`)
  } catch (e) { console.error('[watchdog] alerta de indisponibilidade falhou:', e.message) }
  return true
}

export async function alertIfBalanceError(provider, status, detail) {
  const txt = String(detail || '')
  if (status !== 402 && status !== 403 && !SALDO_RE.test(txt)) return false
  console.error(`[${provider}] recusa por saldo/billing (HTTP ${status}):`, txt.slice(0, 300))
  try { await sendAlert(provider, 'saldo', `Provedor ${provider} recusando por saldo/billing (HTTP ${status}): ${txt.slice(0, 200)}`) }
  catch (e) { console.error('[watchdog] alerta de saldo falhou:', e.message) }
  return true
}

const DEDUP_H = 24

export async function sendAlert(cron, tipo, motivo) {
  const supabase = sb()

  // dedup: mesmo cron+tipo nas últimas 24h = já avisado
  const desde = new Date(Date.now() - DEDUP_H * 3600_000).toISOString()
  const { data: recentes } = await supabase.from('cron_alerts')
    .select('id').eq('cron', cron).eq('tipo', tipo).gte('criado_em', desde).limit(1)
  if (recentes?.length) return false

  console.error(`[watchdog] 🚨 ${tipo.toUpperCase()} — ${motivo}`)
  await supabase.from('cron_alerts').insert({ cron, tipo, motivo })
  await Promise.allSettled([sentry(motivo, { cron, tipo }), webhook(motivo)])
  return true
}

async function sentry(message, tags) {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  try {
    const u = new URL(dsn)
    const projectId = u.pathname.replace(/\//g, '')
    await fetch(`${u.protocol}//${u.host}/api/${projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=brandcode-watchdog/1.0, sentry_key=${u.username}`,
      },
      body: JSON.stringify({ message, level: 'error', logger: 'cron-watchdog', platform: 'node', tags }),
    })
  } catch (e) { console.error('[watchdog] envio ao Sentry falhou:', e.message) }
}

async function webhook(text) {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `🚨 BR4NDCODE · ${text}` }),
    })
  } catch (e) { console.error('[watchdog] envio ao webhook falhou:', e.message) }
}
