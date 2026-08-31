import { describe, it, expect } from 'vitest'
import * as front from './parecer.js'
import * as back from '../../netlify/functions/_parecer.js'
import { normalizarVeredito, reprovou, VEREDITOS, VEREDITO_ANTIGO, TEXTO_MAX } from './parecer.js'

// Paridade front ↔ back, no molde do credits.parity.test.js: o front EXIBE o
// veredito e o back o GRAVA. Se driftarem, a tela diz uma coisa e a memória da
// marca guarda outra.
describe('paridade front ↔ back do vocabulário do parecer', () => {
  it('VEREDITOS idênticos',        () => expect(back.VEREDITOS).toEqual(front.VEREDITOS))
  it('VEREDITO_ANTIGO idêntico',   () => expect(back.VEREDITO_ANTIGO).toEqual(front.VEREDITO_ANTIGO))
  it('VEREDITO_ROTULO idêntico',   () => expect(back.VEREDITO_ROTULO).toEqual(front.VEREDITO_ROTULO))
  it('TEXTO_MAX idêntico',         () => expect(back.TEXTO_MAX).toBe(front.TEXTO_MAX))
  it('normalizarVeredito concorda em todo valor conhecido', () => {
    for (const v of [...VEREDITOS, ...Object.keys(VEREDITO_ANTIGO), 'xpto', '', null, undefined])
      expect(back.normalizarVeredito(v)).toBe(front.normalizarVeredito(v))
  })
})

describe('normalizarVeredito — a leitura dupla', () => {
  it('o vocabulário novo passa intacto', () => {
    expect(normalizarVeredito('aprovado')).toBe('aprovado')
    expect(normalizarVeredito('rechecar')).toBe('rechecar')
    expect(normalizarVeredito('reprovado')).toBe('reprovado')
  })

  it('o vocabulário antigo é traduzido — são os sinais art_review já gravados', () => {
    expect(normalizarVeredito('aprovada')).toBe('aprovado')
    expect(normalizarVeredito('reprovada')).toBe('reprovado')
  })

  // O valor do meio é o que motiva o módulo: "com ressalvas" e "rechecar" são o
  // mesmo lugar na fila (§2.2) — o núcleo sustenta, mas alguém precisa olhar.
  it('aprovada_com_ressalvas vira rechecar, não aprovado', () => {
    expect(normalizarVeredito('aprovada_com_ressalvas')).toBe('rechecar')
    expect(normalizarVeredito('aprovada_com_ressalvas')).not.toBe('aprovado')
  })

  it('tolera caixa e espaço — payload gravado por LLM não é confiável', () => {
    expect(normalizarVeredito('  APROVADA_COM_RESSALVAS ')).toBe('rechecar')
    expect(normalizarVeredito('Reprovado')).toBe('reprovado')
  })

  it('desconhecido vira null, nunca um chute', () => {
    for (const v of ['xpto', '', '   ', null, undefined, 0, {}])
      expect(normalizarVeredito(v)).toBeNull()
  })

  // A regressão que este teste existe para impedir: o StudioLibrary julgava
  // aprovação por `veredito.includes('aprov')`, o que fazia
  // "aprovada_com_ressalvas" contar como APROVADA na certidão da peça.
  it('nada que exija olho pode passar por aprovado', () => {
    for (const v of ['aprovada_com_ressalvas', 'rechecar'])
      expect(normalizarVeredito(v)).not.toBe('aprovado')
  })
})

describe('reprovou — o único veredito que ramifica comportamento', () => {
  it('reconhece reprovação nos dois vocabulários', () => {
    expect(reprovou('reprovado')).toBe(true)
    expect(reprovou('reprovada')).toBe(true)
  })
  it('o resto não interrompe o fluxo', () => {
    for (const v of ['aprovado', 'aprovada', 'rechecar', 'aprovada_com_ressalvas', 'xpto', null])
      expect(reprovou(v)).toBe(false)
  })
})

describe('o formato do parecer (§2.2)', () => {
  it('o texto cabe em 300 caracteres', () => expect(TEXTO_MAX).toBe(300))
  it('são três vereditos, sem score', () => expect(VEREDITOS).toHaveLength(3))
})
