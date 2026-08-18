import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig, extractJSON } from './_ai.js'
import { buscarNaWeb, provedorDeBusca } from './_busca.js'
import { sendAlert } from './_watchdog.js'

// ── A INVERSÃO (2026-08-18) ─────────────────────────────────────────────
// Antes: o modelo buscava E respondia. A URL saía da resposta dele, o que é o
// mesmo que pedir para o modelo escrever o link — e modelo escreve link
// plausível. Não existia filtro de data, e a query mudava a cada rodada porque
// quem a escrevia era o modelo, a partir de uma descrição em prosa.
//
// Agora: o GOOGLE coleta, o CLAUDE classifica. O modelo lê linhas que já
// existem no índice e diz, de cada uma, se é sobre esta marca e com que carga.
// Ele não pode inventar menção porque não pode inventar linha na resposta do
// Google. A URL, o título e a data vêm do índice; do modelo vêm só os juízos.
//
// A janela é de 7 dias (`dateRestrict=d7`), o que casa com o cron semanal: cada
// rodada varre exatamente o intervalo desde a anterior, sem buraco nem overlap.

const JANELA_DIAS = 7

// O canal deixa de ser palpite do modelo e passa a ser DERIVADO do host do
// resultado — dado, não opinião. `busca` é o recorte que vai ao Google; null
// significa que o canal só aparece pelas buscas abertas (é o caso de imprensa e
// de qualquer site que a gente não listou).
const CANAIS = [
  { nome: 'Reclame Aqui',   hosts: ['reclameaqui.com.br'],                busca: 'site:reclameaqui.com.br' },
  { nome: 'Twitter/X',      hosts: ['twitter.com', 'x.com'],              busca: 'site:x.com OR site:twitter.com' },
  { nome: 'Instagram',      hosts: ['instagram.com'],                     busca: 'site:instagram.com' },
  { nome: 'TikTok',         hosts: ['tiktok.com'],                        busca: 'site:tiktok.com' },
  { nome: 'YouTube',        hosts: ['youtube.com', 'youtu.be'],           busca: 'site:youtube.com' },
  { nome: 'LinkedIn',       hosts: ['linkedin.com'],                      busca: 'site:linkedin.com' },
  { nome: 'Facebook',       hosts: ['facebook.com'],                      busca: 'site:facebook.com' },
  { nome: 'Google Reviews', hosts: ['google.com/maps', 'maps.google.com'], busca: null },
  { nome: 'Glassdoor',      hosts: ['glassdoor.com.br', 'glassdoor.com'], busca: null },
]

export function canalDoHost(host, url = '') {
  const h = String(host || '').toLowerCase().replace(/^www\./, '')
  const u = String(url || '').toLowerCase()
  const achado = CANAIS.find(c => c.hosts.some(d =>
    d.includes('/') ? u.includes(d) : (h === d || h.endsWith(`.${d}`))
  ))
  return achado ? achado.nome : 'Web'
}

// As consultas. São string literal, montada aqui e versionada aqui — não mais
// uma descrição em português que o modelo traduzia em algo diferente a cada vez.
//
// Duas famílias, porque elas pegam coisas distintas:
//  · ABERTAS — onde a percepção realmente mora. Notícia, blog, fórum,
//    agregador, alguém citando a marca. É o que mais rende.
//  · POR CANAL — `site:` no índice do Google, que é coisa diferente do `site:`
//    que falhou antes: aquele ia para a busca da Anthropic, que não tem o
//    conteúdo dessas plataformas. O Google tem, ainda que parcialmente. Com
//    janela de 7 dias muitos voltam vazios, e vazio aqui é resposta honesta.
export function montarQueries(marca, termos = []) {
  const m = `"${marca}"`
  const abertas = [
    m,
    `${m} (reclamação OR reclamar OR problema OR péssimo)`,
    `${m} (recomendo OR excelente OR adorei OR melhor)`,
    `${m} (opinião OR avaliação OR review OR "vale a pena")`,
  ]
  const porCanal = CANAIS.filter(c => c.busca).map(c => `${c.busca} ${m}`)
  // Termo extra do cliente entra como consulta aberta própria: ele existe
  // justamente para pegar o que o nome da marca sozinho não pega (apelido,
  // produto, hashtag, o domínio).
  const extras = termos.slice(0, 4).map(t => `"${t}"`)
  return [...abertas, ...porCanal, ...extras]
}

