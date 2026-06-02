// Central module for all LLM calls.
// Currently: Anthropic only.
// Future: add connectors for other providers (OpenAI, Grok, Meta AI).
// All functions should import from here instead of calling the API directly.

const ANTHROPIC_BASE    = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// Named model presets — swap here to update every function at once
export const MODELS = {
  fast:  'claude-haiku-4-5-20251001',   // cheap, no web_search — local dev / simple tasks
  smart: 'claude-sonnet-4-5',           // full capability + web_search — production
}

export const TOOLS = {
  webSearch: { type: 'web_search_20250305', name: 'web_search' },
}

export const isDev = () => !!process.env.NETLIFY_DEV

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
}) {
  const body = {
    model:      model || MODELS.smart,
    max_tokens: maxTokens,
    messages,
    ...(system        ? { system }                  : {}),
    ...(tools?.length ? { tools }                   : {}),
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, retryDelay))

    let resp
    try {
      resp = await fetch(ANTHROPIC_BASE, {
        method:  'POST',
        headers: anthropicHeaders(apiKey),
        body:    JSON.stringify(body),
      })
    } catch (e) {
      throw new AIError(`Network error: ${e.message}`, 0)
    }

    if (resp.status === 429 && attempt < retries) continue

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new AIError(err?.error?.message || `HTTP ${resp.status}`, resp.status)
    }

    const data = await resp.json()
    const text = data.content?.find(b => b.type === 'text')?.text || ''
    return { text, usage: data.usage }
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
}) {
  const resp = await fetch(ANTHROPIC_BASE, {
    method:  'POST',
    headers: anthropicHeaders(apiKey),
    body:    JSON.stringify({
      model:      model || MODELS.smart,
      max_tokens: maxTokens,
      stream:     true,
      messages,
      ...(system        ? { system } : {}),
      ...(tools?.length ? { tools }  : {}),
    }),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new AIError(err?.error?.message || `HTTP ${resp.status}`, resp.status)
  }

  const reader  = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
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
