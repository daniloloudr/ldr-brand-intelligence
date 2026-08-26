import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { canalDoHost, montarQueries } from '../netlify/functions/listening-coletar-background.js'

const fonte = readFileSync('netlify/functions/listening-coletar-background.js', 'utf8')
const google = readFileSync('netlify/functions/_google.js', 'utf8')

describe('quem coleta é o Google, quem classifica é o modelo', () => {
  it('a URL não passa mais pela cabeça do modelo', () => {
    // A raiz de tudo: o esquema antigo pedia `"url":"https://..."` ao modelo, e
    // modelo que escreve link escreve link plausível. A PES ganhou 9 queixas de
    // cancelamento que ninguém escreveu. Agora a URL vem do índice.
    const prompt = fonte.slice(fonte.indexOf('function promptClassificar'), fonte.indexOf('async function classificar'))
    expect(prompt).not.toMatch(/"url"/)
    expect(prompt).toMatch(/NÃO invente detalhe/)
  })

  it('a classificação roda sem busca web', () => {
    // Dar busca ao classificador reabriria a porta que a inversão fechou: ele
    // sairia procurando e voltaria com coisa que o Google não trouxe.
    const bloco = fonte.slice(fonte.indexOf('async function classificar'), fonte.indexOf('export const handler'))
    expect(bloco).toMatch(/tools:\s*undefined/)
  })

  it('a busca vem da camada, não de um provedor fixo', () => {
    // Decisão do Danilo: "o google será gargalo, vamos controlar via websearch".
    // O padrão passa a ser a busca da própria Anthropic — mesma chave que todo
    // o resto já exige, sem cota nova. O Google continua como adaptador.
    expect(fonte).toContain("import { buscarNaWeb, provedorDeBusca } from './_busca.js'")
    expect(fonte).not.toMatch(/googleConfigurado/)
  })

  it('a URL continua vindo do índice, nunca do modelo', () => {
    // A propriedade que importa não depende do provedor: ela vem de LER os
    // blocos estruturados em vez da prosa. Foi ler só a prosa que fez a escuta
    // gravar link inventado.
    const busca = readFileSync('netlify/functions/_busca.js', 'utf8')
    expect(busca).toMatch(/b\.type === 'web_search_tool_result'/)
    expect(busca).toMatch(/cited_text/)
  })
})

describe('a janela é de 7 dias, e é filtro de verdade', () => {
  it('o adaptador Google, quando usado, manda dateRestrict', () => {
    // Ele deixou de ser o padrão, mas segue disponível — e a janela por índice
    // é a única coisa que ele faz e a Anthropic não faz.
    expect(google).toMatch(/params\.set\('dateRestrict', `d\$\{dias\}`\)/)
  })

  it('a janela do coletor é 7 e casa com o cron semanal', () => {
    expect(fonte).toMatch(/const JANELA_DIAS = 7/)
    const toml = readFileSync('netlify.toml', 'utf8')
    expect(toml).toMatch(/\[functions\."listening-cron"\][\s\S]*?schedule = "0 5 \* \* 1"/)
  })
})

describe('o canal é derivado do host, não adivinhado', () => {
  it('reconhece as plataformas pelo domínio do resultado', () => {
    expect(canalDoHost('www.reclameaqui.com.br')).toBe('Reclame Aqui')
    expect(canalDoHost('x.com')).toBe('Twitter/X')
    expect(canalDoHost('twitter.com')).toBe('Twitter/X')
    expect(canalDoHost('br.linkedin.com')).toBe('LinkedIn')
    expect(canalDoHost('m.youtube.com')).toBe('YouTube')
  })

  it('subdomínio conta, sufixo parecido não', () => {
    expect(canalDoHost('business.instagram.com')).toBe('Instagram')
    // "naoinstagram.com" não é o Instagram — o casamento é por rótulo de
    // domínio, não por `includes`.
    expect(canalDoHost('naoinstagram.com')).toBe('Web')
  })

  it('o que não é plataforma conhecida é Web, não palpite', () => {
    expect(canalDoHost('g1.globo.com')).toBe('Web')
    expect(canalDoHost('')).toBe('Web')
  })
})

describe('as queries são string nossa, versionada', () => {
  const qs = montarQueries('PES English', ['pesenglish.com.br'])

  it('o nome da marca vai entre aspas em toda consulta', () => {
    // Sem aspas, "PES English" vira busca por qualquer página com as duas
    // palavras soltas.
    expect(qs.every(q => q.includes('"'))).toBe(true)
    expect(qs).toContain('"PES English"')
  })

  it('busca aberta E por canal — as duas famílias', () => {
    expect(qs.some(q => /reclamação/.test(q))).toBe(true)
    expect(qs.some(q => q.startsWith('site:reclameaqui.com.br'))).toBe(true)
    expect(qs.some(q => q.startsWith('site:x.com OR site:twitter.com'))).toBe(true)
  })

  it('o termo do cliente vira consulta própria', () => {
    // Ele existe para pegar o que o nome sozinho não pega: apelido, produto,
    // hashtag, o domínio.
    expect(qs).toContain('"pesenglish.com.br"')
  })

  it('marca sem termo extra ainda tem consulta', () => {
    expect(montarQueries('Vhita').length).toBeGreaterThan(5)
  })
})

describe('por qual termo a escuta procura', () => {
  it('o NOME vem antes do domínio', () => {
    // Era `ws.dominio || ws.nome`: a PES foi procurada como
    // "https://www.pesenglish.com.br/" no Instagram e voltou vazia. Ninguém
    // escreve a URL num post.
    expect(fonte).toContain('const marca = ws.nome || ws.dominio')
    expect(fonte).not.toContain('const marca = ws.dominio || ws.nome')
  })
})

