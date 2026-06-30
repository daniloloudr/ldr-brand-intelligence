// ════════════════════════════════════════════════════════════════════
// studio-webhook.js — callback do fal quando o job conclui (prod)
// Baixa a imagem → R2 → marca a geração done/error. Responde 200 rápido.
// Idempotente por provider_request_id. Spec: studio.md §1
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { finalizeGeneration, failGeneration, findGenerationByRequest, extractMediaUrl } from './_studio.js'

const ok = { statusCode: 200, body: 'ok' }

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'method' }

  // Segredo opcional na query (?s=...) — defesa extra além do request_id UUID
  const secret = process.env.STUDIO_WEBHOOK_SECRET
  if (secret && event.queryStringParameters?.s !== secret) return { statusCode: 401, body: 'unauthorized' }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return ok }

  const requestId = body.request_id || body.gateway_request_id
  if (!requestId) return ok

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const gen = await findGenerationByRequest(supabase, requestId)
  if (!gen) return ok                                   // request desconhecido — ignora

  // status do webhook: "OK" (sucesso) | "ERROR" (falha) — distinto da fila
  if (body.status === 'ERROR') {
    await failGeneration(supabase, gen.id, JSON.stringify(body.error || body.payload || 'erro no fal').slice(0, 500))
    return ok
  }

  const mediaUrl = extractMediaUrl(body.payload, gen.media_type)
  await finalizeGeneration(supabase, gen, mediaUrl)
  return ok
}
