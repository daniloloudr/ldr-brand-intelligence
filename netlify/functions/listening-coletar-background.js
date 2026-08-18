import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig, extractJSON } from './_ai.js'

// Cada canal descreve O QUE PROCURAR, não onde. O `site:` que existia aqui
// matava a busca por construção: Twitter, Instagram e TikTok bloqueiam crawler
// ou exigem login, então o índice não tem o conteúdo deles e a consulta voltava
// vazia SEMPRE — para qualquer marca. Medido: `site:twitter.com` + PES fez 3
// buscas e achou nada; a mesma pergunta sem o filtro achou a página de
// reputação da empresa e uma reclamação real com citação.
//
// O canal continua sendo a unidade — é assim que se lê percepção por praça —
// mas agora ele é o ASSUNTO da pergunta, não um operador de busca.
const FONTES = [
  { nome: 'Twitter/X',      alvo: 'posts, threads e respostas no Twitter/X' },
  { nome: 'Instagram',      alvo: 'publicações, comentários e marcações no Instagram' },
  { nome: 'Facebook',       alvo: 'publicações, grupos e comentários no Facebook' },
  { nome: 'TikTok',         alvo: 'vídeos e comentários no TikTok' },
  { nome: 'LinkedIn',       alvo: 'publicações e comentários no LinkedIn, incluindo de funcionários' },
  { nome: 'Reclame Aqui',   alvo: 'reclamações, respostas da empresa e índice de reputação no Reclame Aqui' },
  { nome: 'Google Reviews', alvo: 'avaliações e notas em Google Reviews e Google Maps' },
  { nome: 'News',           alvo: 'notícias, matérias e citações na imprensa' },
]

function buildPrompt(marca, fonte, termos) {
  const termosStr = termos.length
    ? `\nAlém da marca, monitore também: ${termos.map(t => `"${t}"`).join(', ')}.`
    : ''
  return `Como a marca "${marca}" é percebida em ${fonte.nome}? Procure ${fonte.alvo}.${termosStr}

Busque livremente, com os termos que uma pessoa real usaria. NÃO restrinja a busca a um domínio
(nada de "site:") — o conteúdo dessas plataformas costuma aparecer indexado fora delas, em
agregadores, notícias e citações, e a restrição por domínio devolve vazio mesmo quando há material.
Retorne APENAS JSON, sem markdown:
{"events":[{"titulo":"<80chars>","conteudo":"<300chars>","fonte":"${fonte.nome}","sentiment":"positivo|neutro|negativo","score_impacto":<1-10>,"url":"https://..."}]}

Regras:
- Toda menção precisa da URL de onde ela foi encontrada. Sem link verificável, NÃO inclua.
- Não descreva o que uma marca deste ramo "costuma" receber. Só o que você encontrou sobre ESTA marca.
- Não achou nada? Devolva {"events":[]}. Lista vazia é resposta correta e esperada.
- O que interessa é PERCEPÇÃO: o que dizem, elogiam, reclamam ou noticiam sobre a marca. Post da
  própria marca só entra se a reação a ele for o achado.`
}

const DISCLAIMER = [
  /não (tenho|possui|é possível|foi possível)/i,
  /sem acesso/i,
  /base de conhecimento/i,
  /não (consigo|posso) (acessar|pesquisar|buscar)/i,
  /acesso (em tempo real|direto)/i,
  // "Procurei e não achei" é RESULTADO, não menção. Sem estas linhas, cada
  // rodada gravava um evento por canal dizendo que não havia eventos — a PES
  // tinha 19 "menções" e todas eram "nenhuma menção encontrada".
  /nenhuma? (menç|resultado|registro|publicaç)/i,
  /sem (menç|resultado|registro|publicaç)/i,
  /não (foram|foi) encontrad/i,
  /não há (menç|registro|resultado)/i,
  /não retorn/i,
  /presença digital limitada/i,
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
    // Sem link, não é menção: é afirmação sobre a marca que ninguém consegue
    // conferir. A PES tinha 10 eventos e ZERO URLs — todos inventados. O
    // esquema antigo oferecia `"url": "...ou null"` e o modelo aceitava o
    // convite. Verificável ou fora.
    .filter(e => /^https?:\/\/\S+$/i.test(String(e.url || '').trim()))
}

async function coletarFonte(marca, fonte, termos) {
  try {
    // 'premium' porque é o único tier com busca web em TODO ambiente. Com
    // 'standard', em dev o modelo recebia "pesquise menções da marca" sem ter
    // como pesquisar — e fazia o que modelo faz: inventava reclamações
    // plausíveis para o ramo. A PES ganhou 9 queixas de cancelamento que
    // ninguém escreveu, gravadas como inteligência de marca.
    //
    // Coletor sem acesso ao mundo não coleta: alucina. Não existe modo
    // degradado aceitável aqui.
    const { text } = await callAI({
      ...aiConfig('premium'),
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

  // Busca pelo NOME da marca, não pelo domínio.
  //
  // Era `ws.dominio || ws.nome`, e o domínio ganhava: a PES foi procurada como
  // "https://www.pesenglish.com.br/" no Instagram e no TikTok. Ninguém escreve
  // a URL num post — escreve "PES", "PES English". Marca com barulho real
  // voltava com zero menções, e o silêncio parecia do mercado quando era da
  // pergunta.
  //
  // O domínio continua útil como termo SECUNDÁRIO: pega quem compartilha link,
  // e é o que identifica a empresa no Reclame Aqui. Vai como host, sem
  // protocolo nem barra — é assim que ele aparece escrito.
  const marca = ws.nome || ws.dominio
  const host = (ws.dominio || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '')
  if (host && host !== marca) termos.push(host)

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
