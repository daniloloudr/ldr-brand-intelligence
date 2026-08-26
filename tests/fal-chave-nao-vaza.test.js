// ════════════════════════════════════════════════════════════════════
// A chave da fal não sai de casa.
//
// Achado no security gate de 26/08, na véspera do deploy: o
// `studio-poll-background` recebia `status_url` e `response_url` do CORPO do
// request e os passava para `getJobStatus`/`getJobResult`, que fazem
// `fetch(url, { headers: { Authorization: 'Key <FAL_KEY>' } })`. Host e
// protocolo eram do chamador.
//
// O porteiro que tinha acabado de chegar fechou o acesso anônimo, mas ele
// aceita QUALQUER usuário autenticado — e este handler não confere participação
// no workspace da geração. Ou seja: qualquer cliente de qualquer tenant, com o
// próprio Bearer, apontava `status_url` para um servidor dele e recebia a nossa
// chave da fal no primeiro fetch. Dali em diante o gasto corre por fora do
// sistema de créditos. `169.254.169.254` alcançava o metadata da Lambda.
//
// Duas guardas, de propósito, porque protegem coisas diferentes:
//  · a URL é validada onde a CHAVE entra no fetch (_image.js) — assim qualquer
//    caminho futuro que reuse aquelas funções nasce protegido;
//  · o poll passa a exigir chamada INTERNA, porque o caminho de token de
//    usuário não servia a ninguém: os dois chamadores estão atrás de isDev() e
//    mandam internalHeaders(), e em produção quem finaliza é o webhook.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { urlDeJobDoFal } from '../netlify/functions/_image.js'

describe('a URL do job precisa ser do fal', () => {
  it('aceita a URL que o próprio fal devolve no submit', () => {
    const u = 'https://queue.fal.run/fal-ai/flux/requests/abc-123/status'
    expect(urlDeJobDoFal(u)).toBe(u)
  })

  it('nulo segue nulo — o chamador reconstrói a rota', () => {
    // Não é erro: é o fallback de compat que já existia.
    expect(urlDeJobDoFal(null)).toBeNull()
    expect(urlDeJobDoFal(undefined)).toBeNull()
    expect(urlDeJobDoFal('')).toBeNull()
  })

  it('RECUSA host de terceiro — é a exfiltração da chave', () => {
    expect(() => urlDeJobDoFal('https://atacante.tld/coleta'))
      .toThrow(/fora do fal/)
  })

  it('recusa o metadata da Lambda', () => {
    expect(() => urlDeJobDoFal('http://169.254.169.254/latest/meta-data/'))
      .toThrow(/fora do fal/)
  })

  it('recusa http no host certo — a chave não viaja em claro', () => {
    // `origin` inclui o esquema, então downgrade para http é outro origin.
    expect(() => urlDeJobDoFal('http://queue.fal.run/fal-ai/x/requests/y/status'))
      .toThrow(/fora do fal/)
  })

  it('recusa subdomínio parecido', () => {
    expect(() => urlDeJobDoFal('https://queue.fal.run.atacante.tld/x'))
      .toThrow(/fora do fal/)
  })

  it('recusa lixo que não é URL', () => {
    expect(() => urlDeJobDoFal('não é url')).toThrow(/inválida/)
  })
})

describe('as duas funções que carregam a chave usam a guarda', () => {
  const src = readFileSync('netlify/functions/_image.js', 'utf8')

  it('getJobStatus não usa a URL crua', () => {
    const corpo = src.slice(src.indexOf('export async function getJobStatus'))
      .slice(0, src.slice(src.indexOf('export async function getJobStatus')).indexOf('\n}'))
    expect(corpo, 'statusUrl chegou ao fetch sem passar pela guarda')
      .toMatch(/urlDeJobDoFal\(statusUrl\)/)
  })

  it('getJobResult não usa a URL crua', () => {
    const corpo = src.slice(src.indexOf('export async function getJobResult'))
      .slice(0, src.slice(src.indexOf('export async function getJobResult')).indexOf('\n}'))
    expect(corpo, 'resultUrl chegou ao fetch sem passar pela guarda')
      .toMatch(/urlDeJobDoFal\(resultUrl\)/)
  })
})

describe('o poll do Studio é chamada de servidor, não de usuário', () => {
  const src = readFileSync('netlify/functions/studio-poll-background.js', 'utf8')

  it('exige o segredo interno, não só um token qualquer', () => {
    expect(src, 'token de usuário volta a valer neste endpoint')
      .toMatch(/if \(!porteiro\.interno\)/)
  })

  it('recusa antes de ler o corpo do request', () => {
    // Ordem importa: conferir depois de já ter usado `status_url` não protege
    // nada. A recusa tem que vir antes do JSON.parse.
    expect(src.indexOf('porteiro.interno')).toBeLessThan(src.indexOf('JSON.parse'))
  })
})
