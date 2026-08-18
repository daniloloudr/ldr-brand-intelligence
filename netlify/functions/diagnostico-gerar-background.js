import { createClient } from '@supabase/supabase-js'
import { streamAI, aiConfig, extractJSON } from './_ai.js'
import { SYSTEM_PROMPT } from './_prompt.js'
import { alvoDoDiagnostico, instrucaoDeIdentidade, conferirIdentidade, identidadeParaGravar } from './_identidade.js'
import { contextoDeMercado } from './_mercado.js'

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
      .from('workspaces').select('id, nome, dominio, pais, diagnosticos_mes').eq('id', workspace_id).single()
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

  // O ALVO carrega nome E domínio. Antes ia só `empresaNome` — o domínio era
  // carregado acima e nunca chegava ao modelo. O workspace "Pixel" recebeu um
  // diagnóstico da "Pixel Agência Digital" (agenciapx.com) por causa disso:
  // "Pixel" é nome de dezenas de agências, e o modelo escolheu outra.
  const alvo    = { nome: empresaNome, dominio }
  const msgText = `Diagnóstico Smart Branding para: "${alvoDoDiagnostico(alvo)}".`
    + `${contexto ? `\nContexto: ${contexto}` : ''}`
    + instrucaoDeIdentidade(alvo)
    + contextoDeMercado(wsData?.pais)
    + `\nGere o JSON completo.`
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

  // STREAMING: a chamada não-streaming longa com web_search era dropada/pendurada
  // ao sair da Lambda em prod (funcionava no localhost por não ter teto). Streaming
  // mantém a conexão viva com eventos → não pendura. idleMs corta só um stream que
  // parou de responder (não um saudável que flui). 2 tentativas p/ drops transitórios.
  const { model, modeloReserva, tools, maxTokens } = aiConfig('premium')
  const MAX_ATTEMPTS = 2
  let parsed = null
  let lastErr = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await streamAI({
        system:   SYSTEM_PROMPT,
        messages: [{ role: 'user', content: msgText }],
        model, modeloReserva, tools, maxTokens,
        // A operação mais cara do produto passava sem rastreio nenhum.
        supabase, tag: 'diagnostico', workspace_id: workspaceId,
        operacao: `diagnostico:${alvoDoDiagnostico(alvo)}`,
        idleMs:   120000,   // 2 min sem NENHUM chunk (pings inclusos) = stream morto
      })
      const p = extractJSON(text)
      if (p) { parsed = p; break }
      lastErr = 'Não foi possível extrair o diagnóstico do texto gerado.'
    } catch (e) {
      lastErr = e.message || 'Falha na geração do diagnóstico.'
    }
    console.warn(`[diagnostico] tentativa ${attempt}/${MAX_ATTEMPTS} falhou: ${lastErr}`)
    if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 4000))
  }

  if (!parsed) {
    await saveError(`Falha após ${MAX_ATTEMPTS} tentativas — ${lastErr}`)
    return { statusCode: 200 }
  }

  // A GUARDA DE IDENTIDADE. Roda depois do modelo e antes de gravar: se o
  // diagnóstico é de outra empresa, ele não vira registro `done`. Diagnóstico
  // errado que chega ao cliente com cara de pronto é pior que diagnóstico
  // nenhum — o cliente age em cima dele.
  const conferencia = conferirIdentidade(alvo, parsed)
  if (!conferencia.ok) {
    const detalhe = `esperado ${conferencia.esperado || '?'}, recebido ${conferencia.recebido || '?'}`
    console.error(`[diagnostico] identidade recusada: ${conferencia.motivo} (${detalhe})`)
    await saveError(`Identificação falhou — ${conferencia.motivo}. ${detalhe}. `
      + 'O diagnóstico foi descartado para não atribuir a esta marca a análise de outra empresa.')
    return { statusCode: 200 }
  }

  const payload = {
    // A identidade vem da ENTRADA, não da resposta. Era `parsed.empresa` /
    // `parsed.dominio`, e o modelo sobrescrevia quem era o cliente.
    ...identidadeParaGravar(alvo, parsed),
    setor:                parsed.setor,
    porte:                parsed.porte,
    score_singularidade:  parsed.score_singularidade,
    score_consistencia:   parsed.score_consistencia,
    score_posicionamento: parsed.score_posicionamento,
    frase_diagnostico:    parsed.frase_diagnostico,
    data:                 { ...parsed, _identidade: conferencia },
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
