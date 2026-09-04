// ⭐ O TESTE QUE RESPONDE "vai garantir a fidelidade?"
//
// Ele monta o pedido de duas maneiras — pelo caminho do CANVAS e pelo caminho
// do ADDON — sobre o MESMO grafo, e exige que sejam idênticos. Se alguém mudar
// a leitura de um lado, este teste fica vermelho antes de qualquer imagem ser
// gerada, e antes de qualquer crédito ser gasto.
import { describe, it, expect } from 'vitest'
import {
  entradasDaGeracao, comContexto, referenciasDaGeracao, comEntradas, papelDoNo, produtoresDeImagem,
  vistasDoGrafo,
} from '../src/lib/studioGrafo.js'
import { resolveModel, MAX_REFS_CANVAS } from '../src/lib/studioModels.js'
import { pedidoDaVista, entradasDoLote, pedidosDaPeca, roteiroDaPeca, lerEstado } from '../src/lib/loteExecucao.js'

// Um recorte fiel do fluxo real da Hering: ids `eN_in_papel`, formato custom
// 1720×2432, contexto de acabamento, e a ordem das arestas importando.
const nodes = [
  { id: 'e1_in_still',   type: 'imageInput', data: { rotulo: 'Still · frente', urls: ['ORIG_still.jpg'] } },
  { id: 'e1_in_bolsa',   type: 'imageInput', data: { rotulo: 'Bolsa · KMD6N10SI', urls: ['ORIG_bolsa1.jpg', 'ORIG_bolsa2.jpg'] } },
  { id: 'e1_in_calcado', type: 'imageInput', data: { rotulo: 'Calçado · AR1A1ASN', urls: ['ORIG_calcado.jpg'] } },
  { id: 'e0_in_casting', type: 'imageInput', data: { rotulo: 'Casting aprovado', urls: ['ORIG_casting.jpg'] } },
  { id: 'e2_in_pose',    type: 'imageInput', data: { rotulo: 'Referência de POSE', urls: ['POSE_a.jpg'] } },
  { id: 'ctx',  type: 'context',  data: { text: '═══ ACABAMENTO ═══\nfundo #F2F2F2, luz suave' } },
  { id: 'fmt',  type: 'formato',  data: { formato: 'custom', width: 1720, height: 2432 } },
  { id: 'p_frontal', type: 'prompt', data: { text: 'FRONTAL\n\nDe frente, peso distribuído.' } },
  { id: 'g1', type: 'generate', data: { model: 'bytedance/seedream/v5/pro/text-to-image',
      refOrder: ['e0_in_casting', 'e1_in_still', 'e1_in_calcado', 'e1_in_bolsa', 'e2_in_pose'] } },
]
// ordem das arestas = ordem das referências (casting primeiro: é a PESSOA)
const edges = [
  { source: 'e0_in_casting', target: 'g1' },
  { source: 'e1_in_still',   target: 'g1' },
  { source: 'e1_in_bolsa',   target: 'g1' },
  { source: 'e1_in_calcado', target: 'g1' },
  { source: 'e2_in_pose',    target: 'g1' },
  { source: 'ctx', target: 'g1' }, { source: 'fmt', target: 'g1' },
  { source: 'p_frontal', target: 'g1' },
]

const linha = {
  sku: 'KH6V', elenco: 'CAST.jpg',
  peca_principal: 'STILL.jpg', peca_vista_2: 'STILL_costas.jpg',
  acessorios: 'CALC.jpg;B1.jpg;B2.jpg',
}
const CTX_PECA = '═══ A PEÇA ═══\nRibana canelada, slim.'

// ── o caminho do CANVAS, escrito à mão como o componente faz ──
function comoOCanvasMonta(grafo) {
  const inp = entradasDaGeracao(grafo, edges, 'g1')
  const model = resolveModel('bytedance/seedream/v5/pro/text-to-image')
  const references = produtoresDeImagem(grafo, edges, 'g1')
    .flatMap(n => n.data.urls || []).slice(0, MAX_REFS_CANVAS)
  return {
    brand_id: 'B', workflow_id: 'W', node_id: 'g1',
    prompt: comContexto(inp.prompt, CTX_PECA || inp.context),
    formato: inp.formato, custom_size: inp.customSize,
    use_brand: inp.hasBrand, brand_facets: inp.brandFacets,
    model, references,
  }
}

