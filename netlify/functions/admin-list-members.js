import { createClient } from '@supabase/supabase-js'

async function isPlatformAdmin(supabase, token) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data ? user : null
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  const adminUser = await isPlatformAdmin(supabase, token)
  if (!adminUser) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }

  const workspaceId = event.queryStringParameters?.workspace_id
  if (!workspaceId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

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
  }))

  return { statusCode: 200, headers, body: JSON.stringify({ members: result }) }
}
