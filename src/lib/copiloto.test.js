import { describe, it, expect } from 'vitest'
import { contextoDoLugar, blocoDeContexto } from './copiloto.js'
import { getRoute } from './helpers.js'

// A garantia que estes testes existem para dar: o painel e o system prompt saem
// do MESMO objeto. Se um dia alguém derivar o texto do modelo de outra fonte,
// o teste de coerência abaixo quebra.

describe('contextoDoLugar — o lugar declara o que sabe', () => {
  it('rota conhecida → nível lugar, com rótulo e o que sabe', () => {
    const ctx = contextoDoLugar({ route: 'brands-studio-campaigns', brandNome: 'Hering' })
    expect(ctx.nivel).toBe('lugar')
    expect(ctx.rotulo).toBe('Hering · Campanhas')
    expect(ctx.sabe).toContain('objetivo')
  })

  it('o rótulo encadeia marca · lugar · id curto', () => {
    const ctx = contextoDoLugar({
      route: 'brands-campaign-detail', brandNome: 'Hering',
      campaignId: 'a1b2c3d4-5555-6666-7777-888899990000',
    })
    expect(ctx.rotulo).toBe('Hering · Campanha · #a1b2c3d4')
  })

  it('seção só entra na Estratégia — nas outras rotas é ruído', () => {
    expect(contextoDoLugar({ route: 'brands-detail', brandNome: 'Hering', section: 'negocio' }).rotulo)
      .toBe('Hering · Estratégia · negocio')
    expect(contextoDoLugar({ route: 'brands-studio', brandNome: 'Hering', section: 'studio' }).rotulo)
      .toBe('Hering · Criar')
  })

  it('sem marca, o rótulo não vira "· ·"', () => {
    const ctx = contextoDoLugar({ route: 'brands-studio' })
    expect(ctx.rotulo).toBe('Criar')
    expect(ctx.rotulo).not.toMatch(/^ ·|· ·|· $/)
  })

  it('rota desconhecida cai na marca, não quebra', () => {
    const ctx = contextoDoLugar({ route: 'conta', brandNome: 'Hering' })
    expect(ctx.nivel).toBe('marca')
    expect(ctx.lugar).toBeNull()
    expect(ctx.rotulo).toBe('Hering')
  })

  it('sem argumento nenhum devolve o contexto de marca vazio', () => {
    expect(contextoDoLugar().nivel).toBe('marca')
    expect(contextoDoLugar().rotulo).toBe('Marca')
  })

  it("nível 'marca' ignora o lugar — é o usuário REDUZINDO o contexto", () => {
    const ctx = contextoDoLugar({ route: 'brands-studio-workflow', brandNome: 'Hering', nivel: 'marca' })
    expect(ctx.lugar).toBeNull()
    expect(ctx.rotulo).toBe('Hering')
  })
})

describe('blocoDeContexto — o que o modelo lê', () => {
  it('nível marca não manda bloco: é o Copiloto de antes desta camada', () => {
    expect(blocoDeContexto(contextoDoLugar({ route: 'conta', brandNome: 'Hering' }))).toBe('')
    expect(blocoDeContexto(null)).toBe('')
    expect(blocoDeContexto(undefined)).toBe('')
  })

  it('o bloco carrega o MESMO rótulo e o MESMO "sabe" que o painel mostra', () => {
    const ctx = contextoDoLugar({ route: 'brands-studio-biblioteca', brandNome: 'Hering' })
    const bloco = blocoDeContexto(ctx)
    expect(bloco).toContain(ctx.rotulo)
    ctx.sabe.forEach(s => expect(bloco).toContain(s))
  })

  it('manda responder ao foco, mas não recusar o que está fora dele', () => {
    const bloco = blocoDeContexto(contextoDoLugar({ route: 'brands-studio', brandNome: 'Hering' }))
    expect(bloco).toContain('responda mesmo assim')
  })
})

describe('o mapa de lugares fala a mesma língua do roteador', () => {
  // Um lugar que não existe em getRoute() nunca seria alcançado — seria uma
  // linha morta no mapa, e o Copiloto ficaria mudo naquela tela sem ninguém ver.
  const ROTAS = [
    ['/app', 'app-home'],
    ['/app/reports', 'reports'],
    ['/app/competitors', 'competitors'],
    ['/app/market-intel', 'market-intel'],
    ['/app/listening', 'listening'],
    ['/app/insights', 'insights'],
    ['/app/trends', 'trends'],
    ['/app/content-hub', 'content-hub'],
    ['/app/brands/b1', 'brands-detail'],
    ['/app/brands/b1/studio', 'brands-studio'],
    ['/app/brands/b1/studio/video', 'brands-studio-video'],
    ['/app/brands/b1/studio/writing', 'brands-studio-writing'],
    ['/app/brands/b1/studio/workflow', 'brands-studio-workflow'],
    ['/app/brands/b1/studio/campanhas', 'brands-studio-campaigns'],
    ['/app/brands/b1/studio/biblioteca', 'brands-studio-biblioteca'],
    ['/app/brands/b1/studio/assets', 'brands-studio-assets'],
    ['/app/brands/b1/campaigns/c1', 'brands-campaign-detail'],
  ]

  it.each(ROTAS)('%s resolve para %s, e esse lugar tem contexto', (path, esperada) => {
    global.window = { location: { pathname: path, search: '' } }
    try {
      expect(getRoute()).toBe(esperada)
      expect(contextoDoLugar({ route: esperada, brandNome: 'Hering' }).nivel).toBe('lugar')
    } finally { delete global.window }
  })
})
