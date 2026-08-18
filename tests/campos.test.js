import { describe, it, expect } from 'vitest'
import { ESSENCIA, FUNCAO, PERSONALIDADE, EXPRESSAO_VERBAL, TODOS } from '../src/pages/app/campos'
import { SECOES } from '../netlify/functions/_smartbrand.js'

const endereco = c => `${c.col}.${c.k}`

describe('um campo, um lugar', () => {
  it('nenhum campo aparece em duas telas', () => {
    // Era o estado anterior: propósito, missão, visão, valores, posicionamento,
    // proposta de valor, personalidade, atributos de tom, personas e público
    // viviam em DUAS telas. A pessoa não sabia qual valia, e uma pendência que
    // apontasse "Visão" não tinha para onde apontar.
    const vistos = new Map()
    const repetidos = []
    for (const [tela, mapa] of Object.entries({ ESSENCIA, FUNCAO, PERSONALIDADE, EXPRESSAO_VERBAL })) {
      for (const c of mapa.filter(x => x.k)) {
        const e = endereco(c)
        if (vistos.has(e)) repetidos.push(`${e}: ${vistos.get(e)} + ${tela}`)
        else vistos.set(e, tela)
      }
    }
    expect(repetidos).toEqual([])
  })

  it('todo campo declara coluna, chave e rótulo', () => {
    for (const c of TODOS) {
      expect(c.col, JSON.stringify(c)).toMatch(/^(verbal_identity|strategy)$/)
      expect(c.k, JSON.stringify(c)).toBeTruthy()
      expect(c.label, c.k).toBeTruthy()
    }
  })

  it('lista de itens declara as colunas dela', () => {
    for (const c of TODOS.filter(x => x.tipo === 'itens')) {
      expect(Array.isArray(c.fields), c.k).toBe(true)
      expect(c.fields.length, c.k).toBeGreaterThan(0)
      for (const f of c.fields) expect(f.key && f.label, `${c.k}.${f.key}`).toBeTruthy()
    }
  })
})

describe('o que a extração escreve tem onde ser editado', () => {
  // Sem isto, o manual preenche um campo que ninguém consegue corrigir — e a
  // pendência aponta para uma tela onde ele não existe.
  const editaveis = new Set(TODOS.map(endereco))

  it('todo campo verbal do smartbrand tem tela', () => {
    const doManual = SECOES
      .filter(s => s.de === 'verbal_identity')
      .flatMap(s => s.campos.map(([k]) => `verbal_identity.${k}`))
    const semTela = doManual.filter(e => !editaveis.has(e))
    expect(semTela).toEqual([])
  })

  it('as personas do manual caem na coluna que a tela edita', () => {
    // O bug que motivou o mapa: a extração escrevia em verbal_identity.personas
    // e a tela de Função lia strategy.personas — listas diferentes da mesma coisa.
    const persona = TODOS.find(c => c.k === 'personas')
    expect(persona.col).toBe('verbal_identity')
    expect(TODOS.filter(c => c.k === 'personas')).toHaveLength(1)
  })
})