// Teto de itens que vão para a classificação. Segura o custo e o tempo da
// chamada; o Google devolve muito duplicado entre queries e a deduplicação já
// derruba boa parte antes daqui.
const TETO_CLASSIFICAR = 40

function promptClassificar(marca, itens) {
  // O trecho é VERBATIM quando a busca devolveu citação — a frase que a pessoa
  // escreveu, não um resumo. É o que separa "reclamam da entrega" de "fiz uma
  // compra dia 12 e não recebi".
  const lista = itens.map((r, i) =>
    `[${i}] ${r.canal} · ${r.host}\nTítulo: ${r.titulo}\n`
    + (r.trechos?.length ? `Passagens literais da página:\n${r.trechos.map(t => `  "${t}"`).join('\n')}`
                         : `Trecho: ${r.snippet}`)
  ).join('\n\n')

  return `Estes são resultados reais do índice do Google dos últimos ${JANELA_DIAS} dias.
Classifique cada um em relação à marca "${marca}".

${lista}

Devolva APENAS JSON, sem markdown:
{"itens":[{"i":<índice>,"relevante":true|false,"sentiment":"positivo|neutro|negativo","score_impacto":<1-10>,"resumo":"<até 300 chars>"}]}

Regras:
- "relevante": o resultado fala mesmo DESTA marca? Nome parecido, sigla igual, homônimo
  ou marca diferente no mesmo ramo → false. Na dúvida, false.
- Página institucional, catálogo ou anúncio da própria marca → relevante: false.
  O que interessa é PERCEPÇÃO: o que terceiros dizem, elogiam, reclamam ou noticiam.
- "resumo": descreva o que o trecho diz, na sua língua. NÃO invente detalhe que não
  esteja no título ou no trecho — você não abriu a página.
- "score_impacto": alcance e gravidade. Reclamação isolada é baixa; matéria em veículo
  grande ou viralizado é alta.
- Devolva um objeto para CADA índice, inclusive os irrelevantes.`
}

