// A leitura do grafo é UMA. Este arquivo existe porque a pergunta do Danilo
// ("garanto que a tela roda o mesmo que o Fluxos?") só tem resposta se houver
// uma implementação só — e um teste que a segure no lugar.
import { describe, it, expect } from 'vitest'
import { entradasDaGeracao, comContexto, vistasDoGrafo, geracaoDoPrompt, entradasDe, saidasDe } from '../src/lib/studioGrafo.js'

const nodes = [
  { id: 'p1', type: 'prompt',   data: { text: 'FRONTAL\n\nDe frente, peso distribuído.' } },
  { id: 'p2', type: 'prompt',   data: { text: 'SENTADA\n\nNum cubo neutro.' } },
  { id: 'ctx', type: 'context', data: { text: '═══ ACABAMENTO ═══\nfundo #F2F2F2' } },
  { id: 'fmt', type: 'formato', data: { formato: 'custom', width: 1720, height: 2432 } },
  { id: 'bv', type: 'brandContext', data: { title: 'Brand Visual' } },
  { id: 'g1', type: 'generate', data: { model: 'bytedance/seedream/v5/pro/text-to-image' } },
  { id: 'g2', type: 'generate', data: { model: 'custom', customModel: 'x/y' } },
  { id: 'pv', type: 'preview',  data: {} },
]
const edges = [
  { source: 'p1', target: 'g1' }, { source: 'ctx', target: 'g1' },
  { source: 'fmt', target: 'g1' }, { source: 'bv', target: 'g1' },
  { source: 'g1', target: 'pv' }, { source: 'p2', target: 'g2' },
]

describe('as entradas de uma geração', () => {
  const e = entradasDaGeracao(nodes, edges, 'g1')
  it('pega o prompt do nó conectado', () => expect(e.prompt).toContain('FRONTAL'))
  it('junta o contexto dos nós de contexto', () => expect(e.context).toContain('ACABAMENTO'))
  it('lê o formato custom em px, com clamp', () => {
    expect(e.customSize).toEqual({ width: 1720, height: 2432 })
    expect(e.formato).toBe('1720x2432')
  })
  it('clampa px absurdo — é o que impede pedido inválido chegar na fal', () => {
    const n2 = nodes.map(n => n.id === 'fmt' ? { ...n, data: { formato: 'custom', width: 99999, height: 1 } } : n)
    expect(entradasDaGeracao(n2, edges, 'g1').customSize).toEqual({ width: 4096, height: 256 })
  })
  it('detecta faceta visual da marca', () => {
    expect(e.hasBrand).toBe(true)
    expect(e.brandFacets).toContain('visual')
  })
  it('acha a prévia a jusante', () => expect(e.previewNodeId).toBe('pv'))
  it('geração sem nada conectado não quebra', () => {
    const v = entradasDaGeracao(nodes, edges, 'inexistente')
    expect(v.prompt).toBe(''); expect(v.formato).toBe('1:1'); expect(v.customSize).toBeNull()
  })
})

describe('⭐ comContexto — a linha onde a divergência doeria mais', () => {
  it('junta com o separador exato do canvas', () => {
    expect(comContexto('P', 'C')).toBe('P\n\n[CONTEXTO ADICIONAL]\nC')
  })
  it('sem contexto, devolve o prompt intacto', () => {
    expect(comContexto('P', '')).toBe('P')
  })
})

describe('as vistas do grafo', () => {
  const v = vistasDoGrafo(nodes, edges)
  it('uma vista por nó prompt, nomeada pela 1ª linha', () => {
    expect(v.map(x => x.nome)).toEqual(['FRONTAL', 'SENTADA'])
  })
  it('cada vista sabe qual geração ela alimenta', () => {
    expect(v[0].generateNodeId).toBe('g1')
  })
  it('⭐ o modelo vem da geração DAQUELA vista, não do primeiro nó do grafo', () => {
    expect(v[0].model).toBe('bytedance/seedream/v5/pro/text-to-image')
    expect(v[1].model).toBe('x/y')          // model:'custom' resolve para customModel
  })
  it('grafo vazio devolve vazio', () => expect(vistasDoGrafo(null, null)).toEqual([]))
})

describe('as arestas', () => {
  it('entradas e saídas', () => {
    expect(entradasDe(nodes, edges, 'g1').map(n => n.id).sort()).toEqual(['bv', 'ctx', 'fmt', 'p1'])
    expect(saidasDe(nodes, edges, 'g1').map(n => n.id)).toEqual(['pv'])
    expect(geracaoDoPrompt(nodes, edges, 'p1').id).toBe('g1')
  })
})

describe('⭐ a etapa 0 é a BASE da modelo, não catálogo', () => {
  const n = [
    { id: 'e0_p1', type: 'prompt',   data: { text: 'VISTA 90° · PERFIL\n\nde lado' } },
    { id: 'e0_g4', type: 'generate', data: { model: 'fal-ai/gemini-25-flash-image' } },
    { id: 'e1_p1', type: 'prompt',   data: { text: 'FRONTAL\n\nde frente' } },
    { id: 'e1_g1', type: 'generate', data: { model: 'bytedance/seedream/v5/pro/text-to-image' } },
  ]
  const e = [{ source: 'e0_p1', target: 'e0_g4' }, { source: 'e1_p1', target: 'e1_g1' }]
  const v = vistasDoGrafo(n, e)

  it('lê a etapa do id do nó', () => {
    expect(v.find(x => x.nome.startsWith('VISTA 90')).etapa).toBe(0)
    expect(v.find(x => x.nome === 'FRONTAL').etapa).toBe(1)
  })
  it('⭐ a etapa 0 NÃO é de catálogo — é insumo, e cobrá-la seria errado', () => {
    expect(v.find(x => x.nome.startsWith('VISTA 90')).deCatalogo).toBe(false)
    expect(v.find(x => x.nome === 'FRONTAL').deCatalogo).toBe(true)
  })
  it('cada etapa traz o modelo do trabalho dela', () => {
    expect(v.find(x => x.etapa === 0).model).toMatch(/gemini/)      // pessoa → nano banana
    expect(v.find(x => x.etapa === 1).model).toMatch(/seedream/)    // peça  → Seedream 5 Pro
  })
  it('nó sem prefixo de etapa não é excluído por engano', () => {
    const solto = vistasDoGrafo(
      [{ id: 'x', type: 'prompt', data: { text: 'AVULSA\n\nx' } },
       { id: 'y', type: 'generate', data: { model: 'm' } }],
      [{ source: 'x', target: 'y' }])
    expect(solto[0].deCatalogo).toBe(true)
  })
})
