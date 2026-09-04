// ════════════════════════════════════════════════════════════════════
// O CATÁLOGO DE ADDONS — e ele mora em CÓDIGO de propósito (§13.10).
//
// Um addon É uma tela construída sobre um fluxo, no vocabulário do cliente
// (§13.2). O banco não deve anunciar o que não tem implementação: addon fora
// desta lista não pode ser solicitado, e assim nunca existe linha de
// `addon_instalacao` apontando para o vazio.
//
// O que o banco guarda é só a INSTALAÇÃO — quem pediu, quem liberou, em que
// estado está.
//
// ⚠️ `estado` aqui é o do PRODUTO, não o da instalação. Um addon
// `em_construcao` pode ser solicitado: a fila de pedidos é o que MEDE A
// DEMANDA antes de a tela existir, e foi essa a razão de a §13.10 preferir
// pedir-e-liberar a instalar-sozinho.
// ════════════════════════════════════════════════════════════════════

export const ADDONS = [
  {
    slug: 'catalogo',
    nome: 'Catálogo',
    resumo: 'Uma planilha e uma pasta de fotos viram peças por SKU. O juiz filtra, e a rodada para em portões para o seu time bater o martelo.',
    paraQuem: 'Operação de catálogo — moda, varejo, marketplace.',
    fluxo: 'Roda sobre um fluxo já aprovado. O canvas continua sendo onde a receita se desenha.',
    estado: 'em_construcao',
  },
  {
    slug: 'formatos',
    nome: 'Fan-out de Formato',
    resumo: 'Uma peça aprovada vira todos os formatos de uma vez, com preview antes de gravar.',
    paraQuem: 'Quem publica a mesma peça em muitos canais.',
    fluxo: 'Usa o nó Recortar, que já existe e não cobra crédito.',
    estado: 'em_construcao',
  },
]

export const acharAddon = (slug) => ADDONS.find((a) => a.slug === slug) || null

// Os quatro estados de `addon_instalacao.estado` (059), com o que a tela diz
// de cada um. `null` = nunca foi pedido.
export const ROTULO_ESTADO = {
  pedido:   { texto: 'Pedido enviado', cor: 'warning' },
  ativo:    { texto: 'Ativo',          cor: 'success' },
  recusado: { texto: 'Recusado',       cor: 'error'   },
  suspenso: { texto: 'Suspenso',       cor: 'default' },
}

// O menu só mostra o que está ATIVO. É isto que faz "por padrão não vem" ser
// verdade em vez de promessa — e `suspenso` some do menu sem perder histórico.
export const estaLigado = (inst) => inst?.estado === 'ativo'

// Instalação com `brand_id` NULO vale para TODAS as marcas do workspace (059).
// Com marca preenchida, vale só naquela — e é aqui que mora o vazamento se a
// condição inverter: addon liberado para a marca A apareceria na marca B, que
// é a mesma família de erro que a RLS impede entre workspaces.
export const valeNaMarca = (inst, brandId) => !inst?.brand_id || inst.brand_id === brandId

// O que o menu mostra: ativo E válido nesta marca E existente no catálogo.
// Instalação apontando para slug que saiu do código é ignorada em silêncio —
// é o caso de um addon descontinuado com linha viva no banco.
export const addonsDoMenu = (instalacoes, brandId) =>
  (instalacoes || [])
    .filter((i) => estaLigado(i) && valeNaMarca(i, brandId))
    .map((i) => acharAddon(i.addon))
    .filter(Boolean)
