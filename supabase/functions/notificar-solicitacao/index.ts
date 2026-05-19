import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const LOUDR_EMAIL    = 'inteligencia@loudr.com.br'

serve(async (req) => {
  const payload = await req.json()
  const record  = payload.record as {
    nome: string; email: string; empresa: string;
    site?: string; setor?: string; porte?: string;
    cargo?: string; contexto?: string; score_qualificacao?: number;
    created_at: string;
  }

  const score = record.score_qualificacao ?? 0
  const corScore = score >= 70 ? '#0D9E7A' : score >= 40 ? '#EF9F27' : '#E8185A'

  const html = `
    <div style="font-family:'Cairo',sans-serif;max-width:600px;margin:0 auto;background:#0D1B2A;color:#fff;border-radius:12px;overflow:hidden">
      <div style="background:#162840;padding:24px 32px;border-bottom:1px solid #1E3550">
        <h2 style="margin:0;font-size:18px;font-weight:900;letter-spacing:-0.01em">
          Nova solicitação de diagnóstico
        </h2>
        <p style="margin:4px 0 0;color:#8A9AB0;font-size:13px">
          ${new Date(record.created_at).toLocaleString('pt-BR')}
        </p>
      </div>
      <div style="padding:32px">
        <div style="display:inline-block;background:${corScore}20;border:1px solid ${corScore};border-radius:8px;padding:8px 16px;margin-bottom:24px">
          <span style="color:${corScore};font-weight:900;font-size:20px">${score}</span>
          <span style="color:${corScore};font-size:12px;margin-left:4px">pts — score de qualificação</span>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px 0;color:#8A9AB0;font-size:12px;width:140px">Nome</td>
            <td style="padding:8px 0;font-weight:700">${record.nome}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#8A9AB0;font-size:12px">E-mail</td>
            <td style="padding:8px 0;font-weight:700">${record.email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#8A9AB0;font-size:12px">Empresa</td>
            <td style="padding:8px 0;font-weight:700">${record.empresa}</td>
          </tr>
          ${record.cargo ? `<tr><td style="padding:8px 0;color:#8A9AB0;font-size:12px">Cargo</td><td style="padding:8px 0">${record.cargo}</td></tr>` : ''}
          ${record.setor ? `<tr><td style="padding:8px 0;color:#8A9AB0;font-size:12px">Setor</td><td style="padding:8px 0">${record.setor}</td></tr>` : ''}
          ${record.porte ? `<tr><td style="padding:8px 0;color:#8A9AB0;font-size:12px">Porte</td><td style="padding:8px 0">${record.porte}</td></tr>` : ''}
          ${record.site ? `<tr><td style="padding:8px 0;color:#8A9AB0;font-size:12px">Site</td><td style="padding:8px 0"><a href="${record.site}" style="color:#0D9E7A">${record.site}</a></td></tr>` : ''}
        </table>
        ${record.contexto ? `
        <div style="margin-top:20px;background:#162840;border-radius:8px;padding:16px;border-left:3px solid #0D9E7A">
          <p style="margin:0 0 6px;color:#8A9AB0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em">Contexto</p>
          <p style="margin:0;font-size:14px;line-height:1.6">${record.contexto}</p>
        </div>
        ` : ''}
        <div style="margin-top:28px">
          <a href="https://ldr.netlify.app/#/admin"
            style="display:inline-block;background:#0D9E7A;color:#fff;padding:12px 24px;border-radius:8px;font-weight:900;font-size:13px;text-decoration:none;letter-spacing:0.06em">
            Ver na fila de aprovação →
          </a>
        </div>
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'LOUDR Intelligence <noreply@loudr.com.br>',
      to:   [LOUDR_EMAIL],
      subject: `Nova solicitação: ${record.empresa} (score ${score})`,
      html,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
