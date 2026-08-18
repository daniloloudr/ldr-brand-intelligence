import { createClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT } from './_prompt.js'
import { streamAI, MODELS, TOOLS, extractJSON, isDev } from './_ai.js'
import { alvoDoDiagnostico, instrucaoDeIdentidade, conferirIdentidade, identidadeParaGravar } from './_identidade.js'
import { contextoDeMercado } from './_mercado.js'

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
    .select('id, nome, dominio, pais, diagnosticos_mes')
    .eq('id', workspace_id)
    .single()
  if (!ws) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Workspace não encontrado' }) }

  const alvo     = { nome: ws.nome, dominio: ws.dominio }
  const dev      = isDev()
  const msgText  = `Diagnóstico Smart Branding para: "${alvoDoDiagnostico(alvo)}".`
    + `${contexto ? `\nContexto: ${contexto}` : ''}`
    + instrucaoDeIdentidade(alvo)
    + contextoDeMercado(ws.pais)
    + `\nGere o JSON completo.`

  let fullText
  try {
    fullText = await streamAI({
      model:     dev ? MODELS.medium : MODELS.smart,
      maxTokens: dev ? 5000 : 6000,
      system:    SYSTEM_PROMPT,
      tools:     dev ? [] : [TOOLS.webSearch],
      messages:  [{ role: 'user', content: msgText }],
      supabase, tag: 'diagnostico', workspace_id,
      operacao:  `diagnostico:${alvoDoDiagnostico(alvo)}`,
    })
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }

  if (!fullText) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Sem resposta do agente' }) }

  const parsed = extractJSON(fullText)
  if (!parsed) return { statusCode: 500, headers, body: JSON.stringify({ error: 'JSON não encontrado na resposta' }) }

  // Guarda de identidade antes de gravar: diagnóstico de outra empresa não vira
  // registro. Erro visível é recuperável; erro com cara de relatório pronto não.
  const conf = conferirIdentidade(alvo, parsed)
  if (!conf.ok) {
    const detalhe = `esperado ${conf.esperado || '?'}, recebido ${conf.recebido || '?'}`
    console.error(`[diagnostico-gerar] identidade recusada: ${conf.motivo} (${detalhe})`)
    return { statusCode: 422, headers, body: JSON.stringify({
      error: `A análise voltou sobre outra empresa (${detalhe}). Nada foi gravado — tente de novo.`,
    }) }
  }

  const { data: diag, error: diagErr } = await supabase
    .from('diagnosticos')
    .insert({
      workspace_id,
      user_id:              user.id,
      user_email:           user.email,
      user_name:            user.user_metadata?.full_name || user.email.split('@')[0],
      ...identidadeParaGravar(alvo, parsed),
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
