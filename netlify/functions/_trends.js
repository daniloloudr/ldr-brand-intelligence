// _trends.js — radar de tendências do setor (Onda 3 · Inteligência).
// Mesmo padrão do _clipping.js: web-search via aiConfig('standard'), em série,
// dedup por título, feed do cérebro via brand_signal. A diferença de produto:
// cada tendência já nasce com "como_surfar" — escrito no tom da marca, porque
// o prompt recebe o brand context + inteligência aprendida (resolveBrandIntelligence).
import { callAI, aiConfig } from './_ai.js'
import { emitSignal, resolveBrandIntelligence } from './_brain.js'

function buildPrompt({ setor, nomeMarca, brandCtx }) {
  return `Pesquise as TENDÊNCIAS mais relevantes AGORA no setor de "${setor}" no Brasil (com olho no global): comportamento do consumidor, tecnologia, estética/linguagem, movimentos de mercado e formatos de conteúdo em ascensão.

A marca que vai usar esse radar:
${brandCtx}

Selecione 5 a 8 tendências REAIS e recentes (nada de lugar-comum tipo "IA está em alta" sem ângulo). Para cada uma, escreva "como_surfar": uma recomendação CONCRETA de como a marca ${nomeMarca} surfa essa tendência — no tom de voz da marca descrito acima, citando o território dela quando fizer sentido.

Retorne APENAS JSON, sem markdown:
{"trends":[{"titulo":"<80chars>","conteudo":"<300chars — a tendência em si, com evidência>","categoria":"comportamento|tecnologia|estetica|mercado|conteudo","relevancia":<1-10 para ESTA marca>,"horizonte":"agora|6m|1a+","como_surfar":"<300chars>","fonte":"<veículo/origem>","url":"https://...ou null"}]}`
}

// Mesmo parser tolerante do clipping: JSON puro, cercado ou embutido em prosa.
function parseTrends(txt) {
  const raw = String(txt || '')
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const cand = fence ? fence[1] : raw
  const ie = cand.indexOf('"trends"')
  if (ie < 0) return []
  const start = cand.lastIndexOf('{', ie)
  if (start < 0) return []
  let depth = 0
  for (let i = start; i < cand.length; i++) {
    if (cand[i] === '{') depth++
    else if (cand[i] === '}') {
      if (--depth === 0) {
        try { const o = JSON.parse(cand.slice(start, i + 1)); if (Array.isArray(o.trends)) return o.trends } catch { /* incompleto */ }
        break
      }
    }
  }
  return []
}

// Coleta o radar de um workspace. Precisa de setor definido (é o alvo da busca).
export async function coletarTendenciasWorkspace(supabase, { workspace_id }) {
  const [{ data: ws }, { data: brand }] = await Promise.all([
    supabase.from('workspaces').select('id, nome, setor').eq('id', workspace_id).single(),
    supabase.from('brands').select('id, nome').eq('workspace_id', workspace_id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle(),
  ])
  if (!ws?.setor) return { status: 'sem_setor', inseridos: 0 }
  if (!brand)     return { status: 'sem_marca', inseridos: 0 }

  const { prefix: brandCtx } = await resolveBrandIntelligence(supabase, brand.id, brand.nome)

  let trends = []
  try {
    const { text } = await callAI({ ...aiConfig('standard'), maxTokens: 6000,
      messages: [{ role: 'user', content: buildPrompt({ setor: ws.setor, nomeMarca: brand.nome, brandCtx }) }],
      supabase, tag: 'tendencias' })
    trends = parseTrends(text)
  } catch (e) {
    console.error(`[trends] ws ${workspace_id}: ${e.message}`)
    return { status: 'llm_error', inseridos: 0 }
  }
  if (!trends.length) return { status: 'vazio', inseridos: 0 }

  // Dedup por título (últimos 60 dias): a mesma tendência não entra duas vezes.
  const desde = new Date(Date.now() - 60 * 86400000).toISOString()
  const { data: recentes } = await supabase.from('tendencias')
    .select('titulo').eq('workspace_id', workspace_id).gte('created_at', desde)
  const vistos = new Set((recentes || []).map(r => (r.titulo || '').toLowerCase().trim()))
  const novos = trends.filter(t => t.titulo && !vistos.has(t.titulo.toLowerCase().trim()))
  if (!novos.length) return { status: 'ok', inseridos: 0 }

  const { error: insErr } = await supabase.from('tendencias').insert(novos.map(t => ({
    workspace_id,
    titulo:      (t.titulo || '').slice(0, 200),
    conteudo:    (t.conteudo || '').slice(0, 600),
    categoria:   ['comportamento', 'tecnologia', 'estetica', 'mercado', 'conteudo'].includes(t.categoria) ? t.categoria : null,
    relevancia:  Number.isFinite(t.relevancia) ? Math.min(10, Math.max(1, t.relevancia)) : null,
    horizonte:   ['agora', '6m', '1a+'].includes(t.horizonte) ? t.horizonte : null,
    como_surfar: (t.como_surfar || '').slice(0, 600),
    fonte:       t.fonte || null,
    url:         t.url || null,
  })))
  if (insErr) { console.error(`[trends] insert ws ${workspace_id}: ${insErr.message}`); return { status: 'insert_error', inseridos: 0 } }

  // Feed do cérebro: as tendências de alta relevância viram evidência (peso baixo —
  // é contexto de mercado, não a marca). O distiller usa o formato genérico.
  const top = novos.filter(t => (t.relevancia ?? 0) >= 6).slice(0, 5)
    .map(t => ({ titulo: (t.titulo || '').slice(0, 160), categoria: t.categoria || null, relevancia: t.relevancia ?? null }))
  if (top.length) {
    const { error } = await emitSignal(supabase, {
      brand_id: brand.id, workspace_id, tipo: 'trend', fonte: 'trends', peso: 0.5,
      payload: { setor: ws.setor, tendencias: top },
    })
    if (error) console.error(`[trends] signal ws ${workspace_id}: ${error.message}`)
  }

  return { status: 'ok', inseridos: novos.length }
}
