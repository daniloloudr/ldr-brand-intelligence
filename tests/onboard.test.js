import { describe, it, expect } from 'vitest'
import { STEPS, TRILHAS, TERMINAL, completo, completoTrilha, veredito, trilhaDe } from '../netlify/functions/_onboard.js'

// Estado de onboarding com todas as etapas no desfecho informado.
const estado = (over = {}) => ({
  steps: Object.fromEntries(STEPS.map(s => [s, 'done'])),
  notas: {},
  ...over,
})

describe('completo — terminar é diferente de dar certo', () => {
  it('etapa ainda rodando não é terminal', () => {
    expect(completo(estado({ steps: { ...estado().steps, mineracao: 'running' } }))).toBe(false)
  })
  it('expired e failed encerram tanto quanto done', () => {
    const s = estado()
    s.steps.brand = 'failed'
    s.steps.sinteses = 'expired'
    expect(completo(s)).toBe(true)
  })
  it('sem steps não está completo', () => {
    expect(completo(null)).toBe(false)
    expect(completo({})).toBe(false)
  })
})

describe('veredito — o que impede o "Ambiente pronto" falso', () => {
  it('tudo done → ok, sem problemas', () => {
    const v = veredito(estado())
    expect(v.ok).toBe(true)
    expect(v.problemas).toEqual([])
  })

  it('uma etapa expirada derruba o ok e aparece na lista', () => {
    const s = estado()
    s.steps.mineracao = 'expired'
    s.notas.mineracao = 'sem saída de: clipping, escuta'
    const v = veredito(s)
    expect(v.ok).toBe(false)
    expect(v.problemas).toEqual([
      { etapa: 'mineracao', estado: 'expired', motivo: 'sem saída de: clipping, escuta' },
    ])
  })

  it('falha sem motivo registrado ainda aparece, com motivo nulo', () => {
    const s = estado()
    s.steps.brand = 'failed'
    const v = veredito(s)
    expect(v.ok).toBe(false)
    expect(v.problemas[0]).toEqual({ etapa: 'brand', estado: 'failed', motivo: null })
  })

  it('o caso que motivou tudo: pipeline inteiro expirado NÃO é sucesso', () => {
    const s = estado({ steps: Object.fromEntries(STEPS.map(k => [k, 'expired'])) })
    expect(completo(s)).toBe(true)     // terminou
    expect(veredito(s).ok).toBe(false) // mas não deu certo
    expect(veredito(s).problemas).toHaveLength(STEPS.length)
  })
})

describe('contrato dos estados', () => {
  it('os três terminais são done, expired e failed', () => {
    expect(TERMINAL).toEqual(['done', 'expired', 'failed'])
  })
  it('a ordem das etapas é a do pipeline', () => {
    expect(STEPS).toEqual(['brand', 'diagnostico', 'concorrentes', 'mineracao', 'sinteses', 'destilacao'])
  })
})

describe('trilhas — a marca não segura a inteligência', () => {
  it('cada etapa pertence a uma trilha só', () => {
    expect(trilhaDe('brand')).toBe('marca')
    expect(trilhaDe('destilacao')).toBe('inteligencia')
    expect(TRILHAS.inteligencia).not.toContain('brand')
  })

  it('inteligência conclui com a marca ainda esperando o manual', () => {
    const s = estado()
    s.steps.brand = 'waiting'
    expect(completoTrilha(s, 'inteligencia')).toBe(true)
    expect(completoTrilha(s, 'marca')).toBe(false)  // esperando não é terminal
    expect(completo(s)).toBe(false)                 // o conjunto não terminou
    expect(veredito(s).ok).toBe(true)               // mas nada deu errado
  })

  it('esperar o manual não vira problema no painel', () => {
    const s = estado()
    s.steps.brand = 'waiting'
    s.notas.brand = 'aguardando o manual da marca'
    expect(veredito(s).problemas).toEqual([])
  })

  it('manual que falhou continua sendo problema', () => {
    const s = estado()
    s.steps.brand = 'failed'
    s.notas.brand = 'a extração do manual falhou'
    expect(veredito(s).ok).toBe(false)
    expect(veredito(s).problemas).toHaveLength(1)
  })
})
