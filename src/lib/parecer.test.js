import { describe, it, expect } from 'vitest'
import * as front from './parecer.js'
import * as back from '../../netlify/functions/_parecer.js'
import { normalizarVeredito, reprovou, encaixarTexto, VEREDITOS, VEREDITO_ANTIGO, TEXTO_MAX } from './parecer.js'

// Paridade front ↔ back, no molde do credits.parity.test.js: o front EXIBE o
// veredito e o back o GRAVA. Se driftarem, a tela diz uma coisa e a memória da
// marca guarda outra.
describe('paridade front ↔ back do vocabulário do parecer', () => {
  it('VEREDITOS idênticos',        () => expect(back.VEREDITOS).toEqual(front.VEREDITOS))
  it('VEREDITO_ANTIGO idêntico',   () => expect(back.VEREDITO_ANTIGO).toEqual(front.VEREDITO_ANTIGO))
  it('VEREDITO_ROTULO idêntico',   () => expect(back.VEREDITO_ROTULO).toEqual(front.VEREDITO_ROTULO))
  it('TEXTO_MAX idêntico',         () => expect(back.TEXTO_MAX).toBe(front.TEXTO_MAX))
  it('encaixarTexto concorda nos dois lados', () => {
    for (const t of ['curto.', 'a'.repeat(400), 'frase uma. frase duas. ' + 'z'.repeat(400)])
      expect(back.encaixarTexto(t)).toBe(front.encaixarTexto(t))
  })
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

describe('encaixarTexto — o corte que não parece defeito', () => {
  // O parecer real que expôs o defeito, esticado para estourar o limite.
  const hex = 'ESCOPO: Paleta fora do padrão institucional e a peça inteira se afasta do território visual da marca em composição, luz e enquadramento. Dominantes são bege e cinza neutro mais rosa genérico, não a extensão cromática LOUDR (#F7127A, #0D9376, #011F3E, #072A45, #0E3549, #134050, #1B4A54, #DCE6F3) e o fundo sólido também foge dela'

  it('texto dentro do limite passa intacto', () => {
    expect(encaixarTexto('curto e no ponto.')).toBe('curto e no ponto.')
    expect(encaixarTexto('a'.repeat(300)).length).toBe(300)
  })

  it('nunca ultrapassa o limite — nem com a reticência', () => {
    for (const n of [301, 350, 500, 1200])
      expect(encaixarTexto('a'.repeat(n)).length).toBeLessThanOrEqual(300)
    expect(encaixarTexto(hex).length).toBeLessThanOrEqual(300)
  })

  // A regressão concreta: o primeiro parecer real terminou em "#DC", metade de
  // um código hex, e parecia software quebrado.
  it('não termina no meio de um código hex', () => {
    expect(hex.length).toBeGreaterThan(300)          // a fixture precisa estourar
    expect(encaixarTexto(hex)).not.toMatch(/#[0-9A-Fa-f]{1,5}$/)
  })

  it('termina sempre num final limpo: ponto ou reticência', () => {
    for (const t of [hex, 'palavra '.repeat(60), 'Frase. ' + 'z'.repeat(400)]) {
      const r = encaixarTexto(t)
      expect(r.endsWith('.') || r.endsWith('…')).toBe(true)
    }
  })

  it('não parte palavra ao meio', () => {
    const r = encaixarTexto('palavra '.repeat(60))
    expect(r).toMatch(/(palavra|\.)…?$/)
  })

  // A regra que importa: fechar numa frase só vale quando ela cobre a maior
  // parte do limite. Frase curta no começo de um parecer longo perde conteúdo.
  it('fecha na frase quando ela cobre a maior parte do limite', () => {
    const longa = 'a'.repeat(200) + ' fim da frase que cobre quase tudo. ' + 'z'.repeat(200)
    expect(encaixarTexto(longa).endsWith('tudo.')).toBe(true)
  })

  it('frase curta demais NÃO vence o conteúdo — usa reticência', () => {
    const curta = 'Curta. ' + 'z'.repeat(400)
    expect(encaixarTexto(curta).endsWith('…')).toBe(true)
    expect(encaixarTexto(curta).length).toBeGreaterThan(100)
  })

  it('vazio e nulo não quebram', () => {
    for (const v of ['', null, undefined]) expect(encaixarTexto(v)).toBe('')
  })
})
