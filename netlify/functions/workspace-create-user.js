// ════════════════════════════════════════════════════════════════════
// workspace-create-user.js — o dono do tenant cria acesso para o time dele.
//
// Até aqui só o operador da plataforma criava usuário: a Hering não conseguia
// dar acesso ao próprio time sem pedir para nós. Isso não escala para 30 marcas
// e nos coloca no meio de toda contratação de estagiário do cliente.
//
// ⚠️ O QUE ESTA FUNCTION NÃO FAZ, DE PROPÓSITO
// O `admin-create-user` (nosso) redefine a senha quando o e-mail já existe —
// aceitável para o operador da plataforma, que já tem service key. Dar o mesmo
// comportamento ao dono de um tenant seria entregar tomada de conta de brinde:
// ele digitaria o e-mail de qualquer pessoa do brandcode e receberia na tela
// uma senha válida para ela.
//
// Aqui, e-mail que já existe NUNCA tem a senha tocada. A pessoa é apenas
// vinculada ao workspace e entra com a senha que já usa. É menos conveniente e
// é a única versão defensável.
//
// Operador da plataforma também não é vinculável por esta porta: quem opera
// entra por suporte, não por convite de cliente.
// ════════════════════════════════════════════════════════════════════
import { clienteServico, exigirOwner, normalizarPapel, erro, ok, cabecalhos } from './_papeis.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cabecalhos }
  if (event.httpMethod !== 'POST') return erro(405, 'Método não suportado')

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return erro(400, 'Corpo inválido') }

  const { workspace_id, nome, email, password } = body
  const supabase = clienteServico()

  const ctx = await exigirOwner(supabase, event, workspace_id)
  if (ctx.erro) return ctx.erro

  if (!email?.trim()) return erro(400, 'E-mail obrigatório')
  const emailNorm = String(email).trim().toLowerCase()

  const papel = normalizarPapel(body)
  if (papel.erro) return erro(400, papel.erro)

  // Procura antes de criar: o caminho "já existe" precisa ser deliberado, não
  // o catch de um erro de criação (é assim que se toca senha por engano).
  const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const existente = (lista?.users || []).find(u => u.email?.toLowerCase() === emailNorm)

  let userId

  if (existente) {
    // ── Conta que já existe NÃO entra por aqui ─────────────────────────
    // A primeira versão vinculava a pessoa em silêncio e devolvia `ja_existia`
    // + o `user_id` dela. Dois problemas:
    //
    //  · o dono de qualquer tenant (ou seja, todo cliente) ganhava um oráculo:
    //    digita um e-mail, descobre se aquela pessoa usa o brandcode — inclusive
    //    o e-mail de um concorrente;
    //  · e a pessoa passava a constar como membro de um workspace que nunca
    //    pediu para entrar, com nome e e-mail visíveis para aquele time.
    //
    // O segundo é o dano concreto, e ele some recusando. O primeiro (o bit "esse
    // e-mail existe") só fecha de vez quando o caminho for CONVITE, que a pessoa
    // aceita — é o B4 do backlog, e a resposta passa a ser uniforme de verdade.
    // Até lá a mensagem é a mesma de qualquer falha de vínculo e não afirma nada
    // sobre a conta.
    return erro(409, 'Não foi possível criar este acesso com esse e-mail. Fale com o suporte do brandcode para vincular a pessoa a este workspace.')
  }

  if (!password || password.length < 8) return erro(400, 'A senha deve ter pelo menos 8 caracteres')

  const { data: criado, error: criarErr } = await supabase.auth.admin.createUser({
    email: emailNorm,
    password,
    email_confirm: true,
    // must_change_password: a senha temporária existe só para a primeira
    // entrada. Quem definiu não é quem vai usar.
    user_metadata: { full_name: nome || null, workspace_id, must_change_password: true },
  })
  if (criarErr) return erro(400, criarErr.message)
  userId = criado.user.id

  const { error: insErr } = await supabase.from('workspace_members')
    .insert({ workspace_id, user_id: userId, ...papel })
  if (insErr) return erro(400, insErr.message)

  // A resposta não carrega `user_id` nem nenhum sinal sobre contas alheias:
  // só o e-mail que o próprio chamador digitou.
  return ok({ email: emailNorm })
}
