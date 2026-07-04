// concorrente-diagnosticar-cron.js — Scheduled (netlify.toml). Refresca diagnósticos
// de concorrentes: pega os ATIVOS sem diagnóstico recente e gera em SÉRIE (não
// paralelo — o prompt cache do _ai.js só rende com reuso sequencial dentro do TTL).
// Limita MAX_POR_RUN pra não estourar o teto de 15 min da function (cada geração
// leva ~2-3 min). O que sobrar entra no próximo ciclo.
import { createClient } from '@supabase/supabase-js'
import { diagnosticarConcorrente } from './_diagnostico.js'

const STALE_DAYS   = 7
const MAX_POR_RUN  = 4

export const handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const cutoff = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString()

  const [{ data: concorrentes }, { data: diags }] = await Promise.all([
    supabase.from('concorrentes').select('id, workspace_id, nome, dominio').eq('ativo', true),
    supabase.from('diagnosticos_concorrentes').select('concorrente_id, created_at').order('created_at', { ascending: false }),
  ])

  const ultimoPor = new Map()
  for (const d of diags || []) {
    if (!ultimoPor.has(d.concorrente_id)) ultimoPor.set(d.concorrente_id, d.created_at)
  }

  const pendentes = (concorrentes || []).filter(c => {
    const ultimo = ultimoPor.get(c.id)
    return !ultimo || ultimo < cutoff
  }).slice(0, MAX_POR_RUN)

  let ok = 0
  const erros = []
  for (const c of pendentes) {           // SÉRIE (cache do prompt)
    try {
      await diagnosticarConcorrente(supabase, c)
      ok++
    } catch (e) {
      erros.push({ concorrente: c.nome, erro: e.message })
      console.error(`[concorrente-cron] ${c.nome}: ${e.message}`)
    }
  }

  console.log(`[concorrente-cron] gerados ${ok}/${pendentes.length} (fila total ${(concorrentes || []).length})`)
  return { statusCode: 200, body: JSON.stringify({ gerados: ok, tentados: pendentes.length, erros }) }
}