describe('falha de busca não pode virar silêncio de mercado', () => {
  it('cota estourada dispara alerta em vez de "nada encontrado"', () => {
    expect(fonte).toMatch(/f\.motivo === 'cota'/)
    expect(fonte).toMatch(/sendAlert\('listening', `cota:/)
  })

  it('busca falhando devolve erro, não snapshot zerado', () => {
    // Snapshot com 0 menções é uma AFIRMAÇÃO sobre a semana da marca. Só pode
    // ser gravado quando a busca de fato aconteceu e não achou nada.
    const i = fonte.indexOf('falhas.length && !resultados.length')
    const j = fonte.indexOf('sentiment_snapshots')
    expect(i).toBeGreaterThan(0)
    expect(i).toBeLessThan(j)
    expect(fonte.slice(i, i + 300)).toMatch(/statusCode: 502/)
  })

  it('uma consulta que falha não derruba as outras', () => {
    expect(google).toMatch(/Promise\.allSettled/)
  })
})

describe('o cron semanal', () => {
  const cron = readFileSync('netlify/functions/listening-cron.js', 'utf8')

  it('é despachante puro — um worker por workspace', () => {
    // Loop serial numa função só estoura o teto de 15 min bem antes de 30 marcas.
    expect(cron).toMatch(/Promise\.allSettled/)
    expect(cron).toMatch(/listening-coletar-background/)
  })

  it('entra pela porta interna — sem jogar a chave de serviço na rede', () => {
    // Era `Bearer ${SUPABASE_SERVICE_KEY}`: a chave que abre o banco inteiro
    // viajava em todo disparo agendado, e qualquer log de intermediário a
    // guardava. Agora vai um segredo DERIVADO dela (ver _interno.js), que abre
    // só as background functions.
    expect(cron).toMatch(/internalHeaders\(\)/)
    expect(cron, 'a chave de serviço voltou para o header').not.toMatch(/Bearer \$\{process\.env\.SUPABASE_SERVICE_KEY\}/)
    expect(fonte, 'o worker precisa distinguir chamada interna de clique de usuário').toMatch(/porteiro\.interno/)
  })

  it('registra qual provedor de busca usou', () => {
    // Não há mais porta de configuração para travar — a busca padrão usa a
    // chave da Anthropic que todo o resto já exige. Mas o provedor precisa
    // aparecer no histórico do cron, para que uma troca futura seja rastreável.
    const antesDoFetch = cron.slice(0, cron.indexOf('Promise.allSettled'))
    expect(antesDoFetch).toMatch(/provedorDeBusca\(\)/)
    expect(cron).not.toMatch(/googleConfigurado/)
  })

  it('o watchdog sabe que ele existe', () => {
    // Cron que não roda é invisível: sem entrada no watchdog, a escuta pode
    // parar por semanas sem ninguém notar.
    expect(readFileSync('netlify/functions/cron-watchdog.js', 'utf8')).toMatch(/'listening-cron'/)
  })
})

describe('a menção guarda a evidência', () => {
  it('o provedor gravado é o que de fato buscou', () => {
    // Estava literal `origem: 'google'` mesmo quando quem buscou foi a
    // Anthropic — o dado mentia sobre a própria procedência.
    expect(fonte).toMatch(/origem: provedor/)
    expect(fonte).not.toMatch(/origem: 'google'/)
  })

  it('as passagens literais viajam junto com a menção', () => {
    // A classificação parafraseia. O trecho verbatim é a fala de quem escreveu,
    // e é o que permite conferir a menção depois sem reabrir a página.
    const classificar = fonte.slice(fonte.indexOf('async function classificar'), fonte.indexOf('export const handler'))
    expect(classificar).toMatch(/trechos:\s+r\.trechos \|\| \[\]/)
  })
})

describe('o alerta de indisponibilidade do provedor', () => {
  const ai = readFileSync('netlify/functions/_ai.js', 'utf8')
  const wd = readFileSync('netlify/functions/_watchdog.js', 'utf8')

  it('existe e distingue "a reserva salvou" de "o usuário perdeu"', () => {
    // Havia alerta para SALDO e nenhum para indisponibilidade: 5xx e 529
    // passavam mudos e a queda era descoberta pelo cliente ligando.
    expect(wd).toMatch(/export async function alertIfProviderDown/)
    expect(wd).toMatch(/sobreviveu/)
  })

  it('dispara nos dois caminhos de chamada', () => {
    expect(ai.slice(ai.indexOf('export async function callAI'), ai.indexOf('export async function streamAI')))
      .toMatch(/alertIfProviderDown/)
    expect(ai.slice(ai.indexOf('export async function streamAI'))).toMatch(/alertIfProviderDown/)
  })

  it('só alerta em falha de disponibilidade, não em erro de pedido', () => {
    // 400/401 é culpa nossa, não queda do provedor. Alertar neles vira ruído
    // e esconde a queda de verdade no meio.
    // Ancorar nas DECLARAÇÕES: `indexOf('alertIfBalanceError')` pegava uma
    // ocorrência anterior no arquivo e a fatia vinha vazia — teste que compara
    // string vazia com regex falha por acidente, não por mérito.
    const ini = wd.indexOf('export async function alertIfProviderDown')
    const fim = wd.indexOf('export async function alertIfBalanceError')
    const bloco = wd.slice(ini, fim > ini ? fim : undefined)
    expect(bloco).toMatch(/\[429, 500, 502, 503, 504, 529\]/)
  })
})
