// trends-coletar-background.js — coleta on-demand do radar de tendências
// do workspace (botão "Buscar tendências"). Background function; grava em
// tendencias. Mesmo esqueleto do concorrente-clipping-background.
import { createClient } from '@supabase/supabase-js'
import { coletarTendenciasWorkspace } from './_trends.js'

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

  const res = await coletarTendenciasWorkspace(supabase, { workspace_id })
  console.log(`[trends] ws ${workspace_id}: ${res.status}, ${res.inseridos} tendências`)
  return { statusCode: 200, body: JSON.stringify(res) }
}
