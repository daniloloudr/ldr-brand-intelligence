// ════════════════════════════════════════════════════════════════════
// brand-distill-background.js — wrapper HTTP do destilador do cérebro.
// A destilação em si vive em _brain.js (distillBrand); aqui só o transporte:
// background function (sem limite de 30s), idempotente pelo consumido_em.
// Spec: specs/features/brand-intelligence.md §2/§3.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { distillBrand } from './_brain.js'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { brand_id } = body
  if (!brand_id) return { statusCode: 400 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const r = await distillBrand(supabase, brand_id)

  if (r.status === 'not_found')    return { statusCode: 404 }
  if (r.status === 'no_signals')   return { statusCode: 200, body: 'sem sinais novos' }
  if (r.status === 'llm_error')    return { statusCode: 502, body: r.message }
  if (r.status === 'invalid')      return { statusCode: 502, body: 'destilação inválida' }
  if (r.status === 'insert_error') return { statusCode: 500, body: r.message }
  return { statusCode: 200, body: JSON.stringify({ versao: r.versao, sinais: r.sinais }) }
}
