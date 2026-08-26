import { createClient } from '@supabase/supabase-js'
import { exigirSegundoFator } from './_mfa.js'

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
  // Segundo fator. A identidade já foi VALIDADA acima (getUser confere a
  // assinatura do token); só depois disso faz sentido ler a claim `aal` dele.
  const semFator = exigirSegundoFator(token, headers)
  if (semFator) return semFator

  const { nome, email, password, workspace_id, role } = JSON.parse(event.body || '{}')
  if (!email || !password || !workspace_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'email, senha e workspace_id obrigatórios' }) }
  }
  if (password.length < 8) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A senha deve ter pelo menos 8 caracteres' }) }
  }

  const emailNorm = String(email).trim().toLowerCase()

  // Cria o usuário já confirmado (sem email de verificação) com senha definida pelo admin.
  let userId
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: emailNorm,
    password,
    email_confirm: true,
    user_metadata: { full_name: nome || null, workspace_id, workspace_name: null, must_change_password: true },
  })

  if (createErr) {
    // Se já existe, localiza o usuário e apenas atualiza a senha + vincula ao workspace.
    const already = /already|exist|registered/i.test(createErr.message || '')
    if (!already) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: createErr.message }) }
    }
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 })
    const existing = (list?.users || []).find(u => u.email?.toLowerCase() === emailNorm)
    if (!existing) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-mail já em uso mas usuário não encontrado' }) }
    }
    userId = existing.id
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata || {}), full_name: nome || existing.user_metadata?.full_name || null, must_change_password: true },
    })
  } else {
    userId = created.user.id
  }

  // Vincula ao workspace (idempotente).
  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspace_id)
    .maybeSingle()

  if (!existingMember) {
    // `admin` virou `owner` na migration 052 (colidia com platform_admins, e o
    // CHECK recusa o valor antigo). Dono recebe as duas capacidades: era o que
    // "admin" significava na prática antes de elas existirem.
    const dono = role === 'admin' || role === 'owner'
    const { error: memberErr } = await supabase.from('workspace_members').insert({
      workspace_id,
      user_id: userId,
      role: dono ? 'owner' : 'member',
      pode_aprovar_pecas: dono,
      pode_aprovar_aprendizado: dono,
    })
    if (memberErr) return { statusCode: 400, headers, body: JSON.stringify({ error: memberErr.message }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, user_id: userId, email: emailNorm }) }
}