const vista = { id: 'p_frontal', nome: 'FRONTAL', generateNodeId: 'g1',
                model: 'bytedance/seedream/v5/pro/text-to-image' }
const montarAddon = () => pedidoDaVista({
  nodes, edges, vista, linha, brandId: 'B', workflowId: 'W',
  resolver: v => v, contextoDaPeca: CTX_PECA,
})

describe('⭐ addon e canvas montam o MESMO pedido', () => {
  const addon = montarAddon()
  const grafoInjetado = comEntradas(nodes, entradasDoLote(nodes, linha, v => v, edges))
  const canvas = comoOCanvasMonta(grafoInjetado)

  it('o pedido inteiro é idêntico', () => {
    expect(addon).toEqual(canvas)
  })
  it('prompt: a pose vem primeiro, depois o contexto', () => {
    expect(addon.prompt.indexOf('FRONTAL')).toBe(0)
    expect(addon.prompt).toContain('[CONTEXTO ADICIONAL]')
  })
  it('⭐ o contexto do usuário é o único — nada do nó se mistura', () => {
    expect(addon.prompt).toContain('A PEÇA')
    expect(addon.prompt).not.toContain('ACABAMENTO')
  })
  it('sem contexto do usuário, vale o do nó', () => {
    const p = pedidoDaVista({ nodes, edges, vista, linha, brandId: 'B', workflowId: 'W',
      resolver: v => v, contextoDaPeca: '' })
    expect(p.prompt).toContain('ACABAMENTO')
  })
  it('formato e px vêm do grafo, não da tela', () => {
    expect(addon.formato).toBe('1720x2432')
    expect(addon.custom_size).toEqual({ width: 1720, height: 2432 })
  })
})

describe('⭐ as referências: o grafo decide, o addon só injeta', () => {
  const addon = montarAddon()
  it('⭐ a ordem é: modelo, PEÇA PRINCIPAL, depois acessórios', () => {
    expect(addon.references).toEqual(
      ['CAST.jpg', 'STILL.jpg', 'STILL_costas.jpg', 'CALC.jpg', 'B1.jpg', 'B2.jpg', 'POSE_a.jpg'])
    expect(addon.references[1]).toBe('STILL.jpg')          // a estrela, logo após a modelo
    expect(addon.references[2]).toBe('STILL_costas.jpg')   // a vista 2, colada nela
  })
  it('⭐ sem refOrder, cai na ordem das arestas — e por isso o fluxo grava a ordem', () => {
    const semOrdem = nodes.map(n => n.id === 'g1' ? { ...n, data: { ...n.data, refOrder: undefined } } : n)
    const p = pedidoDaVista({ nodes: semOrdem, edges, vista, linha, brandId: 'B', workflowId: 'W',
      resolver: v => v, contextoDaPeca: '' })
    expect(p.references[0]).toBe('CAST.jpg')
  })
  it('as N vistas de um acessório entram todas, em sequência', () => {
    expect(addon.references.filter(u => /^B\d/.test(u))).toEqual(['B1.jpg', 'B2.jpg'])
  })
  it('⭐ nó que a planilha NÃO preenche fica intocado (constante da receita)', () => {
    expect(addon.references).toContain('POSE_a.jpg')
  })
  it('nenhuma URL original sobrevive onde a planilha mandou substituir', () => {
    expect(addon.references.some(u => u.startsWith('ORIG_'))).toBe(false)
  })
  it('respeita o teto do canvas', () => {
    expect(addon.references.length).toBeLessThanOrEqual(MAX_REFS_CANVAS)
  })
})

describe('o resolver traduz nome da Biblioteca em URL', () => {
  it('aplica em toda referência injetada', () => {
    const p = pedidoDaVista({ nodes, edges, vista, linha, brandId: 'B', workflowId: 'W',
      resolver: v => `https://cdn/${v}`, contextoDaPeca: '' })
    expect(p.references[0]).toBe('https://cdn/CAST.jpg')
    expect(p.references).toContain('POSE_a.jpg')      // o não-injetado não passa pelo resolver
  })
})

