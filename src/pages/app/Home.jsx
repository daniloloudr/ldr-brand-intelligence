import { useState, useEffect, useCallback } from 'react'
import Box            from '@mui/material/Box'
import Typography     from '@mui/material/Typography'
import Card           from '@mui/material/Card'
import CardContent    from '@mui/material/CardContent'
import Button         from '@mui/material/Button'
import Chip           from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Divider        from '@mui/material/Divider'
import Alert          from '@mui/material/Alert'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'

import { useWorkspace }      from '../../lib/WorkspaceContext'
import { supabase }          from '../../lib/supabase'
import { PRATICAS, PLANOS }  from '../../lib/constants'
import { fmtDate }           from '../../lib/helpers'
import { IdentityGapCard }   from '../../components/intelligence/IdentityGapCard'
import { PageHeader }        from '../../components/shell/PageHeader'

/* ── helpers ─────────────────────────────────────────────────────── */

function scoreColor(s) {
  if (s >= 7) return 'success.main'
  if (s >= 5) return 'warning.main'
  return 'secondary.main'
}
function scoreHex(s) {
  if (s >= 7) return '#0D9E7A'
  if (s >= 5) return '#EF9F27'
  return '#E8185A'
}
function scoreLabel(s) {
  if (s >= 7) return 'Sólido'
  if (s >= 5) return 'Em desenvolvimento'
  return 'Crítico'
}
function alertColor(sev) {
  if (sev === 'critical' || sev === 'error') return '#E8185A'
  if (sev === 'warning') return '#EF9F27'
  if (sev === 'success') return '#0D9E7A'
  return '#96AABF'
}

/* ── RadarPilares ────────────────────────────────────────────────── */

function RadarPilares({ singularidade, consistencia, posicionamento }) {
  const data = [
    { subject: 'Singularidade',  value: singularidade  ?? 0 },
    { subject: 'Consistência',   value: consistencia   ?? 0 },
    { subject: 'Posicionamento', value: posicionamento ?? 0 },
  ]
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 0 }}>
      <CardContent>
        <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
          Radar de pilares
        </Typography>
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#8A9AB0', fontSize: 11, fontWeight: 700 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.18} dot={{ fill: '#7F77DD', r: 3 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/* ── SentimentDonut ──────────────────────────────────────────────── */

const DONUT_COLORS = { positivo: '#0D9E7A', neutro: '#EF9F27', negativo: '#E8185A' }

