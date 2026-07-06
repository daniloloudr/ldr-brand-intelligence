// concorrente-clipping-background.js — coleta on-demand do clipping dos concorrentes
// de um workspace (botão "Buscar clipping"). Background function; grava em
// concorrente_clipping. Em série (aproveita o prompt cache do web-search).
import { createClient } from '@supabase/supabase-js'
import { coletarClippingWorkspace } from './_clipping.js'

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

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403 }

  const res = await coletarClippingWorkspace(supabase, { workspace_id })
  console.log(`[clipping] ws ${workspace_id}: ${res.inseridos} itens de ${res.concorrentes} concorrentes`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
