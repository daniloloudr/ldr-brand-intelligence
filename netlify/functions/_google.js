// _google.js — busca no índice do Google (Programmable Search / Custom Search JSON API).
//
// POR QUE ISSO EXISTE
// A escuta usava a busca da Anthropic e pedia menções em prosa. Três problemas
// estruturais, nessa ordem de gravidade:
//   1. A URL vinha da RESPOSTA DO MODELO, não do resultado da busca. Modelo que
//      escreve link escreve link plausível. Foi assim que a PES ganhou 9 queixas
//      de cancelamento que ninguém escreveu.
//   2. Não havia filtro de data. "Última semana" só dava para PEDIR, e pedido
//      não é filtro — voltava material de 2019 misturado com o de ontem.
//   3. Não controlávamos a query. Descrevíamos a intenção e o modelo decidia o
//      que digitar; duas rodadas iguais buscavam coisas diferentes.
//
// Com o índice do Google os três somem de uma vez: a URL É o resultado (ninguém
// a escreve), `dateRestrict` é filtro de verdade aplicado pelo índice, e a query
// é string que a gente monta e versiona.
//
// A partir daqui o modelo não coleta mais — ele só LÊ o que o Google devolveu e
// classifica. Ele não tem como inventar uma menção porque não tem como inventar
// uma linha na resposta do Google.
//
// SETUP (uma vez): GOOGLE_SEARCH_KEY (API key do Cloud, com a Custom Search API
// habilitada) e GOOGLE_SEARCH_CX (id de um Programmable Search Engine com
// "Pesquisar em toda a web" LIGADO — sem isso ele só procura nos sites que você
// listar e devolve vazio para tudo).
//
// Cota: 100 consultas/dia grátis, depois US$ 5 / mil, teto de 10 mil/dia.

const ENDPOINT = 'https://www.googleapis.com/customsearch/v1'

export const googleConfigurado = () =>
  !!(process.env.GOOGLE_SEARCH_KEY && process.env.GOOGLE_SEARCH_CX)

export class GoogleSearchError extends Error {
  constructor(message, { status = null, motivo = null } = {}) {
    super(message)
    this.name = 'GoogleSearchError'
    this.status = status
    this.motivo = motivo
  }
}

// A API devolve o erro real dentro do corpo; o status sozinho não distingue
// "acabou a cota" de "chave errada", e essas duas pedem ações opostas.
function humanizar(status, corpo) {
  const msg = corpo?.error?.message || ''
  const razao = corpo?.error?.errors?.[0]?.reason || ''
  if (status === 429 || /quota|rateLimit/i.test(razao)) {
    return { motivo: 'cota', texto: 'cota diária do Google esgotada (100 buscas/dia no plano grátis)' }
  }
  if (status === 403 && /disabled|not been used/i.test(msg)) {
    return { motivo: 'api_desligada', texto: 'a Custom Search API não está habilitada neste projeto do Google Cloud' }
  }
  if (status === 400 && /Invalid Value|cx/i.test(msg)) {
    return { motivo: 'cx', texto: 'GOOGLE_SEARCH_CX inválido' }
  }
  if (status === 400 || status === 403) {
    return { motivo: 'chave', texto: `GOOGLE_SEARCH_KEY recusada pelo Google: ${msg || status}` }
  }
  return { motivo: 'http', texto: `Google respondeu ${status}${msg ? `: ${msg}` : ''}` }
}

// Data de publicação, quando o índice tem. Best-effort: serve para ordenar e
// para mostrar "de quando é", nunca como filtro — quem filtra é o dateRestrict.
function dataDoItem(item) {
  const meta = item.pagemap?.metatags?.[0] || {}
  const bruto = meta['article:published_time'] || meta['og:updated_time']
            || meta['datepublished'] || meta['date']
            || item.pagemap?.newsarticle?.[0]?.datepublished
  if (!bruto) return null
  const d = new Date(bruto)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Uma consulta no índice do Google.
 *
 * @param {string} q            a query, literalmente como vai para o Google
 * @param {object} opts
 * @param {number} opts.dias    janela do índice (dateRestrict=d{n}); 7 = a última semana
 * @param {number} opts.num     resultados (teto de 10 por consulta na API)
 * @param {boolean} opts.recentesPrimeiro  ordena por data em vez de relevância
 * @returns {Promise<Array<{titulo,url,snippet,host,data,query}>>}
 */
export async function buscar(q, { dias = 7, num = 10, recentesPrimeiro = false } = {}) {
  if (!googleConfigurado()) {
    throw new GoogleSearchError('busca do Google não configurada', { motivo: 'sem_config' })
  }

  const params = new URLSearchParams({
    key: process.env.GOOGLE_SEARCH_KEY,
    cx:  process.env.GOOGLE_SEARCH_CX,
    q,
    num: String(Math.min(Math.max(num, 1), 10)),
    hl:  'pt-BR',   // idioma da interface
    gl:  'br',      // país — muda o ranking, e a escuta é de marca brasileira
    safe: 'off',    // reclamação real usa palavrão; filtrar aqui é filtrar percepção
  })
  // O filtro que a busca do modelo não tinha. d7 = indexado nos últimos 7 dias.
  if (dias) params.set('dateRestrict', `d${dias}`)
  if (recentesPrimeiro) params.set('sort', 'date')

  const res = await fetch(`${ENDPOINT}?${params}`)
  let corpo = null
  try { corpo = await res.json() } catch { /* corpo não-JSON cai no humanizar */ }

  if (!res.ok) {
    const { motivo, texto } = humanizar(res.status, corpo)
    throw new GoogleSearchError(texto, { status: res.status, motivo })
  }

  // Zero resultado é resposta legítima e comum com janela de 7 dias: o Google
  // omite `items` inteiro em vez de mandar lista vazia.
  return (corpo?.items || []).map(item => ({
    titulo:  item.title || '',
    url:     item.link || '',
    snippet: (item.snippet || '').replace(/\s+/g, ' ').trim(),
    host:    (item.displayLink || '').replace(/^www\./i, ''),
    data:    dataDoItem(item),
    query:   q,
  })).filter(r => /^https?:\/\//i.test(r.url))
}

/**
 * Várias consultas, com as falhas isoladas. Uma query que estoura cota não pode
 * derrubar a rodada inteira — mas a gente precisa SABER que ela estourou, senão
 * "não achei nada" e "nem procurei" viram a mesma coisa na tela.
 *
 * @returns {Promise<{resultados: Array, falhas: Array<{query,motivo,erro}>}>}
 */
export async function buscarVarias(queries, opts = {}) {
  const saidas = await Promise.allSettled(queries.map(q => buscar(q, opts)))
  const resultados = []
  const falhas = []
  saidas.forEach((s, i) => {
    if (s.status === 'fulfilled') resultados.push(...s.value)
    else falhas.push({ query: queries[i], motivo: s.reason?.motivo || 'erro', erro: s.reason?.message })
  })
  return { resultados, falhas }
}
