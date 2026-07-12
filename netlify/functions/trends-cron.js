// trends-cron.js — Scheduled (netlify.toml). Radar de tendências semanal para
// todos os workspaces com setor definido (em série — aproveita o prompt cache).
// Lição aprendida: NUNCA fire-and-forget em Lambda; tudo await até o fim.
import { createClient } from '@supabase/supabase-js'
import { coletarTendenciasWorkspace } from './_trends.js'

export const handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: wss } = await supabase.from('workspaces').select('id, setor').not('setor', 'is', null)

  let total = 0
  for (const ws of wss || []) {                      // SÉRIE (cache do prompt)
    const res = await coletarTendenciasWorkspace(supabase, { workspace_id: ws.id })
    total += res.inseridos
  }
  console.log(`[trends-cron] ${total} tendências em ${wss?.length || 0} workspaces`)
  return { statusCode: 200, body: JSON.stringify({ workspaces: wss?.length || 0, inseridos: total }) }
}
