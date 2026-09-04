// ════════════════════════════════════════════════════════════════════
// LOTE DE CATÁLOGO — a lógica do addon, sem tela e sem rede (§7.5)
//
// A pessoa sobe UMA planilha. Nada de canvas, nada de nó, nada de pasta
// separada (decisão do Danilo, 04/set: "subir apenas a planilha com as infos,
// reduzir ao máximo o acesso dele").
//
// Este arquivo faz três coisas, todas puras:
//   1. lê a planilha
//   2. MONTA O CONTEXTO por SKU, no gabarito que o fluxo Hering já usa
//   3. faz o PREFLIGHT — o que está errado, e quanto vai custar — ANTES de
//      qualquer crédito ser gasto
//
// ⚠️ NÃO reimplementa o teto de referências. `planoDeRefs` já existe e já sabe
// dizer de quem é a culpa do corte (modelo × canvas) — foi o conserto do F4
// 4+6, o "o sapato não pegou". Recriar aqui seria recriar o bug em outro lugar.
// ════════════════════════════════════════════════════════════════════
import { planoDeRefs, comoLeAsRefs, MAX_REFS_CANVAS } from './studioModels'
import { vistasDoGrafo } from './studioGrafo'

// ── As colunas ──────────────────────────────────────────────────────
//
// Espelham a seção §O LOOK do gabarito: cada papel diz DE ONDE vem cada parte
// da imagem. Não são "campos de arquivo" — são papéis, e é por isso que a
// ordem importa e o corte silencioso dói.
// A PEÇA PRINCIPAL é a estrela, e nem sempre é camisa — pode ser calça, pode
// ser sapato (Danilo, 04/set). Por isso os papéis deixaram de ser
// `calca`/`calcado`/`bolsa`, que só descrevem um look de camiseta: agora é UMA
// peça principal com N vistas, mais N acessórios genéricos.
//
// A vista 1 da peça é a ÂNCORA — é ela que precisa sair perfeita, e é ela que
// entra primeiro entre os uploads. As outras vistas são ângulos da MESMA peça
// (lado, costas), não itens diferentes.
export const PAPEIS = [
  { col: 'peca',        papel: 'PEÇA PRINCIPAL', obrigatorio: true,  principal: true },
  { col: 'acessorio_1', papel: 'ACESSÓRIO 1',    obrigatorio: false },
  { col: 'acessorio_2', papel: 'ACESSÓRIO 2',    obrigatorio: false },
  { col: 'acessorio_3', papel: 'ACESSÓRIO 3',    obrigatorio: false },
  { col: 'elenco',      papel: 'MODELO',         obrigatorio: true,  doElenco: true },
]

export const PAPEL_PRINCIPAL = 'peca'
export const ACESSORIOS = PAPEIS.filter(p => /^acessorio_/.test(p.col)).map(p => p.col)

export const COLUNAS_OBRIGATORIAS = ['sku', 'contexto', ...PAPEIS.filter(p => p.obrigatorio).map(p => p.col)]

// Um papel aceita VÁRIAS VISTAS do mesmo item — a bolsa de frente e de lado, o
// calçado de perfil e de cima (pedido do Danilo, 04/set). Na planilha elas vêm
// na MESMA célula, separadas por `;`, igual à coluna `saidas`.
//
// ⚠️ Isto muda a conta do teto: o que o modelo recebe são IMAGENS, não papéis.
// Contar papel aqui seria repetir o defeito do F4 — o canvas contava NÓ e não
// imagem, e foi assim que "o sapato não pegou".
export const valoresDe = (linha, col) =>
  String(linha?.[col] || '').split(';').map(v => v.trim()).filter(Boolean)

// `contexto` curto demais não é contexto — é rótulo. O gabarito real tem ~4 KB;
// abaixo disto a peça sai genérica e o juiz reprova por infidelidade.
export const CONTEXTO_MIN = 200

// ── 1 · A planilha ──────────────────────────────────────────────────

