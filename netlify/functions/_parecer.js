// ════════════════════════════════════════════════════════════════════
// _parecer.js — o vocabulário do parecer (BACKEND)
// Espelha src/lib/parecer.js (MANTER OS DOIS EM SINCRONIA — há teste de paridade).
//
// E0b (31/ago/2026): o parecer passa a ser {veredito, texto} e nada mais.
// A spec do Estúdio §2.2 define a saída em dois campos, sem score: "não existe
// constructo validado para converter análise de peça em nota, e inventar um
// seria precisão falsa".
//
// ⚠️ POR QUE ISTO É UM MÓDULO, E NÃO CONSTANTES SOLTAS: os sinais `art_review`
// já gravados em `brand_signals` carregam o vocabulário ANTIGO, e quem os lê é
// o destilador — memória permanente da marca. Ler "aprovada_com_ressalvas" como
// desconhecido, ou pior, como aprovação, envenena o que a marca aprendeu, e o
// estrago não se desfaz apagando linha.
// ════════════════════════════════════════════════════════════════════

// §2.2 — três valores, e a ordem em que exigem atenção:
// reprovado exige decisão · rechecar exige olho · aprovado pode ir em lote.
export const VEREDITOS = ['aprovado', 'rechecar', 'reprovado']

// O de-para com o vocabulário anterior ao E0b. `aprovada_com_ressalvas` vira
// `rechecar` porque é o mesmo lugar na fila: o núcleo sustenta, mas alguém
// precisa olhar.
export const VEREDITO_ANTIGO = {
  aprovada:               'aprovado',
  aprovada_com_ressalvas: 'rechecar',
  reprovada:              'reprovado',
}

export const TEXTO_MAX = 300

export const VEREDITO_ROTULO = {
  aprovado:  'Aprovado',
  rechecar:  'Rechecar',
  reprovado: 'Reprovado',
}

/**
 * Devolve o veredito no vocabulário novo, aceitando o antigo.
 * `null` para o que não reconhece — quem chama decide o que fazer com isso.
 * Nunca chuta: um veredito desconhecido tratado como aprovação é o defeito que
 * este módulo existe para impedir.
 */
export function normalizarVeredito(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (VEREDITOS.includes(s)) return s
  return VEREDITO_ANTIGO[s] || null
}

/** O único veredito que RAMIFICA comportamento: reprovado interrompe o fluxo. */
export function reprovou(v) {
  return normalizarVeredito(v) === 'reprovado'
}
