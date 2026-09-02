// ════════════════════════════════════════════════════════════════════
// brand-distill-cron.js — automação do destilador (Camada de Inteligência)
// Scheduled: diário (netlify.toml). Acha marcas com sinais NOVOS acima do
// limiar e dispara o brand-distill-background pra cada uma. Cadência + volume.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { withHeartbeat } from './_watchdog.js'
import { siteBase } from './_studio.js'
import { internalHeaders } from './_interno.js'

const THRESHOLD = parseInt(process.env.BRAND_DISTILL_THRESHOLD || '5', 10)

const run = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // Sinais não-consumidos, contados POR ESCOPO (migration 058).
  //
  // Contar por marca depois que a destilação passou a filtrar por escopo seria
  // trabalho eterno: os sinais de campanha entrariam na conta da marca, a
  // destilação da marca não os consumiria (ela lê só `campanha_id is null`), e
  // no dia seguinte a mesma conta estaria acima do limiar de novo. Todo dia,
  // para sempre, gastando LLM para não consumir nada.
  const { data, error } = await supabase.from('brand_signals')
    .select('brand_id, campanha_id').is('consumido_em', null).not('brand_id', 'is', null)
  if (error) {
    console.error('[distill-cron] leitura de sinais falhou:', error.message)
    return { statusCode: 500, body: error.message }
  }
  const counts = {}
  for (const r of data || []) {
    const chave = `${r.brand_id}|${r.campanha_id || ''}`
    counts[chave] = (counts[chave] || 0) + 1
  }
  const escopos = Object.entries(counts)
    .filter(([, c]) => c >= THRESHOLD)
    .map(([chave]) => {
      const [brand_id, campanha_id] = chave.split('|')
      return campanha_id ? { brand_id, campanha_id } : { brand_id }
    })

  // Dispara a destilação de cada escopo como background function (202 imediato).
  // PRECISA de await: fire-and-forget em Lambda morre quando o handler retorna
  // (o runtime congela antes de o fetch sair) — bug que deixou o cron "rodando"
  // sem destilar nada em prod (06–08/jul).
  const results = await Promise.allSettled(escopos.map(escopo =>
    fetch(`${siteBase()}/.netlify/functions/brand-distill-background`, {
      method: 'POST', headers: internalHeaders(),
      body: JSON.stringify(escopo),
    })
  ))
  const falhas = results.filter(r => r.status === 'rejected').length
  if (falhas) console.error(`[distill-cron] ${falhas} disparo(s) falharam`)

  const marcas = escopos.filter(e => !e.campanha_id).length
  console.log(`[distill-cron] ${escopos.length} escopo(s) acima do limiar (${THRESHOLD}) → ${marcas} marca(s) + ${escopos.length - marcas} campanha(s)`)
  return { statusCode: 200, body: JSON.stringify({ distilled: escopos.length, marcas, threshold: THRESHOLD }) }
}

export const handler = withHeartbeat('brand-distill-cron', run)
