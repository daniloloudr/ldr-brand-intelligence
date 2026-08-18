// listening-cron.js — Scheduled (netlify.toml, segunda 05:00 UTC = 02:00 BRT).
//
// A escuta social só rodava no clique, enquanto a tela prometia monitoramento
// automático. Este é o cron que faltava.
//
// Semanal por construção, não por gosto: a coleta usa `dateRestrict=d7` no
// índice do Google, então cada rodada varre exatamente o intervalo desde a
// anterior — sem buraco entre semanas e sem revarrer o que já foi lido.
//
// Despachante puro, como os outros crons (fan-out da meta 30 marcas): um worker
// em background por workspace. Loop serial numa função só estoura o teto de 15
// min bem antes de 30 marcas, e o teto do scheduled síncrono muito antes disso.
import { createClient } from '@supabase/supabase-js'
import { withHeartbeat } from './_watchdog.js'
import { siteBase } from './_studio.js'
import { provedorDeBusca } from './_busca.js'

const run = async () => {
  // Não há mais porta de configuração para travar: a busca padrão usa a mesma
  // chave da Anthropic que todo o resto já exige. O provedor entra no log para
  // que uma troca futura apareça no histórico do cron.
  console.log(`[listening-cron] provedor de busca: ${provedorDeBusca()}`)

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // Precisa de nome para buscar — é por ele que se procura. Workspace sem nome
  // não tem o que perguntar ao índice.
  const { data: wss } = await supabase
    .from('workspaces').select('id, nome')
    .not('nome', 'is', null)
    .eq('plano_status', 'active')

  const results = await Promise.allSettled((wss || []).map(ws =>
    fetch(`${siteBase()}/.netlify/functions/listening-coletar-background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Porta interna do worker: a chave de serviço só existe no servidor.
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ workspace_id: ws.id }),
    })
  ))

  const falhas = results.filter(r => r.status === 'rejected').length
  if (falhas) console.error(`[listening-cron] ${falhas} disparo(s) falharam`)
  console.log(`[listening-cron] fan-out: ${wss?.length || 0} workspace(s) despachado(s)`)
  return { statusCode: 200, body: JSON.stringify({ despachados: wss?.length || 0, falhas }) }
}

export const handler = withHeartbeat('listening-cron', run)
