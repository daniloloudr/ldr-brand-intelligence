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
export function classificarSlots(nodes) {
  const slots = {}
  for (const n of nodes || []) {
    if (n?.type !== 'imageInput') continue
    const papel = papelDoNo(n.id) || ''
    slots[n.id] = /casting/.test(papel)     ? 'casting'
                : /still|peca/.test(papel)  ? 'principal'
                : /pose/.test(papel)        ? 'pose'
                : 'acessorio'
  }
  return slots
}

/**
 * Preenche os nós do grafo com as TRÊS entradas.
 *
 *   slot casting    ← Modelo
 *   slot principal  ← Peça Principal, e em seguida a Vista 2 (mesma peça)
 *   slot acessório  ← Acessórios, todos no PRIMEIRO nó de acessório
 *   slot pose       ← intocado: é constante da receita
 *
 * Os acessórios vão todos no primeiro nó porque um nó de imagem carrega N
 * imagens, e distribuir um por nó inventaria uma correspondência que a planilha
 * não declara — "o segundo acessório é o calçado" só é verdade num look de
 * camiseta, que é justamente o que deixou de ser assumido.
 */
export function entradasDoLote(nodes, linha, resolver = (v) => v, edges = []) {
  const slots = classificarSlots(nodes)
  const mapa = {}
  const usar = (col) => valoresDe(linha, col).map(resolver).filter(Boolean)

  const peca   = [...usar('peca_principal'), ...usar('peca_vista_2')]
  const acess  = usar('acessorios')
  const modelo = usar('elenco')

  // A ordem dos acessórios é a que o fluxo declara no `refOrder` — o primeiro
  // deles recebe o balde inteiro.
  const ordem = new Map()
  for (const n of nodes || []) {
    const ro = n?.type === 'generate' ? n.data?.refOrder : null
    if (Array.isArray(ro)) ro.forEach((id, i) => { if (!ordem.has(id)) ordem.set(id, i) })
  }
  const acessorios = Object.entries(slots).filter(([, s]) => s === 'acessorio')
    .map(([id]) => id).sort((a, b) => (ordem.get(a) ?? 99) - (ordem.get(b) ?? 99))

  for (const [nodeId, slot] of Object.entries(slots)) {
    if (slot === 'pose') continue
    if (slot === 'casting')   { mapa[nodeId] = modelo; continue }
    if (slot === 'principal') { mapa[nodeId] = peca;   continue }
  }
  // ⚠️ TODO nó de acessório é reescrito, inclusive com lista VAZIA. Sem isso os
  // nós que a planilha não preenche guardariam as URLs do lote ANTERIOR — a
  // bolsa e o calçado da Hering entrariam em todo SKU novo, caladas, e a peça
  // sairia com um acessório que ninguém pediu.
  acessorios.forEach((id, i) => { mapa[id] = i === 0 ? acess : [] })
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
  // ⚠️ O contexto do usuário SUBSTITUI o do nó, não soma.
  //
  // Somar produzia DUAS seções §O LOOK no mesmo prompt: a do fluxo (escrita para
  // o KH6V — "SAPATILHA PRETA", "TOTE PRETA") e a do SKU novo ("MOCASSIM
  // MARROM", "TOTE MARROM"). O modelo obedeceu a primeira e devolveu bolsa e
  // sapato pretos, com as referências marrons na mão. Instrução contraditória
  // não dá erro: dá imagem errada com cara de certa.
  //
  // "O contexto precisa ser escrito pelo usuário, o restante é conosco"
  // (Danilo, 04/set) — o nó de contexto das etapas de PEÇA é conteúdo de lote
  // morando no lugar de constante. Na etapa 0 o contexto é da PESSOA e continua
  // sendo do fluxo.
  const contexto = daPeca || inp.context

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

/**
 * ⭐ O estado de uma geração, lido como o canvas lê.
 *
 * Os estados que o backend usa são `processing`, `done` e `error` — e SÓ eles.
 * Tratar "qualquer coisa diferente de done" como falha marcava a peça de
 * vermelho três segundos depois de disparar, enquanto ela gerava normalmente:
 * a imagem chegava, e a tela já tinha desistido dela.
 *
 * Só `error` é falha. O resto ainda está em voo.
 */
export function lerEstado(row) {
  if (!row) return { estado: 'em_voo' }
  if (row.status === 'done')  return { estado: 'pronta', url: row.image_url }
  if (row.status === 'error') return { estado: 'falhou', erro: row.error || 'a geração falhou' }
  return { estado: 'em_voo' }
}
