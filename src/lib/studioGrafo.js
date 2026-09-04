// ════════════════════════════════════════════════════════════════════
// O GRAFO, LIDO — uma leitura só, para o canvas e para os addons
//
// POR QUE ESTE ARQUIVO EXISTE
// Pergunta do Danilo (04/set): *"preciso garantir que o fluxo da tela é igual
// ao do fluxo criado no Fluxos, correto?"* — e a resposta, até aqui, era não.
//
// A leitura do grafo (que prompt, que formato, que contexto, que modelo
// alimentam um nó de geração) morava DENTRO do `StudioCanvas.jsx`, como função
// de componente. Qualquer addon que quisesse rodar o mesmo fluxo teria de
// reimplementá-la — e implementação duplicada diverge no primeiro conserto que
// alguém fizer só de um lado. Foi exatamente assim que o `studio-campaign.js`
// ficou órfão sem ninguém notar.
//
// Estas funções são PURAS sobre (nodes, edges). O canvas passa o estado dele;
// o addon passa o que leu do banco. Mesma entrada, mesma saída, por construção.
// ════════════════════════════════════════════════════════════════════

const dados = (n) => n?.data || {}

// Quem produz imagem no grafo. Espelha `PRODUCES_IMAGE` do studioNodes: nó que
// não produz imagem NÃO entra como referência, por mais conectado que esteja.
export const PRODUZ_IMAGEM = new Set(['generate', 'app', 'imageInput', 'preview', 'artGate'])

// Normaliza o que um nó "produziu": string, lista, ou nada.
export const paraUrls = (v) => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : [])

/** Nós ligados à ENTRADA de um nó. */
export const entradasDe = (nodes, edges, nodeId) => {
  const ids = (edges || []).filter(e => e.target === nodeId).map(e => e.source)
  return (nodes || []).filter(n => ids.includes(n.id))
}

/** Nós ligados à SAÍDA de um nó. */
export const saidasDe = (nodes, edges, nodeId) => {
  const ids = (edges || []).filter(e => e.source === nodeId).map(e => e.target)
  return (nodes || []).filter(n => ids.includes(n.id))
}

/**
 * O que alimenta um nó de geração: prompt, formato, contexto, faceta de marca.
 * Extraído do `inputsFor` do StudioCanvas SEM mudar comportamento — inclusive o
 * clamp do tamanho custom, que é o que impede um px absurdo chegar na fal.
 */
export function entradasDaGeracao(nodes, edges, genId) {
  const ins         = entradasDe(nodes, edges, genId)
  const promptNode  = ins.find(n => n.type === 'prompt')
  const formatoNode = ins.find(n => n.type === 'formato')
  const brandNodes  = ins.filter(n => n.type === 'brandContext')
  const context     = ins.filter(n => n.type === 'context')
                         .map(n => (dados(n).text || '').trim()).filter(Boolean).join('\n\n')
  const previewNode = (nodes || []).find(n =>
    n.type === 'preview' && (edges || []).some(e => e.source === genId && e.target === n.id))

  const brandFacets = []
  if (brandNodes.some(n => /voz|voice|verbal/i.test(dados(n).title || ''))) brandFacets.push('verbal')
  if (brandNodes.some(n => /visual/i.test(dados(n).title || '')))           brandFacets.push('visual')

  const fd = dados(formatoNode)
  const customSize = fd.formato === 'custom'
    ? { width:  Math.min(4096, Math.max(256, fd.width  || 1080)),
        height: Math.min(4096, Math.max(256, fd.height || 1350)) }
    : null

  return {
    prompt: (dados(promptNode).text || '').trim(),
    promptNodeId: promptNode?.id || null,
    formato: customSize ? `${customSize.width}x${customSize.height}` : (fd.formato || '1:1'),
    customSize,
    hasBrand: brandNodes.length > 0,
    brandFacets,
    context,
    previewNodeId: previewNode?.id,
  }
}

/**
 * Junta prompt + contexto num texto só. UMA linha, e mesmo assim é o ponto onde
 * a divergência doeria mais: se o addon montasse com outro separador, a peça
 * sairia diferente da que o canvas gera com o mesmo grafo — e ninguém acharia
 * a causa olhando o grafo, porque o grafo seria idêntico.
 */
