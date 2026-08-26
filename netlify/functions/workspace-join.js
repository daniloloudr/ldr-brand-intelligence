// ════════════════════════════════════════════════════════════════════
// workspace-join.js — o convidado entra no workspace que o convidou.
//
// O DEFEITO QUE ISTO FECHA (24/08/2026)
// A tela de convite fazia `workspace_members.insert({ workspace_id, user_id })`
// direto do browser, e a policy que permitia era:
//
//     for insert to authenticated with check (user_id = auth.uid())
//
// Repare no que NÃO está ali: workspace_id. Qualquer pessoa com uma conta no
// brandcode e o UUID de um workspace virava membro daquele cliente — e, pela
// policy de leitura, passava a enxergar os dados dele. Bypass de tenant
// completo, em duas linhas de SQL.
//
// O segundo furo era a origem do dado: o convite gravava o workspace_id em
// `user_metadata`, que o próprio usuário reescreve com
// `supabase.auth.updateUser({ data: { workspace_id: <outro> } })`. Ou seja,
// mesmo com a policy corrigida, a intenção do convite não era confiável.
//
// Por isso o convite agora viaja em `app_metadata`, que SÓ a service key
// escreve (ver admin-invite.js), e a entrada acontece aqui, no servidor.
// O campo é consumido: convite serve uma vez.
// ════════════════════════════════════════════════════════════════════
import { clienteServico, erro, ok, cabecalhos, PRESETS } from './_papeis.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cabecalhos }
  if (event.httpMethod !== 'POST') return erro(405, 'Método não suportado')

  const supabase = clienteServico()

  const token = event.headers?.authorization?.replace(/^Bearer /, '')
  if (!token) return erro(401, 'Não autenticado')

  const { data: { user } = {}, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return erro(401, 'Não autenticado')

  // A ÚNICA fonte aceita. Nada de ler workspace_id do corpo da requisição nem
  // de user_metadata: os dois são escritos por quem está pedindo para entrar.
  const workspaceId = user.app_metadata?.convite_workspace_id
  if (!workspaceId) return erro(403, 'Nenhum convite pendente para esta conta.')

  const { data: ws } = await supabase
    .from('workspaces').select('id, nome').eq('id', workspaceId).maybeSingle()
  if (!ws) return erro(404, 'O workspace do convite não existe mais.')

  const { data: membro } = await supabase.from('workspace_members')
    .select('id').eq('user_id', user.id).eq('workspace_id', workspaceId).maybeSingle()

  if (!membro) {
    // Convidado entra como Criador: cria e sugere, não aprova. Quem convidou
    // promove depois, na Gestão de time — subir privilégio é decisão de gente,
    // não default de fluxo automático.
    const { error: insErr } = await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: PRESETS.criador.role,
      pode_aprovar_pecas: PRESETS.criador.pode_aprovar_pecas,
      pode_aprovar_aprendizado: PRESETS.criador.pode_aprovar_aprendizado,
    })
    if (insErr) return erro(400, insErr.message)
  }

  // Consome o convite. Sem isto ele fica válido para sempre — e um convite que
  // não expira é uma porta que ninguém lembra que deixou aberta.
  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata || {}), convite_workspace_id: null },
  })

  return ok({ workspace_id: workspaceId, workspace_nome: ws.nome })
}
