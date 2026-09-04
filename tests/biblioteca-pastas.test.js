// A pasta virou CAMINHO: "Catálogo/49FP/20260904" é uma árvore, não um nome.
// A leitura em árvore mora na Biblioteca; aqui ficam as duas regras que a
// sustentam, isoladas para poderem ser provadas.
import { describe, it, expect } from 'vitest'

// mesmas funções da StudioLibrary — se divergirem, o teste deixa de valer
const dentroDe = (caminho, atual) => {
  if (!caminho) return false
  if (!atual) return true
  return caminho === atual || caminho.startsWith(atual + '/')
}
const proximoNivel = (caminho, atual) => {
  const resto = atual ? caminho.slice(atual.length + 1) : caminho
  if (!resto) return null
  const seg = resto.split('/')[0]
  return atual ? `${atual}/${seg}` : seg
}
const filhosDe = (caminhos, atual) => [...new Set(caminhos
  .filter(c => dentroDe(c, atual) && c !== atual)
  .map(c => proximoNivel(c, atual)).filter(Boolean))].sort()

const ACERVO = [
  'Catálogo/49FP/20260904',
  'Catálogo/49FP/20260905',
  'Catálogo/KH6V/20260904',
  'refs',
]

describe('a árvore de pastas', () => {
  it('na raiz, mostra só o primeiro nível', () => {
    expect(filhosDe(ACERVO, null)).toEqual(['Catálogo', 'refs'])
  })
  it('dentro de Catálogo, mostra os SKUs', () => {
    expect(filhosDe(ACERVO, 'Catálogo')).toEqual(['Catálogo/49FP', 'Catálogo/KH6V'])
  })
  it('dentro do SKU, mostra as datas — e elas ordenam sozinhas', () => {
    expect(filhosDe(ACERVO, 'Catálogo/49FP'))
      .toEqual(['Catálogo/49FP/20260904', 'Catálogo/49FP/20260905'])
  })
  it('no último nível não há mais filhos', () => {
    expect(filhosDe(ACERVO, 'Catálogo/49FP/20260904')).toEqual([])
  })
  it('⭐ prefixo parecido NÃO é filho — "Catálogo2" não entra em "Catálogo"', () => {
    expect(filhosDe([...ACERVO, 'Catálogo2/X'], 'Catálogo')).not.toContain('Catálogo2/X')
    expect(dentroDe('Catálogo2/X', 'Catálogo')).toBe(false)
  })
  it('item sem pasta fica na raiz e não vira filho de ninguém', () => {
    expect(dentroDe(null, 'Catálogo')).toBe(false)
    expect(dentroDe('', null)).toBe(false)
  })
  it('contar uma pasta inclui os níveis abaixo', () => {
    expect(ACERVO.filter(c => dentroDe(c, 'Catálogo')).length).toBe(3)
    expect(ACERVO.filter(c => dentroDe(c, 'Catálogo/49FP')).length).toBe(2)
  })
})

describe('o caminho que o addon grava', () => {
  const pasta = (sku, d) => {
    const dia = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
    return `Catálogo/${String(sku).replace(/\//g, '-')}/${dia}`
  }
  it('é Catálogo / SKU / aaaammdd', () => {
    expect(pasta('49FP', new Date(2026, 8, 4))).toBe('Catálogo/49FP/20260904')
  })
  it('⭐ barra no SKU não cria nível fantasma', () => {
    expect(pasta('A/B', new Date(2026, 8, 4)).split('/')).toHaveLength(3)
  })
  it('a data não tem separador — ordenação alfabética é cronológica', () => {
    const a = pasta('X', new Date(2026, 8, 4)), b = pasta('X', new Date(2026, 8, 15))
    expect(a < b).toBe(true)
  })
})
