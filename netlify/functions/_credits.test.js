import { describe, it, expect } from 'vitest'
import { creditsForImage, creditsForVideo, creditsForOp } from './_credits.js'

// Regras de crédito = money-critical. Bug aqui = cobrar a mais/menos.
// Espelha o mapa autoritativo de _credits.js (deve estar SINCRONIZADO com credits.js).

describe('creditsForImage', () => {
  it('modelos conhecidos', () => {
    expect(creditsForImage('fal-ai/flux-pro/v1.1-ultra')).toBe(2)
    expect(creditsForImage('fal-ai/ideogram/v2')).toBe(2)
    expect(creditsForImage('fal-ai/ideogram/v3')).toBe(2)
    expect(creditsForImage('fal-ai/nano-banana-pro')).toBe(3)
  })
  it('modelo desconhecido / vazio → default 1', () => {
    expect(creditsForImage('modelo-inexistente')).toBe(1)
    expect(creditsForImage(undefined)).toBe(1)
  })
})

describe('creditsForVideo', () => {
  it('escala com a duração', () => {
    expect(creditsForVideo('hailuo-02', 6)).toBe(5)
    expect(creditsForVideo('hailuo-02', 10)).toBe(9)
    expect(creditsForVideo('kling-25-turbo', 10)).toBe(13)
    expect(creditsForVideo('veo3', 8)).toBe(108)
    expect(creditsForVideo('seedance-2-pro', 5)).toBe(28)
  })
  it('modelo com custo fixo (default por modelo)', () => {
    expect(creditsForVideo('wan-22', 5)).toBe(4)
    expect(creditsForVideo('wan-22', 10)).toBe(4)
  })
  it('modelo/duração desconhecidos → fallback 8', () => {
    expect(creditsForVideo('modelo-x', 5)).toBe(8)
    expect(creditsForVideo('hailuo-02', 99)).toBe(8) // duração não mapeada, sem default
  })
})

describe('creditsForOp', () => {
  it('operações com custo', () => {
    expect(creditsForOp('content')).toBe(2)
    expect(creditsForOp('campaign')).toBe(4)
    expect(creditsForOp('image')).toBe(1)
    expect(creditsForOp('upscale')).toBe(1)
  })
  it('Brand Intelligence é fair-use (0 crédito)', () => {
    expect(creditsForOp('diagnostico')).toBe(0)
    expect(creditsForOp('listening')).toBe(0)
    expect(creditsForOp('assistant')).toBe(0)
  })
  it('operação desconhecida → default 1', () => {
    expect(creditsForOp('op-nova')).toBe(1)
  })
})
