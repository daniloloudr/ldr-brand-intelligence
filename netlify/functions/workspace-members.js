import { createClient } from '@supabase/supabase-js'

// Lista membros de um workspace incluindo nome/email (que vêm de auth.users
// e não são acessíveis via RLS direto pro cliente). Requer que o usuário
// autenticado seja membro do workspace (ou platform_admin).
export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autenticado' }) }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autenticado' }) }

  const workspaceId = event.queryStringParameters?.workspace_id
  if (!workspaceId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  const { data: members } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (!members?.length) return { statusCode: 200, headers, body: JSON.stringify({ members: [] }) }

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

  const result = members.map(m => ({
    id:         m.id,
    user_id:    m.user_id,
    role:       m.role,
    created_at: m.created_at,
    email:      userMap[m.user_id]?.email || null,
    nome:       userMap[m.user_id]?.user_metadata?.full_name || null,
    is_self:    m.user_id === user.id,
  }))

  return { statusCode: 200, headers, body: JSON.stringify({ members: result }) }
}
