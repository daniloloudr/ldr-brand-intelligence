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

  it('sem chave do Google a escuta PARA — não degrada', () => {
    // Foi o modo degradado silencioso que gravou 122 eventos inventados:
    // `standard` desligava a busca em dev e o modelo, sem como pesquisar,
    // preenchia o vazio. Coletor sem acesso ao índice não coleta.
    expect(fonte).toMatch(/if \(!googleConfigurado\(\)\)/)
    expect(fonte).toMatch(/statusCode: 503/)
  })
})

describe('a janela é de 7 dias, e é filtro de verdade', () => {
  it('a busca manda dateRestrict ao Google', () => {
    // Antes, "última semana" só dava para PEDIR no prompt — e pedido não filtra.
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

  it('todas as consultas falhando devolve erro, não snapshot zerado', () => {
    // Snapshot com 0 menções é uma AFIRMAÇÃO sobre a semana da marca. Só pode
    // ser gravado quando a busca de fato aconteceu e não achou nada.
    const i = fonte.indexOf('falhas.length === queries.length')
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

  it('entra pela porta interna, com a chave de serviço', () => {
    expect(cron).toMatch(/Bearer \$\{process\.env\.SUPABASE_SERVICE_KEY\}/)
    expect(fonte).toMatch(/token !== process\.env\.SUPABASE_SERVICE_KEY/)
  })

  it('não despacha sem chave do Google', () => {
    // 30 workers acordando só para disparar o mesmo alerta é 30 alertas.
    const antesDoFetch = cron.slice(0, cron.indexOf('Promise.allSettled'))
    expect(antesDoFetch).toMatch(/if \(!googleConfigurado\(\)\)/)
  })

  it('o watchdog sabe que ele existe', () => {
    // Cron que não roda é invisível: sem entrada no watchdog, a escuta pode
    // parar por semanas sem ninguém notar.
    expect(readFileSync('netlify/functions/cron-watchdog.js', 'utf8')).toMatch(/'listening-cron'/)
  })
})