function SentimentDonut({ sentimento }) {
  if (!sentimento) return null
  const slices = [
    { name: 'Positivo', value: sentimento.positivo ?? 0, color: DONUT_COLORS.positivo },
    { name: 'Neutro',   value: sentimento.neutro   ?? 0, color: DONUT_COLORS.neutro   },
    { name: 'Negativo', value: sentimento.negativo ?? 0, color: DONUT_COLORS.negativo  },
  ].filter(s => s.value > 0)

  if (slices.length === 0) return null

  const dominant = slices.reduce((a, b) => a.value > b.value ? a : b)

  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 0 }}>
      <CardContent>
        <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
          Sentimento público
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={slices} cx={55} cy={55} innerRadius={36} outerRadius={54} dataKey="value" stroke="none">
                  {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#1A2436', border: 'none', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: dominant.color, lineHeight: 1 }}>
                {dominant.value}%
              </Typography>
              <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dominant.name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {slices.map(s => (
              <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>
                  {s.name} <span style={{ color: s.color, fontWeight: 900 }}>{s.value}%</span>
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

/* ── ScoreCard ───────────────────────────────────────────────────── */

function ScoreCard({ label, value }) {
  const hex = scoreHex(value ?? 0)
  const pct = Math.round(((value ?? 0) / 10) * 100)
  return (
    <Card variant="outlined" sx={{ flex: 1, borderTop: `2px solid ${hex}`, borderRadius: 0 }}>
      <CardContent>
        <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
          <Typography sx={{ fontSize: 'clamp(48px,5vw,68px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: hex }}>
            {value ?? '—'}
          </Typography>
          <Typography sx={{ fontSize: 16, color: 'text.disabled', fontWeight: 400 }}>/10</Typography>
        </Box>
        <Chip
          label={scoreLabel(value ?? 0)}
          size="small"
          sx={{ background: hex + '18', color: hex, fontWeight: 700, fontSize: '0.625rem', height: 20, mb: 1.5 }}
        />
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ height: 2, backgroundColor: 'divider', '& .MuiLinearProgress-bar': { backgroundColor: hex } }}
        />
      </CardContent>
    </Card>
  )
}

/* ── AlertRow ────────────────────────────────────────────────────── */

function AlertRow({ alerta, onMarkRead }) {
  const [loading, setLoading] = useState(false)
  async function mark() {
    setLoading(true)
    await supabase.from('alertas').update({ lido: true }).eq('id', alerta.id)
    onMarkRead(alerta.id)
    setLoading(false)
  }
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1.5,
      p: '12px 16px', border: '1px solid', borderColor: 'divider',
      opacity: alerta.lido ? 0.4 : 1, transition: 'opacity 0.3s',
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: alertColor(alerta.severidade), flexShrink: 0, mt: '6px' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.25 }}>
          {alerta.titulo}
        </Typography>
        {alerta.descricao && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{alerta.descricao}</Typography>
        )}
        <Typography variant="overline" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
          {fmtDate(alerta.created_at)}
        </Typography>
      </Box>
      {!alerta.lido && (
        <Button size="small" variant="outlined" onClick={mark} disabled={loading} sx={{ ml: 'auto', flexShrink: 0, alignSelf: 'center', minWidth: 0 }}>
          {loading ? '...' : 'Lido'}
        </Button>
      )}
    </Box>
  )
}

/* ── SectionTitle ────────────────────────────────────────────────── */

function SectionTitle({ children }) {
  return (
    <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.5, mt: 3.5, pt: 3.5, borderTop: '1px solid', borderColor: 'divider' }}>
      {children}
    </Typography>
  )
}

/* ── Home ────────────────────────────────────────────────────────── */

