import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const CALENDLY_URL     = Deno.env.get('CALENDLY_URL') || 'https://calendly.com/loudr/insights'
const BASE_URL         = Deno.env.get('BASE_URL') || 'https://ldr.netlify.app'

// Triggered por INSERT em diagnosticos WHERE tipo = 'aprovado_lead'
// Agenda 4 e-mails: D+2, D+5, D+10, D+15
// Cancela automaticamente se lead cria workspace (via RLS / subscription check)

const SEQUENCIA = [
  { dia: 2,  assunto: 'Sua marca tem um território inexplorado', template: 'dia2' },
  { dia: 5,  assunto: 'O que seus concorrentes estão fazendo que você não está',  template: 'dia5' },
  { dia: 10, assunto: 'Próximo passo: workspace de inteligência de marca',  template: 'dia10' },
  { dia: 15, assunto: 'Última chamada — oferta especial de onboarding', template: 'dia15' },
]

function templateDia2(nome: string, empresa: string, linkRelatorio: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;max-width:600px;margin:0 auto;color:#0D1B2A">
      <p>Olá, ${nome}!</p>
      <p>No seu diagnóstico de <strong>${empresa}</strong>, identificamos um <strong>território de marca inexplorado</strong> — um posicionamento que nenhum concorrente reivindica ainda.</p>
      <p>Marcas que agem rápido sobre esse tipo de insight constroem vantagem competitiva durável.</p>
      <p><a href="${linkRelatorio}" style="color:#0D9E7A;font-weight:700">Revisar o diagnóstico completo →</a></p>
      <p>Abraços,<br>Equipe LOUDR</p>
    </div>
  `
}

function templateDia5(nome: string, empresa: string, linkRelatorio: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;max-width:600px;margin:0 auto;color:#0D1B2A">
      <p>Olá, ${nome}!</p>
      <p>Enquanto você lê este e-mail, seus concorrentes estão monitorando o mercado — e alguns já mapearam o território que <strong>${empresa}</strong> poderia reivindicar.</p>
      <p>A inteligência de marca é um processo contínuo. Um diagnóstico pontual revela o estado atual; o monitoramento revela para onde o mercado está indo.</p>
      <p>Com o workspace LOUDR, você acompanha a evolução dos seus scores todo mês e recebe alertas quando algo muda.</p>
      <p><a href="${BASE_URL}/#/register" style="color:#E8185A;font-weight:900;display:inline-block;background:#E8185A22;padding:10px 20px;border-radius:8px;text-decoration:none">Criar workspace gratuito →</a></p>
      <p>Abraços,<br>Equipe LOUDR</p>
    </div>
  `
}

function templateDia10(nome: string, empresa: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;max-width:600px;margin:0 auto;color:#0D1B2A">
      <p>Olá, ${nome}!</p>
      <p>Você sabia que empresas com monitoramento contínuo de marca respondem 3x mais rápido a movimentos de mercado?</p>
      <p>Com o workspace LOUDR para <strong>${empresa}</strong>, você teria:</p>
      <ul>
        <li>Histórico completo de evolução de scores</li>
        <li>Alertas automáticos de mudanças de marca</li>
        <li>Diagnósticos mensais automáticos</li>
        <li>Dashboard de oportunidades e quick wins</li>
      </ul>
      <p><a href="${BASE_URL}/#/register" style="color:#0D9E7A;font-weight:700">Começar trial grátis de 14 dias →</a></p>
      <p>Abraços,<br>Equipe LOUDR</p>
    </div>
  `
}

function templateDia15(nome: string, empresa: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;max-width:600px;margin:0 auto;color:#0D1B2A">
      <p>Olá, ${nome}!</p>
      <p>Este é o último e-mail da nossa sequência para <strong>${empresa}</strong>.</p>
      <p>Se o diagnóstico foi útil e você quer continuar acompanhando a evolução da sua marca, adoraríamos ter você no workspace LOUDR.</p>
      <p>Oferta especial: <strong>primeiro mês com 20% off</strong> usando o código <strong>INTELIGENCIA20</strong> no checkout.</p>
      <p><a href="${BASE_URL}/#/register" style="color:#E8185A;font-weight:900">Criar workspace agora →</a></p>
      <p>Qualquer dúvida, responda este e-mail.</p>
      <p>Abraços,<br>Equipe LOUDR</p>
    </div>
  `
}

serve(async (req) => {
  const payload  = await req.json()
  const diag     = payload.record as {
    id: string; tipo: string; user_name?: string; user_email?: string; empresa?: string
  }

  if (diag.tipo !== 'aprovado_lead') {
    return new Response('skip', { status: 200 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)
  const nome     = diag.user_name || 'gestor'
  const empresa  = diag.empresa   || 'sua empresa'
  const email    = diag.user_email
  const linkRel  = `${BASE_URL}/#/relatorio/${diag.id}`

  if (!email) return new Response('no email', { status: 200 })

  const templates: Record<string, string> = {
    dia2:  templateDia2(nome, empresa, linkRel),
    dia5:  templateDia5(nome, empresa, linkRel),
    dia10: templateDia10(nome, empresa),
    dia15: templateDia15(nome, empresa),
  }

  // Agenda os e-mails (em produção usaria pg_cron ou Supabase scheduled)
  // Por ora envia imediatamente com delay simulado via metadados
  for (const seq of SEQUENCIA) {
    const scheduledAt = new Date()
    scheduledAt.setDate(scheduledAt.getDate() + seq.dia)

    await supabase.from('alertas').insert({
      workspace_id: null,
      tipo: 'nurturing_agendado',
      titulo: `E-mail nurturing D+${seq.dia}: ${empresa}`,
      descricao: `Agendado para ${scheduledAt.toLocaleDateString('pt-BR')}`,
      severidade: 'info',
      dados: {
        email,
        assunto: seq.assunto,
        html: templates[seq.template],
        agendado_para: scheduledAt.toISOString(),
        diagnostico_id: diag.id,
      },
    })
  }

  return new Response(JSON.stringify({ agendados: SEQUENCIA.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
