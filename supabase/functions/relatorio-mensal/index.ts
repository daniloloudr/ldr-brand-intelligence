import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const BASE_URL         = Deno.env.get('BASE_URL') || 'https://ldr.netlify.app'

// Scheduled: dia 1 de cada mês às 9h
// Gera resumo de evolução e envia por e-mail para todos os membros

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, nome, plano')
    .in('plano', ['starter', 'pro', 'enterprise'])
    .eq('plano_status', 'active')

  let enviados = 0

  for (const ws of workspaces ?? []) {
    // Busca diagnósticos do último mês
    const umMesAtras = new Date()
    umMesAtras.setMonth(umMesAtras.getMonth() - 1)

    const { data: diags } = await supabase
      .from('diagnosticos')
      .select('empresa, score_singularidade, score_consistencia, score_posicionamento, created_at')
      .eq('workspace_id', ws.id)
      .gte('created_at', umMesAtras.toISOString())
      .order('created_at', { ascending: false })

    if (!diags?.length) continue

    // Busca membros do workspace
    const { data: membros } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', ws.id)

    if (!membros?.length) continue

    // Busca e-mails dos membros via auth.users (serviço)
    const userIds = membros.map(m => m.user_id)
    const { data: users } = await supabase.auth.admin.listUsers()
    const emails = users?.users
      .filter(u => userIds.includes(u.id))
      .map(u => u.email)
      .filter(Boolean) || []

    if (!emails.length) continue

    // Monta resumo
    const ultimo   = diags[0]
    const mes      = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const avgSing  = +(diags.reduce((a, d) => a + (d.score_singularidade || 0), 0) / diags.length).toFixed(1)
    const avgCons  = +(diags.reduce((a, d) => a + (d.score_consistencia || 0), 0) / diags.length).toFixed(1)
    const avgPos   = +(diags.reduce((a, d) => a + (d.score_posicionamento || 0), 0) / diags.length).toFixed(1)

    const html = `
      <div style="font-family:'Cairo',sans-serif;max-width:620px;margin:0 auto">
        <div style="background:#0D1B2A;padding:28px;border-radius:12px 12px 0 0;text-align:center">
          <p style="color:#0D9E7A;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 4px">Relatório Mensal</p>
          <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0">${ws.nome}</h1>
          <p style="color:#8A9AB0;font-size:13px;margin:6px 0 0">${mes}</p>
        </div>
        <div style="background:#162840;padding:28px;border-radius:0 0 12px 12px">
          <p style="color:#8A9AB0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px">
            ${diags.length} diagnóstico${diags.length > 1 ? 's' : ''} realizados no mês
          </p>
          <div style="display:flex;gap:12px;margin-bottom:24px">
            ${[['Singularidade', avgSing, '#0D9E7A'], ['Consistência', avgCons, '#7F77DD'], ['Posicionamento', avgPos, '#EF9F27']]
              .map(([l, v, c]) => `
                <div style="flex:1;background:#0D1B2A;border-radius:10px;padding:16px;text-align:center">
                  <div style="font-size:28px;font-weight:900;color:${c}">${v}</div>
                  <div style="font-size:11px;color:#8A9AB0;margin-top:4px">${l}</div>
                </div>
              `).join('')}
          </div>
          <a href="${BASE_URL}/#/app/evolucao"
            style="display:block;text-align:center;background:#0D9E7A;color:#fff;padding:14px;border-radius:8px;font-weight:900;font-size:14px;text-decoration:none">
            Ver evolução completa no workspace →
          </a>
        </div>
        <p style="text-align:center;color:#4A5A6A;font-size:11px;margin-top:16px">
          LOUDR Brand Intelligence · Relatório automático mensal
        </p>
      </div>
    `

    for (const email of emails) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'LOUDR Intelligence <inteligencia@loudr.com.br>',
          to: [email],
          subject: `Relatório mensal de marca — ${ws.nome} · ${mes}`,
          html,
        }),
      })
      enviados++
    }
  }

  return new Response(JSON.stringify({ enviados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
