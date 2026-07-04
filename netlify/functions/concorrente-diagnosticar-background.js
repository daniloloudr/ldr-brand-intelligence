// concorrente-diagnosticar-background.js — gera o diagnóstico de UM concorrente
// on-demand (disparado quando o usuário adiciona um concorrente). Background
// function (teto de 15 min); grava em diagnosticos_concorrentes (scores + dados).
import { createClient } from '@supabase/supabase-js'
import { diagnosticarConcorrente } from './_diagnostico.js'

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
  const { concorrente_id } = body
  if (!concorrente_id) return { statusCode: 400 }

  const { data: concorrente } = await supabase
    .from('concorrentes').select('id, workspace_id, nome, dominio').eq('id', concorrente_id).single()
  if (!concorrente) return { statusCode: 404 }

  // Acesso: membro do workspace do concorrente OU platform admin
  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', concorrente.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403 }

  try {
    await diagnosticarConcorrente(supabase, concorrente)
  } catch (e) {
    console.warn(`[concorrente-diag] ${concorrente.nome}: ${e.message}`)
    // Sem linha de erro na tabela (não há coluna status); o front mostra "sem diagnóstico".
    return { statusCode: 200 }
  }
  return { statusCode: 200 }
}
