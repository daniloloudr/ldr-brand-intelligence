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
    vistas.push({
      id: n.id,
      nome,
      instrucao: texto.slice(nome.length).trim(),
      generateNodeId: gen?.id || null,
      model: dados(gen).model === 'custom' ? dados(gen).customModel : (dados(gen).model || null),
    })
  }
  return vistas
}
