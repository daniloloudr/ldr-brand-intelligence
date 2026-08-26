// ════════════════════════════════════════════════════════════════════
// workspace-member.js — o dono muda o papel de alguém, ou tira a pessoa.
//
// Antes isto era `supabase.from('workspace_members').update(...)` direto do
// browser, protegido por uma policy `for all` que na prática não protegia nada:
// qualquer membro podia se promover, rebaixar o dono ou remover um colega.
//
// Duas armadilhas que este arquivo precisa fechar, e que a policy sozinha não
// fecharia porque aqui a service key passa POR CIMA da RLS:
//
//  1. O `id` do membro vem do cliente. Filtrar só por `id` deixaria o dono do
//     workspace A editar membro do workspace B — o id é um UUID que ele pode
//     ter visto em qualquer lugar. Todo filtro leva `workspace_id` junto.
//  2. Quem chama precisa ser dono DESTE workspace, checado aqui e não só na
//     RLS, senão a service key torna a policy irrelevante.
//
// O último dono é protegido por trigger no banco (migration 052). Aqui a
// exceção vira 409 com texto legível — quem clicou precisa saber o que fazer,
// não ver "check_violation".
// ════════════════════════════════════════════════════════════════════
import { clienteServico, exigirOwner, normalizarPapel, erro, ok, cabecalhos } from './_papeis.js'

const ULTIMO_DONO = /pelo menos um dono/i

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cabecalhos }
  if (!['PATCH', 'DELETE', 'POST'].includes(event.httpMethod)) return erro(405, 'Método não suportado')

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return erro(400, 'Corpo inválido') }

  const { workspace_id, member_id, acao } = body
  if (!member_id) return erro(400, 'member_id obrigatório')

  const supabase = clienteServico()
  const ctx = await exigirOwner(supabase, event, workspace_id)
  if (ctx.erro) return ctx.erro

  // O alvo tem que ser deste workspace. Sem este eq, o id sozinho atravessa
  // tenants — a service key não pergunta de quem é a linha.
  const { data: alvo } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, workspace_id')
    .eq('id', member_id).eq('workspace_id', workspace_id)
    .maybeSingle()

  if (!alvo) return erro(404, 'Membro não encontrado neste workspace')

  const remover = event.httpMethod === 'DELETE' || acao === 'remover'

  if (remover) {
    const { error } = await supabase.from('workspace_members')
      .delete().eq('id', member_id).eq('workspace_id', workspace_id)
    if (error) {
      if (ULTIMO_DONO.test(error.message)) return erro(409, error.message)
      return erro(400, error.message)
    }
    return ok({ removido: true })
  }

  const papel = normalizarPapel(body)
  if (papel.erro) return erro(400, papel.erro)

  const { data: atualizado, error } = await supabase
    .from('workspace_members')
    .update(papel)
    .eq('id', member_id).eq('workspace_id', workspace_id)
    .select('id, role, pode_aprovar_pecas, pode_aprovar_aprendizado')
    .maybeSingle()

  if (error) {
    if (ULTIMO_DONO.test(error.message)) return erro(409, error.message)
    return erro(400, error.message)
  }
  return ok({ membro: atualizado })
}
