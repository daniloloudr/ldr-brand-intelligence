import { createClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT } from './_prompt.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  const { workspace_id, contexto } = body
  if (!workspace_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, nome, dominio, diagnosticos_mes')
    .eq('id', workspace_id)
    .single()
  if (!ws) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Workspace não encontrado' }) }

  const empresa = ws.dominio || ws.nome
  const msg = JSON.stringify(contexto ? { empresa, contexto } : { empresa })

  // Streaming para caber no timeout local (30s netlify dev) — coleta SSE server-side
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.NETLIFY_DEV ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-5',
      max_tokens: process.env.NETLIFY_DEV ? 2048 : 4000,
      stream: true,
      system: SYSTEM_PROMPT,
      ...(process.env.NETLIFY_DEV ? {} : { tools: [{ type: 'web_search_20250305', name: 'web_search' }] }),
      messages: [{ role: 'user', content: msg }],
    }),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    return { statusCode: 500, headers, body: JSON.stringify({ error: err?.error?.message || `Anthropic ${resp.status}` }) }
  }

  // Coleta os text_delta do stream
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
      let evt
      try { evt = JSON.parse(raw) } catch { continue }
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        fullText += evt.delta.text || ''
      }
    }
  }

  if (!fullText) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Sem resposta do agente' }) }

  const j0 = fullText.indexOf('{')
  const j1 = fullText.lastIndexOf('}')
  if (j0 < 0 || j1 <= j0) return { statusCode: 500, headers, body: JSON.stringify({ error: 'JSON não encontrado na resposta' }) }

  let parsed
  try { parsed = JSON.parse(fullText.slice(j0, j1 + 1)) } catch {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao parsear diagnóstico' }) }
  }

  const { data: diag, error: diagErr } = await supabase
    .from('diagnosticos')
    .insert({
      workspace_id,
      user_id:              user.id,
      user_email:           user.email,
      user_name:            user.user_metadata?.full_name || user.email.split('@')[0],
      empresa:              parsed.empresa,
      dominio:              parsed.dominio,
      setor:                parsed.setor,
      porte:                parsed.porte,
      score_singularidade:  parsed.score_singularidade,
      score_consistencia:   parsed.score_consistencia,
      score_posicionamento: parsed.score_posicionamento,
      frase_diagnostico:    parsed.frase_diagnostico,
      data:                 parsed,
      publico:              true,
      tipo:                 'manual',
    })
    .select()
    .single()

  if (diagErr) return { statusCode: 500, headers, body: JSON.stringify({ error: diagErr.message }) }

  await supabase
    .from('workspaces')
    .update({ diagnosticos_mes: (ws.diagnosticos_mes || 0) + 1 })
    .eq('id', workspace_id)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ diagnostico: { ...diag, data: parsed } }),
  }
}
