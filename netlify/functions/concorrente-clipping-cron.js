// concorrente-clipping-cron.js — Scheduled (netlify.toml). Clipping semanal dos
// concorrentes de TODOS os workspaces (em série, deduplicando por url).
// Depois da coleta, gera a SÍNTESE DO CICLO por workspace (fase 1 · Inteligência
// de Mercado): o time abre segunda-feira com o briefing pronto.
// Lição aprendida: NUNCA fire-and-forget em Lambda; tudo await até o fim.
import { createClient } from '@supabase/supabase-js'
import { coletarClippingWorkspace } from './_clipping.js'
import { gerarSinteseMercado } from './_market.js'

export const handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const res = await coletarClippingWorkspace(supabase, { max: 8 })
  console.log(`[clipping-cron] ${res.inseridos} itens de ${res.concorrentes} concorrentes`)

  // Síntese por workspace com concorrentes ativos (em série; falha não derruba o cron)
  const { data: concs } = await supabase.from('concorrentes').select('workspace_id').eq('ativo', true)
  const wss = [...new Set((concs || []).map(c => c.workspace_id))]
  for (const ws of wss) {
    const r = await gerarSinteseMercado(supabase, { workspace_id: ws }).catch(e => ({ status: `erro: ${e.message}` }))
    console.log(`[clipping-cron] síntese ws ${ws}: ${r.status}`)
  }
  return { statusCode: 200, body: JSON.stringify({ ...res, sinteses: wss.length }) }
}
