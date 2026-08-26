// ════════════════════════════════════════════════════════════════════
// Nenhuma background function pode ser disparada por um estranho.
//
// São endpoints HTTP públicos rodando com a SUPABASE_SERVICE_KEY, e o que elas
// fazem custa dinheiro: chamam Anthropic, fal e Voyage, e escrevem no banco de
// qualquer workspace. Nenhuma checava o chamador — bastava saber o caminho.
//
// Elas têm dois chamadores legítimos, e é isso que torna a correção menos óbvia
// do que "põe um segredo": o BROWSER (que manda Bearer do usuário e não pode
// receber segredo nenhum, porque tudo que chega ao frontend é público) e o
// SERVIDOR (crons e _studio, que não têm usuário para apresentar). O porteiro
// aceita as duas provas — e recusa a ausência das duas.
//
// O teste de cobertura no fim é o que segura isso no tempo: uma background
// function nova nasce protegida ou fica vermelha aqui.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { autorizarBackground, internalSecret, internalHeaders, HEADER_INTERNO } from '../netlify/functions/_interno.js'

const ORIGINAL = { ...process.env }
const DIR = 'netlify/functions'
const backgrounds = () => readdirSync(DIR).filter(f => f.endsWith('-background.js'))

beforeEach(() => {
  process.env.SUPABASE_SERVICE_KEY = 'chave-de-teste-para-derivar-o-segredo'
  process.env.SUPABASE_URL = 'https://exemplo-de-teste.supabase.co'
  delete process.env.INTERNAL_SECRET
})

afterEach(() => { process.env = { ...ORIGINAL } })

describe('o porteiro das background functions', () => {
  it('recusa chamada sem prova nenhuma', async () => {
    const r = await autorizarBackground({ headers: {} })
    expect(r.erro?.statusCode, 'chamada anônima passou').toBe(401)
  })

  it('recusa segredo interno errado', async () => {
    const r = await autorizarBackground({ headers: { [HEADER_INTERNO]: 'chute' } })
    expect(r.erro?.statusCode).toBe(401)
  })

  it('aceita o segredo interno certo (cron e servidor)', async () => {
    const r = await autorizarBackground({ headers: { [HEADER_INTERNO]: internalSecret() } })
    expect(r.erro).toBeUndefined()
    expect(r.interno).toBe(true)
    expect(r.user, 'chamada de servidor não tem usuário').toBeNull()
  })

  it('os headers que o servidor monta passam pelo porteiro', async () => {
    // Prova que as duas pontas concordam — o cron manda exatamente o que o
    // porteiro espera, sem alguém ter que lembrar do nome do header.
    const r = await autorizarBackground({ headers: internalHeaders() })
    expect(r.erro).toBeUndefined()
  })

  it('sem nada de onde derivar segredo, falha fechado', async () => {
    delete process.env.SUPABASE_SERVICE_KEY
    const r = await autorizarBackground({ headers: {} })
    expect(r.erro?.statusCode, 'sem segredo o porteiro precisa recusar, não liberar').toBe(500)
  })

  it('não confunde header vazio com segredo válido', async () => {
    // internalHeaders() devolve string vazia quando não há segredo. Se o
    // porteiro comparasse frouxo, '' === '' liberaria geral.
    delete process.env.SUPABASE_SERVICE_KEY
    const headers = internalHeaders()
    process.env.SUPABASE_SERVICE_KEY = 'chave-de-teste-para-derivar-o-segredo'
    const r = await autorizarBackground({ headers })
    expect(r.erro?.statusCode).toBe(401)
  })

  it('o segredo interno é diferente do segredo do webhook', async () => {
    // Mesma chave de origem, rótulos diferentes: vazar um não entrega o outro.
    const { webhookSecret } = await import('../netlify/functions/_studio.js')
    expect(internalSecret()).not.toBe(webhookSecret())
  })

  it('INTERNAL_SECRET tem precedência, para rotação', () => {
    process.env.INTERNAL_SECRET = 'rotacionado'
    expect(internalSecret()).toBe('rotacionado')
  })
})

describe('cobertura — toda background function tem porteiro', () => {
  it('encontra as background functions do projeto', () => {
    expect(backgrounds().length, 'nenhuma background encontrada — o caminho mudou?')
      .toBeGreaterThan(10)
  })

  it('todas chamam autorizarBackground antes de trabalhar', () => {
    const sem = backgrounds().filter(f => {
      const src = readFileSync(`${DIR}/${f}`, 'utf8')
      return !src.includes('autorizarBackground(event)')
    })
    expect(sem, `background function sem porteiro: ${sem.join(', ')}`).toEqual([])
  })

  it('e retornam o erro do porteiro em vez de seguir', () => {
    // Chamar o porteiro e ignorar o veredito seria pior que não chamar: parece
    // protegido em revisão e não está.
    const sem = backgrounds().filter(f => {
      const src = readFileSync(`${DIR}/${f}`, 'utf8')
      return !/if \(porteiro\.erro\) return porteiro\.erro/.test(src)
    })
    expect(sem, `chama o porteiro mas ignora o veredito: ${sem.join(', ')}`).toEqual([])
  })

  it('quem dispara do servidor manda o header interno', () => {
    // Um cron que continue mandando só Content-Type passa a levar 401 e o
    // trabalho agendado silenciosamente para de acontecer.
    const chamadores = readdirSync(DIR)
      .filter(f => f.endsWith('.js') && !f.endsWith('-background.js'))
      .filter(f => /functions\/[a-z-]+-background/.test(readFileSync(`${DIR}/${f}`, 'utf8')))

    const sem = chamadores.filter(f => !readFileSync(`${DIR}/${f}`, 'utf8').includes('internalHeaders('))
    expect(sem, `dispara background sem o header interno: ${sem.join(', ')}`).toEqual([])
  })
})
