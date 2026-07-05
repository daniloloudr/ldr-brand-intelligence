// _clipping.js — coleta de clipping (menções/notícias recentes) dos concorrentes.
// Reaproveita o web-search do _ai.js (mesmo padrão do listening). Grava em
// concorrente_clipping (migration 027), deduplicando por url. Em SÉRIE (cache).
import { callAI, aiConfig } from './_ai.js'

const DISCLAIMER = [
  /não (tenho|possui|é possível|foi possível)/i, /sem acesso/i,
  /base de conhecimento/i, /não (consigo|posso) (acessar|pesquisar|buscar)/i,
]

function buildPrompt(nome, dominio) {
  const alvo = dominio ? `${nome} (${dominio})` : nome
  return `Pesquise MENÇÕES e NOTÍCIAS RECENTES (últimas ~2 semanas) sobre o concorrente "${alvo}": lançamentos, campanhas, prêmios, contratações, movimentos de mercado, repercussão em notícias e redes.
Retorne APENAS JSON, sem markdown:
{"events":[{"titulo":"<80chars>","conteudo":"<300chars>","fonte":"News|LinkedIn|Instagram|X|outro","sentiment":"positivo|neutro|negativo","score_impacto":<1-10>,"url":"https://...ou null"}]}`
}

function parseEvents(txt) {
  const s = String(txt || '').replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/im, '').trim()
  const tryParse = str => { try { const r = JSON.parse(str); return Array.isArray(r.events) ? r.events : null } catch { return null } }
  let events = tryParse(s)
  if (!events) { const j0 = s.indexOf('{'), j1 = s.lastIndexOf('}'); if (j0 >= 0 && j1 > j0) events = tryParse(s.slice(j0, j1 + 1)) }
  return (events || []).filter(e => !DISCLAIMER.some(p => p.test(`${e.titulo || ''} ${e.conteudo || ''}`)))
}

async function coletarClipping(concorrente) {
  try {
    const { text } = await callAI({ ...aiConfig('standard'), maxTokens: 1200,
      messages: [{ role: 'user', content: buildPrompt(concorrente.nome, concorrente.dominio) }] })
    return parseEvents(text)
  } catch (e) {
    console.error(`[clipping] ${concorrente.nome}: ${e.message}`)
    return []
  }
}

// Coleta o clipping dos concorrentes ativos (de um workspace, ou todos) em SÉRIE.
export async function coletarClippingWorkspace(supabase, { workspace_id, max = 6 } = {}) {
  let q = supabase.from('concorrentes').select('id, workspace_id, nome, dominio').eq('ativo', true)
  if (workspace_id) q = q.eq('workspace_id', workspace_id)
  const { data: concs } = await q
  const fila = (concs || []).slice(0, max)

  let inseridos = 0
  for (const c of fila) {                                   // SÉRIE (cache do prompt)
    const events = await coletarClipping(c)
    const urls = events.map(e => e.url).filter(Boolean)
    let jaExistem = new Set()
    if (urls.length) {
      const { data } = await supabase.from('concorrente_clipping')
        .select('url').eq('workspace_id', c.workspace_id).in('url', urls)
      jaExistem = new Set((data || []).map(x => x.url))
    }
    const novos = events.filter(e => !e.url || !jaExistem.has(e.url))
    if (novos.length) {
      await supabase.from('concorrente_clipping').insert(novos.map(e => ({
        workspace_id:   c.workspace_id,
        concorrente_id: c.id,
        titulo:         (e.titulo || '').slice(0, 200),
        conteudo:       (e.conteudo || '').slice(0, 600),
        fonte:          e.fonte || null,
        sentiment:      e.sentiment || null,
        score_impacto:  Number.isFinite(e.score_impacto) ? e.score_impacto : null,
        url:            e.url || null,
      }))).catch(() => {})
      inseridos += novos.length
    }
  }
  return { concorrentes: fila.length, inseridos }
}