export const comContexto = (prompt, context) =>
  context ? `${prompt}\n\n[CONTEXTO ADICIONAL]\n${context}` : prompt

/** O nó `generate` que consome um nó de prompt. */
export const geracaoDoPrompt = (nodes, edges, promptId) =>
  saidasDe(nodes, edges, promptId).find(n => n.type === 'generate') || null

/**
 * As VISTAS que um fluxo oferece: cada nó `prompt` que desemboca numa geração.
 * O nome é a primeira linha do texto ("FRONTAL", "SENTADA"); o resto é a
 * instrução da pose. Ler daqui é o que impede a tela de discordar do canvas
 * quando alguém acrescenta uma pose lá.
 */
export function vistasDoGrafo(nodes, edges) {
  const vistas = []
  for (const n of Array.isArray(nodes) ? nodes : []) {
    if (n?.type !== 'prompt') continue
    const texto = String(dados(n).text || '')
    const nome  = (texto.split(/\r?\n/)[0] || '').trim()
    if (!nome || vistas.some(v => v.nome === nome)) continue
    const gen = geracaoDoPrompt(nodes, edges, n.id)
    const etapa = etapaDoNo(gen?.id) ?? etapaDoNo(n.id)
    vistas.push({
      id: n.id,
      nome,
      instrucao: texto.slice(nome.length).trim(),
      generateNodeId: gen?.id || null,
      model: dados(gen).model === 'custom' ? dados(gen).customModel : (dados(gen).model || null),
      etapa,
      // A etapa 0 constrói a base da modelo; ela não é entrega de catálogo.
      deCatalogo: etapa === null ? true : etapa !== ETAPA_DA_BASE,
    })
  }
  return vistas
}

/**
 * ⭐ A ORDEM DAS REFERÊNCIAS — o coração da fidelidade.
 *
 * Extraído do `imageUpstreamsOf` do canvas, sem mudar comportamento. Duas
 * regras, e as duas custaram rodada para serem descobertas (F4 · itens 4+6):
 *
 *  · vale a ordem das ARESTAS, não a do array de nós. A convenção do try-on
 *    (1ª = modelo, 2ª = peça) depende disso, e foi a raiz do "a 1ª imagem
 *    precisa ser PESSOA";
 *  · mas a ordem ESCOLHIDA no painel Entradas (`refOrder`) vence a das
 *    conexões, porque ordem de conexão é histórico de edição — ninguém a vê
 *    nem a controla sem refazer as ligações.
 *
 * O addon NÃO monta lista de referência própria: ele troca as URLs dos nós de
 * imagem e chama isto. Assim a ordem é decidida pelo MESMO código que decide no
 * canvas, e não por uma convenção paralela que divergiria no primeiro ajuste.
 */
export function produtoresDeImagem(nodes, edges, nodeId) {
  const ids = [...new Set((edges || []).filter(e => e.target === nodeId).map(e => e.source))]
  const produtores = ids.map(id => (nodes || []).find(n => n.id === id))
                        .filter(n => n && PRODUZ_IMAGEM.has(n.type))
  const refOrder = dados((nodes || []).find(n => n.id === nodeId)).refOrder
  if (!Array.isArray(refOrder) || !refOrder.length) return produtores
  const pos = id => { const i = refOrder.indexOf(id); return i === -1 ? Infinity : i }
  return [...produtores].sort((a, b) => pos(a.id) - pos(b.id))
}

/**
 * As URLs de referência de uma geração, na ordem que o grafo determina.
 *
 * `saidas` é o mapa `{ nodeId: url }` do que JÁ foi produzido nesta rodada —
 * exatamente o `outputs` do canvas. É por ele que a etapa 2 recebe a imagem
 * aprovada da etapa 1: sem isso, um nó `generate` a montante entra vazio e a
 * peça sai SEM a base da modelo, em silêncio.
 */
export const referenciasDaGeracao = (nodes, edges, genId, teto = Infinity, saidas = {}) =>
  produtoresDeImagem(nodes, edges, genId)
    .flatMap(n => paraUrls(saidas?.[n.id] ?? (dados(n).urls || dados(n).outputUrl || dados(n).imageUrl || dados(n).url)))
    .slice(0, teto)

