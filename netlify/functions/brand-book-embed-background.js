import { createClient } from '@supabase/supabase-js'

function extractChunks(book) {
  const chunks = []

  const id = book.identity || {}
  if (id.missao)                chunks.push({ section: 'identity',    text: `Missão: ${id.missao}` })
  if (id.visao)                 chunks.push({ section: 'identity',    text: `Visão: ${id.visao}` })
  if (id.valores?.length)       chunks.push({ section: 'identity',    text: `Valores da marca: ${id.valores.join(', ')}` })
  if (id.arquetipo)             chunks.push({ section: 'identity',    text: `Arquétipo de marca: ${id.arquetipo}` })
  if (id.tom_voz)               chunks.push({ section: 'identity',    text: `Tom de voz: ${id.tom_voz}` })
  if (id.publico_alvo)          chunks.push({ section: 'identity',    text: `Público-alvo: ${id.publico_alvo}` })
  if (id.vocabulario_proibido?.length)
    chunks.push({ section: 'identity', text: `Vocabulário proibido: ${id.vocabulario_proibido.join(', ')}` })

  const pos = book.positioning || {}
  if (pos.posicionamento)  chunks.push({ section: 'positioning', text: `Posicionamento: ${pos.posicionamento}` })
  if (pos.proposta_valor)  chunks.push({ section: 'positioning', text: `Proposta de valor: ${pos.proposta_valor}` })
  if (pos.mensagem_central) chunks.push({ section: 'positioning', text: `Mensagem central: ${pos.mensagem_central}` })

  const ds = book.design_system || {}
  const dsParts = []
  if (ds.typography?.font_primary)   dsParts.push(`Fonte primária: ${ds.typography.font_primary}`)
  if (ds.typography?.font_secondary) dsParts.push(`Fonte secundária: ${ds.typography.font_secondary}`)
  if (ds.colors?.primary?.main)      dsParts.push(`Cor primária: ${ds.colors.primary.main}`)
  if (ds.colors?.secondary?.main)    dsParts.push(`Cor secundária: ${ds.colors.secondary.main}`)
  if (dsParts.length) chunks.push({ section: 'design_system', text: `Design System — ${dsParts.join(' · ')}` })

  const ref = book.references || {}
  if (ref.brands?.length)       chunks.push({ section: 'references', text: `Marcas de referência: ${ref.brands.join(', ')}` })
  if (ref.differentiation)      chunks.push({ section: 'references', text: `Diferenciação: ${ref.differentiation}` })
  if (ref.anti_referencias)     chunks.push({ section: 'references', text: `O que a marca NÃO é: ${ref.anti_referencias}` })

  return chunks
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST')    return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }

  const { brand_id } = body
  if (!brand_id) return { statusCode: 400 }

  const { data: brand } = await supabase
    .from('brands').select('id, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404 }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role')
      .eq('workspace_id', brand.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403 }

  const { data: book } = await supabase
    .from('brand_books').select('*').eq('brand_id', brand_id).maybeSingle()
  if (!book) return { statusCode: 200 }

  const chunks = extractChunks(book)
  if (!chunks.length) return { statusCode: 200 }

  const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: chunks.map(c => c.text),
    }),
  })

  if (!voyageRes.ok) {
    console.error('[embed] Voyage API error:', voyageRes.status, await voyageRes.text())
    return { statusCode: 200 }
  }

  const voyageData = await voyageRes.json()

  await supabase.from('brand_book_chunks').delete().eq('brand_id', brand_id)

  await supabase.from('brand_book_chunks').insert(
    chunks.map((c, i) => ({
      brand_id,
      brand_book_id: book.id,
      section:       c.section,
      chunk_text:    c.text,
      embedding:     voyageData.data[i].embedding,
    }))
  )

  console.log(`[embed] ${chunks.length} chunks embedded for brand ${brand_id}`)
  return { statusCode: 200 }
}
