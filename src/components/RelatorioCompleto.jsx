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
import { Bar }                 from './Bar'
import { PALETTE } from '../lib/theme'
import Chip from "@mui/material/Chip";
import { Card, CardContent } from "@mui/material";

// Selos de impacto/ameaça/prática — Chip do MUI, cor pelo papel semântico.
// (Vinham do componente Pill do design system antigo, já removido.)
const ipill = v =>
  v === 'alto'  ? <Chip size="small" label="impacto alto"  color="success" variant="outlined" /> :
  v === 'medio' ? <Chip size="small" label="impacto médio" color="warning" variant="outlined" /> :
                  <Chip size="small" label="impacto baixo" variant="outlined" />

const apill = v =>
  v === 'alta'  ? <Chip size="small" label="ameaça alta"  color="error"   variant="outlined" /> :
  v === 'media' ? <Chip size="small" label="ameaça média" color="warning" variant="outlined" /> :
                  <Chip size="small" label="ameaça baixa" variant="outlined" />

const ppill = key => {
  const p = PRATICAS.find(p => p.key === key)
  return p ? <Chip size="small" label={p.label} sx={{ bgcolor: p.color + '22', color: p.color, fontWeight: 700 }} /> : null
}


// Território (novo schema): rótulos de confiança + micro-campo de evidência
const CONF_LABEL = { alta: 'Território sólido', media: 'Território promissor', hipotese: 'Hipótese a validar' }
const CONF_BG    = { alta: 'rgba(13,158,122,0.12)', media: 'rgba(239,159,39,0.12)', hipotese: 'rgba(122,136,153,0.14)' }
const CONF_COLOR = { alta: PALETTE.data.positivo, media: PALETTE.data.atencao, hipotese: PALETTE.neutral[400] }

