// ════════════════════════════════════════════════════════════════════
// _embed.js — Camada de embedding compartilhada do RAG (os DOIS cérebros).
// Cérebro 1: brand book DIGITADO  (brand-book-embed-background.js)
// Cérebro 2: modelo vivo APRENDIDO (brand-distill-background.js, trilho B)
// Ambos gravam em brand_book_chunks; a re-derivação do modelo vivo usa
// sections com prefixo "intel:" para conviver sem se sobrescrever.
// Spec: .spec/features/brand-intelligence.md §4 (RAG re-derivado do modelo vivo).
// ════════════════════════════════════════════════════════════════════

// Prefixo de section que identifica os chunks derivados do modelo vivo.
export const INTEL_PREFIX = 'intel:'

// Embedding via Voyage voyage-3 (1024 dims). Lança em erro de API.
let _sb = null
export const setEmbedUsageSink = supabase => { _sb = supabase }   // opcional (rastreio)

export async function voyageEmbed(inputs) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'voyage-3', input: inputs }),
  })
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.data.map(d => d.embedding)
}

const txt = x => typeof x === 'string' ? x : (x?.valor || x?.fato || x?.padrao || '')

// Constrói chunks acionáveis a partir do modelo vivo destilado.
// Cada item vira uma UNIDADE DE SENTIDO auto-descritiva — o texto se explica
// sozinho (independe do rótulo de section), pois o Assistant só injeta chunk_text.
export function intelChunks(modelo) {
  if (!modelo || typeof modelo !== 'object') return []
  const out = []
  const push = (section, t) => { const s = (t || '').trim(); if (s) out.push({ section, text: s }) }

  if (modelo.posicionamento?.valor)
    push('intel:posicionamento', `Posicionamento que a marca comprovou pelo uso real: ${txt(modelo.posicionamento)}`)
  if (modelo.voz?.valor)
    push('intel:voz', `Voz da marca, aprendida e reforçada pelo uso real: ${txt(modelo.voz)}`)
  if (modelo.territorio?.valor)
    push('intel:territorio', `Território de posicionamento que a marca deve reivindicar (aprendido dos diagnósticos e do mapa competitivo): ${txt(modelo.territorio)}`)

  const pv = modelo.preferencias_visuais || {}
  for (const a of (pv.aprovado  || [])) push('intel:aprovado',  `Visual APROVADO pela marca (comprovado por avaliações reais): ${txt(a)}`)
  for (const r of (pv.reprovado || [])) push('intel:reprovado', `Visual REPROVADO pela marca (comprovado por avaliações reais): ${txt(r)}`)
  if (pv.modelo_preferido?.provider)
    push('intel:modelo', `Modelo de geração que mais performa para esta marca: ${pv.modelo_preferido.provider} (win-rate ${pv.modelo_preferido.win_rate}).`)

  const dd = modelo.do_dont || {}
  for (const d of (dd.do   || [])) push('intel:do',   `A marca DEVE (aprendido pelo uso): ${txt(d)}`)
  for (const d of (dd.dont || [])) push('intel:dont', `A marca NÃO DEVE (aprendido pelo uso): ${txt(d)}`)

  const ct = modelo.conteudo || {}
  for (const t of (ct.temas   || [])) push('intel:conteudo', `Tema de conteúdo que a marca realmente usa (comprovado por adoção): ${txt(t)}`)
  for (const a of (ct.angulos || [])) push('intel:conteudo', `Ângulo de conteúdo que funciona para a marca: ${txt(a)}`)

  for (const f of (modelo.fatos || [])) push('intel:fato', `Fato aprendido sobre a marca: ${txt(f)}`)

  return out
}

// Re-deriva o RAG a partir do modelo vivo: limpa os chunks "intel:" antigos e
// re-embeda os atuais. Idempotente. Falha de embedding NÃO deve quebrar o caller.
export async function embedIntelChunks(supabase, brandId, modelo) {
  const chunks = intelChunks(modelo)
  // sempre remove os intel: antigos (evita conhecimento estagnado), mesmo sem novos
  await supabase.from('brand_book_chunks').delete().eq('brand_id', brandId).like('section', `${INTEL_PREFIX}%`)
  if (!chunks.length) return 0
  const embeddings = await voyageEmbed(chunks.map(c => c.text))
  await supabase.from('brand_book_chunks').insert(chunks.map((c, i) => ({
    brand_id:      brandId,
    brand_book_id: null,
    section:       c.section,
    chunk_text:    c.text,
    embedding:     embeddings[i],
    metadata:      { fonte: 'intelligence' },
  })))
  return chunks.length
}