// CSV com aspas, quebra de linha dentro de campo, e separador detectado
// (vírgula ou ponto-e-vírgula — Excel pt-BR exporta com `;`).
// Sem dependência nova: nenhum parser de planilha entrou no package.json.
export function lerCSV(texto) {
  const src = String(texto || '').replace(/^﻿/, '')       // BOM do Excel
  if (!src.trim()) return { cabecalho: [], linhas: [] }

  const primeira = src.split(/\r?\n/)[0] || ''
  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : ','

  const celulas = []
  let campo = '', linha = [], aspas = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (aspas) {
      if (c === '"' && src[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' }
    else if (c === '\n') { linha.push(campo); celulas.push(linha); linha = []; campo = '' }
    else if (c !== '\r') campo += c
  }
  if (campo !== '' || linha.length) { linha.push(campo); celulas.push(linha) }

  const cru = celulas.filter(l => l.some(c => String(c).trim() !== ''))
  if (!cru.length) return { cabecalho: [], linhas: [] }

  const cabecalho = cru[0].map(normalizarCabecalho)
  const linhas = cru.slice(1).map((l, i) => {
    const o = { _linha: i + 2 }                                 // nº real na planilha
    cabecalho.forEach((k, j) => { if (k) o[k] = String(l[j] ?? '').trim() })
    return o
  })
  return { cabecalho, linhas }
}

// "Peça Frente", "PEÇA_FRENTE", "peca frente" → `peca_frente`.
// Sem isto, uma planilha salva do Excel com acento vira coluna desconhecida e
// a linha inteira parece vazia.
export function normalizarCabecalho(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// ── 2 · O contexto, no gabarito ─────────────────────────────────────

// ⚠️ O §O LOOK NÃO É MAIS GERADO AQUI (decisão do Danilo, 04/set):
// *"o contexto precisa ser escrito pelo usuário, o restante é conosco. Os
// prompts são relacionados às poses, o contexto à roupa."*
//
// O contexto INTEIRO é do usuário e fala da roupa — peça e acessórios. Gerar
// uma seção §O LOOK aqui produzia DUAS: a rica, escrita à mão no nó de
// contexto, e a minha, rasa ("da referência de calça"). Duas seções com o mesmo
// título no mesmo prompt é ruído, e a rasa contradizia a boa.
//
// Fica exportada devolvendo vazio para não quebrar quem chama.
export const montarLook = () => ''

// O contexto completo. §A PEÇA vem da planilha; §O LOOK é gerado; o resto é
// constante da RECEITA e vem do fluxo (§7.2, camada "do fluxo").
export function montarContexto({ etapa, aPeca, linha, doFluxo = '', resolvidas } = {}) {
  const blocos = [
    `PRODUÇÃO DE CATÁLOGO — ${String(etapa || '').toUpperCase()}`.trim(),
    `═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══\n${String(aPeca || '').trim()}`,
    montarLook(linha, resolvidas),
    String(doFluxo || '').trim(),
  ]
  return blocos.filter(b => b && b.trim()).join('\n\n')
}

// ── 2b · As vistas vêm do FLUXO, não de uma lista fixa ──────────────
//
// Cada nó `prompt` do grafo é uma VISTA — "FRONTAL", "TRÊS QUARTOS", "SENTADA",
// "APROXIMADA". O nome é a primeira linha do texto, em caixa alta; o resto é a
// instrução daquela pose.
//
// Ter isso fixo no código seria a divergência que o Danilo perguntou como
// evitar: o dia em que alguém acrescentasse uma pose no canvas, o addon não
// saberia — e ninguém veria, porque a tela continuaria mostrando as antigas.
// Delegação, de propósito: a leitura do grafo é UMA só, em `studioGrafo.js`.
// Manter uma cópia aqui seria a divergência que aquele módulo existe para
// impedir — e ela apareceria justamente quando alguém acrescentasse um tipo de
// nó, consertando só um dos lados.
export const vistasDoFluxo = (nodes, edges) => vistasDoGrafo(nodes, edges)

// ── 3 · O preflight ─────────────────────────────────────────────────
//
// Roda ANTES de a execução nascer. Todo problema aqui é problema que não
// virou crédito queimado.

const GRAVE = 'grave'      // a linha não roda
const AVISO = 'aviso'      // a linha roda, mas alguém precisa saber

export function preflight({
  linhas = [],
  cabecalho = [],
  elenco = [],              // nomes de castings aprovados na Biblioteca
  acervo = [],              // nomes/arquivos já disponíveis
  modelo = null,
  vistas = [],              // as vistas que o fluxo oferece (vistasDoFluxo)
  saidasPadrao = 1,
  creditoPorImagem = 1,
  teto = MAX_REFS_CANVAS,
} = {}) {
  const problemas = []
  const nomesElenco = new Set(elenco.map(e => String(e).trim().toLowerCase()))
  const nomesAcervo = new Set(acervo.map(a => String(a).trim().toLowerCase()))
  const vistos = new Map()

  for (const c of COLUNAS_OBRIGATORIAS) {
    if (!cabecalho.includes(c)) {
      problemas.push({ nivel: GRAVE, linha: 1, campo: c, texto: `a planilha não tem a coluna "${c}"` })
    }
  }

  const avaliadas = linhas.map(l => {
    const p = []
    const sku = String(l.sku || '').trim()

    if (!sku) p.push({ nivel: GRAVE, campo: 'sku', texto: 'linha sem SKU' })
    else if (vistos.has(sku)) p.push({ nivel: GRAVE, campo: 'sku', texto: `SKU repetido (já na linha ${vistos.get(sku)})` })
    else vistos.set(sku, l._linha)

    const ctx = String(l.contexto || '').trim()
    if (!ctx) p.push({ nivel: GRAVE, campo: 'contexto', texto: 'sem contexto — a peça sairia genérica' })
    else if (ctx.length < CONTEXTO_MIN)
      p.push({ nivel: AVISO, campo: 'contexto', texto: `contexto com ${ctx.length} caracteres; o gabarito em uso tem ~4000. Descreva modelagem, comprimento, textura — e o erro que o modelo costuma cometer` })

    // Referências: existem? e quantas sobrevivem ao teto do modelo?
    const resolvidas = {}
    let refs = 0
    for (const papel of PAPEIS) {
      const vs = valoresDe(l, papel.col)
      if (!vs.length) {
        if (papel.obrigatorio) p.push({ nivel: GRAVE, campo: papel.col, texto: `${papel.papel} é obrigatório` })
        continue
      }
      // O elenco é UMA pessoa: várias vistas ali seria outra modelo por engano.
      if (papel.doElenco && vs.length > 1) {
        p.push({ nivel: GRAVE, campo: papel.col, texto: 'só uma modelo por peça' })
      }
      refs += vs.length                       // IMAGENS, não papéis
      const v = vs[0]
      const ok = vs.every(x => papel.doElenco ? nomesElenco.has(x.toLowerCase())
                                              : (ehUrl(x) || nomesAcervo.has(x.toLowerCase())))
      resolvidas[papel.col] = ok
      if (!ok) {
        // Modelo só entra por upload — não dá para cadastrar por planilha, porque
        // a foto dela não cabe numa célula. Por isso a mensagem aponta a porta.
        p.push(papel.doElenco
          ? { nivel: GRAVE, campo: papel.col, texto: `a modelo "${v}" não está cadastrada — suba a foto dela na aba "Uma peça"` }
          : { nivel: GRAVE, campo: papel.col, texto: `"${v}" não foi encontrado na Biblioteca` })
      }
    }

    // O corte silencioso do F4, agora dito em voz alta e ANTES de gerar.
    const plano = modelo ? planoDeRefs(modelo, refs, teto) : null
    if (plano?.ignoradas) {
      p.push({
        nivel: AVISO, campo: 'referencias',
        texto: `${refs} referências, ${plano.usadas} entram — ${plano.ignoradas} seriam ` +
               `descartadas ${plano.porQue === 'modelo' ? 'pelo MODELO' : 'pelo teto do canvas'}, ` +
               `sem erro. ${comoLeAsRefs(modelo)}`,
      })
    }
    if (plano?.faltam) {
      p.push({ nivel: GRAVE, campo: 'referencias', texto: `este modelo exige ${plano.exatas} referências; faltam ${plano.faltam}` })
    }

    // Saída que não existe no fluxo é pedido que nunca sairia — e sem esta
    // conferência ela sumiria calada, virando "gerou menos do que pedi".
    const pedidas = String(l.saidas || '').split(';').map(v => v.trim()).filter(Boolean)
    if (vistas.length && pedidas.length) {
      const conhecidas = new Set(vistas.map(v => v.nome.toLowerCase()))
      const orfas = pedidas.filter(v => !conhecidas.has(v.toLowerCase()))
      if (orfas.length) p.push({ nivel: GRAVE, campo: 'saidas',
        texto: `este lote não tem a vista ${orfas.map(o => `"${o}"`).join(', ')}` })
    }
    const saidas = contarSaidas(l.saidas, saidasPadrao)
    return { ...l, sku, refs, resolvidas, saidas, problemas: p }
  })

  const graves = avaliadas.filter(l => l.problemas.some(x => x.nivel === GRAVE))
  const prontas = avaliadas.filter(l => !l.problemas.some(x => x.nivel === GRAVE))
  const imagens = prontas.reduce((n, l) => n + l.saidas, 0)

  return {
    linhas: avaliadas,
    problemas,                                  // problemas da planilha inteira
    prontas: prontas.length,
    bloqueadas: graves.length,
    avisos: avaliadas.reduce((n, l) => n + l.problemas.filter(x => x.nivel === AVISO).length, 0),
    imagens,
    creditos: imagens * creditoPorImagem,
    podeRodar: prontas.length > 0 && !problemas.some(x => x.nivel === GRAVE),
  }
}

export function contarSaidas(valor, padrao = 1) {
  const n = String(valor || '').split(';').map(s => s.trim()).filter(Boolean).length
  return n || padrao
}

export const ehUrl = (v) => /^https?:\/\//i.test(String(v || '').trim())

export const NIVEIS = { GRAVE, AVISO }
