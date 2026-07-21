import { describe, it, expect } from 'vitest'
import { compileBrandContext } from '../netlify/functions/_brain.js'

// compileBrandContext é o IP do produto: a porta que injeta a marca em toda
// geração de IA. Puro (sem I/O), então testável direto. O foco é a guardrail
// do LOGO e o controle de facetas (verbal/visual).

const brandBook = {
  verbal_identity: {
    posicionamento: 'A camiseta que dura',
    personalidade: ['acolhedora', 'atemporal'],
    tom_voz: 'próximo e claro',
    tom_evitar: 'gírias',
  },
  visual_identity: {
    paleta: [{ hex: '#FFFFFF' }, { hex: '#171717' }],
    tipo_principal_nome: 'Georgia',
    foto_mood: 'natural',
  },
}
const tokens = [{ nome: 'color/primary', valor: '#0D9E7A', categoria: 'color' }]

describe('compileBrandContext', () => {
  it('retorna { prefix, snapshot } e injeta o nome da marca', () => {
    const { prefix, snapshot } = compileBrandContext({ brandBook, tokens, brandNome: 'Hering' })
    expect(prefix).toContain('[BRAND CONTEXT]')
    expect(prefix).toContain('Marca: Hering')
    expect(snapshot).toBeTruthy()
  })

  it('guardrail do LOGO está presente por default (regra do Danilo)', () => {
    const { prefix } = compileBrandContext({ brandBook, tokens, brandNome: 'Hering' })
    expect(prefix).toContain('LOGO: NUNCA desenhe')
  })

  it('funde cores dos tokens + paleta, sem duplicar', () => {
    const { prefix, snapshot } = compileBrandContext({ brandBook, tokens, brandNome: 'Hering' })
    expect(prefix).toContain('#0D9E7A')      // token
    expect(prefix).toContain('#FFFFFF')      // paleta
    expect(snapshot.cores).toContain('#171717')
    // dedup: nenhuma cor repetida
    expect(new Set(snapshot.cores).size).toBe(snapshot.cores.length)
  })

  it('faceta só-verbal: sem paleta/tipografia e sem a linha do LOGO', () => {
    const { prefix, snapshot } = compileBrandContext({
      brandBook, tokens, brandNome: 'Hering', facets: { verbal: true, visual: false },
    })
    expect(prefix).toContain('Posicionamento: A camiseta que dura')
    expect(prefix).not.toContain('LOGO: NUNCA')
    expect(prefix).not.toContain('Paleta')
    expect(snapshot.facets).toEqual({ verbal: true, visual: false })
  })

  it('faceta só-visual: sem posicionamento/personalidade, com LOGO', () => {
    const { prefix, snapshot } = compileBrandContext({
      brandBook, tokens, brandNome: 'Hering', facets: { verbal: false, visual: true },
    })
    expect(prefix).not.toContain('Posicionamento')
    expect(prefix).toContain('LOGO: NUNCA')
    expect(prefix).toContain('Paleta')
    expect(snapshot.facets).toEqual({ verbal: false, visual: true })
  })

  it('brandBook vazio → não quebra, ainda emite nome + guardrail', () => {
    const { prefix } = compileBrandContext({ brandBook: null, tokens: null, brandNome: 'Nova' })
    expect(prefix).toContain('Marca: Nova')
    expect(prefix).toContain('LOGO: NUNCA')
  })
})
