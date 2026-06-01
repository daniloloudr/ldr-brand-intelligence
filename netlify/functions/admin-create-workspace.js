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

  const { nome, dominio, setor, porte } = JSON.parse(event.body || '{}')
  if (!nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome obrigatório' }) }

  const { data: ws, error: wsError } = await supabase
    .from('workspaces')
    .insert({ nome, dominio, setor, porte, plano: 'trial', plano_status: 'active' })
    .select()
    .single()

  if (wsError) return { statusCode: 400, headers, body: JSON.stringify({ error: wsError.message }) }

  // Adiciona o admin como membro do workspace criado
  await supabase.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: adminUser.id,
    role: 'admin',
  })

  return { statusCode: 200, headers, body: JSON.stringify({ workspace: ws }) }
}
