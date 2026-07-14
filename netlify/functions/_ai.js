// Central module for all LLM calls.
// Currently: Anthropic only.
// Future: add connectors for other providers (OpenAI, Grok, Meta AI).
// All functions should import from here instead of calling the API directly.

const ANTHROPIC_BASE    = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// Named model presets — swap here to update every function at once
export const MODELS = {
  fast:   'claude-haiku-4-5-20251001',  // cheap, no web_search — local dev / simple tasks
  medium: 'claude-sonnet-4-5',          // faster sonnet — dev when 30s netlify-cli timeout applies
  smart:  'claude-sonnet-4-6',          // full capability + web_search — production
  opus:   'claude-opus-4-7',            // máxima qualidade — extração de manuais, análises sensíveis
}

export const TOOLS = {
  // max_uses limita o loop agêntico de busca — sem isso a chamada não-streaming
  // pode enrolar por minutos e estourar o teto de 15 min da background function em prod.
  // O prompt do diagnóstico pede 5 buscas; 6 dá 1 de folga sem esticar o tempo.
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
  'claude-opus-4-7':            { in: 15,   out: 75 },
}
export async function logAiUsage(supabase, { model, usage, tag = null }) {
  try {
    if (!supabase || !usage) return
    const p = TOKEN_PRICE[model] || { in: 3, out: 15 }
    const inTok = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0) * 0.1
    const custo = (inTok * p.in + (usage.output_tokens || 0) * p.out) / 1_000_000
    await supabase.from('ai_usage').insert({
      provider: 'anthropic', model,
      input_tokens: Math.round(inTok), output_tokens: usage.output_tokens || 0,
      custo_usd: custo, tag,
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
  if (tier === 'premium') return {
    model:      MODELS.smart,
    maxTokens:  8000,
    tools:      [TOOLS.webSearch],
    retries:    1,
    retryDelay: 5000,
  }
  // 'standard' — default
  return {
    model:      dev ? MODELS.medium : MODELS.smart,
    maxTokens:  dev ? 5000 : 6000,
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
  tools,
  maxTokens    = 1024,
  apiKey,
  retries      = 1,
  retryDelay   = 3000,
  timeoutMs,
  supabase     = null,   // opcional: habilita o rastreio de custo (ai_usage)
  tag          = null,   // quem chamou (distill, diagnostico, sintese…)
}) {
  requireApiKey(apiKey)

  const body = {
    model:      model || MODELS.smart,
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
        throw new AIError(err?.error?.message || `HTTP ${resp.status}`, resp.status)
      }

      const data = await resp.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      await logAiUsage(supabase, { model: body.model, usage: data.usage, tag })
      return { text, usage: data.usage }
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
  tools,
  maxTokens = 4000,
  apiKey,
  onText,
  idleMs,          // aborta se ficar SEM receber dados por N ms (ideal p/ streaming:
                   // não corta um stream saudável que flui, só um pendurado)
}) {
  requireApiKey(apiKey)

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
        model:      model || MODELS.smart,
        max_tokens: maxTokens,
        stream:     true,
        messages,
        ...(system        ? { system: cachedSystem(system) } : {}),
        ...(tools?.length ? { tools }                        : {}),
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
    throw new AIError(err?.error?.message || `HTTP ${resp.status}`, resp.status)
  }

  const reader  = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', fullText = ''

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
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new AIError(`Stream sem resposta após ${Math.round(idleMs / 1000)}s`, 408)
    throw new AIError(`Stream error: ${e.message}`, 0)
  } finally {
    clearIdle()
  }

  return fullText
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
