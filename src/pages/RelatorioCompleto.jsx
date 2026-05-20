import { useState } from 'react'
import Box             from '@mui/material/Box'
import Typography      from '@mui/material/Typography'
import Button          from '@mui/material/Button'
import TextField       from '@mui/material/TextField'
import Divider         from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'

import { PRATICAS }            from '../lib/constants'
import { fmtDate, sc }         from '../lib/helpers'
import { gerarPDF }            from '../lib/pdf'
import { Bar }                 from '../components/Bar'
import { Pill, ipill, apill, ppill } from '../components/Pill'
import { Lbl }                 from '../components/Lbl'
import { Card }                from '../components/Card'

function SharePanel({ meta, data }) {
  const [copied, setCopied]         = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError]     = useState('')
  const shareUrl = window.location.href.split('#')[0] + '#/relatorio/' + meta.id

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  async function downloadPDF() {
    setPdfLoading(true)
    setPdfError('')
    try {
      await gerarPDF(data, meta)
    } catch {
      setPdfError('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setPdfLoading(false)
    }
  }

  function sendEmail() {
    const subject = `Diagnóstico de Marca: ${data.empresa}`
    const body = [
      `Diagnóstico Smart Branding — ${data.empresa}`,
      ``,
      `"${data.frase_diagnostico}"`,
      ``,
      `SCORES`,
      `• Singularidade:  ${data.score_singularidade}/10`,
      `• Consistência:   ${data.score_consistencia}/10`,
      `• Posicionamento: ${data.score_posicionamento}/10`,
      ``,
      `RESUMO`,
      data.resumo_executivo,
      ``,
      `─────────────────────────────`,
      `Ver relatório completo:`,
      shareUrl,
      ``,
      `Diagnóstico gerado por LOUDR Brand Intelligence`,
      `loudr.com.br`,
    ].join('\n')
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  return (
    <Box sx={{ bgcolor: 'background.default', p: '16px 20px', mb: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 1.5 }}>
        Compartilhar relatório
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
        <TextField
          fullWidth
          size="small"
          value={shareUrl}
          onFocus={e => e.target.select()}
          inputProps={{ readOnly: true }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Button
          variant="contained"
          color={copied ? 'primary' : 'inherit'}
          onClick={copyLink}
          sx={{ flexShrink: 0, borderRadius: 0, fontWeight: 700 }}
        >
          {copied ? 'Copiado ✓' : 'Copiar link'}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" onClick={sendEmail}>
          Enviar por e-mail →
        </Button>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={downloadPDF}
          disabled={pdfLoading}
          startIcon={pdfLoading ? <CircularProgress size={10} color="inherit" /> : null}
        >
          {pdfLoading ? 'Gerando PDF...' : '↓ Baixar PDF (.pdf)'}
        </Button>
      </Box>
      {pdfError && (
        <Typography sx={{ fontSize: 11, color: 'error.main', mt: 1 }}>{pdfError}</Typography>
      )}
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1.25, lineHeight: 1.5 }}>
        Qualquer pessoa com o link pode visualizar este relatório.
      </Typography>
    </Box>
  )
}

