// ════════════════════════════════════════════════════════════════════
// diagnostico-reaper.js — Scheduled function (cron */15).
// Diagnósticos ficam presos em `running` quando a background function é
// interrompida (dev server morto, timeout duro, crash sem catch) — a linha
// nunca recebe status terminal e aparece "em andamento" pra sempre.
// Este reaper marca como `error` os `running` mais velhos que STALE_MIN,
// para nenhum job órfão ficar preso na tela. netlify.toml: schedule */15.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const STALE_MIN = 15   // um diagnóstico completa em ~1-3 min; >15 min = morto

export const handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const cutoff = new Date(Date.now() - STALE_MIN * 60_000).toISOString()

  const { data, error } = await supabase
    .from('diagnosticos')
    .update({ status: 'error', publico: false,
      data: { _job_error: true, error: `Geração expirada — sem conclusão após ${STALE_MIN} min.` } })
    .eq('status', 'running')
    .lt('created_at', cutoff)
    .select('id, empresa')

  if (error) { console.error('[reaper] falhou:', error.message); return { statusCode: 500, body: error.message } }
  if (data?.length) console.log(`[reaper] ${data.length} diagnóstico(s) órfão(s) marcados como erro: ${data.map(d => d.empresa).join(', ')}`)
  return { statusCode: 200, body: JSON.stringify({ reaped: data?.length || 0 }) }
}
