// ════════════════════════════════════════════════════════════════════
// A CORRIDA DO LOTE — montagem do pedido, idêntica à do canvas
//
// "garanta a fidelidade no processo para que o resultado seja incrível quanto
// no que fizemos em fluxo" (Danilo, 04/set).
//
// A garantia não vem de cuidado — vem de o addon NÃO MONTAR NADA POR CONTA.
// Ele injeta as URLs do cliente nos nós de imagem do grafo e chama as MESMAS
// funções que o canvas chama. Se a ordem, o formato ou o prompt mudarem lá,
// mudam aqui, porque é o mesmo código. `tests/lote-fidelidade.test.js` prova a
// igualdade payload a payload.
// ════════════════════════════════════════════════════════════════════
import { entradasDaGeracao, comContexto, referenciasDaGeracao, comEntradas, papelDoNo,
         planoDeExecucao, ondasDaExecucao, etapaDoNo, ETAPA_DA_BASE } from './studioGrafo'
import { resolveModel, MAX_REFS_CANVAS } from './studioModels'
import { valoresDe, PAPEIS } from './loteCatalogo'

// Casa as colunas da planilha com os nós de imagem do grafo, pelo id
// (`e1_in_bolsa` → coluna `bolsa`). O elenco alimenta o nó de casting.
const COLUNA_DO_PAPEL = {
  casting: 'elenco', still: 'peca_frente', look: 'calca',
  calca: 'calca', calcado: 'calcado', bolsa: 'bolsa',
}

/**
 * Mapa `{ nodeId: [url] }` para injetar no grafo.
 * O `resolver` traduz o valor da planilha (nome na Biblioteca ou URL) em URL.
 * Nó cujo papel a planilha não preenche fica INTOCADO — é o que preserva as
 * constantes da receita (referência de pose, base neutra, fundo).
 */
export function entradasDoLote(nodes, linha, resolver = (v) => v) {
  const mapa = {}
  for (const n of nodes || []) {
    if (n?.type !== 'imageInput') continue
    const papel = papelDoNo(n.id)
    const col = COLUNA_DO_PAPEL[papel]
    if (!col) continue
    // `still` de costas tem coluna própria; o id não distingue, o rótulo sim.
    const rotulo = String(n?.data?.rotulo || '')
    const colFinal = (papel === 'still' && /costas/i.test(rotulo)) ? 'peca_costas' : col
    const vals = valoresDe(linha, colFinal)
    if (!vals.length) continue
    mapa[n.id] = vals.map(resolver).filter(Boolean)
  }
  return mapa
}

/**
 * O pedido de UMA vista, montado exatamente como o canvas monta.
 * Devolve `null` quando o grafo não tem geração para aquela vista.
 */
export function pedidoDaVista({ nodes, edges, vista, genId: genDireto, linha, brandId, workflowId,
                                resolver, contextoDaPeca = '', saidas = {} }) {
  const genId = genDireto || vista?.generateNodeId
  if (!genId) return null

  const grafo = comEntradas(nodes, entradasDoLote(nodes, linha, resolver))
  const inp   = entradasDaGeracao(grafo, edges, genId)
  const gen   = (nodes || []).find(n => n.id === genId)
  const bruto = vista?.model ?? (gen?.data?.model === 'custom' ? gen?.data?.customModel : gen?.data?.model)
  const model = resolveModel(bruto)

  // A etapa 0 é a base da modelo: o contexto da PEÇA não entra ali, porque o
  // assunto é a pessoa. Mandar a descrição da camiseta para o nano banana
  // gerando a base é ruído — e ruído vira deriva de identidade.
  const daPeca = etapaDoNo(genId) === ETAPA_DA_BASE ? '' : contextoDaPeca

  // O contexto da peça entra JUNTO do contexto que o grafo já declara — nunca
  // no lugar dele. O do grafo é a constante da receita (câmera, acabamento); o
  // da peça é o que muda por SKU. Substituir um pelo outro perderia metade.
  const contexto = [inp.context, daPeca].filter(Boolean).join('\n\n')

  return {
    brand_id: brandId,
    workflow_id: workflowId,
    node_id: genId,
    prompt: comContexto(inp.prompt, contexto),
    formato: inp.formato,
    ...(inp.customSize ? { custom_size: inp.customSize } : {}),
    use_brand: inp.hasBrand,
    brand_facets: inp.brandFacets,
    model,
    references: referenciasDaGeracao(grafo, edges, genId, MAX_REFS_CANVAS, saidas),
  }
}

/** Um pedido por vista escolhida, na ordem em que ela aparece no grafo. */
export function pedidosDaPeca({ nodes, edges, vistas, escolhidas, linha, brandId, workflowId, resolver, contextoDaPeca }) {
  return (vistas || [])
    .filter(v => (escolhidas || []).some(e => e.toLowerCase() === v.nome.toLowerCase()))
    .map(v => ({ vista: v.nome, pedido: pedidoDaVista({ nodes, edges, vista: v, linha, brandId, workflowId, resolver, contextoDaPeca }) }))
    .filter(x => x.pedido)
}

/**
 * ⭐ O ROTEIRO COMPLETO de uma peça: tudo que precisa rodar, em ondas.
 *
 * Escolher "SENTADA" não gera uma imagem — gera quatro, porque a etapa 4 come a
 * etapa 2, que come a 1, que come a base da modelo. Este roteiro é o que impede
 * a peça de sair sem base, que é o defeito que apareceria CALADO: a referência
 * simplesmente faltaria e a imagem viria plausível e errada.
 */
export function roteiroDaPeca({ nodes, edges, vistas, escolhidas, linha, brandId, workflowId,
                                resolver, contextoDaPeca }) {
  const alvos = (vistas || [])
    .filter(v => (escolhidas || []).some(e => e.toLowerCase() === v.nome.toLowerCase()))
    .map(v => v.generateNodeId).filter(Boolean)

  const plano = planoDeExecucao(nodes, edges, alvos)
  const ondas = ondasDaExecucao(nodes, edges, plano)
  const nome = (genId) => (vistas || []).find(v => v.generateNodeId === genId)?.nome
                       || `etapa ${etapaDoNo(genId) ?? '?'}`

  return {
    plano, ondas, alvos,
    // quantas gerações no total, e quantas são ENTREGA (o resto é insumo)
    total: plano.length,
    entregas: alvos.length,
    passos: plano.map(genId => ({
      genId, nome: nome(genId), etapa: etapaDoNo(genId),
      entrega: alvos.includes(genId),
      montar: (saidas) => pedidoDaVista({ nodes, edges, genId, linha, brandId, workflowId,
                                          resolver, contextoDaPeca, saidas }),
    })),
  }
}
