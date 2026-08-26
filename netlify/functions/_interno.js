// ════════════════════════════════════════════════════════════════════
// _interno.js — porteiro das background functions
//
// As `*-background.js` são endpoints HTTP públicos que rodam com a
// SUPABASE_SERVICE_KEY e disparam trabalho pago (Anthropic, fal, Voyage).
// Nenhuma checava quem estava chamando: bastava saber o caminho para gastar o
// nosso dinheiro e escrever no banco de qualquer workspace.
//
// Elas têm DOIS tipos de chamador legítimo, e é por isso que um segredo
// compartilhado sozinho não resolve:
//   · o BROWSER (ContentHub, Posicionamento, IntelligencePages…) — que já manda
//     `Authorization: Bearer` e já trata 401/403. Aqui o segredo interno seria
//     um desastre: qualquer segredo que chega ao frontend é público.
//   · o SERVIDOR (crons e _studio.js) — que não tem usuário nenhum para
//     apresentar, e por isso precisa do segredo.
//
// Daí o porteiro aceitar qualquer uma das duas provas, e nunca a ausência das
// duas.
//
// O segredo é DERIVADO da service key quando não há INTERNAL_SECRET definido,
// pelo mesmo motivo do webhook do Studio (ver `webhookSecret` em _studio.js):
// proteção que depende de alguém lembrar de configurar uma variável nasce
// desligada — e foi assim que esses endpoints ficaram abertos. Para rotacionar,
// defina INTERNAL_SECRET: ele tem precedência.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'node:crypto'

export const HEADER_INTERNO = 'x-interno'

export function internalSecret() {
  const explicito = process.env.INTERNAL_SECRET
  if (explicito) return explicito
  const base = process.env.SUPABASE_SERVICE_KEY
  if (!base) return null
  return createHmac('sha256', base).update('background/v1').digest('hex').slice(0, 32)
}

/** Headers para uma chamada servidor→servidor (cron, _studio). */
export const internalHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  [HEADER_INTERNO]: internalSecret() || '',
  ...extra,
})

/**
 * Porteiro. Devolve `{ erro }` com a resposta HTTP pronta, ou `{ user, interno }`
 * quando a chamada é legítima (`user` é null quando veio do próprio servidor).
 *
 * Falha FECHADA: sem segredo derivável, recusa em vez de liberar — o contrário
 * é o defeito original de volta.
 */
export async function autorizarBackground(event) {
  const segredo = internalSecret()
  if (!segredo) {
    return { erro: { statusCode: 500, body: JSON.stringify({ error: 'servidor sem segredo interno' }) } }
  }

  const headers = event?.headers || {}
  if (headers[HEADER_INTERNO] && headers[HEADER_INTERNO] === segredo) {
    return { user: null, interno: true }
  }

  const token = headers.authorization?.replace(/^Bearer /, '')
  if (!token) {
    return { erro: { statusCode: 401, body: JSON.stringify({ error: 'Não autorizado' }) } }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: { user } = {}, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { erro: { statusCode: 401, body: JSON.stringify({ error: 'Token inválido' }) } }
  }
  return { user, interno: false }
}
