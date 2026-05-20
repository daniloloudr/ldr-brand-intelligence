import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Scheduled: diário às 7h
// Compara último snapshot com anterior e gera alertas por workspace
serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, nome, plano')
    .eq('plano_status', 'active')

  let gerados = 0

  for (const ws of workspaces ?? []) {
    // Busca os 2 últimos diagnósticos do workspace
    const { data: diags } = await supabase
      .from('diagnosticos')
      .select('score_singularidade, score_consistencia, score_posicionamento, created_at, empresa')
      .eq('workspace_id', ws.id)
      .order('created_at', { ascending: false })
      .limit(2)

    if (!diags || diags.length < 2) continue

    const [ultimo, anterior] = diags

    const dimensoes = [
      { key: 'score_singularidade', label: 'Singularidade' },
      { key: 'score_consistencia',  label: 'Consistência' },
      { key: 'score_posicionamento', label: 'Posicionamento' },
    ]

    for (const { key, label } of dimensoes) {
      const diff = (ultimo[key] ?? 0) - (anterior[key] ?? 0)

      if (Math.abs(diff) >= 2) {
        const positivo  = diff > 0
        const severidade = positivo ? 'success' : Math.abs(diff) >= 3 ? 'critical' : 'warning'

        await supabase.from('alertas').insert({
          workspace_id: ws.id,
          tipo: positivo ? 'score_subiu' : 'score_caiu',
          titulo: `${label} ${positivo ? 'aumentou' : 'caiu'} ${Math.abs(diff)} pontos — ${ultimo.empresa}`,
          descricao: `Score de ${label} passou de ${anterior[key]} para ${ultimo[key]}. ${positivo ? 'Bom trabalho!' : 'Recomendamos revisar as oportunidades do diagnóstico.'}`,
          severidade,
          dados: { dimensao: key, de: anterior[key], para: ultimo[key], empresa: ultimo.empresa },
        })
        gerados++
      }
    }
  }

  return new Response(JSON.stringify({ gerados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
