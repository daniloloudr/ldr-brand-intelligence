// ════════════════════════════════════════════════════════════════════
// brand-book-search.js — wrapper HTTP da busca semântica do cérebro.
// Auth do membro + delega a _brain.js (searchBrandKnowledge): top-5 sobre
// brand_book_chunks (brand book digitado + "intel:" do modelo vivo).
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { searchBrandKnowledge } from './_brain.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ chunks: [] }) }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ chunks: [] }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ chunks: [] }) }
  }

  const { brand_id, query } = body
  if (!brand_id || !query) return { statusCode: 400, headers, body: JSON.stringify({ chunks: [] }) }

  const chunks = await searchBrandKnowledge(supabase, brand_id, query, 5)
  return { statusCode: 200, headers, body: JSON.stringify({ chunks }) }
}
