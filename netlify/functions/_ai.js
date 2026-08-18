// Central module for all LLM calls.
// Currently: Anthropic only.
// Future: add connectors for other providers (OpenAI, Grok, Meta AI).
// All functions should import from here instead of calling the API directly.

import { alertIfBalanceError, MSG_INSTABILIDADE } from './_watchdog.js'

const ANTHROPIC_BASE    = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// Named model presets — swap here to update every function at once
// Troca de geração em 18/08/2026. Custo por milhão de tokens medido contra a
// tabela: sonnet-5 = US$ 3/15, igual ao 4-6; opus-5 = US$ 5/25, igual ao 4-7.
// A troca é LATERAL em preço — o gasto real dos últimos 30 dias (US$ 29,80)
// não se move. Não é economia nem despesa: é geração mais nova de graça.
export const MODELS = {
  fast:   'claude-haiku-4-5-20251001',  // barato, sem web_search — dev / tarefas simples
  medium: 'claude-sonnet-4-5',          // sonnet rápido — dev, onde vale o teto de 30s do netlify-cli
  smart:  'claude-sonnet-4-6',          // capacidade cheia + web_search — produção
  opus:   'claude-opus-5',              // máxima qualidade — extração de manuais, análises sensíveis
}

// Reserva: entra quando o principal FALHA, nunca em condição normal.
//
// A escolha do 4-6 como principal e do 5 como reserva foi medida, não achada
// (A/B de 4 rodadas no diagnóstico da Pixel, 18/08): os dois acertam a empresa,
// tempo empata, e o 5 custa 2,6× (US$ 1,20 contra US$ 0,48 por diagnóstico)
// porque faz raciocínio adaptativo. O 5 é mais consistente entre rodadas — por
// isso é a reserva boa, não uma reserva pior.
export const MODELS_RESERVA = {
  'claude-sonnet-4-6': 'claude-sonnet-5',
  'claude-sonnet-4-5': 'claude-sonnet-5',
  'claude-opus-5':     'claude-opus-4-7',
  'claude-haiku-4-5-20251001': 'claude-sonnet-4-6',
}

// Falhas em que trocar de modelo pode ajudar: capacidade, indisponibilidade e
// timeout. NÃO inclui 400 nem 401 — pedido malformado ou chave errada falham
// igual no outro modelo, e repetir só queima tempo e dinheiro.
export const valeTentarReserva = (status) => [429, 500, 502, 503, 504, 529, 408].includes(Number(status))

export const TOOLS = {
  // max_uses limita o loop agêntico de busca — sem isso a chamada não-streaming
  // pode enrolar por minutos e estourar o teto de 15 min da background function em prod.
  // O prompt do diagnóstico pede 5 buscas; 6 dá 1 de folga sem esticar o tempo.
  //
  // FICAMOS NA 20250305, e a escolha é medida (18/08). A 20260209 é mais nova,
  // mas para o nosso uso ela é PIOR em duas frentes:
  //
  //  · Perde as citações. Mesma pergunta, mesmo modelo: a 20250305 devolveu 33
  //    blocos de texto com 16 citações verbatim; a 20260209, 41 blocos e ZERO.
  //    O `cited_text` é a frase literal da página — o material mais forte que a
  //    escuta tem, porque é a fala e não a paráfrase.
  //  · Roteia as buscas por execução de código (`code_execution_tool_result`),
  //    o que engorda o consumo de tokens. Foi um dos ingredientes do estouro de
  //    teto no diagnóstico da Pixel.
  //
  // Nenhuma das duas tem filtro de data — sondei o schema da nova contra a
  // nossa chave: só max_uses, allowed_domains, blocked_domains e user_location.
  // A janela semanal da escuta vem da deduplicação contra o banco.
  webSearch: { type: 'web_search_20250305', name: 'web_search', max_uses: 6 },
}

export const isDev = () => !!process.env.NETLIFY_DEV

