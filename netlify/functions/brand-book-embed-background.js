import { createClient } from '@supabase/supabase-js'
import { voyageEmbed, INTEL_PREFIX } from './_embed.js'
import { autorizarBackground } from './_interno.js'

const arr = x => Array.isArray(x) ? x.filter(Boolean) : (x ? [x] : [])
const joinArr = x => arr(x)
  .map(v => typeof v === 'object' ? (v.hex || v.valor || v.nome || v.termo || '') : v)
  .filter(Boolean).join(', ')

// Estrutura nova (v5.8): verbal_identity + visual_identity.
// Fallback para o legado (identity/positioning/design_system/references).
export function extractChunks(book) {
  const chunks = []
  const v  = book.verbal_identity || {}
  const vi = book.visual_identity || {}
  const st = book.strategy || {}

  // ── Strategy (Onda 2 — nova arquitetura) ───────────────────────────
  if (st.meaning)             chunks.push({ section: 'strategy', text: `Brand Meaning — o significado da marca: ${st.meaning}` })
  if (st.business_model)      chunks.push({ section: 'strategy', text: `Modelo de negócio da marca: ${st.business_model}` })
  if (st.portfolio)           chunks.push({ section: 'strategy', text: `Portfólio de produtos/serviços: ${st.portfolio}` })
  if (st.brand_architecture)  chunks.push({ section: 'strategy', text: `Arquitetura de marca: ${st.brand_architecture}` })
  if (arr(st.stakeholders).length) chunks.push({ section: 'strategy', text: `Stakeholders da marca: ${joinArr(st.stakeholders)}` })
  for (const p of arr(st.personas)) {
    if (!p?.nome) continue
    chunks.push({ section: 'strategy', text: `Persona da marca — ${p.nome}: ${[p.descricao, p.dores && `Dores: ${p.dores}`, p.objetivos && `Objetivos: ${p.objetivos}`].filter(Boolean).join(' · ')}` })
  }
  for (const g of arr(st.goals_kpis)) {
    if (!g?.objetivo) continue
    chunks.push({ section: 'strategy', text: `Objetivo da marca: ${g.objetivo}${g.kpi ? ` · KPI: ${g.kpi}` : ''}${g.meta ? ` · Meta: ${g.meta}` : ''}` })
  }
  const exp = [st.ux && `UX: ${st.ux}`, st.ui && `UI: ${st.ui}`, st.customer_journey && `Jornada do cliente: ${st.customer_journey}`].filter(Boolean)
  if (exp.length)             chunks.push({ section: 'strategy', text: `Princípios de experiência da marca — ${exp.join(' · ')}` })
  if (st.storytelling_overview) chunks.push({ section: 'strategy', text: `Storytelling — a narrativa da marca: ${st.storytelling_overview}` })
  for (const sz of arr(st.seasons)) {
    if (!sz?.nome) continue
    chunks.push({ section: 'strategy', text: `Season narrativa "${sz.nome}"${sz.periodo ? ` (${sz.periodo})` : ''}: ${sz.narrativa || ''}` })
  }
  if (st.territorio_notas)    chunks.push({ section: 'strategy', text: `Territórios — direcionamento do time: ${st.territorio_notas}` })

  // ── Identidade Verbal ──────────────────────────────────────────────
  const essencia = [
    v.tagline   && `Tagline: ${v.tagline}`,
    v.proposito && `Propósito: ${v.proposito}`,
    v.manifesto && `Manifesto: ${v.manifesto}`,
  ].filter(Boolean)
  if (essencia.length) chunks.push({ section: 'verbal', text: essencia.join('\n') })

  if (v.missao)             chunks.push({ section: 'verbal', text: `Missão: ${v.missao}` })
  if (v.visao)              chunks.push({ section: 'verbal', text: `Visão: ${v.visao}` })
  if (arr(v.valores).length) chunks.push({ section: 'verbal', text: `Valores da marca: ${joinArr(v.valores)}` })
  if (v.arquetipo)          chunks.push({ section: 'verbal', text: `Arquétipo de marca: ${v.arquetipo}` })

  const pers = [...new Set([...arr(v.personalidade), ...arr(v.tom_atributos)])]
  if (pers.length)          chunks.push({ section: 'verbal', text: `Personalidade e atributos de tom: ${pers.join(', ')}` })
  if (v.tom_voz)            chunks.push({ section: 'verbal', text: `Tom de voz: ${v.tom_voz}` })
  if (v.tom_evitar)         chunks.push({ section: 'verbal', text: `No tom de voz, evitar: ${v.tom_evitar}` })

  const posChunk = [
    v.posicionamento  && `Posicionamento: ${v.posicionamento}`,
    v.proposta_valor  && `Proposta de valor: ${v.proposta_valor}`,
    v.mensagem_central && `Mensagem central: ${v.mensagem_central}`,
  ].filter(Boolean)
  if (posChunk.length)      chunks.push({ section: 'verbal', text: posChunk.join('\n') })

  if (v.publico_alvo)       chunks.push({ section: 'verbal', text: `Público-alvo: ${v.publico_alvo}` })
  if (arr(v.vocabulario_aprovado).length) chunks.push({ section: 'verbal', text: `Vocabulário on-brand (usar): ${joinArr(v.vocabulario_aprovado)}` })
  if (arr(v.vocabulario_proibido).length) chunks.push({ section: 'verbal', text: `Vocabulário proibido (evitar): ${joinArr(v.vocabulario_proibido)}` })
  if (arr(v.termos_proprios).length)      chunks.push({ section: 'verbal', text: `Termos próprios da marca: ${joinArr(v.termos_proprios)}` })
  if (v.narrativa_origem)   chunks.push({ section: 'verbal', text: `Narrativa de origem: ${v.narrativa_origem}` })
  if (v.boilerplate)        chunks.push({ section: 'verbal', text: `Boilerplate institucional: ${v.boilerplate}` })

  // ── Identidade Visual ──────────────────────────────────────────────
  if (arr(vi.paleta).length) chunks.push({ section: 'visual', text: `Paleta de cores da marca: ${joinArr(vi.paleta)}` })

  const tipo = [
    vi.tipo_principal_nome  && `Principal: ${vi.tipo_principal_nome}${vi.tipo_principal_uso ? ` (${vi.tipo_principal_uso})` : ''}`,
    vi.tipo_secundario_nome && `Secundária: ${vi.tipo_secundario_nome}`,
    vi.tipo_display         && `Display: ${vi.tipo_display}`,
  ].filter(Boolean)
  if (tipo.length)          chunks.push({ section: 'visual', text: `Tipografia — ${tipo.join(' · ')}` })

  const foto = [
    vi.foto_mood          && `Mood: ${vi.foto_mood}`,
    vi.foto_luz_edicao    && `Luz e edição: ${vi.foto_luz_edicao}`,
    vi.foto_enquadramento && `Enquadramento: ${vi.foto_enquadramento}`,
  ].filter(Boolean)
  if (foto.length)          chunks.push({ section: 'visual', text: `Direção de fotografia — ${foto.join(' · ')}` })

  if (vi.ilustracao_estilo) chunks.push({ section: 'visual', text: `Estilo de ilustração: ${vi.ilustracao_estilo}` })
  if (vi.icone_estilo)      chunks.push({ section: 'visual', text: `Estilo de ícones: ${vi.icone_estilo}` })

  const naoVisual = [
    arr(vi.usos_proibidos).length && `Usos proibidos da marca: ${joinArr(vi.usos_proibidos)}`,
    arr(vi.foto_dont).length      && `Em fotografia, evitar: ${joinArr(vi.foto_dont)}`,
  ].filter(Boolean)
  if (naoVisual.length)     chunks.push({ section: 'visual', text: naoVisual.join('\n') })

  if (chunks.length) return chunks

  // ── Fallback: brand books antigos (estrutura legada) ───────────────
  const id = book.identity || {}
  if (id.missao)          chunks.push({ section: 'identity', text: `Missão: ${id.missao}` })
  if (id.visao)           chunks.push({ section: 'identity', text: `Visão: ${id.visao}` })
  if (arr(id.valores).length) chunks.push({ section: 'identity', text: `Valores da marca: ${joinArr(id.valores)}` })
  if (id.arquetipo)       chunks.push({ section: 'identity', text: `Arquétipo de marca: ${id.arquetipo}` })
  if (id.tom_voz)         chunks.push({ section: 'identity', text: `Tom de voz: ${id.tom_voz}` })
  if (id.publico_alvo)    chunks.push({ section: 'identity', text: `Público-alvo: ${id.publico_alvo}` })
  if (arr(id.vocabulario_proibido).length) chunks.push({ section: 'identity', text: `Vocabulário proibido: ${joinArr(id.vocabulario_proibido)}` })

  const pos = book.positioning || {}
  if (pos.posicionamento)  chunks.push({ section: 'positioning', text: `Posicionamento: ${pos.posicionamento}` })
  if (pos.proposta_valor)  chunks.push({ section: 'positioning', text: `Proposta de valor: ${pos.proposta_valor}` })
  if (pos.mensagem_central) chunks.push({ section: 'positioning', text: `Mensagem central: ${pos.mensagem_central}` })

  const ref = book.references || {}
  if (ref.differentiation)  chunks.push({ section: 'references', text: `Diferenciação: ${ref.differentiation}` })
  if (ref.anti_referencias) chunks.push({ section: 'references', text: `O que a marca NÃO é: ${ref.anti_referencias}` })

  return chunks
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST')    return { statusCode: 405 }

  // Porteiro: usuário autenticado (browser) OU segredo interno (cron/servidor).
  // Sem isto este endpoint é trabalho pago à disposição de quem souber o caminho.
  const porteiro = await autorizarBackground(event)
  if (porteiro.erro) return porteiro.erro

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

  // Linha de brand_book MAIS RECENTE — resiliente a duplicatas de brand_id
  const { data: bookRows } = await supabase
    .from('brand_books').select('*').eq('brand_id', brand_id)
    .order('updated_at', { ascending: false }).limit(1)
  const book = bookRows?.[0]
  if (!book) return { statusCode: 200 }

  const chunks = extractChunks(book)
  if (!chunks.length) return { statusCode: 200 }

  let embeddings
  try {
    embeddings = await voyageEmbed(chunks.map(c => c.text))
  } catch (e) {
    console.error('[embed] Voyage API error:', e.message)
    return { statusCode: 200 }
  }

  // Remove só os chunks do BRAND BOOK — preserva os "intel:" (modelo vivo, trilho B),
  // que têm ciclo de vida próprio (re-derivados pelo destilador).
  await supabase.from('brand_book_chunks').delete()
    .eq('brand_id', brand_id).not('section', 'like', `${INTEL_PREFIX}%`)
  await supabase.from('brand_book_chunks').insert(
    chunks.map((c, i) => ({
      brand_id,
      brand_book_id: book.id,
      section:       c.section,
      chunk_text:    c.text,
      embedding:     embeddings[i],
    }))
  )

  console.log(`[embed] ${chunks.length} chunks embedded for brand ${brand_id}`)
  return { statusCode: 200 }
}