function MicroField({ label, val }) {
  if (!val) return null
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.55 }}>{val}</Typography>
    </Box>
  )
}

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
      `Diagnóstico gerado por BR4NDCODE`,
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25px' }}>
            {onBack
              ? <Button variant="text" onClick={onBack} sx={{ color: 'text.disabled', p: 0, fontWeight: 400, fontSize: 13, textTransform: 'none', minWidth: 0 }}>{backLabel}</Button>
              : <Box />
            }
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '1.25px', flexWrap: 'wrap' }}>
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
          Brand Intelligence Report · BR4NDCODE
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
      <Card variant="outlined" sx={{ mb: '14px' }}><CardContent>
        <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Resumo executivo</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.8 }}>
          {data.resumo_executivo}
        </Typography>
      </CardContent></Card>

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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '1.5px', mb: 1.25 }}>
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
                      Caminho a explorar
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
          <Card variant="outlined" key={s.key}><CardContent>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 1.25 }}>{s.desc}</Typography>
            <Bar score={data[s.key]} color={sc(data[s.key])} />
          </CardContent></Card>
        ))}
      </Box>

      {/* Identidade declarada / percebida */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '10px', mb: '14px' }}>
        {[
          { label: 'Identidade declarada', key: 'identidade_declarada', accent: PALETTE.data.positivo },
          { label: 'Identidade percebida', key: 'identidade_percebida', accent: PALETTE.data.critico },
        ].map(b => (
          <Card variant="outlined" key={b.key} sx={{ borderTop: `3px solid ${b.accent}` }}><CardContent>
            <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>{b.label}</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7 }}>{data[b.key]}</Typography>
          </CardContent></Card>
        ))}
      </Box>

      {/* Gap de identidade */}
      <Box sx={{ bgcolor: 'rgba(239,159,39,0.08)', borderLeft: `4px solid ${PALETTE.data.atencao}`, p: '16px 20px', mb: '14px' }}>
        <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Gap de identidade</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7 }}>{data.gap_identidade}</Typography>
      </Box>

      {/* Territórios possíveis (novo) — fallback pro território único (legado) */}
      {data.territorios_possiveis?.length > 0 ? (
        <Box sx={{ mb: '14px' }}>
          <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
            Territórios possíveis para explorar
          </Typography>
          {data.territorios_possiveis.map((t, i) => (
            <Box key={i} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: 'primary.main', p: '18px 22px', mb: '10px' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 900, color: 'text.primary' }}>{t.nome}</Typography>
                {t.confianca && (
                  <Chip size="small" label={CONF_LABEL[t.confianca] || t.confianca} sx={{ bgcolor: CONF_BG[t.confianca] || CONF_BG.hipotese, color: CONF_COLOR[t.confianca] || CONF_COLOR.hipotese, fontWeight: 700 }} />
                )}
              </Box>
              {t.tese && (
                <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7, mb: 1.25 }}>{t.tese}</Typography>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '10px 24px' }}>
                <MicroField label="Sustenta" val={t.sustenta} />
                <MicroField label="Diferencia porque" val={t.diferencia} />
                <MicroField label="Fit com o público" val={t.fit_publico} />
                <MicroField label="Tensão / trade-off" val={t.tensao} />
              </Box>
              {t.exploracao && (
                <Box sx={{ borderLeft: '2px solid', borderLeftColor: 'primary.main', pl: 1.5, mt: 1.25 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.375 }}>A explorar</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.6 }}>{t.exploracao}</Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      ) : data.territorio_inexplorado ? (
        <Box sx={{ bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'primary.main', p: '20px 24px', mb: '14px' }}>
          <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Território inexplorado</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.7 }}>
            {data.territorio_inexplorado}
          </Typography>
        </Box>
      ) : null}

      {/* Pergunta provocativa */}
      {data.pergunta_provocativa && (
        <Box sx={{ bgcolor: 'rgba(232,24,90,0.06)', borderLeft: '4px solid', borderLeftColor: 'secondary.main', p: '16px 20px', mb: '14px' }}>
          <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Se essa marca sumisse amanhã...</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7 }}>{data.pergunta_provocativa}</Typography>
        </Box>
      )}

      {/* Concorrentes */}
      {data.concorrentes?.length > 0 && (
        <Card variant="outlined" sx={{ mb: '14px' }}><CardContent>
          <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Contexto competitivo</Typography>
          {data.concorrentes.map((c, i) => (
            <Box key={i}>
              <Box sx={{ display: 'flex', gap: '1.5px', py: 1, alignItems: 'flex-start' }}>
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
        </CardContent></Card>
      )}

      {/* Oportunidades estratégicas */}
      {data.oportunidades?.length > 0 && (
        <Box sx={{ mb: '14px' }}>
          <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
            Oportunidades estratégicas
          </Typography>
          {data.oportunidades.map((op, i) => (
            <Card variant="outlined" key={i} sx={{ mb: '10px' }}><CardContent>
              <Box sx={{ display: 'flex', gap: '14px' }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'background.default', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                  {i + 1}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.75, alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{op.titulo}</Typography>
                    {op.pratica_loudr && ppill(op.pratica_loudr)}
                    {ipill(op.impacto)}
                    <Chip size="small" label={op.prazo} sx={{ bgcolor: "rgba(13,158,122,0.12)", color: PALETTE.data.positivo, fontWeight: 700 }} />
                  </Box>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>{op.descricao}</Typography>
                </Box>
              </Box>
            </CardContent></Card>
          ))}
        </Box>
      )}

      {/* Quick wins */}
      {data.quick_wins?.length > 0 && (
        <Box sx={{ bgcolor: 'rgba(13,158,122,0.08)', borderLeft: '4px solid', borderLeftColor: 'primary.main', p: '16px 20px', mb: '14px' }}>
          <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Quick wins</Typography>
          {data.quick_wins.map((qw, i) => (
            <Box key={i} sx={{ display: 'flex', gap: '1.25px', mb: 1 }}>
              <Typography sx={{ color: 'primary.main', fontWeight: 900, lineHeight: 1.5 }}>→</Typography>
              <Typography sx={{ fontSize: 13, color: 'primary.main', fontWeight: 600, lineHeight: 1.5 }}>{qw}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Por onde começar a explorar */}
      {data.porta_entrada_loudr && (
        <Box sx={{ bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'primary.main', p: '16px 20px', mb: '14px' }}>
          <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Por onde começar a explorar</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7 }}>
            {data.porta_entrada_loudr}
          </Typography>
        </Box>
      )}

      {/* Próximo passo CTA */}
      <Box sx={{ bgcolor: 'background.default', p: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2.5px', flexWrap: 'wrap', mb: '14px', border: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Próximo passo</Typography>
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
          Falar com a BR4NDCODE →
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
