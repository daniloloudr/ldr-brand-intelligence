// ════════════════════════════════════════════════════════════════════
// parecer.js — o vocabulário do parecer (FRONTEND)
// Espelha netlify/functions/_parecer.js (MANTER OS DOIS EM SINCRONIA — há teste de paridade).
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

/**
 * Encaixa o texto do parecer no limite SEM cortar no meio da palavra.
 *
 * O corte cru (`slice(300)`) produziu, no primeiro parecer real: "...LOUDR
 * (#F7127A, #0D9376, #011F3E, #072A45, #0E3549, #134050, #1B4A54, #DC" — o
 * leitor vê um texto que parece defeito de software, não um parecer.
 *
 * A ordem tenta preservar sentido: última frase inteira que couber; se nem uma
 * frase couber, a última palavra inteira, com reticência. O limite continua
 * sendo o da §2.2 — o que muda é onde o corte cai.
 *
 * Endurecer o prompt não substitui isto: modelo não conta caractere de forma
 * confiável, e o limite precisa valer mesmo quando ele passa.
 */
export function encaixarTexto(t, max = TEXTO_MAX) {
  const s = String(t ?? '').trim()
  if (s.length <= max) return s

  const cru = s.slice(0, max)

  // 1) última frase inteira — mas SÓ se ela cobrir a maior parte do limite.
  //    Fechar numa frase é o melhor final possível; fechar na PRIMEIRA frase de
  //    um parecer longo joga fora o resto do que o juiz achou. Com o corte em
  //    30% do limite, por exemplo, perde-se 70% do parecer para ganhar um
  //    ponto final — e o leitor prefere o conteúdo com reticência.
  const frase = Math.max(cru.lastIndexOf('. '), cru.lastIndexOf('! '), cru.lastIndexOf('? '))
  if (frase >= max * 0.6) return cru.slice(0, frase + 1)

  // 2) última palavra inteira, com reticência — e a MESMA ressalva: só vale se
  //    sobrar texto. Com um bloco longo sem espaço (uma lista de hex colada,
  //    uma URL), a última fronteira de palavra fica lá no começo e o resultado
  //    encolhe para uma palavra só — pior que o corte cru que isto veio
  //    consertar. Nesse caso corta no limite mesmo: perder meia palavra é menos
  //    grave que perder o parecer inteiro.
  //    A reticência entra DENTRO do limite, senão o conserto estoura o teto.
  const palavra = cru.slice(0, max - 1).lastIndexOf(' ')
  const base = palavra >= (max - 1) * 0.6 ? cru.slice(0, palavra) : cru.slice(0, max - 1)
  return base.replace(/[\s.,;:—-]+$/, '') + '…'
}