// ── Rastreio de custo (visão da dona — migration 039) ────────────────
// Preços por MILHÃO de tokens (USD, tabela Anthropic jul/2026). Estimativa;
// o que importa é a ordem de grandeza por operação/tag.
const TOKEN_PRICE = {
  'claude-sonnet-4-6':          { in: 3,    out: 15 },
  'claude-sonnet-4-5':          { in: 3,    out: 15 },
  'claude-haiku-4-5-20251001':  { in: 1,    out: 5 },
  'claude-opus-4-7':            { in: 5,    out: 25 },
  'claude-sonnet-5':            { in: 3,    out: 15 },
  'claude-opus-5':              { in: 5,    out: 25 },
}
export async function logAiUsage(supabase, { model, usage, tag = null, workspace_id = null, operacao = null }) {
  try {
    if (!supabase || !usage) return
    const p = TOKEN_PRICE[model] || { in: 3, out: 15 }
    const inTok = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0) * 0.1
    const custo = (inTok * p.in + (usage.output_tokens || 0) * p.out) / 1_000_000
    await supabase.from('ai_usage').insert({
      provider: 'anthropic', model,
      input_tokens: Math.round(inTok), output_tokens: usage.output_tokens || 0,
      custo_usd: custo, tag, workspace_id, operacao,
    })
  } catch { /* rastreio nunca derruba a operação */ }
}

/**
 * Returns a ready-to-spread config object for callAI/streamAI based on tier + environment.
 *
 * Tiers:
 *   'fast'     — Haiku, no web search. Dev and prod. For simple, cheap tasks (keyword draft, etc.)
 *   'standard' — Dev: Sonnet 4.5, no web search. Prod: Sonnet 4.6 + web search. For all analysis.
 *   'premium'  — Always Sonnet 4.6 + web search. For highest quality regardless of env.
 */
export function aiConfig(tier = 'standard') {
  const dev = isDev()
  if (tier === 'fast') return {
    model:      MODELS.fast,
    maxTokens:  4000,
    retries:    1,
    retryDelay: 2000,
  }
  // 'premium' é usado SÓ pelos dois caminhos de diagnóstico — mexer aqui não
  // respinga em mais ninguém (conferido em 18/08).
  //
  // O teto era 8000 e ficou pequeno na troca para o Sonnet 5, que faz raciocínio
  // adaptativo por padrão. Medido no diagnóstico da Pixel: 10.351 tokens de
  // raciocínio + 15 chamadas de ferramenta, stop_reason max_tokens, ZERO
  // caractere de texto. O raciocínio fica — é ele que desambigua homônimo, que
  // é exatamente o problema desta marca — mas com espaço para escrever depois.
  if (tier === 'premium') return {
    model:         MODELS.smart,
    modeloReserva: MODELS_RESERVA[MODELS.smart],
    maxTokens:     32000,
    tools:      [TOOLS.webSearch],
    retries:    1,
    retryDelay: 5000,
  }
  // 'standard' — default
  return {
    model:         dev ? MODELS.medium : MODELS.smart,
    modeloReserva: MODELS_RESERVA[dev ? MODELS.medium : MODELS.smart],
    maxTokens:     dev ? 5000 : 6000,
    tools:      dev ? undefined : [TOOLS.webSearch],
    retries:    1,
    retryDelay: dev ? 2000 : 5000,
  }
}

function anthropicHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey || process.env.ANTHROPIC_KEY,
    'anthropic-version': ANTHROPIC_VERSION,
  }
}

export class AIError extends Error {
  constructor(message, status) {
    super(message)
    this.name  = 'AIError'
    this.status = status
  }
}

// Fail-fast: sem a chave, o fetch streaming PENDURA na Lambda até o teto de 15 min
// (não dá 401 rápido). Guard explícito antes de qualquer fetch → erro claro em ms.
// Atenção: as functions usam ANTHROPIC_KEY, NÃO VITE_ANTHROPIC_KEY (essa é só do frontend).
function requireApiKey(apiKey) {
  const key = apiKey || process.env.ANTHROPIC_KEY
  if (!key) throw new AIError('ANTHROPIC_KEY ausente no ambiente — configure a env var no Netlify (functions usam ANTHROPIC_KEY, não VITE_ANTHROPIC_KEY).', 500)
  return key
}

