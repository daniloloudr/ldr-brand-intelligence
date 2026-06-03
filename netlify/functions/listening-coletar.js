import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig, extractJSON } from './_ai.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

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
    ? `\nAlém da marca, monitore também cada um destes termos de forma independente: ${termos.map(t => `"${t}"`).join(', ')}.`
    : ''
  return `Pesquise menções recentes de "${marca}" em ${fonte.nome} (${fonte.hint}).${termosStr}
Retorne APENAS JSON, sem markdown:
{"events":[{"titulo":"<80chars>","conteudo":"<300chars>","fonte":"${fonte.nome}","sentiment":"positivo|neutro|negativo","score_impacto":<1-10>,"url":"https://...ou null"}]}`
}

const MODEL_LIMITATION_PATTERNS = [
  /não (tenho|possui|é possível|foi possível)/i,
  /sem acesso/i,
  /base de conhecimento/i,
  /não (consigo|posso) (acessar|pesquisar|buscar)/i,
  /acesso (em tempo real|direto)/i,
]

function isModelDisclaimer(event) {
  const text = `${event.titulo || ''} ${event.conteudo || ''}`.toLowerCase()
  return MODEL_LIMITATION_PATTERNS.some(p => p.test(text))
}

function parseEvents(txt, fonteNome) {
  const s = txt.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/im, '').trim()
  const tryParse = (str) => {
    try {
      const r = JSON.parse(str)
      return Array.isArray(r.events) ? r.events : null
    } catch { return null }
  }
  let events = tryParse(s)
  if (!events) {
    const j0 = s.indexOf('{'), j1 = s.lastIndexOf('}')
    if (j0 >= 0 && j1 > j0) events = tryParse(s.slice(j0, j1 + 1))
  }
  return (events || [])
    .map(e => ({ ...e, fonte: e.fonte || fonteNome }))
    .filter(e => !isModelDisclaimer(e))
}

async function coletarFonte(marca, fonte, termos = []) {
  try {
    const { text } = await callAI({
      ...aiConfig('standard'),
      maxTokens: 1024,
      messages:  [{ role: 'user', content: buildPrompt(marca, fonte, termos) }],
    })
    return parseEvents(text, fonte.nome)
  } catch (e) {
    console.error(`[listening] ${fonte.nome}:`, e.message)
    return null
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  const { workspace_id } = body
  if (!workspace_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, nome, dominio')
    .eq('id', workspace_id)
    .single()
  if (!ws) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Workspace não encontrado' }) }

  const marca = ws.dominio || ws.nome

  // Termos customizados de busca do workspace
  const { data: termsData } = await supabase.from('listening_terms').select('termo').eq('workspace_id', workspace_id)
  const termos = (termsData || []).map(t => t.termo).filter(Boolean)

  // Escalonadas a cada 300ms para evitar burst de rate limit (30k tokens/min)
  // Em dev local o netlify-cli força timeout de 30s; em prod o timeout é 60s (netlify.toml)
  const isLocalDev = !!process.env.NETLIFY_DEV
  const staggerMs    = 300
  const callTimeoutMs = isLocalDev ? 25000 : 50000
  const withDeadline = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))])

  const resultados = await Promise.allSettled(
    FONTES.map((f, i) =>
      new Promise(r => setTimeout(r, i * staggerMs))
        .then(() => withDeadline(coletarFonte(marca, f, termos), callTimeoutMs - i * staggerMs))
    )
  )

  const fontesFalhas = []
  const todosEvents = []
  resultados.forEach((r, i) => {
    if (r.status === 'rejected' || r.value === null) {
      fontesFalhas.push(FONTES[i].nome)
    } else {
      todosEvents.push(...r.value)
    }
  })

  if (!todosEvents.length && fontesFalhas.length === FONTES.length) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Falha ao acessar a API de busca. Tente novamente.' }) }
  }

  // Deduplicação por URL
  const urlsColetadas = todosEvents.filter(e => e.url).map(e => e.url)
  let eventsToInsert = todosEvents
  if (urlsColetadas.length) {
    const { data: existentes } = await supabase
      .from('listening_events')
      .select('url')
      .eq('workspace_id', workspace_id)
      .in('url', urlsColetadas)
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

  // Calcula summary a partir dos eventos coletados
  const total = eventsToInsert.length
  const pos = eventsToInsert.filter(e => e.sentiment === 'positivo').length
  const neg = eventsToInsert.filter(e => e.sentiment === 'negativo').length
  const neu = total - pos - neg
  const summary = {
    positivo_pct: total ? Math.round((pos / total) * 100) : 0,
    neutro_pct:   total ? Math.round((neu / total) * 100) : 0,
    negativo_pct: total ? Math.round((neg / total) * 100) : 0,
    total,
  }

  const today = new Date().toISOString().split('T')[0]
  await supabase.from('sentiment_snapshots').insert({
    workspace_id,
    data:          today,
    positivo_pct:  summary.positivo_pct,
    neutro_pct:    summary.neutro_pct,
    negativo_pct:  summary.negativo_pct,
    avg_positivo:  summary.positivo_pct,
    avg_neutro:    summary.neutro_pct,
    avg_negativo:  summary.negativo_pct,
    total_mencoes: total,
    periodo:       'diario',
  })

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      events:     eventsToInsert,
      summary,
      duplicatas: todosEvents.length - eventsToInsert.length,
      falhas:     fontesFalhas,
    }),
  }
}