describe('o mapa de injeção', () => {
  it('casa coluna com nó pelo id', () => {
    const m = entradasDoLote(nodes, linha, v => v, edges)
    expect(m.e0_in_casting).toEqual(['CAST.jpg'])
    expect(m.e1_in_still).toEqual(['STILL.jpg', 'STILL_costas.jpg'])   // peça + vista 2
    expect(m.e2_in_pose).toBeUndefined()             // constante da receita
  })
  it('⭐ os acessórios vão TODOS no primeiro nó de acessório', () => {
    const m = entradasDoLote(nodes, linha, v => v, edges)
    expect(m.e1_in_calcado).toEqual(['CALC.jpg', 'B1.jpg', 'B2.jpg'])
    expect(m.e1_in_bolsa).toEqual([])          // ⭐ zerado: nada do lote anterior sobrevive
  })
  it('papelDoNo lê o papel do id', () => {
    expect(papelDoNo('e1_in_bolsa')).toBe('bolsa')
    expect(papelDoNo('g1')).toBeNull()
  })
})

describe('uma peça, várias vistas', () => {
  const vistas = [vista, { id: 'p2', nome: 'SENTADA', generateNodeId: null, model: null }]
  it('só as escolhidas viram pedido', () => {
    const ps = pedidosDaPeca({ nodes, edges, vistas, escolhidas: ['FRONTAL'], linha,
      brandId: 'B', workflowId: 'W', resolver: v => v, contextoDaPeca: '' })
    expect(ps.map(p => p.vista)).toEqual(['FRONTAL'])
  })
  it('vista sem nó de geração não vira pedido morto', () => {
    const ps = pedidosDaPeca({ nodes, edges, vistas, escolhidas: ['FRONTAL', 'SENTADA'], linha,
      brandId: 'B', workflowId: 'W', resolver: v => v, contextoDaPeca: '' })
    expect(ps).toHaveLength(1)
  })
})

describe('⭐ o roteiro: todas as etapas, na ordem que o grafo manda', () => {
  // Recorte fiel da topologia real: e1 come e0_g1; e2 come e1_g1; e4 come e1_g1 e e2_g1.
  const N = [
    { id: 'e0_in_casting', type: 'imageInput', data: { rotulo: 'Casting aprovado', urls: ['ORIG_cast'] } },
    { id: 'e0_p1', type: 'prompt', data: { text: 'VISTA 0° · FRENTE\n\nbase' } },
    { id: 'e0_g1', type: 'generate', data: { model: 'fal-ai/gemini-25-flash-image' } },
    { id: 'e1_in_still', type: 'imageInput', data: { rotulo: 'Still · frente', urls: ['ORIG_still'] } },
    { id: 'e1_p1', type: 'prompt', data: { text: 'FRONTAL\n\nde frente' } },
    { id: 'e1_g1', type: 'generate', data: { model: 'bytedance/seedream/v5/pro/text-to-image' } },
    { id: 'e2_in_pose', type: 'imageInput', data: { rotulo: 'POSE', urls: ['POSE'] } },
    { id: 'e2_p1', type: 'prompt', data: { text: 'CAMINHANDO\n\nanda' } },
    { id: 'e2_g1', type: 'generate', data: { model: 'bytedance/seedream/v5/pro/text-to-image' } },
    { id: 'e4_p1', type: 'prompt', data: { text: 'SENTADA\n\nsenta' } },
    { id: 'e4_g1', type: 'generate', data: { model: 'bytedance/seedream/v5/pro/text-to-image' } },
  ]
  const E = [
    { source: 'e0_in_casting', target: 'e0_g1' }, { source: 'e0_p1', target: 'e0_g1' },
    { source: 'e0_g1', target: 'e1_g1' }, { source: 'e1_in_still', target: 'e1_g1' }, { source: 'e1_p1', target: 'e1_g1' },
    { source: 'e1_g1', target: 'e2_g1' }, { source: 'e2_in_pose', target: 'e2_g1' }, { source: 'e2_p1', target: 'e2_g1' },
    { source: 'e1_g1', target: 'e4_g1' }, { source: 'e2_g1', target: 'e4_g1' }, { source: 'e4_p1', target: 'e4_g1' },
  ]
  const vistas = vistasDoGrafo(N, E)
  const L = { sku: 'K', elenco: 'CAST', peca_principal: 'STILL' }
  const r = roteiroDaPeca({ nodes: N, edges: E, vistas, escolhidas: ['SENTADA'], linha: L,
    brandId: 'B', workflowId: 'W', resolver: v => v, contextoDaPeca: 'A PEÇA' })

  it('⭐ pedir SENTADA arrasta a cadeia inteira', () => {
    expect(r.plano).toEqual(['e0_g1', 'e1_g1', 'e2_g1', 'e4_g1'])
  })
  it('só uma é ENTREGA; o resto é insumo', () => {
    expect(r.entregas).toBe(1); expect(r.total).toBe(4)
    expect(r.passos.filter(p => p.entrega).map(p => p.nome)).toEqual(['SENTADA'])
  })
  it('as ondas respeitam a dependência', () => {
    expect(r.ondas).toEqual([['e0_g1'], ['e1_g1'], ['e2_g1'], ['e4_g1']])
  })
  it('⭐ a etapa 1 recebe a SAÍDA da base, não o casting original', () => {
    const p = r.passos.find(x => x.genId === 'e1_g1').montar({ e0_g1: 'BASE_LIMPA.png' })
    expect(p.references).toContain('BASE_LIMPA.png')
    expect(p.references).not.toContain('ORIG_cast')
  })
  it('⭐ sem a saída da base, a referência FALTA — é o defeito que seria calado', () => {
    const p = r.passos.find(x => x.genId === 'e1_g1').montar({})
    expect(p.references).toEqual(['STILL'])          // a base sumiu
  })
  it('a etapa 4 recebe as duas saídas de que depende', () => {
    const p = r.passos.find(x => x.genId === 'e4_g1').montar({ e1_g1: 'F.png', e2_g1: 'C.png' })
    expect(p.references).toEqual(expect.arrayContaining(['F.png', 'C.png']))
  })
  it('⭐ a base da modelo roda em nano banana; a peça em Seedream', () => {
    expect(r.passos.find(x => x.genId === 'e0_g1').montar({}).model).toMatch(/gemini/)
    expect(r.passos.find(x => x.genId === 'e1_g1').montar({}).model).toMatch(/seedream/)
  })
  it('⭐ o contexto da PEÇA não polui a base da modelo', () => {
    expect(r.passos.find(x => x.genId === 'e0_g1').montar({}).prompt).not.toContain('A PEÇA')
    expect(r.passos.find(x => x.genId === 'e1_g1').montar({}).prompt).toContain('A PEÇA')
  })
})

