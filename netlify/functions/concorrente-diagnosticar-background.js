// concorrente-diagnosticar-background.js — dispara a FILA de diagnósticos de
// concorrente de um workspace (on-demand, quando o usuário adiciona um concorrente
// ou pede refresh). Gera todos os pendentes em SÉRIE (aproveita o prompt cache).
// Background function (teto de 15 min); grava em diagnosticos_concorrentes.
import { createClient } from '@supabase/supabase-js'
import { concorrentesPendentes, diagnosticarEmSerie } from './_diagnostico.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { workspace_id } = body
  if (!workspace_id) return { statusCode: 400 }

  // Acesso: membro do workspace OU platform admin
  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403 }

  const pendentes = await concorrentesPendentes(supabase, { workspace_id })
  const res = await diagnosticarEmSerie(supabase, pendentes)
  console.log(`[concorrente-diag] ws ${workspace_id}: ${res.ok}/${res.tentados} gerados, ${res.restantes} restantes`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
