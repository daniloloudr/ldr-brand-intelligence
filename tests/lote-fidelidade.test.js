// ⭐ O TESTE QUE RESPONDE "vai garantir a fidelidade?"
//
// Ele monta o pedido de duas maneiras — pelo caminho do CANVAS e pelo caminho
// do ADDON — sobre o MESMO grafo, e exige que sejam idênticos. Se alguém mudar
// a leitura de um lado, este teste fica vermelho antes de qualquer imagem ser
// gerada, e antes de qualquer crédito ser gasto.
import { describe, it, expect } from 'vitest'
import {
  entradasDaGeracao, comContexto, referenciasDaGeracao, comEntradas, papelDoNo, produtoresDeImagem,
} from '../src/lib/studioGrafo.js'
import { resolveModel, MAX_REFS_CANVAS } from '../src/lib/studioModels.js'
import { pedidoDaVista, entradasDoLote, pedidosDaPeca } from '../src/lib/loteExecucao.js'

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
  { id: 'g1', type: 'generate', data: { model: 'bytedance/seedream/v5/pro/text-to-image' } },
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
  sku: 'KH6V', elenco: 'CAST.jpg', peca_frente: 'STILL.jpg',
  bolsa: 'B1.jpg;B2.jpg', calcado: 'CALC.jpg',
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
    prompt: comContexto(inp.prompt, [inp.context, CTX_PECA].filter(Boolean).join('\n\n')),
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
  const grafoInjetado = comEntradas(nodes, entradasDoLote(nodes, linha))
  const canvas = comoOCanvasMonta(grafoInjetado)

  it('o pedido inteiro é idêntico', () => {
    expect(addon).toEqual(canvas)
  })
  it('prompt: pose + contexto do grafo + contexto da peça, nessa ordem', () => {
    expect(addon.prompt.indexOf('FRONTAL')).toBe(0)
    expect(addon.prompt).toContain('[CONTEXTO ADICIONAL]')
    expect(addon.prompt.indexOf('ACABAMENTO')).toBeLessThan(addon.prompt.indexOf('A PEÇA'))
  })
  it('formato e px vêm do grafo, não da tela', () => {
    expect(addon.formato).toBe('1720x2432')
    expect(addon.custom_size).toEqual({ width: 1720, height: 2432 })
  })
})

describe('⭐ as referências: o grafo decide, o addon só injeta', () => {
  const addon = montarAddon()
  it('a 1ª referência é a PESSOA — a regra que custou o KH6V', () => {
    expect(addon.references[0]).toBe('CAST.jpg')
  })
  it('a ordem é a das arestas, não a das colunas da planilha', () => {
    expect(addon.references).toEqual(['CAST.jpg', 'STILL.jpg', 'B1.jpg', 'B2.jpg', 'CALC.jpg', 'POSE_a.jpg'])
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
    const m = entradasDoLote(nodes, linha)
    expect(m.e0_in_casting).toEqual(['CAST.jpg'])
    expect(m.e1_in_bolsa).toEqual(['B1.jpg', 'B2.jpg'])
    expect(m.e2_in_pose).toBeUndefined()             // sem coluna: constante da receita
  })
  it('still de COSTAS usa a coluna própria, pelo rótulo', () => {
    const n2 = [...nodes, { id: 'e3_in_still', type: 'imageInput', data: { rotulo: 'Still · costas', urls: ['x'] } }]
    const m = entradasDoLote(n2, { ...linha, peca_costas: 'COSTAS.jpg' })
    expect(m.e3_in_still).toEqual(['COSTAS.jpg'])
    expect(m.e1_in_still).toEqual(['STILL.jpg'])
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
