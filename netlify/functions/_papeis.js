// ════════════════════════════════════════════════════════════════════
// _papeis.js — quem é o chamador dentro de um workspace, e o que pode.
//
// A RLS (migration 052) é o perímetro real: mesmo que uma function esqueça de
// checar, o banco recusa. Este módulo existe para o outro lado do problema —
// dar ERRO CLARO em vez de "0 linhas afetadas". A tela de Gestão de time
// escrevia direto pelo client; quando a policy passou a recusar, o update
// silenciosamente não fazia nada e a UI dizia "salvo". Recusa que não fala é
// quase tão ruim quanto permissão que não existe.
//
// Por que as escritas de time saíram do browser: `workspace_members` guarda
// quem enxerga o quê. Toda mudança ali é decisão de acesso, e decisão de
// acesso merece um lugar só, auditável, com o motivo do "não" por escrito.
//
// O operador da plataforma (platform_admins) passa por cima do papel — ele é
// suporte, precisa consertar o workspace do cliente sem pedir promoção. Isso é
// deliberado e está registrado na resposta (`ehOperador`), nunca implícito.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

export const PAPEIS = ['owner', 'member']

// As capacidades são do DADO, não do papel: quem faz as duas coisas não deve
// obrigar a inventar um papel novo (decisão do Danilo, 24/08). Os presets são
// só a leitura humana disso na tela — e `tests/papeis.test.js` prova que esta
// tabela e a do front (src/lib/papeis.js) não divergem.
export const PRESETS = {
  dono:      { role: 'owner',  pode_aprovar_pecas: true,  pode_aprovar_aprendizado: true  },
  curador:   { role: 'member', pode_aprovar_pecas: true,  pode_aprovar_aprendizado: true  },
  aprovador: { role: 'member', pode_aprovar_pecas: true,  pode_aprovar_aprendizado: false },
  criador:   { role: 'member', pode_aprovar_pecas: false, pode_aprovar_aprendizado: false },
}

export const cabecalhos = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const erro = (statusCode, mensagem) => ({
  statusCode, headers: cabecalhos, body: JSON.stringify({ error: mensagem }),
})

export const ok = (payload) => ({
  statusCode: 200, headers: cabecalhos, body: JSON.stringify(payload),
})

export const clienteServico = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ── Os dois esquemas convivem ────────────────────────────────────────
// O deploy tem duas metades que não caem juntas: o Netlify sobe o código e a
// migration 052 roda à parte. Entre uma e outra existe uma janela em que o
// código NOVO fala com o banco VELHO — e `select('pode_aprovar_pecas')` numa
// coluna que ainda não existe não degrada: o PostgREST recusa a query inteira,
// o workspace não carrega e TODO tenant vê tela de erro.
//
// Depender da ordem do deploy é depender de alguém acertar a ordem às 22h. Em
// vez disso o código tolera os dois esquemas: tenta com as capacidades e, se o
// banco ainda não as tem, deriva do papel — exatamente como o backfill da 052
// faz (dono tem as duas, membro não tem nenhuma). Quando a migration passa, o
// caminho de baixo simplesmente para de ser usado.
export const CAMPOS_MEMBRO = 'id, role, pode_aprovar_pecas, pode_aprovar_aprendizado'

export function derivarCapacidades(membro) {
  if (!membro) return null
  const dono = membro.role === 'owner' || membro.role === 'admin'   // 'admin' = pré-052
  return {
    ...membro,
    role: dono ? 'owner' : 'member',
    pode_aprovar_pecas:       membro.pode_aprovar_pecas       ?? dono,
    pode_aprovar_aprendizado: membro.pode_aprovar_aprendizado ?? dono,
  }
}

/** Lê a participação tolerando banco pré-052. */
export async function lerMembro(supabase, workspaceId, userId) {
  const consulta = (campos) => supabase.from('workspace_members')
    .select(campos).eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle()

  const { data, error } = await consulta(CAMPOS_MEMBRO)
  if (!error) return derivarCapacidades(data)

  const { data: velho } = await consulta('id, role')
  return derivarCapacidades(velho)
}

/**
 * Identifica o chamador dentro de um workspace.
 * → `{ erro }` com a resposta HTTP pronta, ou
 * → `{ user, membro, ehOwner, ehOperador }`.
 */
export async function contexto(supabase, event, workspaceId) {
  const token = event.headers?.authorization?.replace(/^Bearer /, '')
  if (!token) return { erro: erro(401, 'Não autenticado') }

  const { data: { user } = {}, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { erro: erro(401, 'Não autenticado') }
  if (!workspaceId) return { erro: erro(400, 'workspace_id obrigatório') }

  const [membro, { data: operador }] = await Promise.all([
    lerMembro(supabase, workspaceId, user.id),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])

  if (!membro && !operador) return { erro: erro(403, 'Sem acesso a este workspace') }

  return {
    user,
    membro: membro || null,
    ehOperador: !!operador,
    ehOwner: membro?.role === 'owner' || !!operador,
  }
}

/** Igual ao contexto, mas recusa quem não é dono do workspace. */
export async function exigirOwner(supabase, event, workspaceId) {
  const ctx = await contexto(supabase, event, workspaceId)
  if (ctx.erro) return ctx
  if (!ctx.ehOwner) {
    return { erro: erro(403, 'Só o dono do workspace pode gerenciar o time.') }
  }
  return ctx
}

/**
 * Normaliza o que a tela mandou. O banco tem CHECK no `role`, mas devolver 400
 * com motivo é melhor do que deixar o insert estourar com erro de constraint —
 * a pessoa precisa saber o que digitar de diferente.
 */
export function normalizarPapel({ role, pode_aprovar_pecas, pode_aprovar_aprendizado }) {
  if (!PAPEIS.includes(role)) return { erro: `Papel inválido: ${role}` }
  return {
    role,
    pode_aprovar_pecas:       !!pode_aprovar_pecas,
    // Dono manda no workspace; negar-lhe uma capacidade seria um estado que a
    // tela não sabe representar e que ele desfaz sozinho em dois cliques.
    pode_aprovar_aprendizado: !!pode_aprovar_aprendizado,
    ...(role === 'owner' ? { pode_aprovar_pecas: true, pode_aprovar_aprendizado: true } : {}),
  }
}