/** Os nós `generate` a montante de um nó — as dependências dele. */
export const dependenciasDeGeracao = (nodes, edges, genId) =>
  produtoresDeImagem(nodes, edges, genId).filter(n => n.type === 'generate').map(n => n.id)

/**
 * ⭐ O PLANO DE EXECUÇÃO — a ordem em que as gerações precisam rodar.
 *
 * Dado o que se QUER (as vistas escolhidas), devolve tudo que precisa rodar
 * antes, em ordem topológica. No processo da Hering isso é o que faz a etapa 2
 * receber a FRONTAL aprovada e a etapa 1 receber a base da modelo — o
 * encadeamento que a §F0.6 chama de "a saída aprovada vira entrada".
 *
 * Pedir só "SENTADA" (e4) arrasta e0_g1, e1_g1 e e2_g1 junto, porque sem eles
 * a peça sairia sem base, sem look aprovado e sem pose.
 */
export function planoDeExecucao(nodes, edges, alvos) {
  const ordem = []
  const estado = new Map()          // id → 'visitando' | 'pronto'
  const visitar = (id) => {
    if (estado.get(id) === 'pronto') return
    if (estado.get(id) === 'visitando') return      // ciclo: não trava, só não repete
    estado.set(id, 'visitando')
    for (const dep of dependenciasDeGeracao(nodes, edges, id)) visitar(dep)
    estado.set(id, 'pronto')
    ordem.push(id)
  }
  for (const a of alvos || []) if (a) visitar(a)
  return ordem
}

/** Divide o plano em ONDAS: tudo numa onda pode rodar em paralelo. */
export function ondasDaExecucao(nodes, edges, plano) {
  const nivel = new Map()
  for (const id of plano) {
    const deps = dependenciasDeGeracao(nodes, edges, id).filter(d => nivel.has(d))
    nivel.set(id, deps.length ? Math.max(...deps.map(d => nivel.get(d))) + 1 : 0)
  }
  const ondas = []
  for (const [id, n] of nivel) (ondas[n] ||= []).push(id)
  return ondas.filter(Boolean)
}

/**
 * Troca as URLs dos nós de imagem por um mapa `{ nodeId: [url, …] }`.
 *
 * É assim que o addon injeta a peça do cliente NO GRAFO, em vez de montar um
 * pedido paralelo: o grafo continua sendo quem decide o que entra e em que
 * ordem. Nó não citado no mapa fica como está — é o que preserva as
 * constantes da receita (pose de referência, fundo, base neutra).
 */
export function comEntradas(nodes, mapa) {
  return (nodes || []).map(n => {
    const urls = mapa?.[n.id]
    if (!urls) return n
    return { ...n, data: { ...dados(n), urls: Array.isArray(urls) ? urls : [urls] } }
  })
}

/**
 * A ETAPA de um nó, pelo prefixo do id (`e0_g4` → 0, `e2_in_pose` → 2).
 *
 * ⚠️ A etapa 0 NÃO é catálogo: é a construção da BASE DE CASTING LIMPA, e roda
 * em nano banana porque o trabalho é pessoa. As etapas 1+ é que produzem a peça,
 * em Seedream 5 Pro. Misturar as duas ofereceria "VISTA 90° · PERFIL" como se
 * fosse saída de catálogo, quando é ângulo da base da modelo — e o cliente
 * pagaria por uma imagem que não é entrega.
 */
export const etapaDoNo = (nodeId) => {
  const m = String(nodeId || '').match(/^e(\d+)_/)
  return m ? Number(m[1]) : null
}

export const ETAPA_DA_BASE = 0

/**
 * O papel de um nó de imagem, deduzido do id (`e1_in_bolsa` → `bolsa`).
 * A convenção existe no fluxo real da Hering e é o que permite casar as colunas
 * da planilha com os nós do grafo sem ninguém remapear à mão.
 */
export const papelDoNo = (nodeId) => {
  const m = String(nodeId || '').match(/^e\d+_in_(.+)$/)
  return m ? m[1] : null
}
