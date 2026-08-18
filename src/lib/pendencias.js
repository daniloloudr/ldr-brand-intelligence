// pendencias.js — o que falta para a marca funcionar por inteiro.
//
// A plataforma já SABE o que falta: a extração devolve as lacunas, e a
// biblioteca sabe quais arquivos existem. O que faltava era contar para quem
// pode resolver — e levar até lá.
//
// Três decisões de escrita, e elas são o ponto:
//
// • Cada pendência diz o QUE QUEBRA sem ela, não o que "seria bom ter".
//   "Suba a fonte" não move ninguém; "sem o arquivo da fonte, o Estúdio
//   escreve com uma fonte parecida" move. É a diferença entre cobrar e
//   explicar.
//
// • Cada pendência tem ENDEREÇO e INSTRUÇÃO. Notificação que não leva a lugar
//   nenhum é só ansiedade: ela avisa que há um problema e deixa a pessoa
//   procurando onde resolver. Aqui o clique leva à tela certa e a tela repete
//   o que fazer, porque no meio do caminho a pessoa esquece por que veio.
//
// • Uma pendência por item. "19 campos não declarados" não é acionável: é uma
//   lista fechada que a pessoa não consegue atacar por partes. Dezenove
//   mensagens, cada uma com seu campo e seu lugar, são dezenove coisas que dá
//   para resolver numa tarde.
//
// Nada aqui bloqueia. Marca sem manual funciona — só funciona com menos. A
// severidade diz o tamanho da perda, não uma permissão.

import { TODOS } from './campos'

const ehImagem = (a) => (a.mime_type || '').startsWith('image/')
  || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.nome || '')
const ehFonte = (a) => (a.mime_type || '').startsWith('font/')
  || /\.(otf|ttf|woff2?)$/i.test(a.nome || '')
const temArquivo = (a) => !!a.file_path || /^https?:\/\//i.test(a.valor || '')

// Mesma noção de vazio da tela (CamposDaMarca): lista só de itens em branco —
// o esqueleto que o modelo às vezes devolve — continua sendo vazio.
export const estaVazio = (v) => {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.every(estaVazio)
  if (typeof v === 'object') return Object.values(v).every(estaVazio)
  return false
}

// Quantas imagens de referência bastam para o juiz ter de onde tirar padrão.
// Abaixo disso ele generaliza de exemplo demais e erra bonito.
const MINIMO_REFERENCIAS = 8

const NA_BIBLIOTECA = { secao: 'studio/biblioteca', bibliotecaRoot: 'referencias' }

/**
 * @param {object} estado
 * @param {Array}  estado.assets   linhas de brand_assets da marca
 * @param {object} estado.dados    { verbal_identity, strategy } do brand book
 * @param {boolean} estado.temManual
 * @returns {Array<{id,titulo,porque,acao,severidade,destino,instrucao}>}
 */
