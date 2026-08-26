// market-sintese-background.js — gera a síntese do ciclo de mercado on-demand
// (botão na Inteligência de Mercado). Mesmo esqueleto das outras backgrounds.
import { createClient } from '@supabase/supabase-js'
import { gerarSinteseMercado } from './_market.js'
import { autorizarBackground } from './_interno.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  // Porteiro: usuário autenticado (browser) OU segredo interno (cron/servidor).
  // Sem isto este endpoint é trabalho pago à disposição de quem souber o caminho.
  const porteiro = await autorizarBackground(event)
  if (porteiro.erro) return porteiro.erro

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { workspace_id, janela_dias } = body
  if (!workspace_id) return { statusCode: 400 }

  // Quem chamou já foi identificado pelo porteiro. Falta a AUTORIZAÇÃO: estar
  // autenticado não dá acesso ao workspace dos outros. A chamada interna (o
  // onboard-cron, na etapa de sínteses) não tem usuário e não precisa — ela já
  // é o servidor.
  //
  // Até 26/08 sobrava aqui um segundo `if (!token) return 401`, resto de antes
  // do porteiro. Ele derrubava em silêncio exatamente o caminho automático: o
  // cron despacha com `internalHeaders()`, sem Authorization, e levava 401 sem
  // gravar linha nem erro. A etapa `sinteses` estourava o teto e virava
  // `expired`. É o mesmo defeito que matou o diagnóstico da Zétona em 25/08 —
  // consertado lá, e que tinha ficado de pé um passo adiante.
  if (!porteiro.interno) {
    const [{ data: member }, { data: platformAdmin }] = await Promise.all([
      supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', porteiro.user.id).maybeSingle(),
      supabase.from('platform_admins').select('id').eq('user_id', porteiro.user.id).maybeSingle(),
    ])
    if (!member && !platformAdmin) return { statusCode: 403 }
  }

  const res = await gerarSinteseMercado(supabase, { workspace_id, janela_dias: janela_dias || 7 })
  console.log(`[market-sintese] ws ${workspace_id}: ${res.status}`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
