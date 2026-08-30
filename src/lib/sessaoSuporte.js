// ════════════════════════════════════════════════════════════════════
// sessaoSuporte.js — o lado do browser da sessão de suporte (migration 053).
//
// Depois da 053, o operador da plataforma não enxerga conteúdo de cliente
// nenhum sem uma sessão aberta para AQUELE workspace. Ou seja: a impersonação
// deixou de ser só "trocar o workspace na tela" — ela precisa declarar por quê
// antes, senão o /app abre inteiro e VAZIO.
//
// Nada aqui é a permissão. A permissão é a RLS; isto é o pedido. Se este
// arquivo mentir, o banco continua fechado — que é a propriedade que se quer.
// ════════════════════════════════════════════════════════════════════
import { supabase } from './supabase'

const ENDPOINT = '/.netlify/functions/admin-support-session'

async function token() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function chamar(metodo, { corpo, query } = {}) {
  const url = query ? `${ENDPOINT}?${new URLSearchParams(query)}` : ENDPOINT
  const res = await fetch(url, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await token()}`,
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
  return json
}

/**
 * Abre a sessão e devolve `{ id, workspace_id, motivo, criada_em, expira_em }`.
 * `motivo` é obrigatório — o servidor recusa com menos de 3 caracteres, e é
 * ele que grava a trilha de auditoria.
 */
export const abrirSessaoSuporte = (workspace_id, motivo, { minutos, origem } = {}) =>
  chamar('POST', { corpo: { workspace_id, motivo, minutos, origem } }).then(r => r.sessao)

/** Encerra a sessão viva neste workspace. Higiene, não garantia: o prazo é que garante. */
export const encerrarSessaoSuporte = (workspace_id) =>
  chamar('DELETE', { corpo: { workspace_id } }).catch(() => null)

/** A sessão viva deste operador neste workspace, ou null. */
export const sessaoSuporteViva = (workspace_id) =>
  chamar('GET', { query: { workspace_id } }).then(r => r.sessao).catch(() => null)

/** "14:32" — o que a tarja mostra. */
export const horaDeExpiracao = (sessao) => {
  if (!sessao?.expira_em) return null
  return new Date(sessao.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