export function RelatorioCompleto({ data, onBack, backLabel = '← Voltar', meta = null, hideHero = false }) {
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <Box>
      {meta && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.25 }}>
            {onBack
              ? <Button variant="text" onClick={onBack} sx={{ color: 'text.disabled', p: 0, fontWeight: 400, fontSize: 13, textTransform: 'none', minWidth: 0 }}>{backLabel}</Button>
              : <Box />
            }
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {meta.created_at && fmtDate(meta.created_at)}{meta.user_name && ` · por ${meta.user_name}`}
              </Typography>
              {meta.id && (
                <Button variant="outlined" size="small" onClick={() => setShareOpen(o => !o)} sx={{ fontSize: 12, fontWeight: 600 }}>
                  {shareOpen ? '✕ Fechar' : 'Compartilhar →'}
                </Button>
              )}
            </Box>
          </Box>
          {shareOpen && meta.id && (
            <Box sx={{ mt: 1.5 }}>
              <SharePanel meta={meta} data={data} />
            </Box>
          )}
        </Box>
      )}

      {/* Hero */}
      {!hideHero && <Box className="a0" sx={{ bgcolor: 'background.default', p: '30px 34px', mb: '14px', position: 'relative', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ position: 'absolute', right: -24, top: -24, width: 200, height: 200, borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.05 }} />
        <Box sx={{ width: 14, height: 14, bgcolor: 'secondary.main', mb: 2 }} />
        <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 1 }}>
          Brand Intelligence Report · LOUDR
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.03em', color: 'text.primary', mb: 0.5 }}>
          {data.empresa}
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
          {data.setor} · {data.porte} · {data.dominio}
        </Typography>
        {data.momento_atual && (
          <Typography sx={{ fontSize: 13, color: 'text.disabled', mb: 2, fontStyle: 'italic' }}>
            {data.momento_atual}
          </Typography>
        )}
        <Box sx={{ borderLeft: '3px solid', borderLeftColor: 'primary.main', pl: 2 }}>
          <Typography sx={{ fontStyle: 'italic', fontSize: 14, color: 'text.secondary', lineHeight: 1.65 }}>
            "{data.frase_diagnostico}"
          </Typography>
        </Box>
      </Box>}

      {/* Resumo executivo */}
      <Card sx={{ mb: '14px' }}>
        <Lbl>Resumo executivo</Lbl>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.8 }}>
          {data.resumo_executivo}
        </Typography>
      </Card>

      {/* Diagnóstico por prática */}
      <Box sx={{ mb: '14px' }}>
        <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
          Diagnóstico por prática Smart Branding
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '10px' }}>
          {PRATICAS.map(p => {
            const pr = data.praticas_loudr?.[p.key]
            if (!pr) return null
            return (
              <Box key={p.key} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderTop: `3px solid ${p.color}`, p: '18px 20px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, mb: 1.25 }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>{p.label}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{p.sub}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 80 }}>
                    <Bar score={pr.score} color={p.color} />
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, mb: 1 }}>
                  {pr.diagnostico}
                </Typography>
                {pr.evidencias && (
                  <Box sx={{ bgcolor: 'action.hover', p: '8px 12px', mb: 1 }}>
                    <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>Evidências</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>{pr.evidencias}</Typography>
                  </Box>
                )}
                {pr.oportunidade && (
                  <Box sx={{ borderLeft: `2px solid ${p.color}`, pl: 1.25 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', mb: 0.375 }}>
                      O que a LOUDR faria
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>{pr.oportunidade}</Typography>
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* Scores */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', mb: '14px' }}>
        {[
          { label: 'Singularidade',  key: 'score_singularidade',  desc: 'Diferenciação' },
          { label: 'Consistência',   key: 'score_consistencia',   desc: 'Coerência'     },
          { label: 'Posicionamento', key: 'score_posicionamento', desc: 'Clareza'       },
        ].map(s => (
          <Card key={s.key}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 1.25 }}>{s.desc}</Typography>
            <Bar score={data[s.key]} color={sc(data[s.key])} />
          </Card>
        ))}
      </Box>

      {/* Identidade declarada / percebida */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '10px', mb: '14px' }}>
        {[
          { label: 'Identidade declarada', key: 'identidade_declarada', accent: '#0D9E7A' },
          { label: 'Identidade percebida', key: 'identidade_percebida', accent: '#E8185A' },
        ].map(b => (
          <Card key={b.key} sx={{ borderTop: `3px solid ${b.accent}` }}>
            <Lbl color={b.accent}>{b.label}</Lbl>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7 }}>{data[b.key]}</Typography>
          </Card>
        ))}
      </Box>

      {/* Gap de identidade */}
      <Box sx={{ bgcolor: 'rgba(239,159,39,0.08)', borderLeft: '4px solid #EF9F27', p: '16px 20px', mb: '14px' }}>
        <Lbl color="#EF9F27">Gap de identidade</Lbl>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7 }}>{data.gap_identidade}</Typography>
      </Box>

      {/* Território inexplorado */}
      <Box sx={{ bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'primary.main', p: '20px 24px', mb: '14px' }}>
        <Lbl>Território inexplorado</Lbl>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.7 }}>
          {data.territorio_inexplorado}
        </Typography>
      </Box>

      {/* Pergunta provocativa */}
      {data.pergunta_provocativa && (
        <Box sx={{ bgcolor: 'rgba(232,24,90,0.06)', borderLeft: '4px solid', borderLeftColor: 'secondary.main', p: '16px 20px', mb: '14px' }}>
          <Lbl color="#E8185A">Se essa marca sumisse amanhã...</Lbl>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7 }}>{data.pergunta_provocativa}</Typography>
        </Box>
      )}

      {/* Concorrentes */}
      {data.concorrentes?.length > 0 && (
        <Card sx={{ mb: '14px' }}>
          <Lbl color="text.disabled">Contexto competitivo</Lbl>
          {data.concorrentes.map((c, i) => (
            <Box key={i}>
              <Box sx={{ display: 'flex', gap: 1.5, py: 1, alignItems: 'flex-start' }}>
                <Box sx={{ width: 170, minWidth: 170, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{c.nome}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{c.diferencial}</Typography>
                  {c.sinal && (
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic', mt: 0.5 }}>↳ {c.sinal}</Typography>
                  )}
                </Box>
                <Box sx={{ flexShrink: 0 }}>{apill(c.ameaca)}</Box>
              </Box>
              {i < data.concorrentes.length - 1 && <Divider />}
            </Box>
          ))}
        </Card>
      )}

      {/* Oportunidades estratégicas */}
      {data.oportunidades?.length > 0 && (
        <Box sx={{ mb: '14px' }}>
          <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
            Oportunidades estratégicas
          </Typography>
          {data.oportunidades.map((op, i) => (
            <Card key={i} sx={{ mb: '10px' }}>
              <Box sx={{ display: 'flex', gap: '14px' }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'background.default', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                  {i + 1}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.75, alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{op.titulo}</Typography>
                    {op.pratica_loudr && ppill(op.pratica_loudr)}
                    {ipill(op.impacto)}
                    <Pill bg="rgba(13,158,122,0.12)" color="#0D9E7A">{op.prazo}</Pill>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>{op.descricao}</Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Quick wins */}
      {data.quick_wins?.length > 0 && (
        <Box sx={{ bgcolor: 'rgba(13,158,122,0.08)', borderLeft: '4px solid', borderLeftColor: 'primary.main', p: '16px 20px', mb: '14px' }}>
          <Lbl>Quick wins</Lbl>
          {data.quick_wins.map((qw, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.25, mb: 1 }}>
              <Typography sx={{ color: 'primary.main', fontWeight: 900, lineHeight: 1.5 }}>→</Typography>
              <Typography sx={{ fontSize: 13, color: 'primary.main', fontWeight: 600, lineHeight: 1.5 }}>{qw}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Porta de entrada */}
      {data.porta_entrada_loudr && (
        <Box sx={{ bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'primary.main', p: '16px 20px', mb: '14px' }}>
          <Lbl>Porta de entrada LOUDR</Lbl>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7 }}>
            {data.porta_entrada_loudr}
          </Typography>
        </Box>
      )}

      {/* Próximo passo CTA */}
      <Box sx={{ bgcolor: 'background.default', p: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, flexWrap: 'wrap', mb: '14px', border: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Lbl>Próximo passo</Lbl>
          <Typography sx={{ fontSize: 16, fontWeight: 900, color: 'text.primary', mb: 0.75 }}>
            Esse diagnóstico é só o começo.
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, maxWidth: 400 }}>
            Um Brand Discovery Sprint aprofunda cada ponto e entrega um roadmap completo.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => window.open('https://loudr.com.br', '_blank')}
          sx={{ borderRadius: 0 }}
        >
          Falar com a LOUDR →
        </Button>
      </Box>

      {onBack && (
        <Button variant="outlined" onClick={onBack} sx={{ borderRadius: 0 }}>
          {backLabel}
        </Button>
      )}
    </Box>
  )
}
