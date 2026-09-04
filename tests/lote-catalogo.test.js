// O preflight é o portão que impede crédito queimado. Aqui se prova o que ele
// PEGA — não o que ele descreve.
import { describe, it, expect } from 'vitest'
import {
  lerCSV, normalizarCabecalho, montarLook, montarContexto, preflight,
  contarSaidas, ehUrl, valoresDe, PAPEIS, CONTEXTO_MIN, NIVEIS,
} from '../src/lib/loteCatalogo.js'

const CTX = 'Camiseta feminina em ribana, canelado fino. '.repeat(8)   // > CONTEXTO_MIN
const base = {
  sku: 'KH6V', contexto: CTX, elenco: 'Marina',
  peca_frente: 'kh6v_frente.jpg', calcado: 'sapatilha.jpg',
}
const mundo = {
  elenco: ['Marina', 'Julia'],
  acervo: ['kh6v_frente.jpg', 'kh6v_costas.jpg', 'sapatilha.jpg', 'bolsa.jpg', 'calca.jpg'],
  cabecalho: ['sku', 'contexto', 'elenco', 'peca_frente', 'calcado'],
}
const rodar = (linhas, extra = {}) =>
  preflight({ linhas: linhas.map((l, i) => ({ _linha: i + 2, ...l })), ...mundo, ...extra })

describe('a planilha', () => {
  it('lê CSV com vírgula', () => {
    const { cabecalho, linhas } = lerCSV('sku,contexto\nKH6V,malha')
    expect(cabecalho).toEqual(['sku', 'contexto'])
    expect(linhas[0]).toMatchObject({ sku: 'KH6V', contexto: 'malha', _linha: 2 })
  })
  it('lê CSV com ponto-e-vírgula — é o que o Excel pt-BR exporta', () => {
    const { linhas } = lerCSV('sku;contexto\nKH6V;malha canelada')
    expect(linhas[0].contexto).toBe('malha canelada')
  })
  it('respeita aspas, vírgula e quebra de linha dentro do campo', () => {
    const { linhas } = lerCSV('sku,contexto\nKH6V,"malha canelada, fina\ncom listras"')
    expect(linhas[0].contexto).toBe('malha canelada, fina\ncom listras')
    expect(linhas).toHaveLength(1)
  })
  it('engole o BOM do Excel — senão a 1ª coluna vira desconhecida', () => {
    const { cabecalho } = lerCSV('﻿sku,contexto\nKH6V,x')
    expect(cabecalho[0]).toBe('sku')
  })
  it('normaliza cabeçalho com acento, espaço e maiúscula', () => {
    expect(normalizarCabecalho('Peça Frente')).toBe('peca_frente')
    expect(normalizarCabecalho('  SKU  ')).toBe('sku')
  })
  it('descarta linha totalmente vazia', () => {
    const { linhas } = lerCSV('sku,contexto\nKH6V,x\n,,\n')
    expect(linhas).toHaveLength(1)
  })
  it('numera a linha como na planilha, para a pessoa achar', () => {
    const { linhas } = lerCSV('sku\nA\nB\nC')
    expect(linhas.map(l => l._linha)).toEqual([2, 3, 4])
  })
})

describe('o contexto — a pessoa escreve UMA seção', () => {
  it('§O LOOK é gerado das colunas, não escrito à mão', () => {
    const look = montarLook(base)
    expect(look).toContain('PARTE DE CIMA')
    expect(look).toContain('IDENTIDADE: do elenco "Marina"')
    expect(look).toContain('CALÇADO')
    expect(look).not.toContain('BOLSA')          // coluna vazia não vira linha
  })
  it('referência não resolvida aparece marcada no LOOK', () => {
    expect(montarLook(base, { calcado: false })).toContain('⚠')
  })
  it('monta o gabarito na ordem certa', () => {
    const c = montarContexto({ etapa: 'primeira imagem inteira', aPeca: CTX, linha: base, doFluxo: '═══ ACABAMENTO ═══\nx' })
    expect(c.indexOf('PRODUÇÃO DE CATÁLOGO — PRIMEIRA IMAGEM INTEIRA')).toBe(0)
    expect(c.indexOf('A PEÇA')).toBeLessThan(c.indexOf('O LOOK'))
    expect(c.indexOf('O LOOK')).toBeLessThan(c.indexOf('ACABAMENTO'))
  })
  it('seção vazia não deixa buraco', () => {
    expect(montarContexto({ etapa: 'x', aPeca: 'y', linha: {} })).not.toMatch(/\n\n\n/)
  })
})

describe('o preflight barra antes de gastar', () => {
  it('linha completa passa', () => {
    const r = rodar([base])
    expect(r.prontas).toBe(1)
    expect(r.bloqueadas).toBe(0)
    expect(r.podeRodar).toBe(true)
  })
  it('⭐ elenco não cadastrado BLOQUEIA', () => {
    const r = rodar([{ ...base, elenco: 'Fulana' }])
    expect(r.bloqueadas).toBe(1)
    expect(r.linhas[0].problemas.some(p => /não está cadastrada/.test(p.texto))).toBe(true)
    expect(r.linhas[0].problemas.some(p => /Uma peça/.test(p.texto))).toBe(true)
  })
  it('⭐ arquivo fora da Biblioteca BLOQUEIA', () => {
    const r = rodar([{ ...base, peca_frente: 'nao_existe.jpg' }])
    expect(r.bloqueadas).toBe(1)
  })
  it('URL passa sem estar na Biblioteca', () => {
    const r = rodar([{ ...base, peca_frente: 'https://cdn.exemplo.com/a.jpg' }])
    expect(r.bloqueadas).toBe(0)
  })
  it('SKU repetido bloqueia e diz onde está o primeiro', () => {
    const r = rodar([base, { ...base }])
    expect(r.bloqueadas).toBe(1)
    expect(r.linhas[1].problemas.some(p => /linha 2/.test(p.texto))).toBe(true)
  })
  it('sem contexto BLOQUEIA — peça sairia genérica', () => {
    const r = rodar([{ ...base, contexto: '' }])
    expect(r.bloqueadas).toBe(1)
  })
  it('contexto curto AVISA mas deixa rodar', () => {
    const r = rodar([{ ...base, contexto: 'camiseta azul' }])
    expect(r.bloqueadas).toBe(0)
    expect(r.avisos).toBeGreaterThan(0)
    expect(r.linhas[0].problemas.some(p => p.nivel === NIVEIS.AVISO && /4000/.test(p.texto))).toBe(true)
  })
  it('coluna obrigatória ausente é problema da PLANILHA, não da linha', () => {
    const r = preflight({ ...mundo, linhas: [], cabecalho: ['sku'] })
    expect(r.problemas.some(p => /contexto/.test(p.campo))).toBe(true)
    expect(r.podeRodar).toBe(false)
  })
})

