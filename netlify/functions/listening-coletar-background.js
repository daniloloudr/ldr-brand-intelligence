import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig, extractJSON } from './_ai.js'

const FONTES = [
  { nome: 'Twitter/X',      hint: 'site:twitter.com OR site:x.com' },
  { nome: 'Instagram',      hint: 'site:instagram.com' },
  { nome: 'Facebook',       hint: 'site:facebook.com' },
  { nome: 'TikTok',         hint: 'site:tiktok.com' },
  { nome: 'LinkedIn',       hint: 'site:linkedin.com' },
  { nome: 'Reclame Aqui',   hint: 'site:reclameaqui.com.br' },
  { nome: 'Google Reviews', hint: 'avaliações google reviews' },
  { nome: 'News',           hint: 'notícias artigos recentes' },
]

function buildPrompt(marca, fonte, termos) {
  const termosStr = termos.length
    ? `\nAlém da marca, monitore também: ${termos.map(t => `"${t}"`).join(', ')}.`
    : ''
  return `Pesquise menções recentes de "${marca}" em ${fonte.nome} (${fonte.hint}).${termosStr}
Retorne APENAS JSON, sem markdown:
{"events":[{"titulo":"<80chars>","conteudo":"<300chars>","fonte":"${fonte.nome}","sentiment":"positivo|neutro|negativo","score_impacto":<1-10>,"url":"https://...ou null"}]}`
}

const DISCLAIMER = [
  /não (tenho|possui|é possível|foi possível)/i,
  /sem acesso/i,
  /base de conhecimento/i,
  /não (consigo|posso) (acessar|pesquisar|buscar)/i,
  /acesso (em tempo real|direto)/i,
]

function parseEvents(txt, fonteNome) {
  const s = txt.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/im, '').trim()
  const tryParse = (str) => {
    try { const r = JSON.parse(str); return Array.isArray(r.events) ? r.events : null } catch { return null }
  }
  let events = tryParse(s)
  if (!events) {
    const j0 = s.indexOf('{'), j1 = s.lastIndexOf('}')
    if (j0 >= 0 && j1 > j0) events = tryParse(s.slice(j0, j1 + 1))
  }
  return (events || [])
    .map(e => ({ ...e, fonte: e.fonte || fonteNome }))
    .filter(e => !DISCLAIMER.some(p => p.test(`${e.titulo || ''} ${e.conteudo || ''}`)))
}

async function coletarFonte(marca, fonte, termos) {
  try {
    const { text } = await callAI({
      ...aiConfig('standard'),
      maxTokens: 1024,
      messages:  [{ role: 'user', content: buildPrompt(marca, fonte, termos) }],
    })
    return parseEvents(text, fonte.nome)
  } catch (e) {
    console.error(`[listening-bg] ${fonte.nome}:`, e.message)
    return null
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }

  const { workspace_id } = body
  if (!workspace_id) return { statusCode: 400 }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403 }

  const { data: ws } = await supabase
    .from('workspaces').select('id, nome, dominio').eq('id', workspace_id).single()
  if (!ws) return { statusCode: 404 }

  const { data: termsData } = await supabase
    .from('listening_terms').select('termo').eq('workspace_id', workspace_id)
  const termos = (termsData || []).map(t => t.termo).filter(Boolean)

  const marca = ws.dominio || ws.nome

  // Parallel with 300ms stagger to avoid burst rate limit
  const resultados = await Promise.allSettled(
    FONTES.map((f, i) =>
      new Promise(r => setTimeout(r, i * 300)).then(() => coletarFonte(marca, f, termos))
    )
  )

  const fontesFalhas = []
  const todosEvents  = []
  resultados.forEach((r, i) => {
    if (r.status === 'rejected' || r.value === null) fontesFalhas.push(FONTES[i].nome)
    else todosEvents.push(...r.value)
  })

  // Deduplicate by URL
  const urlsColetadas = todosEvents.filter(e => e.url).map(e => e.url)
  let eventsToInsert = todosEvents
  if (urlsColetadas.length) {
    const { data: existentes } = await supabase
      .from('listening_events').select('url')
      .eq('workspace_id', workspace_id).in('url', urlsColetadas)
    const urlsExistentes = new Set((existentes || []).map(e => e.url))
    eventsToInsert = todosEvents.filter(e => !e.url || !urlsExistentes.has(e.url))
  }

  if (eventsToInsert.length) {
    await supabase.from('listening_events').insert(
      eventsToInsert.map(e => ({
        workspace_id,
        titulo:        e.titulo        || '',
        conteudo:      e.conteudo      || '',
        fonte:         e.fonte         || 'Web',
        sentiment:     e.sentiment     || 'neutro',
        sentimento:    e.sentiment     || 'neutro',
        score_impacto: e.score_impacto || 5,
        score:         e.score_impacto || 5,
        url:           e.url           || null,
        dados:         e,
      }))
    )
  }

  const total = eventsToInsert.length
  const pos   = eventsToInsert.filter(e => e.sentiment === 'positivo').length
  const neg   = eventsToInsert.filter(e => e.sentiment === 'negativo').length
  const neu   = total - pos - neg

  // Saving snapshot signals job completion to the frontend poller
  await supabase.from('sentiment_snapshots').insert({
    workspace_id,
    data:          new Date().toISOString().split('T')[0],
    positivo_pct:  total ? Math.round((pos / total) * 100) : 0,
    neutro_pct:    total ? Math.round((neu / total) * 100) : 0,
    negativo_pct:  total ? Math.round((neg / total) * 100) : 0,
    avg_positivo:  total ? Math.round((pos / total) * 100) : 0,
    avg_neutro:    total ? Math.round((neu / total) * 100) : 0,
    avg_negativo:  total ? Math.round((neg / total) * 100) : 0,
    total_mencoes: total,
    periodo:       'diario',
  })

  return { statusCode: 200 }
}
