import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig, extractJSON } from './_ai.js'
import { SYSTEM_PROMPT } from './_prompt.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }

  const { workspace_id, empresa: empresaParam, contexto, diagnostico_id } = body

  if (!workspace_id && !empresaParam && !diagnostico_id) return { statusCode: 400 }

  let wsData      = null
  let workspaceId = null
  let empresaNome = null
  let dominio     = null

  if (workspace_id) {
    const [{ data: member }, { data: platformAdmin }] = await Promise.all([
      supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
      supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
    ])
    if (!member && !platformAdmin) return { statusCode: 403 }

    const { data: ws } = await supabase
      .from('workspaces').select('id, nome, dominio, diagnosticos_mes').eq('id', workspace_id).single()
    if (!ws) return { statusCode: 404 }

    wsData      = ws
    workspaceId = workspace_id
    empresaNome = ws.nome || ws.dominio
    dominio     = ws.dominio || null
  } else {
    // Admin direct flow — must be platform admin
    const { data: platformAdmin } = await supabase
      .from('platform_admins').select('id').eq('user_id', user.id).maybeSingle()
    if (!platformAdmin) return { statusCode: 403 }

    empresaNome = empresaParam
    dominio     = null
  }

  const msgText = `Diagnóstico Smart Branding para: "${empresaNome}".${contexto ? `\nContexto: ${contexto}` : ''}\nGere o JSON completo.`
  const userName = user.user_metadata?.full_name || user.email.split('@')[0]

  const saveError = async (msg) => {
    if (diagnostico_id) {
      await supabase.from('diagnosticos').update({
        status:  'error',
        data:    { _job_error: true, error: msg },
        publico: false,
      }).eq('id', diagnostico_id).catch(() => {})
      return
    }
    await supabase.from('diagnosticos').insert({
      workspace_id: workspaceId,
      user_id:      user.id,
      user_email:   user.email,
      user_name:    userName,
      empresa:      empresaNome || 'N/A',
      dominio,
      data:         { _job_error: true, error: msg },
      publico:      false,
      tipo:         'background_error',
      status:       'error',
    }).catch(() => {})
  }

  let text
  try {
    const res = await callAI({
      system:   SYSTEM_PROMPT,
      messages: [{ role: 'user', content: msgText }],
      ...aiConfig('premium'),
    })
    text = res.text
  } catch (e) {
    await saveError(e.message)
    return { statusCode: 200 }
  }

  const parsed = extractJSON(text)
  if (!parsed) {
    await saveError('Não foi possível extrair o diagnóstico. Tente novamente.')
    return { statusCode: 200 }
  }

  const payload = {
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
    status:               'done',
  }

  let writeErr
  if (diagnostico_id) {
    const { error } = await supabase.from('diagnosticos').update(payload).eq('id', diagnostico_id)
    writeErr = error
  } else {
    const { error } = await supabase.from('diagnosticos').insert({
      ...payload,
      workspace_id: workspaceId,
      user_id:      user.id,
      user_email:   user.email,
      user_name:    userName,
      tipo:         'manual',
    })
    writeErr = error
  }

  if (writeErr) {
    await saveError(writeErr.message)
    return { statusCode: 200 }
  }

  if (workspaceId && wsData) {
    await supabase.from('workspaces')
      .update({ diagnosticos_mes: (wsData.diagnosticos_mes || 0) + 1 })
      .eq('id', workspaceId)
  }

  return { statusCode: 200 }
}
