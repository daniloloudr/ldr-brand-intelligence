// O menu do Estúdio só pode mostrar addon LIBERADO e VÁLIDO NESTA MARCA.
// A RLS (059) já impede vazamento entre workspaces; aqui a guarda é o degrau
// de dentro, entre marcas do MESMO workspace, que a RLS não vê.
import { describe, it, expect } from 'vitest'
import { ADDONS, acharAddon, estaLigado, valeNaMarca, addonsDoMenu } from '../src/lib/addons.js'

const MARCA_A = 'aaaa1111-0000-0000-0000-000000000001'
const MARCA_B = 'bbbb2222-0000-0000-0000-000000000002'
const slug = ADDONS[0].slug

describe('o catálogo mora no código', () => {
  it('todo addon tem slug, nome e resumo', () => {
    for (const a of ADDONS) {
      expect(a.slug, 'slug').toBeTruthy()
      expect(a.nome, `nome de ${a.slug}`).toBeTruthy()
      expect(a.resumo, `resumo de ${a.slug}`).toBeTruthy()
    }
  })
  it('nenhum slug repetido — o índice único do banco depende disso', () => {
    const slugs = ADDONS.map(a => a.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('slug fora do catálogo não resolve', () => {
    expect(acharAddon('nao-existe')).toBeNull()
  })
})

describe('o portão: só ATIVO liga', () => {
  it.each(['pedido', 'recusado', 'suspenso'])('%s não liga', estado => {
    expect(estaLigado({ estado })).toBe(false)
  })
  it('ativo liga', () => expect(estaLigado({ estado: 'ativo' })).toBe(true))
  it('suspenso some do menu sem perder a linha', () => {
    const menu = addonsDoMenu([{ addon: slug, estado: 'suspenso', brand_id: null }], MARCA_A)
    expect(menu).toHaveLength(0)
  })
})

describe('o escopo de marca', () => {
  it('brand_id nulo vale para TODAS as marcas do workspace', () => {
    expect(valeNaMarca({ brand_id: null }, MARCA_A)).toBe(true)
    expect(valeNaMarca({ brand_id: null }, MARCA_B)).toBe(true)
  })
  it('brand_id preenchido vale SÓ naquela marca', () => {
    expect(valeNaMarca({ brand_id: MARCA_A }, MARCA_A)).toBe(true)
    expect(valeNaMarca({ brand_id: MARCA_A }, MARCA_B)).toBe(false)
  })
  it('⭐ addon liberado para a marca A NÃO aparece na marca B', () => {
    const inst = [{ addon: slug, estado: 'ativo', brand_id: MARCA_A }]
    expect(addonsDoMenu(inst, MARCA_A).map(a => a.slug)).toEqual([slug])
    expect(addonsDoMenu(inst, MARCA_B)).toHaveLength(0)
  })
})

describe('linha órfã não quebra o menu', () => {
  it('instalação de slug que saiu do código é ignorada', () => {
    const inst = [{ addon: 'addon-descontinuado', estado: 'ativo', brand_id: null }]
    expect(addonsDoMenu(inst, MARCA_A)).toHaveLength(0)
  })
  it('lista vazia ou nula devolve vazio', () => {
    expect(addonsDoMenu([], MARCA_A)).toEqual([])
    expect(addonsDoMenu(null, MARCA_A)).toEqual([])
  })
})
