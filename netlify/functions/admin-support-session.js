// ════════════════════════════════════════════════════════════════════
// admin-support-session.js — abre, lista e encerra a sessão de suporte do
// operador num workspace de cliente. É o par da migration 053.
//
// POR QUE ISTO É SERVIDOR, E NÃO UM INSERT DO BROWSER
// A sessão é o que transforma "acesso permanente a tudo" em "acesso declarado,
// por tenant, por tempo". Se o browser pudesse inseri-la, um token roubado
// abriria a própria sessão antes de ler — e a proteção viraria formalidade que
// o atacante preenche sozinho, no mesmo request. Abrir sessão passa por aqui:
// service key, identidade conferida e SEGUNDO FATOR exigido, igual aos demais
// endpoints de operador.
//
// A TRILHA NASCE DAQUI (S4). Cada linha responde quem entrou, em qual tenant,
// quando, por quanto tempo e por quê — que é a pergunta de due diligence da
// Worten (GDPR), não higiene só nossa. Por isso `motivo` é obrigatório no banco
// e conferido aqui: sessão sem motivo é o acesso de antes com carimbo de hora.
//
// TETO DE DURAÇÃO
// Uma hora por padrão, oito no máximo. O teto existe porque sessão longa é
// indistinguível de acesso permanente — e porque o operador esquece a aba
// aberta, que é o modo normal de isso acontecer.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { exigirSegundoFator } from './_mfa.js'

const cabecalhos = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const erro = (statusCode, mensagem) => ({ statusCode, headers: cabecalhos, body: JSON.stringify({ error: mensagem }) })
const ok   = (corpo) => ({ statusCode: 200, headers: cabecalhos, body: JSON.stringify(corpo) })

const MINUTOS_PADRAO = 60
const MINUTOS_TETO   = 8 * 60

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cabecalhos }
  if (!['GET', 'POST', 'DELETE'].includes(event.httpMethod)) return erro(405, 'Método não suportado')

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers?.authorization?.replace(/^Bearer /, '')
  if (!token) return erro(401, 'Não autenticado')

  const { data: { user: quemChama } = {}, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !quemChama) return erro(401, 'Não autenticado')

  const { data: operador } = await supabase
    .from('platform_admins').select('id').eq('user_id', quemChama.id).maybeSingle()
  if (!operador) return erro(403, 'Acesso negado')

  // Segundo fator. A identidade já foi VALIDADA acima (getUser confere a
  // assinatura do token); só depois disso faz sentido ler a claim `aal`.
  const semFator = exigirSegundoFator(token, cabecalhos)
  if (semFator) return semFator

  // ── Consultar a sessão viva deste operador num workspace ──────────
  if (event.httpMethod === 'GET') {
    const workspace_id = event.queryStringParameters?.workspace_id
    if (!workspace_id) return erro(400, 'workspace_id obrigatório')

    const { data } = await supabase
      .from('platform_admin_sessions')
      .select('id, workspace_id, motivo, criada_em, expira_em')
      .eq('admin_user_id', quemChama.id)
      .eq('workspace_id', workspace_id)
      .is('encerrada_em', null)
      .gt('expira_em', new Date().toISOString())
      .order('expira_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    return ok({ sessao: data || null })
  }

  // ── Encerrar ─────────────────────────────────────────────────────
  // Fechar a aba não encerra: quem encerra é sair da impersonação, e o
  // `expira_em` cobre o esquecimento. Encerrar cedo é higiene, não garantia.
  if (event.httpMethod === 'DELETE') {
    let body
    try { body = JSON.parse(event.body || '{}') } catch { return erro(400, 'Corpo inválido') }
    const { workspace_id } = body
    if (!workspace_id) return erro(400, 'workspace_id obrigatório')

    const { error: updErr } = await supabase
      .from('platform_admin_sessions')
      .update({ encerrada_em: new Date().toISOString() })
      .eq('admin_user_id', quemChama.id)
      .eq('workspace_id', workspace_id)
      .is('encerrada_em', null)
    if (updErr) return erro(400, updErr.message)

    return ok({ encerrada: true })
  }

  // ── Abrir ────────────────────────────────────────────────────────
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return erro(400, 'Corpo inválido') }

  const { workspace_id, motivo, minutos, origem } = body
  if (!workspace_id) return erro(400, 'workspace_id obrigatório')

  const motivoLimpo = String(motivo || '').trim()
  if (motivoLimpo.length < 3) return erro(400, 'Diga o motivo do acesso (mínimo 3 caracteres)')

  // O workspace tem que existir: sem isto, um UUID digitado errado abriria uma
  // sessão para lugar nenhum e a trilha registraria um acesso que não houve.
  const { data: ws } = await supabase
    .from('workspaces').select('id, nome').eq('id', workspace_id).maybeSingle()
  if (!ws) return erro(404, 'Workspace não encontrado')

  const pedidos = Number(minutos) || MINUTOS_PADRAO
  const duracao = Math.max(5, Math.min(pedidos, MINUTOS_TETO))
  const expira  = new Date(Date.now() + duracao * 60_000).toISOString()

  // Uma sessão viva por operador/workspace. Reabrir com a aba já aberta
  // renovaria o prazo em silêncio — então a anterior é encerrada e a nova
  // entra com motivo próprio. A trilha fica com as duas linhas, que é o
  // comportamento certo: foram dois acessos declarados.
  await supabase
    .from('platform_admin_sessions')
    .update({ encerrada_em: new Date().toISOString() })
    .eq('admin_user_id', quemChama.id)
    .eq('workspace_id', workspace_id)
    .is('encerrada_em', null)

  const { data: sessao, error: insErr } = await supabase
    .from('platform_admin_sessions')
    .insert({
      admin_user_id: quemChama.id,
      workspace_id,
      motivo: motivoLimpo,
      expira_em: expira,
      origem: origem || 'admin',
    })
    .select('id, workspace_id, motivo, criada_em, expira_em')
    .single()

  // Falha ao abrir NÃO pode ser silenciosa: sem a linha, a impersonação
  // seguinte abre vazia e o operador conclui que o cliente perdeu os dados.
  // Foi exatamente assim que a Zétona nasceu sem dono (25/08).
  if (insErr) return erro(400, insErr.message)

  return ok({ sessao, workspace_nome: ws.nome })
}
