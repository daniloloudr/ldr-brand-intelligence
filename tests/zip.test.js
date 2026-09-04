// O ZIP é escrito à mão, sem lib. O que quebra em formato binário quebra
// CALADO — o arquivo baixa, e só não abre. Por isso o teste confere os bytes.
import { describe, it, expect } from 'vitest'
import { crc32, nomeSeguro, semColisao, montarZip } from '../src/lib/zip.js'

const bytes = (s) => new TextEncoder().encode(s)
// `<<` em JS devolve inteiro COM SINAL; sem o `>>> 0` o CRC alto vira negativo.
const u32 = (a, p) => ((a[p] | (a[p+1] << 8) | (a[p+2] << 16) | (a[p+3] << 24)) >>> 0)

describe('crc32', () => {
  it('bate com o valor canônico de "123456789"', () => {
    expect(crc32(bytes('123456789'))).toBe(0xCBF43926)
  })
  it('vazio é zero', () => expect(crc32(new Uint8Array(0))).toBe(0))
  it('muda com um byte diferente', () => {
    expect(crc32(bytes('a'))).not.toBe(crc32(bytes('b')))
  })
})

describe('nome de arquivo', () => {
  it('tira barra e caractere que o Windows recusa', () => {
    expect(nomeSeguro('a/b:c*d?e"f<g>h|i')).not.toMatch(/[\\/:*?"<>|]/)
  })
  it('tira acento sem virar vazio', () => {
    expect(nomeSeguro('APROXIMADA · peça')).toContain('APROXIMADA')
  })
  it('nome vazio ganha padrão', () => expect(nomeSeguro('', 'x')).toBe('x'))
  it('⭐ nome repetido não sobrepõe — sumiria na extração sem ninguém ver', () => {
    const u = new Set()
    expect(semColisao('a.jpg', u)).toBe('a.jpg')
    expect(semColisao('a.jpg', u)).toBe('a (2).jpg')
    expect(semColisao('a.jpg', u)).toBe('a (3).jpg')
  })
  it('sem extensão também numera', () => {
    const u = new Set(['x'])
    expect(semColisao('x', u)).toBe('x (2)')
  })
})

describe('o zip', () => {
  const z = montarZip([
    { nome: 'FRONTAL.jpg', dados: bytes('imagem um') },
    { nome: 'COSTAS.jpg',  dados: bytes('imagem dois') },
  ])
  it('começa com a assinatura de cabeçalho local', () => {
    expect(u32(z, 0)).toBe(0x04034b50)
  })
  it('termina com o fim do diretório central', () => {
    expect(u32(z, z.length - 22)).toBe(0x06054b50)
  })
  it('declara o número certo de arquivos', () => {
    expect(z[z.length - 22 + 8] | (z[z.length - 22 + 9] << 8)).toBe(2)
  })
  it('o offset do diretório central aponta para a assinatura dele', () => {
    const off = u32(z, z.length - 22 + 16)
    expect(u32(z, off)).toBe(0x02014b50)
  })
  it('guarda o conteúdo sem comprimir — dá para achar os bytes', () => {
    const txt = new TextDecoder().decode(z)
    expect(txt).toContain('imagem um')
    expect(txt).toContain('imagem dois')
  })
  it('grava o CRC de cada arquivo', () => {
    expect(u32(z, 14)).toBe(crc32(bytes('imagem um')))
  })
  it('arquivo vazio é ignorado, não corrompe o zip', () => {
    const z2 = montarZip([{ nome: 'a', dados: new Uint8Array(0) }, { nome: 'b', dados: bytes('x') }])
    expect(z2[z2.length - 22 + 8]).toBe(1)
  })
  it('lista vazia ainda produz um zip válido (vazio)', () => {
    const z3 = montarZip([])
    expect(u32(z3, 0)).toBe(0x06054b50)
    expect(z3.length).toBe(22)
  })
})
