import { createClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT } from './_prompt.js'
import { callAI, MODELS, TOOLS, extractJSON, isDev } from './_ai.js'
import { withHeartbeat } from './_watchdog.js'
import { alvoDoDiagnostico, conferirIdentidade, identidadeParaGravar } from './_identidade.js'

// Scheduled: toda segunda-feira às 8h (configurado em netlify.toml)
// Gera diagnóstico automático para workspaces com monitor ativo

async function gerarDiagnostico(empresa, contexto) {
  const dev = isDev()
  const { text } = await callAI({
    model:     dev ? MODELS.fast : MODELS.smart,
    maxTokens: dev ? 3000 : 5500,
    system:    SYSTEM_PROMPT,
    tools:     dev ? [] : [TOOLS.webSearch],
    messages:  [{
      role:    'user',
      // `empresa` é o objeto { nome, dominio }. Interpolado direto virava
      // "[object Object]" e o modelo respondia, corretamente, que não sabia
      // quem diagnosticar — foi o 0/10 da Worten em 24/08.
      content: `Diagnóstico Smart Branding para: "${alvoDoDiagnostico(empresa)}".${contexto ? `\nContexto: ${contexto}` : ''}\nGere o JSON completo.`,
    }],
  })

  if (!text) throw new Error('Sem resposta de texto da API')
  const parsed = extractJSON(text)
  if (!parsed) throw new Error('JSON não encontrado na resposta')
  return parsed
}

async function run(event) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const hoje = new Date()
  const diaDaSemana = hoje.getDay() // 1 = segunda

  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id, nome, dominio, plano, diagnosticos_mes, diagnosticos_reset_at')
    .in('plano', ['starter', 'pro', 'enterprise'])
    .eq('plano_status', 'active')
    .eq('ativo', true)

  if (error) {
    console.error('[cron-monitor] Erro ao buscar workspaces:', error)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  const DELAY_ENTRE_WORKSPACES = 15000
  const rodados = []
  const erros   = []

  for (const ws of workspaces || []) {
    try {
      // Reset mensal de diagnósticos se necessário
      const resetAt = new Date(ws.diagnosticos_reset_at)
      if (hoje >= resetAt) {
        const proxReset = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
        await supabase.from('workspaces').update({
          diagnosticos_mes: 0,
          diagnosticos_reset_at: proxReset.toISOString(),
        }).eq('id', ws.id)
        ws.diagnosticos_mes = 0
      }

      if (!verificarFrequencia(ws.plano, diaDaSemana, hoje)) continue

      // Nome E domínio vão ao modelo — o domínio é o identificador definitivo.
      const alvo = { nome: ws.nome, dominio: ws.dominio }
      if (!alvo.nome && !alvo.dominio) continue

      console.log(`[cron-monitor] Gerando diagnóstico para ${ws.id} — ${alvo.dominio || alvo.nome}`)
      const parsed = await gerarDiagnostico(alvo, null, {
        supabase, tag: 'diagnostico', workspace_id: ws.id, operacao: 'diagnostico:cron-semanal',
      })

      // Este cron roda TODA SEGUNDA e grava por cima. Sem a guarda, um
      // diagnóstico de outra empresa entrava no histórico do cliente
      // semanalmente, sem ninguém olhar.
      const conf = conferirIdentidade(alvo, parsed)
      if (!conf.ok) {
        console.error(`[cron-monitor] identidade recusada em ${ws.id}: ${conf.motivo} `
          + `(esperado ${conf.esperado || '?'}, recebido ${conf.recebido || '?'}) — diagnóstico descartado`)
        continue
      }

      const { data: diag, error: diagErr } = await supabase
        .from('diagnosticos')
        .insert({
          workspace_id:        ws.id,
          ...identidadeParaGravar(alvo, parsed),
          setor:               parsed.setor,
          porte:               parsed.porte,
          score_singularidade: parsed.score_singularidade,
          score_consistencia:  parsed.score_consistencia,
          score_posicionamento: parsed.score_posicionamento,
          frase_diagnostico:   parsed.frase_diagnostico,
          data:                parsed,
          publico:             false,
          tipo:                'cron',
        })
        .select()
        .single()

      if (diagErr) throw diagErr

      await supabase
        .from('workspaces')
        .update({ diagnosticos_mes: (ws.diagnosticos_mes || 0) + 1 })
        .eq('id', ws.id)

      rodados.push(ws.id)
      console.log(`[cron-monitor] OK — workspace ${ws.id}, diagnóstico ${diag.id}`)
    } catch (e) {
      console.error(`[cron-monitor] Erro no workspace ${ws.id}:`, e.message)
      erros.push({ workspace_id: ws.id, erro: e.message })
    }

    await new Promise(r => setTimeout(r, DELAY_ENTRE_WORKSPACES))
  }

  console.log(`[cron-monitor] ${rodados.length} diagnósticos gerados, ${erros.length} erros`)
  return {
    statusCode: 200,
    body: JSON.stringify({ gerados: rodados.length, erros: erros.length, ids: rodados }),
  }
}

function verificarFrequencia(plano, diaDaSemana, hoje) {
  if (plano === 'enterprise') return true            // diário
  if (plano === 'pro')        return diaDaSemana === 1 // semanal: segunda
  if (plano === 'starter')    return hoje.getDate() === 1 // mensal: dia 1
  return false
}

export const handler = withHeartbeat('cron-monitor', run)
