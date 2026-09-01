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

  const { email, workspace_id, workspace_name } = JSON.parse(event.body || '{}')
  if (!email || !workspace_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'email e workspace_id obrigatórios' }) }
  }

  // O domínio do produto depois do relançamento como BR4NDCODE. O fallback
  // antigo ('loudr.netlify.app') e o valor que estava na env ('app.loudr.com.br')
  // apontavam para endereços mortos — quem recebia convite clicava em nada.
  const appUrl = process.env.VITE_APP_URL || 'https://app.br4ndcode.com'

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { workspace_id, workspace_name },
    redirectTo: appUrl,
  })

  if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) }

  // ── A intenção do convite vai em app_metadata ────────────────────────
  // O `data:` acima grava em user_metadata, que o próprio convidado reescreve
  // com `supabase.auth.updateUser({ data: {...} })`. Enquanto a entrada no
  // workspace saía do browser lendo esse campo, o convite podia ser reapontado
  // para qualquer tenant. `app_metadata` só a service key escreve — é a única
  // parte do usuário em que o servidor pode confiar. Quem lê é workspace-join.
  //
  // user_metadata continua sendo gravado porque a tela de boas-vindas mostra o
  // nome do workspace a partir dele; ele é enfeite, não autorização.
  if (data?.user?.id) {
    await supabase.auth.admin.updateUserById(data.user.id, {
      app_metadata: { convite_workspace_id: workspace_id },
    })
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: data.user }) }
}
