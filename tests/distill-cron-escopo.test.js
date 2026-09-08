import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────
// A destilação passou a filtrar por escopo (migration 058, §3.5). O cron que a
// dispara contava sinais POR MARCA — e essas duas coisas juntas são um laço
// eterno, não um bug de contagem:
//
//   os sinais de campanha entram na conta da marca → a marca fica acima do
//   limiar → o cron dispara → a destilação da marca lê só `campanha_id is
//   null` e não consome nenhum deles → amanhã a conta está igual.
//
// Todo dia, para sempre, gastando chamada de LLM para não consumir nada. E
// nada nisso parece errado de fora: o cron loga sucesso, a marca "tem sinais
// novos", ninguém vê. É por isso que a asserção aqui é sobre O QUE FOI
// DISPARADO, não sobre a conta.

let sinais = []
let erroLeitura = null
const disparos = []

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const q = {
        select() { return q }, is() { return q }, not() { return q },
        then: (res, rej) => Promise.resolve(
          erroLeitura ? { data: null, error: erroLeitura } : { data: sinais, error: null }
        ).then(res, rej),
      }
      return q
    },
  }),
}))
vi.mock('../netlify/functions/_watchdog.js', () => ({ withHeartbeat: (_n, fn) => fn }))
vi.mock('../netlify/functions/_studio.js',   () => ({ siteBase: () => 'https://exemplo' }))
vi.mock('../netlify/functions/_interno.js',  () => ({ internalHeaders: () => ({ 'x-interno': 'ok' }) }))

globalThis.fetch = vi.fn(async (_url, opts) => { disparos.push(JSON.parse(opts.body)); return { ok: true } })

const { handler } = await import('../netlify/functions/brand-distill-cron.js')

const MARCA = 'marca-1'
const CAMP  = 'campanha-1'
const daMarca    = { brand_id: MARCA, campanha_id: null }
const daCampanha = { brand_id: MARCA, campanha_id: CAMP }

beforeEach(() => { disparos.length = 0; erroLeitura = null; process.env.BRAND_DISTILL_THRESHOLD = '5' })

describe('brand-distill-cron conta e dispara POR ESCOPO', () => {
  it('sinal de campanha não empurra a MARCA acima do limiar', async () => {
    // 4 da marca (abaixo de 5) + 4 da campanha (abaixo de 5). Contando por
    // marca daria 8 e dispararia a marca — que não consumiria nada.
    sinais = [...Array(4).fill(daMarca), ...Array(4).fill(daCampanha)]
    await handler()
    expect(disparos).toEqual([])
  })

  it('cada escopo é disparado sozinho, com o seu campanha_id', async () => {
    sinais = [...Array(5).fill(daMarca), ...Array(6).fill(daCampanha)]
    await handler()
    expect(disparos).toContainEqual({ brand_id: MARCA })
    expect(disparos).toContainEqual({ brand_id: MARCA, campanha_id: CAMP })
    expect(disparos).toHaveLength(2)
  })

  it('só a campanha acima do limiar: a marca não é destilada de carona', async () => {
    sinais = [daMarca, ...Array(7).fill(daCampanha)]
    await handler()
    expect(disparos).toEqual([{ brand_id: MARCA, campanha_id: CAMP }])
  })

  it('duas campanhas da mesma marca não se somam', async () => {
    sinais = [...Array(3).fill(daCampanha), ...Array(3).fill({ brand_id: MARCA, campanha_id: 'campanha-2' })]
    await handler()
    expect(disparos).toEqual([])
  })
})

// A 058 foi segurada (decisão de 08/set: nada de campanha sobe por ora), mas o
// código do escopo está no ar. Nessa janela a coluna `campanha_id` não existe e
// o select falha — e isso é DECISÃO, não defeito: o cron responde 200, loga o
// porquê e deixa os sinais acumularem para quando a migration subir. Um 500
// diário de scheduler seria alarme aceso permanente por uma escolha registrada.
describe('a janela sem a migration 058', () => {
  it('⭐ coluna de escopo ausente: 200 silencioso, nada disparado', async () => {
    erroLeitura = { message: 'column brand_signals.campanha_id does not exist' }
    const r = await handler()
    expect(r.statusCode).toBe(200)
    expect(JSON.parse(r.body).adiado).toBe('058 pendente')
    expect(disparos).toEqual([])
  })

  it('erro de leitura de VERDADE continua sendo 500 — não vira pausa', async () => {
    erroLeitura = { message: 'connection refused' }
    const r = await handler()
    expect(r.statusCode).toBe(500)
    expect(disparos).toEqual([])
  })
})
