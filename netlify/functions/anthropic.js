// anthropic.js — proxy STREAMING para a API da Anthropic (Copiloto).
// Functions 2.0 (export default): repassa o SSE como stream de verdade.
// A versão antiga bufferizava a resposta inteira (await response.text()) e
// estourava o teto síncrono (~26s) em respostas longas — era o "Erro 504"
// do chat. (A0 do "Copiloto com mãos", .spec/backlog.md)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS })
  if (req.method !== 'POST')    return new Response('Method Not Allowed', { status: 405, headers: CORS })

  const body = await req.text()
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body,
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS,
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
