import { createClient } from '@supabase/supabase-js'
import { derivarCapacidades } from './_papeis.js'

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

  // Tolera banco pré-052: entre o deploy do código e a migration existe uma
  // janela, e `select` de coluna inexistente derruba a query INTEIRA (a lista de
  // membros some para todo mundo). Ver `derivarCapacidades` em _papeis.js.
  const listar = (campos) => supabase
    .from('workspace_members').select(campos)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  let { data: members, error: listErr } = await listar(
    'id, user_id, role, pode_aprovar_pecas, pode_aprovar_aprendizado, created_at')
  if (listErr) ({ data: members } = await listar('id, user_id, role, created_at'))
  members = (members || []).map(derivarCapacidades)

  if (!members?.length) return { statusCode: 200, headers, body: JSON.stringify({ members: [] }) }

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

  // ── O time do cliente não inclui quem opera a plataforma ─────────────
  // Todo workspace ganha o admin da plataforma como membro para que o suporte
  // funcione. Só que ele aparecia na "Gestão de time" do cliente, com e-mail e
  // tudo: a Pixel via "danilo@loudr.com.br · Administrador" na lista dela.
  //
  // Filtrar na tela não resolveria — o e-mail já teria saído do servidor e
  // estaria no payload, visível em qualquer devtools. O corte é aqui.
  //
  // Quem opera a plataforma continua vendo (marcado como operador), porque
  // esconder dele o próprio acesso atrapalha o suporte e quebra o workspace da
  // própria LOUDR, onde os admins SÃO o time.
  const { data: adminsPlataforma } = await supabase.from('platform_admins').select('user_id')
  const ehOperador = new Set((adminsPlataforma || []).map(a => a.user_id))
  const vendoComoOperador = !!platformAdmin

  const result = members
    .filter(m => vendoComoOperador || !ehOperador.has(m.user_id))
    .map(m => ({
      id:         m.id,
      user_id:    m.user_id,
      role:       m.role,
      pode_aprovar_pecas:       !!m.pode_aprovar_pecas,
      pode_aprovar_aprendizado: !!m.pode_aprovar_aprendizado,
      created_at: m.created_at,
      email:      userMap[m.user_id]?.email || null,
      nome:       userMap[m.user_id]?.user_metadata?.full_name || null,
      is_self:    m.user_id === user.id,
      // Marca o operador para a tela não contá-lo como membro do cliente.
      // Só existe na resposta de quem já é operador — para o cliente essas
      // linhas nem chegam.
      plataforma: ehOperador.has(m.user_id) || undefined,
    }))

  return { statusCode: 200, headers, body: JSON.stringify({ members: result }) }
}