export function pendencias({ assets = [], dados = {}, temManual = false } = {}) {
  const lista = []
  const arquivos = assets.filter(temArquivo)

  if (!temManual) {
    lista.push({
      id: 'manual',
      titulo: 'O manual da marca',
      porque: 'Sem ele a marca vive só do que a inteligência observou por fora. '
        + 'Nada do que ela declara sobre si mesma — propósito, tom, regras de uso — entra no cérebro.',
      acao: 'Importar manual',
      severidade: 'alta',
      destino: { secao: 'essencia' },
      instrucao: 'Use "Importar Manual", no topo desta página, para subir o PDF da marca.',
    })
  }

  // O manual DESCREVE o logo; ele não entrega o arquivo. Esta é a pendência
  // que mais engana: a marca parece completa porque tem nove logos listados.
  const logosDescritos = assets.filter(a => a.tipo === 'logo').length
  const logosComArquivo = arquivos.filter(a => a.tipo === 'logo').length
  if (!logosComArquivo) {
    lista.push({
      id: 'logo',
      titulo: 'Falta o arquivo do logo',
      porque: logosDescritos
        ? `O manual descreve ${logosDescritos} ${logosDescritos > 1 ? 'versões' : 'versão'} do logo, mas descrição não é arquivo. `
          + 'O Estúdio não consegue aplicar o logo numa peça enquanto ele não existir em SVG ou PNG.'
        : 'O Estúdio não consegue aplicar o logo numa peça sem o arquivo, em SVG ou PNG.',
      acao: 'Subir logo',
      severidade: 'alta',
      destino: NA_BIBLIOTECA,
      instrucao: 'Suba aqui o arquivo do logo, em SVG ou PNG — e as variações, se houver '
        + '(símbolo, horizontal, negativa, monocromática).',
    })
  }

  if (!arquivos.some(ehFonte)) {
    lista.push({
      id: 'fontes',
      titulo: 'Faltam os arquivos de fonte',
      porque: 'Sem eles o Estúdio escreve com uma fonte parecida — e "parecida" é '
        + 'exatamente o que faz uma peça não parecer da marca.',
      acao: 'Subir fontes',
      severidade: 'media',
      destino: NA_BIBLIOTECA,
      instrucao: 'Suba aqui os arquivos de fonte da marca (.otf, .ttf ou .woff), em todos os pesos que ela usa.',
    })
  }

  const referencias = arquivos.filter(a => ehImagem(a) && (a.metadata?.reference === true
    || ['logo', 'icone', 'padrao'].includes(a.tipo))).length
  if (referencias < MINIMO_REFERENCIAS) {
    lista.push({
      id: 'referencias',
      titulo: 'Faltam imagens de referência',
      porque: `São elas que ensinam o que é "a cara da marca". Com ${referencias} de ${MINIMO_REFERENCIAS}, `
        + 'o julgamento generaliza de exemplo demais e erra com confiança.',
      acao: 'Subir imagens',
      severidade: 'media',
      destino: NA_BIBLIOTECA,
      instrucao: `Suba aqui pelo menos ${MINIMO_REFERENCIAS} imagens que sejam "a cara da marca" — `
        + 'peças reais, fotos, aplicações. Valem também as recusadas: o que foi reprovado ensina rápido.',
    })
  }

  // Campo vazio, uma notificação cada.
  //
  // A fonte é o MAPA da interface (campos.js), não as lacunas que a extração
  // reportou. São coisas diferentes: `smartbrand_gaps` diz o que o MANUAL não
  // declarou, e só cobre os campos que o smartbrand acompanha — jornada do
  // cliente, UX, portfólio e tudo que vive na coluna `strategy` nunca
  // apareceriam. Além disso a extração pode ter falhado, ou a marca pode nem
  // ter manual, e os campos continuam vazios do mesmo jeito.
  //
  // Lendo do mapa, a regra passa a ser simples e sempre verdadeira: se existe
  // um campo na interface e ele está vazio, existe uma pendência — com o
  // endereço exato e a tela onde se resolve.
  for (const c of TODOS) {
    const valor = dados?.[c.col]?.[c.k]
    if (!estaVazio(valor)) continue
    lista.push({
      id: `campo:${c.col}.${c.k}`,
      titulo: `${c.label} está em branco`,
      // O cérebro NÃO deduz. Escrever "onde não há declaração ele deduz" era o
      // oposto do princípio do produto: sem a declaração, o ponto fica fora do
      // que ele sabe, e ponto. Quem constrói é o Copiloto, quando pedirem.
      porque: `${c.secaoLabel} · sem isso declarado, o cérebro não tem esse ponto da marca — `
        + 'ele não preenche por conta própria. O Copiloto ajuda a construir, se você pedir.',
      acao: 'Preencher',
      severidade: 'baixa',
      destino: { secao: c.secao },
      campo: `${c.col}.${c.k}`,
      instrucao: `Preencha "${c.label}" nesta página. Se a marca não tiver isso definido, `
        + 'deixe em branco mesmo — em branco é honesto; inventado, não.',
    })
  }

  return lista
}

/** Um resumo curto para caber numa linha, fora da tela de referências. */
export function resumoPendencias(lista) {
  if (!lista.length) return null
  const altas = lista.filter(p => p.severidade === 'alta').length
  return altas
    ? `${lista.length} ${lista.length > 1 ? 'pendências' : 'pendência'} — ${altas} ${altas > 1 ? 'travam' : 'trava'} o Estúdio`
    : `${lista.length} ${lista.length > 1 ? 'pendências' : 'pendência'} para a marca ficar completa`
}

// ── Passagem entre telas ─────────────────────────────────────────────
// A instrução viaja com o clique: quem chega na tela precisa reencontrar o
// motivo de ter vindo. Sem isto, a pessoa aterrissa numa biblioteca genérica e
// esquece que veio subir um logo.
const CHAVE_FOCO = 'pendencia_foco'

export function marcarFoco(p) {
  try { sessionStorage.setItem(CHAVE_FOCO, JSON.stringify({ id: p.id, instrucao: p.instrucao, titulo: p.titulo, campo: p.campo || null })) }
  catch { /* sem sessionStorage, a navegação ainda funciona */ }
}

/** Lê e LIMPA — a instrução é para esta chegada, não para as próximas. */
export function consumirFoco() {
  try {
    const bruto = sessionStorage.getItem(CHAVE_FOCO)
    if (!bruto) return null
    sessionStorage.removeItem(CHAVE_FOCO)
    return JSON.parse(bruto)
  } catch { return null }
}
