import { describe, it, expect } from 'vitest'
import * as front from './credits.js'
import * as back from '../../netlify/functions/_credits.js'

// credits.js (front, EXIBE o preço) e _credits.js (back, COBRA o débito) estão
// documentados como "MANTER OS DOIS EM SINCRONIA". Este teste é o cão de guarda:
// se driftarem, o usuário vê um preço e é cobrado outro. Bug de dinheiro.

describe('paridade front ↔ back dos mapas de crédito', () => {
  it('IMAGE_CREDITS idênticos', () => {
    expect(back.IMAGE_CREDITS).toEqual(front.IMAGE_CREDITS)
  })
  it('VIDEO_CREDITS idênticos', () => {
    expect(back.VIDEO_CREDITS).toEqual(front.VIDEO_CREDITS)
  })
  it('OP_CREDITS idênticos', () => {
    expect(back.OP_CREDITS).toEqual(front.OP_CREDITS)
  })
})