describe('⭐ o corte silencioso do F4, dito ANTES de gerar', () => {
  const seisRefs = {
    ...base, peca_costas: 'kh6v_costas.jpg', calca: 'calca.jpg', bolsa: 'bolsa.jpg',
  }
  it('modelo de referência única avisa que descarta o resto, e culpa o MODELO', () => {
    const r = rodar([seisRefs], { modelo: 'fal-ai/flux-pro/v1.1', teto: 10 })
    const av = r.linhas[0].problemas.find(p => p.campo === 'referencias')
    expect(av).toBeTruthy()
    expect(av.texto).toMatch(/MODELO/)
    expect(av.nivel).toBe(NIVEIS.AVISO)
  })
  it('quando a culpa é do teto do canvas, a mensagem muda', () => {
    const r = rodar([seisRefs], { modelo: 'fal-ai/nano-banana-pro', teto: 2 })
    const av = r.linhas[0].problemas.find(p => p.campo === 'referencias')
    expect(av.texto).toMatch(/canvas/)
  })
  it('sem estouro, não inventa aviso', () => {
    const r = rodar([seisRefs], { modelo: 'fal-ai/nano-banana-pro', teto: 10 })
    expect(r.linhas[0].problemas.filter(p => p.campo === 'referencias')).toHaveLength(0)
  })
})

describe('⭐ várias vistas do mesmo acessório', () => {
  it('a célula aceita N vistas separadas por ;', () => {
    const r = rodar([{ ...base, bolsa: 'bolsa.jpg;calca.jpg' }])
    expect(r.bloqueadas).toBe(0)
  })
  it('conta IMAGEM, não papel — é o que o modelo recebe', () => {
    const uma = rodar([base]).linhas[0].refs
    const duas = rodar([{ ...base, bolsa: 'bolsa.jpg;calca.jpg' }]).linhas[0].refs
    expect(duas).toBe(uma + 2)
  })
  it('se UMA vista não existe, o papel inteiro bloqueia', () => {
    const r = rodar([{ ...base, bolsa: 'bolsa.jpg;fantasma.jpg' }])
    expect(r.bloqueadas).toBe(1)
  })
  it('o LOOK diz quantas vistas entraram', () => {
    expect(montarLook({ ...base, bolsa: 'a.jpg;b.jpg;c.jpg' })).toContain('3 vistas')
  })
  it('uma vista só não vira "1 vistas"', () => {
    expect(montarLook(base)).not.toMatch(/1 vistas/)
  })
  it('⭐ o elenco continua sendo UMA pessoa', () => {
    const r = rodar([{ ...base, elenco: 'Marina;Julia' }])
    expect(r.bloqueadas).toBe(1)
    expect(r.linhas[0].problemas.some(p => /só uma modelo/.test(p.texto))).toBe(true)
  })
  it('mais vistas empurram o corte do modelo', () => {
    const r = rodar([{ ...base, bolsa: 'bolsa.jpg;calca.jpg;kh6v_costas.jpg' }],
                    { modelo: 'fal-ai/nano-banana-pro', teto: 4 })
    expect(r.linhas[0].problemas.some(p => p.campo === 'referencias')).toBe(true)
  })
})

describe('a conta antes do gasto', () => {
  it('estima crédito por linha × saídas', () => {
    const r = rodar([{ ...base, saidas: 'inteiro;aproximada;costas' }], { creditoPorImagem: 4 })
    expect(r.imagens).toBe(3)
    expect(r.creditos).toBe(12)
  })
  it('linha bloqueada NÃO entra na conta', () => {
    const r = rodar([base, { ...base, sku: 'X', elenco: 'Fulana' }], { creditoPorImagem: 4 })
    expect(r.imagens).toBe(1)
  })
  it('sem coluna saidas, usa o padrão', () => {
    expect(contarSaidas('', 3)).toBe(3)
    expect(contarSaidas('a;b', 3)).toBe(2)
  })
  it('reconhece URL', () => {
    expect(ehUrl('https://x/a.jpg')).toBe(true)
    expect(ehUrl('a.jpg')).toBe(false)
  })
})

describe('os papéis espelham o §O LOOK do gabarito', () => {
  it('todo papel tem coluna e rótulo', () => {
    for (const p of PAPEIS) { expect(p.col).toBeTruthy(); expect(p.papel).toBeTruthy() }
  })
  it('identidade vem do elenco, e é obrigatória', () => {
    const id = PAPEIS.find(p => p.papel === 'IDENTIDADE')
    expect(id.doElenco).toBe(true)
    expect(id.obrigatorio).toBe(true)
  })
})
