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
import { valoresDe } from './loteCatalogo'

/**
 * ⭐ Casa as colunas com os NÓS DE IMAGEM do grafo.
 *
 * O grafo declara SLOTS; a planilha os preenche. E a classificação é por papel,
 * não por nome de peça — porque a peça principal nem sempre é camisa (pode ser
 * a calça, pode ser o sapato). Um slot é:
 *
 *   casting     → a modelo (coluna `elenco`)
 *   principal   → a PEÇA, com todas as suas vistas (coluna `peca`)
 *   acessório   → os demais, na ORDEM DO GRAFO, recebendo acessorio_1, _2, _3
 *   pose        → constante da receita: a planilha não toca
 *
 * A ordem dos acessórios sai do `refOrder` do nó de geração quando existe, e da
 * ordem dos nós quando não — sempre a ordem que o fluxo declara, nunca uma
 * convenção do addon.
 */
export function classificarSlots(nodes, edges) {
  const porEtapa = {}
  for (const n of nodes || []) {
    if (n?.type !== 'imageInput') continue
    const etapa = etapaDoNo(n.id)
    const papel = papelDoNo(n.id) || ''
    const tipo = /casting/.test(papel) ? 'casting'
               : /still|peca/.test(papel) ? 'principal'
               : /pose/.test(papel) ? 'pose'
               : 'acessorio'
    ;(porEtapa[etapa] ||= []).push({ id: n.id, tipo, no: n })
  }
  // Dentro de cada etapa, os acessórios seguem a ordem que o grafo declara.
  const ordemDoGrafo = new Map()
  for (const n of nodes || []) {
    if (n?.type !== 'generate') continue
    const ro = n.data?.refOrder
    if (Array.isArray(ro)) ro.forEach((id, i) => { if (!ordemDoGrafo.has(id)) ordemDoGrafo.set(id, i) })
  }
  const slots = {}
  for (const [etapa, lista] of Object.entries(porEtapa)) {
    const acess = lista.filter(x => x.tipo === 'acessorio')
      .sort((a, b) => (ordemDoGrafo.get(a.id) ?? 99) - (ordemDoGrafo.get(b.id) ?? 99))
    for (const x of lista) {
      slots[x.id] = x.tipo === 'acessorio'
        ? `acessorio_${acess.findIndex(a => a.id === x.id) + 1}`
        : x.tipo
    }
  }
  return slots
}

const COLUNA_DO_SLOT = { casting: 'elenco', principal: 'peca' }

/**
 * Mapa `{ nodeId: [url] }` para injetar no grafo.
 * Slot `pose` fica de fora de propósito: é constante da receita.
 */
export function entradasDoLote(nodes, linha, resolver = (v) => v, edges = []) {
  const slots = classificarSlots(nodes, edges)
  const mapa = {}
  for (const [nodeId, slot] of Object.entries(slots)) {
    if (slot === 'pose') continue
    const col = COLUNA_DO_SLOT[slot] || slot          // acessorio_1, _2, _3
    const vals = valoresDe(linha, col)
    if (!vals.length) continue
    mapa[nodeId] = vals.map(resolver).filter(Boolean)
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

  const grafo = comEntradas(nodes, entradasDoLote(nodes, linha, resolver, edges))
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
