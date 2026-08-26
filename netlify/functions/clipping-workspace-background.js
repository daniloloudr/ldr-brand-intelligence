// clipping-workspace-background.js — WORKER por workspace (fan-out da meta 30
// marcas): coleta o clipping dos concorrentes E gera a síntese do ciclo, cada
// workspace com seu próprio orçamento de 15 min. Disparado pelo cron (sem JWT —
// mesmo padrão do brand-distill-background; hardening = backlog item 4).
import { createClient } from '@supabase/supabase-js'
import { coletarClippingWorkspace } from './_clipping.js'
import { gerarSinteseMercado } from './_market.js'
import { autorizarBackground } from './_interno.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  // Porteiro: usuário autenticado (browser) OU segredo interno (cron/servidor).
  // Sem isto este endpoint é trabalho pago à disposição de quem souber o caminho.
  const porteiro = await autorizarBackground(event)
  if (porteiro.erro) return porteiro.erro
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { workspace_id, jitter = false } = body
  if (!workspace_id) return { statusCode: 400 }

  // jitter espalha a carga na Anthropic quando o cron dispara N workspaces juntos
  if (jitter) await sleep(Math.floor(Math.random() * 45_000))

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const res = await coletarClippingWorkspace(supabase, { workspace_id })
  const sint = res.inseridos > 0
    ? await gerarSinteseMercado(supabase, { workspace_id }).catch(e => ({ status: `erro: ${e.message}` }))
    : { status: 'sem itens novos — síntese pulada' }
  console.log(`[clipping-worker] ws ${workspace_id}: ${res.inseridos} itens de ${res.concorrentes} concorrentes · síntese: ${sint.status}`)
  return { statusCode: 200, body: JSON.stringify({ ...res, sintese: sint.status }) }
}