export function Home() {
  const { workspace }         = useWorkspace()
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')
  const [diag, setDiag]             = useState(null)
  const [alertas, setAlertas]       = useState([])
  const [sentimento, setSentimento] = useState(null)

  const load = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)
    setLoadError('')
    try {
      const [{ data: d, error: e1 }, { data: a, error: e2 }, { data: s, error: e3 }] = await Promise.all([
        supabase.from('diagnosticos').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('alertas').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('sentiment_snapshots').select('avg_positivo,avg_neutro,avg_negativo').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).single(),
      ])
      // PGRST116 = no rows found from .single() — expected when no data exists yet
      const realErr = [e1, e2, e3].find(e => e && e.code !== 'PGRST116')
      if (realErr) throw new Error(realErr.message)
      setDiag(d ?? null)
      setAlertas(a ?? [])
      if (s) setSentimento({ positivo: Math.round(s.avg_positivo ?? 0), neutro: Math.round(s.avg_neutro ?? 0), negativo: Math.round(s.avg_negativo ?? 0) })
    } catch (e) {
      setLoadError('Erro ao carregar o dashboard. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [workspace?.id])

  useEffect(() => { load() }, [load])

  function markRead(id) {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a))
  }

  const planoNome     = PLANOS[workspace?.plano]?.nome ?? 'Trial'
  const dados         = diag ? { ...diag, ...(diag.dados || diag.data || {}) } : null
  const oportunidades = Array.isArray(dados?.oportunidades) ? dados.oportunidades.slice(0, 3) : []

  return (
    <Box>
      <PageHeader
        title={workspace?.nome || 'Home'}
        subtitle={`Plano ${planoNome}${diag ? ` · último diagnóstico ${fmtDate(diag.created_at)}` : ' · nenhum diagnóstico gerado'}`}
      />
      <Box sx={{ p: { xs: '24px 20px 60px', md: '32px 52px 80px' }, maxWidth: 1060 }}>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setLoadError('')}>
          {loadError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="primary" size={32} />
        </Box>
      ) : !diag ? (
        /* ── Empty state ── */
        <Box sx={{ border: '1px dashed', borderColor: 'divider', p: '60px 32px', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary', mb: 1 }}>
            Nenhum diagnóstico ainda
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Gere o primeiro diagnóstico e descubra oportunidades de crescimento.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => { window.location.hash = '#/app/diagnostico' }}
          >
            Gerar primeiro diagnóstico →
          </Button>
        </Box>
      ) : (
        <>
          {/* ── Score cards ── */}
          <Box sx={{ display: 'flex', gap: '2px', mb: '2px', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <ScoreCard label="Singularidade"  value={diag.score_singularidade} />
            <ScoreCard label="Consistência"   value={diag.score_consistencia} />
            <ScoreCard label="Posicionamento" value={diag.score_posicionamento} />
          </Box>

          {/* ── Charts row ── */}
          <Box sx={{ display: 'flex', gap: '2px', mt: '2px', mb: '2px', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <RadarPilares
              singularidade={diag.score_singularidade}
              consistencia={diag.score_consistencia}
              posicionamento={diag.score_posicionamento}
            />
            {sentimento && <SentimentDonut sentimento={sentimento} />}
          </Box>

          {/* ── Frase diagnóstico ── */}
          {dados?.frase_diagnostico && (
            <Box sx={{
              bgcolor: 'background.paper',
              border: '1px solid', borderColor: 'divider',
              borderLeft: '3px solid', borderLeftColor: 'primary.main',
              p: '20px 24px', mb: 4, mt: '2px',
            }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600, fontStyle: 'italic', color: '#E8ECF0', lineHeight: 1.6, mb: 0.75 }}>
                "{dados.frase_diagnostico}"
              </Typography>
              {dados.empresa && (
                <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                  {dados.empresa}
                </Typography>
              )}
            </Box>
          )}

          {/* ── Oportunidades ── */}
          {oportunidades.length > 0 && (
            <>
              <SectionTitle>Top 3 oportunidades</SectionTitle>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {oportunidades.map((op, i) => {
                  const pratica = PRATICAS.find(p => p.key === op.pratica_loudr)
                  return (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex', alignItems: 'flex-start', gap: 2,
                        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                        p: '16px 20px',
                        '&:hover': { bgcolor: 'background.default' },
                        transition: 'background 0.15s',
                      }}
                    >
                      <Box sx={{
                        fontSize: 11, fontWeight: 900, color: 'text.disabled',
                        bgcolor: 'background.default', width: 24, height: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                          {op.titulo}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.55, mb: 1 }}>
                          {op.descricao}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {op.impacto && (
                            <Chip label={`Impacto ${op.impacto}`} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700,
                              bgcolor: op.impacto === 'alto' ? 'rgba(232,24,90,0.1)' : op.impacto === 'medio' ? 'rgba(239,159,39,0.1)' : 'rgba(122,136,153,0.1)',
                              color:   op.impacto === 'alto' ? '#E8185A' : op.impacto === 'medio' ? '#EF9F27' : '#96AABF',
                            }} />
                          )}
                          {op.prazo && (
                            <Chip label={op.prazo} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, bgcolor: 'rgba(13,158,122,0.1)', color: 'primary.main' }} />
                          )}
                          {pratica && (
                            <Chip label={pratica.label} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, bgcolor: pratica.color + '18', color: pratica.color }} />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </>
          )}

          {/* ── Identity Gap ── */}
          <SectionTitle>Identity Gap</SectionTitle>
          <IdentityGapCard workspaceId={workspace?.id} compact />

          {/* ── Alertas ── */}
          <SectionTitle>Alertas recentes</SectionTitle>
          {alertas.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '14px 16px', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>Nenhum alerta — tudo certo.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {alertas.map(a => <AlertRow key={a.id} alerta={a} onMarkRead={markRead} />)}
            </Box>
          )}

          {/* ── CTA ── */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 4, mt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={() => { window.location.hash = '#/app/diagnostico' }}
            >
              Gerar novo diagnóstico →
            </Button>
          </Box>
        </>
      )}
      </Box>
    </Box>
  )
}
