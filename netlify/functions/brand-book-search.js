import { createClient } from '@supabase/supabase-js'

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

  // Check if brand_book_chunks has data for this brand
  const { count } = await supabase
    .from('brand_book_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brand_id)

  if (!count) return { statusCode: 200, headers, body: JSON.stringify({ chunks: [] }) }

  // Embed the query
  const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'voyage-3', input: [query] }),
  })

  if (!voyageRes.ok) return { statusCode: 200, headers, body: JSON.stringify({ chunks: [] }) }

  const voyageData = await voyageRes.json()
  const queryEmbedding = voyageData.data[0].embedding

  const { data: chunks } = await supabase.rpc('match_brand_book_chunks', {
    p_brand_id:  brand_id,
    p_embedding: queryEmbedding,
    p_limit:     5,
  })

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ chunks: chunks || [] }),
  }
}
