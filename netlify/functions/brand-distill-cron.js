// ════════════════════════════════════════════════════════════════════
// brand-distill-cron.js — automação do destilador (Camada de Inteligência)
// Scheduled: diário (netlify.toml). Acha marcas com sinais NOVOS acima do
// limiar e dispara o brand-distill-background pra cada uma. Cadência + volume.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { siteBase } from './_studio.js'

const THRESHOLD = parseInt(process.env.BRAND_DISTILL_THRESHOLD || '5', 10)

export const handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // marcas com sinais não-consumidos suficientes
  const { data } = await supabase.from('brand_signals')
    .select('brand_id').is('consumido_em', null).not('brand_id', 'is', null)
  const counts = {}
  for (const r of data || []) counts[r.brand_id] = (counts[r.brand_id] || 0) + 1
  const brands = Object.entries(counts).filter(([, c]) => c >= THRESHOLD).map(([b]) => b)

  // dispara a destilação (fire-and-forget) — cada uma roda como background
  for (const brand_id of brands) {
    fetch(`${siteBase()}/.netlify/functions/brand-distill-background`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id }),
    }).catch(() => {})
  }

  console.log(`[distill-cron] ${brands.length} marca(s) acima do limiar (${THRESHOLD}) → destilando`)
  return { statusCode: 200, body: JSON.stringify({ distilled: brands.length, threshold: THRESHOLD }) }
}
