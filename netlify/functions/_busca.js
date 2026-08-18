// _busca.js — a camada de busca. Provedor é configuração, não arquitetura.
//
// POR QUE EXISTE (decisão do Danilo, 18/08/2026: "o google será gargalo nesse
// momento, vamos controlar via websearch")
//
// A escuta tinha acabado de ser reescrita para depender da Custom Search do
// Google — 100 buscas/dia no plano grátis, chave a criar, cota a vigiar. E o
// que descobrimos ao medir é que NÃO PRECISAVA: a ferramenta de busca da
// Anthropic já devolve blocos `web_search_tool_result` com URL e título vindos
// do índice, mais `citations` com o TRECHO VERBATIM da página.
//
// O defeito nunca foi o provedor — era a leitura. A escuta lia só a prosa do
// modelo e jogava fora os blocos estruturados, e aí precisava pedir o link a
// ele. Modelo que escreve link escreve link plausível.
//
// Com os blocos, a propriedade que importa vale em qualquer provedor: a URL é
// RESULTADO DE BUSCA, não texto gerado. O modelo não consegue inventar uma
// menção porque não consegue inventar uma linha na resposta da busca.
//
// O que se perde em relação ao Google: `dateRestrict` de verdade. A ferramenta
// da Anthropic não tem filtro de data em nenhuma versão — sondei o schema da
// 20260209 contra a nossa chave e ela aceita só max_uses, allowed_domains,
// blocked_domains e user_location. A janela semanal passa a vir da
// DEDUPLICAÇÃO contra o banco, que responde a pergunta certa da escuta:
// "apareceu algo que a gente ainda não viu?".

import { callAI, aiConfig, MODELS } from './_ai.js'
import { buscarVarias as buscarNoGoogle, googleConfigurado } from './_google.js'

/**
 * Quem busca. O Google entra só se as duas chaves existirem E alguém pedir
 * explicitamente — ele custa cota e não é mais o padrão.
 */
export function provedorDeBusca() {
  if (process.env.BUSCA_PROVEDOR === 'google' && googleConfigurado()) return 'google'
  return 'anthropic'
}

const hostDe = (url) => {
  try { return new URL(url).hostname.replace(/^www\./i, '').toLowerCase() } catch { return '' }
}

/**
 * Extrai o que interessa dos blocos de uma resposta com busca web.
 *
 * Duas fontes, e as duas vêm do índice, nunca da cabeça do modelo:
 *  · `web_search_tool_result` → url, título
 *  · `citations` dos blocos de texto → `cited_text`, o trecho literal da página
 *
 * O trecho verbatim é melhor do que o snippet do Google: é a frase que a pessoa
 * realmente escreveu, e não um resumo do buscador.
 */
export function colherDosBlocos(blocos) {
  const porUrl = new Map()

  for (const b of blocos || []) {
    if (b.type === 'web_search_tool_result') {
      for (const r of (Array.isArray(b.content) ? b.content : [])) {
        if (!/^https?:\/\//i.test(r.url || '')) continue
        if (!porUrl.has(r.url)) {
          porUrl.set(r.url, {
            titulo:  r.titulo || r.title || '',
            url:     r.url,
            host:    hostDe(r.url),
            data:    r.page_age || null,   // best-effort; costuma vir nulo
            trechos: [],
          })
        }
      }
    }
    // Citação amarra um trecho literal a uma URL. É o material mais forte que a
    // escuta pode ter, porque é a fala, não a paráfrase.
    for (const c of (b.citations || [])) {
      if (!c?.url || !c?.cited_text) continue
      if (!porUrl.has(c.url)) {
        porUrl.set(c.url, { titulo: c.title || '', url: c.url, host: hostDe(c.url), data: null, trechos: [] })
      }
      const t = String(c.cited_text).replace(/\s+/g, ' ').trim()
      const alvo = porUrl.get(c.url)
      if (t && !alvo.trechos.includes(t)) alvo.trechos.push(t)
    }
  }

  return [...porUrl.values()].map(r => ({
    ...r,
    // O snippet é o trecho verbatim quando existe; senão, o título.
    snippet: (r.trechos.join(' … ') || r.titulo).slice(0, 600),
  }))
}

function promptDeBusca(queries, dias) {
  // O pedido de RELATAR CITANDO não é decoração: `citations` só aparece quando o
  // modelo escreve texto apoiado nas fontes. Medido — com "não comente, responda
  // apenas 'buscas concluídas'" vieram 23 resultados e ZERO trecho verbatim.
  //
  // E o trecho verbatim é o que a escuta quer: a frase que a pessoa escreveu
  // ("fiz uma compra dia 12 e não recebi"), não um resumo do buscador. A prosa
  // em si é descartada; ela existe só para carregar as citações.
  return `Execute estas buscas na web, uma a uma, exatamente como escritas:

${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Priorize material dos últimos ${dias} dias.

Depois relate, em tópicos curtos, o que encontrou sobre como a marca é PERCEBIDA —
o que dizem, elogiam, reclamam ou noticiam. CITE a fonte de cada afirmação, sempre
com a passagem literal da página, e prefira a frase de quem falou à sua paráfrase.
Não encontrou nada? Diga isso. Lista vazia é resposta correta.`
}

/**
 * Busca. Devolve sempre a mesma forma, venha de quem vier.
 *
 * @returns {Promise<{resultados: Array, falhas: Array, provedor: string}>}
 */
export async function buscarNaWeb(queries, { dias = 7, supabase = null, workspace_id = null, marca = null } = {}) {
  const provedor = provedorDeBusca()

  if (provedor === 'google') {
    const { resultados, falhas } = await buscarNoGoogle(queries, { dias, num: 10 })
    return { resultados: resultados.map(r => ({ ...r, trechos: [] })), falhas, provedor }
  }

  // A ferramenta da Anthropic decide quantas buscas fazer; o teto é o número de
  // consultas que a gente pediu, com uma de folga.
  const cfg = aiConfig('premium')
  try {
    const { content } = await callAI({
      ...cfg,
      model:     MODELS.smart,
      maxTokens: 4000,      // a prosa é descartada; o que importa são os blocos
      tools:     [{ ...cfg.tools[0], max_uses: Math.min(queries.length + 1, 12) }],
      messages:  [{ role: 'user', content: promptDeBusca(queries, dias) }],
      // A busca é chamada de LLM e custa — precisa aparecer no custo da marca
      // tanto quanto a classificação que vem depois.
      supabase, tag: 'escuta', workspace_id, operacao: `escuta:buscar:${marca || '?'}`,
    })
    const resultados = colherDosBlocos(content)
    // Zero resultado sem erro é resposta legítima — marca pequena, semana quieta.
    return { resultados, falhas: [], provedor }
  } catch (e) {
    return { resultados: [], falhas: [{ query: '(lote)', motivo: 'busca', erro: e.message }], provedor }
  }
}