async function classificar(marca, itens) {
  const { text } = await callAI({
    // 'standard' e não 'fast': o juízo que carrega a rodada é o de RELEVÂNCIA
    // (homônimo, sigla igual, marca parecida no mesmo ramo), e errar ali suja o
    // banco. É uma chamada por rodada, não oito — dá para pagar o modelo bom.
    ...aiConfig('standard'),
    maxTokens: 4000,
    // Sem busca web: a classificação lê o que o Google trouxe e nada mais. Dar
    // busca aqui reabriria a porta que a inversão acabou de fechar.
    tools: undefined,
    messages: [{ role: 'user', content: promptClassificar(marca, itens) }],
  })
  const parsed = extractJSON(text)
  const juizos = new Map((parsed?.itens || []).map(j => [Number(j.i), j]))

  return itens.map((r, i) => {
    const j = juizos.get(i)
    if (!j || j.relevante === false) return null
    return {
      titulo:        (r.titulo || '').slice(0, 200),
      conteudo:      (j.resumo || r.snippet || '').slice(0, 500),
      fonte:         r.canal,
      sentiment:     ['positivo', 'negativo', 'neutro'].includes(j.sentiment) ? j.sentiment : 'neutro',
      score_impacto: Math.min(Math.max(Number(j.score_impacto) || 5, 1), 10),
      url:           r.url,
      publicado_em:  r.data,
      query:         r.query,
      // As passagens literais viajam junto com a menção. Elas são a EVIDÊNCIA:
      // permitem conferir depois que a menção existe mesmo, sem reabrir a
      // página — e é o que separa "reclamam da entrega" de "fiz uma compra dia
      // 12 e não recebi". A classificação parafraseia; isto é a fala.
      trechos:       r.trechos || [],
    }
  }).filter(Boolean)
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { workspace_id } = body
  if (!workspace_id) return { statusCode: 400 }

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }

  // Duas portas: o clique do usuário (token dele, checa participação no
  // workspace) e o cron (chave de serviço, que só existe no servidor).
  if (token !== process.env.SUPABASE_SERVICE_KEY) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return { statusCode: 401 }
    const [{ data: member }, { data: platformAdmin }] = await Promise.all([
      supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
      supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
    ])
    if (!member && !platformAdmin) return { statusCode: 403 }
  }

  const { data: ws } = await supabase
    .from('workspaces').select('id, nome, dominio').eq('id', workspace_id).single()
  if (!ws) return { statusCode: 404 }

  const { data: termsData } = await supabase
    .from('listening_terms').select('termo').eq('workspace_id', workspace_id)
  const termos = (termsData || []).map(t => t.termo).filter(Boolean)

  // Busca pelo NOME da marca. Era `ws.dominio || ws.nome` e o domínio ganhava:
  // a PES foi procurada como "https://www.pesenglish.com.br/". Ninguém escreve
  // a URL num post. O domínio segue útil como termo secundário — pega quem
  // compartilha link — e vai como host, sem protocolo nem barra.
  const marca = ws.nome || ws.dominio
  const host = (ws.dominio || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '')
  if (host && host !== marca) termos.push(host)

  const queries = montarQueries(marca, termos)
  // A busca vem da camada, não de um provedor fixo. Padrão é a própria
  // Anthropic — a mesma chave que já pagamos, sem cota nova para vigiar. O
  // Google fica disponível como adaptador se algum dia a janela de data por
  // índice (`dateRestrict`) valer a cota; hoje não vale.
  const { resultados, falhas, provedor } = await buscarNaWeb(queries, { dias: JANELA_DIAS })
  if (falhas.length) console.error(`[listening-bg] ${falhas.length} falha(s) na busca (${provedor}):`, falhas[0]?.erro)

  // Cota estourada não pode virar "a marca não teve barulho esta semana".
  if (falhas.some(f => f.motivo === 'cota')) {
    try { await sendAlert('listening', `cota:${workspace_id}`, `[${ws.nome}] cota de busca esgotada — a coleta desta rodada está incompleta`) } catch { /* best-effort */ }
  }
  if (falhas.length && !resultados.length) {
    console.error('[listening-bg] todas as consultas falharam — nada a classificar')
    return { statusCode: 502, body: JSON.stringify({ erro: falhas[0]?.erro || 'busca falhou' }) }
  }

  // Dedup dentro da rodada: as queries se sobrepõem de propósito e a mesma
  // página cai em várias.
  const vistos = new Set()
  let itens = resultados.filter(r => !vistos.has(r.url) && vistos.add(r.url))
    .map(r => ({ ...r, canal: canalDoHost(r.host, r.url) }))

  // Dedup contra o que já está no banco: sem isso o cron semanal regrava a mesma
  // menção toda semana enquanto ela seguir indexada.
  if (itens.length) {
    const { data: existentes } = await supabase
      .from('listening_events').select('url')
      .eq('workspace_id', workspace_id).in('url', itens.map(i => i.url))
    const jaTem = new Set((existentes || []).map(e => e.url))
    itens = itens.filter(i => !jaTem.has(i.url))
  }

  const cortados = Math.max(0, itens.length - TETO_CLASSIFICAR)
  if (cortados) console.log(`[listening-bg] ${cortados} resultado(s) além do teto de ${TETO_CLASSIFICAR} ficaram de fora`)
  itens = itens.slice(0, TETO_CLASSIFICAR)

  let eventos = []
  if (itens.length) {
    try {
      eventos = await classificar(marca, itens)
    } catch (e) {
      console.error('[listening-bg] classificação falhou:', e.message)
      return { statusCode: 502, body: JSON.stringify({ erro: 'classificação falhou' }) }
    }
  }

  if (eventos.length) {
    await supabase.from('listening_events').insert(
      eventos.map(e => ({
        workspace_id,
        titulo:        e.titulo,
        conteudo:      e.conteudo,
        fonte:         e.fonte,
        sentiment:     e.sentiment,
        sentimento:    e.sentiment,
        score_impacto: e.score_impacto,
        score:         e.score_impacto,
        url:           e.url,
        dados:         { ...e, origem: provedor, janela_dias: JANELA_DIAS },
      }))
    )
  }

  const total = eventos.length
  const pos   = eventos.filter(e => e.sentiment === 'positivo').length
  const neg   = eventos.filter(e => e.sentiment === 'negativo').length
  const neu   = total - pos - neg

  // O snapshot também é o sinal de conclusão para o poller da tela.
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
    periodo:       'semanal',
  })

  console.log(`[listening-bg] ${ws.nome}: ${queries.length} consultas → ${resultados.length} resultados → ${itens.length} novos → ${total} menções`)
  return { statusCode: 200, body: JSON.stringify({ consultas: queries.length, resultados: resultados.length, novos: itens.length, mencoes: total, falhas: falhas.length }) }
}
