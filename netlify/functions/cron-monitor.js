import { createClient } from '@supabase/supabase-js'

// Scheduled: toda segunda-feira às 8h (configurado em netlify.toml)
// Gera diagnóstico automático para workspaces com monitor ativo

export async function handler(event) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const hoje = new Date()
  const diaDaSemana = hoje.getDay() // 1 = segunda

  // Busca workspaces com plano que inclui monitor
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id, nome, plano, diagnosticos_mes, diagnosticos_reset_at')
    .in('plano', ['starter', 'pro', 'enterprise'])
    .eq('plano_status', 'active')

  if (error) {
    console.error('[cron-monitor] Erro ao buscar workspaces:', error)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  const DELAY_ENTRE_WORKSPACES = 12000
  const rodados = []

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
      }

      // Verifica se o plano inclui monitor e qual frequência
      const deverodar = verificarFrequencia(ws.plano, diaDaSemana, hoje)
      if (!deverodar) continue

      // Busca o último diagnóstico do workspace para saber qual empresa monitorar
      const { data: ultimoDiag } = await supabase
        .from('diagnosticos')
        .select('empresa, dominio, setor, porte, workspace_id')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!ultimoDiag) continue

      // Gera alerta de monitoramento agendado (o diagnóstico real é gerado pelo frontend)
      await supabase.from('alertas').insert({
        workspace_id: ws.id,
        tipo: 'monitor_agendado',
        titulo: `Monitor automático — ${ultimoDiag.empresa}`,
        descricao: `Diagnóstico de monitoramento agendado para ${ultimoDiag.empresa}. Acesse o workspace para executar.`,
        severidade: 'info',
        dados: { empresa: ultimoDiag.empresa, dominio: ultimoDiag.dominio },
      })

      rodados.push(ws.id)
    } catch (e) {
      console.error(`[cron-monitor] Erro no workspace ${ws.id}:`, e.message)
    }
    await new Promise(r => setTimeout(r, DELAY_ENTRE_WORKSPACES))
  }

  console.log(`[cron-monitor] ${rodados.length} workspaces notificados`)
  return {
    statusCode: 200,
    body: JSON.stringify({ notificados: rodados.length, ids: rodados }),
  }
}

function verificarFrequencia(plano, diaDaSemana, hoje) {
  if (plano === 'enterprise') return true // diário
  if (plano === 'pro')        return diaDaSemana === 1 // semanal: segunda
  if (plano === 'starter')    return hoje.getDate() === 1 // mensal: dia 1
  return false
}
