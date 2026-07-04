// concorrente-diagnosticar-cron.js — Scheduled (netlify.toml). Refresca diagnósticos
// de concorrentes de TODOS os workspaces: pega os pendentes (sem diagnóstico recente)
// e gera em SÉRIE (aproveita o prompt cache), limitado por run pra não estourar o
// teto de 15 min. O que sobrar entra no próximo ciclo.
import { createClient } from '@supabase/supabase-js'
import { concorrentesPendentes, diagnosticarEmSerie } from './_diagnostico.js'

export const handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const pendentes = await concorrentesPendentes(supabase)   // todos os workspaces
  const res = await diagnosticarEmSerie(supabase, pendentes, { max: 4 })

  console.log(`[concorrente-cron] ${res.ok}/${res.tentados} gerados, ${res.restantes} restantes na fila`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