// Prompt caching: marca o system (prompt fixo) com cache_control. A ordem é
// tools → system → messages, então o corte no último bloco de system cacheia
// tools+system juntos; o que varia (empresa/URL, em messages) fica DEPOIS e não
// quebra o cache. Só rende quando o MESMO prompt é reusado dentro do TTL (5 min)
// — ex.: batch de diagnósticos de concorrente. Escrita 1,25× / leitura 0,1×.
// Requer prefixo >= mínimo do modelo (Sonnet 4.6 = 2048 tokens; o nosso ~2144).
function cachedSystem(system) {
  if (!system) return undefined
  if (Array.isArray(system)) return system   // já em blocos: respeita como veio
  return [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
}

/**
 * Non-streaming call.
 * Returns { text, usage } or throws AIError.
 *
 * @param {object} opts
 * @param {object[]}  opts.messages
 * @param {string}   [opts.system]
 * @param {string}   [opts.model]       defaults to MODELS.smart
 * @param {object[]} [opts.tools]
 * @param {number}   [opts.maxTokens]   defaults to 1024
 * @param {string}   [opts.apiKey]      defaults to env ANTHROPIC_KEY
 * @param {number}   [opts.retries]     how many times to retry on 429 (default 1)
 * @param {number}   [opts.retryDelay]  ms to wait before retry (default 3000)
 * @param {number}   [opts.timeoutMs]   aborts the request (fetch + body read) after N ms.
 *                                      Sem isso, uma chamada não-streaming pendurada trava
 *                                      até o teto da function. Default: sem timeout.
 */
export async function callAI({
  messages,
  system,
  model,
  modeloReserva,   // entra se o principal falhar por capacidade/indisponibilidade
  tools,
  maxTokens    = 1024,
  apiKey,
  retries      = 1,
  retryDelay   = 3000,
  timeoutMs,
  supabase     = null,   // opcional: habilita o rastreio de custo (ai_usage)
  tag          = null,   // quem chamou (distill, diagnostico, sintese…)
  workspace_id = null,   // DE QUEM é a operação — sem isto não há custo por marca
  operacao     = null,   // sub-identificação dentro da tag
}) {
  requireApiKey(apiKey)

  let modeloAtual = model || MODELS.smart
  let usouReserva = false
  const body = {
    model:      modeloAtual,
    max_tokens: maxTokens,
    messages,
    ...(system        ? { system: cachedSystem(system) } : {}),
    ...(tools?.length ? { tools }                        : {}),
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, retryDelay))

    const controller = timeoutMs ? new AbortController() : null
    const timer      = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
    try {
      const resp = await fetch(ANTHROPIC_BASE, {
        method:  'POST',
        headers: anthropicHeaders(apiKey),
        body:    JSON.stringify(body),
        signal:  controller?.signal,
      })

      if (resp.status === 429 && attempt < retries) continue

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        const msg = err?.error?.message || `HTTP ${resp.status}`
        if (await alertIfBalanceError('anthropic', resp.status, msg)) throw new AIError(MSG_INSTABILIDADE, 503)
        // Reserva: uma vez só, e só em falha que trocar de modelo resolve.
        // Sobrecarga do modelo principal não pode derrubar o diagnóstico do
        // cliente se existe outro capaz de atender.
        if (modeloReserva && !usouReserva && valeTentarReserva(resp.status)) {
          usouReserva = true
          console.warn(`[ai] ${modeloAtual} falhou (${resp.status}) — indo para a reserva ${modeloReserva}`)
          modeloAtual = modeloReserva
          body.model  = modeloReserva
          attempt = -1   // o laço incrementa: a reserva ganha o ciclo completo de tentativas
          continue
        }
        throw new AIError(msg, resp.status)
      }

      const data = await resp.json()
      // Concatena TODOS os blocos de texto. Era `.find(...)`, que pegava só o
      // primeiro — invisível em resposta comum (bloco único), mas com busca web
      // a resposta vem picada em dezenas de blocos entre as buscas, e o
      // chamador recebia o primeiro fragmento como se fosse a resposta inteira.
      const blocos = Array.isArray(data.content) ? data.content : []
      const text = blocos.filter(b => b.type === 'text').map(b => b.text || '').join('')
      await logAiUsage(supabase, { model: body.model, usage: data.usage, tag, workspace_id, operacao })
      if (usouReserva) console.warn(`[ai] respondido pela reserva ${modeloAtual}`)
      // `content` cru sai junto: quem usa busca web precisa dos blocos
      // `web_search_tool_result` (URL e título vindos do índice) e das
      // `citations` (trecho verbatim da página). Sem isso, só resta a prosa do
      // modelo — e foi ler só a prosa que fez a escuta gravar link inventado.
      return { text, content: blocos, stop_reason: data.stop_reason, usage: data.usage }
    } catch (e) {
      if (e.name === 'AbortError') throw new AIError(`Timeout após ${Math.round(timeoutMs / 1000)}s`, 408)
      if (e instanceof AIError) throw e
      throw new AIError(`Network error: ${e.message}`, 0)
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  throw new AIError('Rate limit exceeded after retries', 429)
}

