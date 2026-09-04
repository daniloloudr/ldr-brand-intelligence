// O preflight é o portão que impede crédito queimado. Aqui se prova o que ele
// PEGA — não o que ele descreve.
import { describe, it, expect } from 'vitest'
import {
  lerCSV, normalizarCabecalho, montarLook, montarContexto, preflight,
  contarSaidas, ehUrl, valoresDe, vistasDoFluxo, instrucoesQueSePerdem, PAPEIS, CONTEXTO_MIN, NIVEIS,
} from '../src/lib/loteCatalogo.js'

const CTX = 'Camiseta feminina em ribana, canelado fino. '.repeat(8)   // > CONTEXTO_MIN
const base = {
  sku: 'KH6V', contexto: CTX, elenco: 'Marina',
  peca_principal: 'kh6v_frente.jpg', acessorios: 'sapatilha.jpg',
}
const mundo = {
  elenco: ['Marina', 'Julia'],
  acervo: ['kh6v_frente.jpg', 'kh6v_costas.jpg', 'sapatilha.jpg', 'bolsa.jpg', 'calca.jpg'],
  cabecalho: ['sku', 'contexto', 'elenco', 'peca_principal', 'acessorios'],
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

describe('o contexto é do usuário, e fala da roupa', () => {
  it('⭐ o addon NÃO escreve §O LOOK — o nó de contexto já traz o dele', () => {
    expect(montarLook(base)).toBe('')
  })
  it('texto solto ganha cabeçalho e a seção §A PEÇA', () => {
    const c = montarContexto({ etapa: 'costas', aPeca: 'malha canelada' })
    expect(c.indexOf('PRODUÇÃO DE CATÁLOGO — COSTAS')).toBe(0)
    expect(c).toContain('A PEÇA')
  })
  it('⭐ contexto JÁ COMPLETO passa intacto — nada de cabeçalho em cima de cabeçalho', () => {
    const pronto = 'PRODUÇÃO DE CATÁLOGO\n\n═══ A PEÇA ═══\npolo listrada'
    const c = montarContexto({ etapa: 'primeira', aPeca: pronto })
    expect(c).toBe(pronto)
    expect(c.match(/PRODUÇÃO DE CATÁLOGO/g)).toHaveLength(1)
    expect(c.match(/A PEÇA/g)).toHaveLength(1)
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
    const r = rodar([{ ...base, peca_principal: 'nao_existe.jpg' }])
    expect(r.bloqueadas).toBe(1)
  })
  it('URL passa sem estar na Biblioteca', () => {
    const r = rodar([{ ...base, peca_principal: 'https://cdn.exemplo.com/a.jpg' }])
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
    ...base, peca_vista_2: 'kh6v_costas.jpg', acessorios: 'calca.jpg;bolsa.jpg',
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
    const r = rodar([{ ...base, acessorios: 'bolsa.jpg;calca.jpg' }])
    expect(r.bloqueadas).toBe(0)
  })
  it('conta IMAGEM, não papel — é o que o modelo recebe', () => {
    const uma = rodar([base]).linhas[0].refs
    const duas = rodar([{ ...base, acessorios: 'bolsa.jpg;calca.jpg' }]).linhas[0].refs
    expect(duas).toBe(uma + 1)      // base já tinha 1 acessório; agora são 2
  })
  it('se UMA vista não existe, o papel inteiro bloqueia', () => {
    const r = rodar([{ ...base, acessorios: 'bolsa.jpg;fantasma.jpg' }])
    expect(r.bloqueadas).toBe(1)
  })
  it('⭐ o elenco continua sendo UMA pessoa', () => {
    const r = rodar([{ ...base, elenco: 'Marina;Julia' }])
    expect(r.bloqueadas).toBe(1)
    expect(r.linhas[0].problemas.some(p => /só uma modelo/.test(p.texto))).toBe(true)
  })
  it('mais vistas empurram o corte do modelo', () => {
    const r = rodar([{ ...base, acessorios: 'bolsa.jpg;calca.jpg;kh6v_costas.jpg' }],
                    { modelo: 'fal-ai/nano-banana-pro', teto: 4 })
    expect(r.linhas[0].problemas.some(p => p.campo === 'referencias')).toBe(true)
  })
})

describe('⭐ as vistas vêm do FLUXO, não de lista fixa', () => {
  const nodes = [
    { id: 'n1', type: 'prompt',  data: { text: 'FRONTAL\n\nDe frente, em pé, peso distribuído.' } },
    { id: 'n2', type: 'prompt',  data: { text: 'TRÊS QUARTOS\n\nCorpo girado a três quartos.' } },
    { id: 'n3', type: 'generate', data: { model: 'x' } },
    { id: 'n4', type: 'prompt',  data: { text: '' } },
    { id: 'n5', type: 'prompt',  data: { text: 'FRONTAL\n\noutra redação da mesma vista' } },
  ]
  it('lê o nome da primeira linha de cada nó prompt', () => {
    expect(vistasDoFluxo(nodes).map(v => v.nome)).toEqual(['FRONTAL', 'TRÊS QUARTOS'])
  })
  it('guarda a instrução separada do nome', () => {
    expect(vistasDoFluxo(nodes)[0].instrucao).toContain('De frente')
    expect(vistasDoFluxo(nodes)[0].instrucao).not.toContain('FRONTAL')
  })
  it('ignora nó que não é prompt e prompt sem texto', () => {
    expect(vistasDoFluxo(nodes)).toHaveLength(2)
  })
  it('não repete vista de mesmo nome', () => {
    expect(vistasDoFluxo(nodes).filter(v => v.nome === 'FRONTAL')).toHaveLength(1)
  })
  it('grafo vazio ou inválido não quebra', () => {
    expect(vistasDoFluxo(null)).toEqual([])
    expect(vistasDoFluxo([])).toEqual([])
  })
  it('⭐ pedir vista que o fluxo não tem BLOQUEIA', () => {
    const vistas = vistasDoFluxo(nodes)
    const r = rodar([{ ...base, saidas: 'FRONTAL;VOANDO' }], { vistas })
    expect(r.bloqueadas).toBe(1)
    expect(r.linhas[0].problemas.some(p => /"VOANDO"/.test(p.texto))).toBe(true)
  })
  it('vista conhecida passa, sem ligar para maiúscula', () => {
    const r = rodar([{ ...base, saidas: 'frontal;Três Quartos' }], { vistas: vistasDoFluxo(nodes) })
    expect(r.bloqueadas).toBe(0)
    expect(r.linhas[0].nSaidas).toBe(2)
  })
  it('sem vistas conhecidas, não inventa bloqueio', () => {
    expect(rodar([{ ...base, saidas: 'QUALQUER' }]).bloqueadas).toBe(0)
  })
})

describe('⭐ a lista de vistas sobrevive ao preflight', () => {
  it('os NOMES ficam em vistasPedidas — quem roda lê daqui', () => {
    const r = rodar([{ ...base, saidas: 'FRONTAL;SENTADA' }])
    expect(r.linhas[0].vistasPedidas).toEqual(['FRONTAL', 'SENTADA'])
  })
  it('a CONTAGEM fica em nSaidas, e não sobrescreve a lista', () => {
    const r = rodar([{ ...base, saidas: 'FRONTAL;SENTADA' }])
    expect(r.linhas[0].nSaidas).toBe(2)
    expect(Array.isArray(r.linhas[0].vistasPedidas)).toBe(true)
  })
  it('sem vistas pedidas, a lista é vazia — não vira ["1"]', () => {
    const r = rodar([{ ...base, saidas: '' }])
    expect(r.linhas[0].vistasPedidas).toEqual([])
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

describe('a peça principal é a estrela', () => {
  it('⭐ as três entradas, com esses nomes', () => {
    expect(PAPEIS.map(p => p.papel)).toEqual(
      ['Peça Principal', 'Peça Principal Vista 2', 'Acessórios', 'Modelo'])
  })
  it('só a Peça Principal e a Modelo são obrigatórias', () => {
    expect(PAPEIS.filter(p => p.obrigatorio).map(p => p.col)).toEqual(['peca_principal', 'elenco'])
  })
  it('a Vista 2 é da MESMA peça, não um item novo', () => {
    const r = rodar([{ ...base, peca_vista_2: 'kh6v_costas.jpg' }])
    expect(r.bloqueadas).toBe(0)
    expect(r.linhas[0].refs).toBe(4)      // peça + vista 2 + acessório + modelo
  })
  it('Acessórios é um balde só — quantos forem', () => {
    const r = rodar([{ ...base, acessorios: 'calca.jpg;sapatilha.jpg;bolsa.jpg' }])
    expect(r.bloqueadas).toBe(0)
    expect(r.linhas[0].refs).toBe(5)      // peça + 3 acessórios + modelo
  })
  it('nada de calça/calçado/bolsa cravados', () => {
    for (const c of ['calca', 'calcado', 'bolsa', 'acessorio_1'])
      expect(PAPEIS.map(p => p.col)).not.toContain(c)
  })
})

describe('os papéis', () => {
  it('todo papel tem coluna e rótulo', () => {
    for (const p of PAPEIS) { expect(p.col).toBeTruthy(); expect(p.papel).toBeTruthy() }
  })
  it('a modelo vem do elenco, e é obrigatória', () => {
    const id = PAPEIS.find(p => p.doElenco)
    expect(id.doElenco).toBe(true)
    expect(id.obrigatorio).toBe(true)
  })
})

describe('⭐ a conta inclui as posições extras', () => {
  it('extra entra na contagem de saídas', () => {
    const r = rodar([{ ...base, saidas: 'A;B' }], { extras: ['POSE NOVA'] })
    expect(r.linhas[0].nSaidas).toBe(3)
    expect(r.linhas[0].nExtras).toBe(1)
  })
  it('extra em branco não conta', () => {
    const r = rodar([{ ...base, saidas: 'A' }], { extras: ['  ', ''] })
    expect(r.linhas[0].nSaidas).toBe(1)
  })
  it('a estimativa de crédito acompanha', () => {
    const r = rodar([{ ...base, saidas: 'A' }], { extras: ['X', 'Y'], creditoPorImagem: 2 })
    expect(r.imagens).toBe(3)
    expect(r.creditos).toBe(6)
  })
})

describe('⭐ o que o contexto do SKU apagaria', () => {
  it('aponta seção que não é sobre a peça', () => {
    const ctx = `═══ A PEÇA ═══
polo

═══ VISÃO DE CÂMERA E ÂNGULO ═══
corpo inteiro`
    expect(instrucoesQueSePerdem(ctx)).toEqual(['VISÃO DE CÂMERA E ÂNGULO'])
  })
  it('não alarma para as seções que SÃO da peça', () => {
    const ctx = '═══ A PEÇA — FIDELIDADE ═══\nx\n\n═══ O LOOK ═══\ny\n\n═══ ACABAMENTO ═══\nz'
    expect(instrucoesQueSePerdem(ctx)).toEqual([])
  })
  it('⭐ pega instrução solta no TOPO, antes de qualquer seção', () => {
    const ctx = 'PRODUÇÃO — POSES\n\nO QUE TRAVA: a identidade.\n\n═══ A PEÇA ═══\nx'
    expect(instrucoesQueSePerdem(ctx)).toContain('(topo do contexto)')
  })
  it('cabeçalho de uma linha é rótulo, não instrução', () => {
    expect(instrucoesQueSePerdem('PRODUÇÃO DE CATÁLOGO\n\n═══ A PEÇA ═══\nx')).toEqual([])
  })
  it('contexto vazio não alarma', () => expect(instrucoesQueSePerdem('')).toEqual([]))
})