describe('⭐ o estado de uma geração — só `error` é falha', () => {
  it('processing ainda está em voo', () => {
    expect(lerEstado({ status: 'processing' }).estado).toBe('em_voo')
  })
  it('linha ainda não visível também está em voo', () => {
    expect(lerEstado(undefined).estado).toBe('em_voo')
  })
  it('done devolve a URL', () => {
    expect(lerEstado({ status: 'done', image_url: 'u' })).toEqual({ estado: 'pronta', url: 'u' })
  })
  it('error é falha, e sempre com texto', () => {
    expect(lerEstado({ status: 'error' }).erro).toBeTruthy()
    expect(lerEstado({ status: 'error', error: 'saldo' }).erro).toBe('saldo')
  })
  it('⭐ estado desconhecido NÃO vira falha — a peça continua gerando', () => {
    expect(lerEstado({ status: 'submitted' }).estado).toBe('em_voo')
  })
})

describe('⭐ o contexto do usuário vale COMO ESTÁ', () => {
  const DO_FLUXO = '═══ A PEÇA ═══\nribana canelada'
  const DO_USUARIO = '═══ A PEÇA ═══\npolo listrada'
  it('quando existe, o do usuário é o único', () => {
    const p = pedidoDaVista({ nodes, edges, vista, linha, brandId: 'B', workflowId: 'W',
      resolver: v => v, contextoDaPeca: DO_USUARIO })
    expect(p.prompt).toContain('polo listrada')
    expect(p.prompt).not.toContain('ribana canelada')
  })
  it('sem o do usuário, vale o do nó', () => {
    const p = pedidoDaVista({ nodes, edges, vista, linha, brandId: 'B', workflowId: 'W',
      resolver: v => v, contextoDaPeca: '' })
    expect(p.prompt).toContain('ACABAMENTO')
  })
})