/**
 * Streaming call — collects all text_delta events and returns the full text.
 * Optionally calls onText(fullText) on each delta for progress updates.
 *
 * @param {object}   opts
 * @param {object[]}  opts.messages
 * @param {string}   [opts.system]
 * @param {string}   [opts.model]     defaults to MODELS.smart
 * @param {object[]} [opts.tools]
 * @param {number}   [opts.maxTokens] defaults to 4000
 * @param {string}   [opts.apiKey]
 * @param {Function} [opts.onText]    called with fullText on each chunk
 */
export async function streamAI({
  messages,
  system,
  model,
  modeloReserva,   // entra se o principal falhar por capacidade/indisponibilidade
  tools,
  maxTokens = 4000,
  apiKey,
  onText,
  supabase     = null,   // habilita o rastreio de custo — ver logAiUsage
  tag          = null,
  workspace_id = null,
  operacao     = null,
  thinking,        // {type:'disabled'} corta o raciocínio; omitido = padrão do modelo
  idleMs,          // aborta se ficar SEM receber dados por N ms (ideal p/ streaming:
                   // não corta um stream saudável que flui, só um pendurado)
}) {
  requireApiKey(apiKey)

  // O stream é de uma passada só — não dá para "continuar" no meio. A reserva
  // aqui é uma REEXECUÇÃO limpa com o outro modelo, feita uma vez.
  const tentar = async (modeloAlvo) => {
  const controller = idleMs ? new AbortController() : null
  let timer = null
  const resetIdle = () => {
    if (!controller) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => controller.abort(), idleMs)
  }
  const clearIdle = () => { if (timer) clearTimeout(timer) }

  resetIdle()
  let resp
  try {
    resp = await fetch(ANTHROPIC_BASE, {
      method:  'POST',
      headers: anthropicHeaders(apiKey),
      body:    JSON.stringify({
        model:      modeloAlvo,
        max_tokens: maxTokens,
        stream:     true,
        messages,
        ...(system        ? { system: cachedSystem(system) } : {}),
        ...(tools?.length ? { tools }                        : {}),
        ...(thinking      ? { thinking }                     : {}),
      }),
      signal:  controller?.signal,
    })
  } catch (e) {
    clearIdle()
    if (e.name === 'AbortError') throw new AIError(`Stream sem resposta após ${Math.round(idleMs / 1000)}s`, 408)
    throw new AIError(`Network error: ${e.message}`, 0)
  }

  if (!resp.ok) {
    clearIdle()
    const err = await resp.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${resp.status}`
    if (await alertIfBalanceError('anthropic', resp.status, msg)) throw new AIError(MSG_INSTABILIDADE, 503)
    throw new AIError(msg, resp.status)
  }

  const reader  = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', fullText = ''
  let stopReason = null, thinkingTokens = 0
  // O uso vem partido em dois eventos: os tokens de ENTRADA chegam no
  // `message_start`, os de SAÍDA no `message_delta`. Quem olhar só um dos dois
  // registra metade da conta.
  let usage = {}

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      resetIdle()   // qualquer chunk (inclui pings de keep-alive) reinicia o relógio
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') continue
        let evt; try { evt = JSON.parse(raw) } catch { continue }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          fullText += evt.delta.text || ''
          onText?.(fullText)
        }
        // O desfecho vem no message_delta. Sem olhar isto, um estouro de teto
        // chegava ao chamador como texto vazio, que ele traduzia em "JSON não
        // extraído" — mensagem que aponta para o lugar errado e custou horas.
        if (evt.type === 'message_start' && evt.message?.usage) {
          usage = { ...usage, ...evt.message.usage }
        }
        if (evt.type === 'message_delta') {
          stopReason     = evt.delta?.stop_reason || stopReason
          thinkingTokens = evt.usage?.output_tokens_details?.thinking_tokens || thinkingTokens
          if (evt.usage) usage = { ...usage, ...evt.usage }
        }
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new AIError(`Stream sem resposta após ${Math.round(idleMs / 1000)}s`, 408)
    throw new AIError(`Stream error: ${e.message}`, 0)
  } finally {
    clearIdle()
  }

  // O gasto entra no rastreio ANTES das validações abaixo. Uma chamada que
  // estourou o teto sem escrever nada custou dinheiro do mesmo jeito — foi
  // exatamente o caso da Pixel, 169 mil tokens de entrada e 14 mil de saída
  // para devolver zero caractere. Registrar só o sucesso esconde o desperdício,
  // que é justamente o que a gente precisa enxergar.
  await logAiUsage(supabase, { model: modeloAlvo, usage, tag, workspace_id, operacao })

  // Texto vazio com teto estourado não é "resposta ruim": é resposta que nunca
  // começou. Sonnet 5 pensa por padrão (thinking adaptativo) e, num diagnóstico
  // com busca, gastou 10.351 tokens pensando e orquestrando buscas antes de
  // escrever a primeira letra — chegou ao teto com zero caractere. Diagnosticar
  // isso a partir de "JSON não extraído" é impossível.
  if (!fullText && stopReason === 'max_tokens') {
    throw new AIError(
      `O modelo estourou o teto de ${maxTokens} tokens antes de escrever a resposta`
      + `${thinkingTokens ? ` (${thinkingTokens} deles gastos pensando)` : ''}.`
      + ' Aumente maxTokens ou reduza o raciocínio.', 507)
  }
  if (!fullText) {
    throw new AIError(`O modelo não devolveu texto (stop_reason: ${stopReason || 'desconhecido'})`, 502)
  }
  return fullText
  }

  const principal = model || MODELS.smart
  try {
    return await tentar(principal)
  } catch (e) {
    if (!modeloReserva || !valeTentarReserva(e.status)) throw e
    console.warn(`[ai] stream de ${principal} falhou (${e.status}) — reexecutando na reserva ${modeloReserva}`)
    return tentar(modeloReserva)
  }
}

/**
 * Extracts the first valid JSON object from a string.
 * Useful for parsing model responses that may have extra text around the JSON.
 */
export function extractJSON(text) {
  const j0 = text.indexOf('{')
  const j1 = text.lastIndexOf('}')
  if (j0 < 0 || j1 <= j0) return null
  try { return JSON.parse(text.slice(j0, j1 + 1)) } catch { return null }
}
