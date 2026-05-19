import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CALENDLY_URL      = Deno.env.get('CALENDLY_URL') || 'https://calendly.com/loudr/insights'
const BASE_URL          = Deno.env.get('BASE_URL') || 'https://ldr.netlify.app'

function corScore(s: number) {
  return s >= 7 ? '#0D9E7A' : s >= 5 ? '#EF9F27' : '#E8185A'
}

function barraScore(score: number) {
  const cor = corScore(score)
  const pct = Math.round((score / 10) * 100)
  return `
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;color:#8A9AB0">{label}</span>
        <span style="font-size:16px;font-weight:900;color:${cor}">${score}/10</span>
      </div>
      <div style="height:6px;background:#1E3550;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${cor};border-radius:3px"></div>
      </div>
    </div>
  `
}

serve(async (req) => {
  const payload  = await req.json()
  const solRecord = payload.record as {
    id: string; nome: string; email: string; empresa: string;
    diagnostico_id?: string; status: string;
  }

  if (solRecord.status !== 'aprovado' || !solRecord.diagnostico_id) {
    return new Response('skip', { status: 200 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  const { data: diag } = await supabase
    .from('diagnosticos')
    .select('*')
    .eq('id', solRecord.diagnostico_id)
    .single()

  if (!diag) {
    return new Response('diagnostico not found', { status: 404 })
  }

  const dados = diag.dados as Record<string, unknown> | null
  const frase = diag.frase_diagnostico || ''
  const s1    = diag.score_singularidade || 0
  const s2    = diag.score_consistencia  || 0
  const s3    = diag.score_posicionamento || 0
  const linkPublico = `${BASE_URL}/#/relatorio/${diag.id}`

  const html = `
    <div style="font-family:'Cairo',sans-serif;max-width:620px;margin:0 auto">
      <!-- Header -->
      <div style="background:#0D1B2A;padding:32px;text-align:center;border-radius:12px 12px 0 0">
        <p style="margin:0 0 4px;color:#8A9AB0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em">Brand Intelligence</p>
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;letter-spacing:-0.02em">
          Diagnóstico de Marca
        </h1>
        <p style="margin:8px 0 0;color:#0D9E7A;font-size:15px;font-weight:700">${diag.empresa}</p>
      </div>

      <!-- Frase diagnóstico -->
      <div style="background:#162840;padding:24px 32px;border-left:4px solid #0D9E7A">
        <p style="margin:0;color:#fff;font-size:16px;font-style:italic;line-height:1.6">
          "${frase}"
        </p>
      </div>

      <!-- Scores -->
      <div style="background:#0D1B2A;padding:24px 32px">
        <p style="margin:0 0 16px;color:#8A9AB0;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">
          Scores Smart Branding
        </p>
        ${barraScore(s1).replace('{label}', 'Singularidade')}
        ${barraScore(s2).replace('{label}', 'Consistência')}
        ${barraScore(s3).replace('{label}', 'Posicionamento')}
      </div>

      <!-- CTA Principal -->
      <div style="background:#162840;padding:28px 32px;text-align:center;border-radius:0 0 12px 12px">
        <p style="margin:0 0 20px;color:#8A9AB0;font-size:14px">
          Seu diagnóstico completo está disponível. Agende uma call de 20 min para explorar os insights com nossa equipe.
        </p>
        <a href="${CALENDLY_URL}"
          style="display:inline-block;background:#E8185A;color:#fff;padding:14px 28px;border-radius:8px;font-weight:900;font-size:14px;text-decoration:none;letter-spacing:0.06em;margin-bottom:12px">
          Agendar apresentação de insights →
        </a>
        <br/>
        <a href="${linkPublico}"
          style="display:inline-block;color:#0D9E7A;font-size:12px;text-decoration:none;font-weight:700;margin-top:8px">
          Ver relatório completo →
        </a>
      </div>

      <p style="text-align:center;color:#4A5A6A;font-size:11px;margin-top:20px">
        LOUDR Brand Intelligence · Este é um e-mail transacional automático.
      </p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'LOUDR Intelligence <inteligencia@loudr.com.br>',
      to:   [solRecord.email],
      subject: `Seu diagnóstico de marca está pronto — ${diag.empresa}`,
      html,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
