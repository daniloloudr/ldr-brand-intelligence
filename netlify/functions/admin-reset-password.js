// ════════════════════════════════════════════════════════════════════
// admin-reset-password.js — o operador da plataforma redefine a senha de um
// usuário, sem precisar da senha antiga.
//
// POR QUE ISTO EXISTE COMO ENDPOINT PRÓPRIO
// A capacidade já estava no produto, mas escondida: o `admin-create-user`
// redefine a senha quando o e-mail informado já existe. Ou seja, "criar acesso"
// com um e-mail digitado errado — um caractere a mais num endereço real — troca
// a senha de uma pessoa de verdade, sem intenção e sem aviso. Ação que muda
// credencial não pode ser efeito colateral de outra ação: ela precisa de um
// botão com nome, que diz o que vai fazer antes de fazer.
//
// LIMITES DELIBERADOS
//  · Só `platform_admins`. Dono de tenant NÃO chega aqui — ver
//    workspace-create-user.js, que recusa e-mail já cadastrado justamente para
//    não virar tomada de conta.
//  · Não redefine a senha de OUTRO operador da plataforma. Com mais de um
//    operador, isso seria takeover lateral: um administra o outro sem que ele
//    saiba. Para esse caso o caminho é o console do Supabase, que deixa rastro
//    fora da aplicação. A própria conta é permitida (esquecer a senha acontece).
//  · A senha nasce transitória: `must_change_password` obriga a troca no
//    primeiro acesso, então o valor que aparece na tela do operador tem vida
//    curta por construção.
//
// PENDÊNCIA CONHECIDA: isto não deixa trilha. Redefinição de credencial é
// exatamente o que uma auditoria quer ver registrado — entra no S4 da release
// "Separação do super admin" (backlog), junto da sessão de suporte.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { exigirSegundoFator } from './_mfa.js'

const cabecalhos = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const erro = (statusCode, mensagem) => ({ statusCode, headers: cabecalhos, body: JSON.stringify({ error: mensagem }) })

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cabecalhos }
  if (event.httpMethod !== 'POST') return erro(405, 'Método não suportado')

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers?.authorization?.replace(/^Bearer /, '')
  if (!token) return erro(401, 'Não autenticado')

  const { data: { user: quemChama } = {}, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !quemChama) return erro(401, 'Não autenticado')

  const { data: operador } = await supabase
    .from('platform_admins').select('id').eq('user_id', quemChama.id).maybeSingle()
  if (!operador) return erro(403, 'Acesso negado')

  // Segundo fator. A identidade já foi VALIDADA acima (getUser confere a
  // assinatura do token); só depois disso faz sentido ler a claim `aal` dele.
  // Redefinir credencial alheia é a operação mais sensível do painel — se
  // alguma exige o degrau, é esta.
  const semFator = exigirSegundoFator(token, cabecalhos)
  if (semFator) return semFator

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return erro(400, 'Corpo inválido') }

  const { user_id, password } = body
  if (!user_id) return erro(400, 'user_id obrigatório')
  if (!password || password.length < 8) return erro(400, 'A senha deve ter pelo menos 8 caracteres')

  // Alvo que também opera a plataforma: só ele mesmo. Ver cabeçalho.
  if (user_id !== quemChama.id) {
    const { data: alvoOperador } = await supabase
      .from('platform_admins').select('id').eq('user_id', user_id).maybeSingle()
    if (alvoOperador) {
      return erro(403, 'Este usuário também opera a plataforma. Redefina a senha dele pelo console do Supabase.')
    }
  }

  const { data: alvo, error: buscaErr } = await supabase.auth.admin.getUserById(user_id)
  if (buscaErr || !alvo?.user) return erro(404, 'Usuário não encontrado')

  const { error: updErr } = await supabase.auth.admin.updateUserById(user_id, {
    password,
    // A senha entregue pelo operador é de passagem: quem vai usar a conta
    // escolhe a dela na primeira entrada (tela ForcePassword).
    user_metadata: { ...(alvo.user.user_metadata || {}), must_change_password: true },
  })
  if (updErr) return erro(400, updErr.message)

  return {
    statusCode: 200,
    headers: cabecalhos,
    body: JSON.stringify({ email: alvo.user.email }),
  }
}
