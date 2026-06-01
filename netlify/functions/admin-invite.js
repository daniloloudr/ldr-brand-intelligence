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
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  const adminUser = await isPlatformAdmin(supabase, token)
  if (!adminUser) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }

  const { email, workspace_id, workspace_name } = JSON.parse(event.body || '{}')
  if (!email || !workspace_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'email e workspace_id obrigatórios' }) }
  }

  const appUrl = process.env.VITE_APP_URL || 'https://loudr.netlify.app'

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { workspace_id, workspace_name },
    redirectTo: appUrl,
  })

  if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: data.user }) }
}
