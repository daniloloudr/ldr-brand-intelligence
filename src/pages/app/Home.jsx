import { useState, useEffect, useCallback } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, LinearProgress,
  Chip, Button, Paper, CircularProgress, Divider,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CheckCircleIcon   from '@mui/icons-material/CheckCircle'
import WarningIcon       from '@mui/icons-material/Warning'
import ErrorIcon         from '@mui/icons-material/Error'
import InfoIcon          from '@mui/icons-material/Info'
import TrendingUpIcon    from '@mui/icons-material/TrendingUpOutlined'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'

import { useWorkspace }  from '../../lib/WorkspaceContext'
import { supabase }      from '../../lib/supabase'
import { PRATICAS, PLANOS } from '../../lib/constants'
import { fmtDate }       from '../../lib/helpers'

/* ─── helpers ─────────────────────────────────────────────────── */

function scoreColor(s) {
  if (s >= 7) return 'primary.main'   // green
  if (s >= 5) return 'warning.main'   // amber
  return 'secondary.main'             // pink
}

function scoreLabel(s) {
  if (s >= 7) return 'Sólido'
  if (s >= 5) return 'Em desenvolvimento'
  return 'Crítico'
}

function alertIcon(severity) {
  if (severity === 'error')   return <ErrorIcon   fontSize="small" sx={{ color: 'secondary.main' }} />
  if (severity === 'warning') return <WarningIcon  fontSize="small" sx={{ color: 'warning.main'  }} />
  if (severity === 'info')    return <InfoIcon     fontSize="small" sx={{ color: 'info.main'     }} />
  return                             <NotificationsIcon fontSize="small" sx={{ color: 'primary.main'}} />
}

function impactoColor(impacto) {
  if (impacto === 'alto')  return 'secondary'
  if (impacto === 'medio') return 'warning'
  return 'default'
}

function prazoColor(prazo) {
  if (!prazo) return 'default'
  const p = prazo.toLowerCase()
  if (p.includes('imediato')) return 'error'
  if (p.includes('curto'))    return 'warning'
  return 'default'
}

/* ─── sub-components ──────────────────────────────────────────── */

function ScoreCard({ label, value }) {
  const pct    = Math.round((value / 10) * 100)
  const color  = scoreColor(value)
  const status = scoreLabel(value)

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* accent line */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        bgcolor: color,
      }} />
      <CardContent sx={{ pt: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}
          textTransform="uppercase" letterSpacing="0.08em">
          {label}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1, mb: 0.5 }}>
          <Typography
            sx={{
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1,
              color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>/10</Typography>
        </Box>

        <Chip
          label={status}
          size="small"
          sx={{
            mb: 1.5,
            bgcolor: color,
            color: '#fff',
            fontWeight: 700,
            fontSize: 10,
            height: 20,
          }}
        />

        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'divider',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
          }}
        />
      </CardContent>
    </Card>
  )
}

function AlertRow({ alerta, onMarkRead }) {
  const [loading, setLoading] = useState(false)

  async function markRead() {
    setLoading(true)
    await supabase
      .from('alertas')
      .update({ lido: true })
      .eq('id', alerta.id)
    onMarkRead(alerta.id)
    setLoading(false)
  }

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.5,
      py: 1.5,
      px: 2,
      borderRadius: 2,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      opacity: alerta.lido ? 0.5 : 1,
      transition: 'opacity 0.3s',
    }}>
      <Box sx={{ mt: 0.25 }}>{alertIcon(alerta.severidade)}</Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontSize={13} fontWeight={700} noWrap>{alerta.titulo}</Typography>
        {alerta.descricao && (
          <Typography fontSize={12} color="text.secondary" sx={{ mt: 0.25 }}>
            {alerta.descricao}
          </Typography>
        )}
        <Typography fontSize={10} color="text.disabled" sx={{ mt: 0.5 }}>
          {fmtDate(alerta.created_at)}
        </Typography>
      </Box>

      {!alerta.lido && (
        <Button
          size="small"
          variant="outlined"
          onClick={markRead}
          disabled={loading}
          startIcon={<CheckCircleIcon />}
          sx={{
            fontSize: 11,
            px: 1,
            py: 0.25,
            minWidth: 'unset',
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': { bgcolor: 'primary.main', color: '#fff' },
            whiteSpace: 'nowrap',
          }}
        >
          Lido
        </Button>
      )}
    </Box>
  )
}

/* ─── main component ──────────────────────────────────────────── */

export function Home() {
  const { workspace } = useWorkspace()

  const [loading,       setLoading]       = useState(true)
  const [diagnostico,   setDiagnostico]   = useState(null)
  const [alertas,       setAlertas]       = useState([])

  const load = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)

    const [{ data: diag }, { data: alts }] = await Promise.all([
      supabase
        .from('diagnosticos')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('alertas')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    setDiagnostico(diag ?? null)
    setAlertas(alts ?? [])
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => { load() }, [load])

  function handleMarkRead(id) {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a))
  }

  /* ── loading ── */
  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  const dados       = diagnostico?.dados ?? null
  const oportunidades = Array.isArray(dados?.oportunidades) ? dados.oportunidades.slice(0, 3) : []
  const planoNome   = PLANOS[workspace?.plano]?.nome ?? workspace?.plano ?? 'Trial'

  /* ── no diagnostics yet ── */
  if (!diagnostico) {
    return (
      <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 560 }}>
        <Typography variant="h4" fontWeight={900} sx={{ mb: 1 }}>
          Bom dia, {workspace?.nome}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Plano {planoNome} · nenhum diagnóstico gerado ainda
        </Typography>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <TrendingUpIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Nenhum diagnóstico ainda
            </Typography>
            <Typography color="text.secondary" fontSize={14} sx={{ mb: 3 }}>
              Gere seu primeiro diagnóstico de marca e descubra oportunidades de crescimento.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => { window.location.hash = '#/app/diagnostico' }}
            >
              Gerar primeiro diagnóstico
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  /* ── main render ── */
  return (
    <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1100 }}>

      {/* ── 1. Header ── */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
          Bom dia, {workspace?.nome}
        </Typography>
        <Typography color="text.secondary" fontSize={14}>
          Plano {planoNome} · último diagnóstico em {fmtDate(diagnostico.created_at)}
        </Typography>
      </Box>

      {/* ── 2. Score cards ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <ScoreCard label="Singularidade"  value={diagnostico.score_singularidade}  />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ScoreCard label="Consistência"   value={diagnostico.score_consistencia}   />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ScoreCard label="Posicionamento" value={diagnostico.score_posicionamento} />
        </Grid>
      </Grid>

      {/* ── 3. Frase diagnóstico ── */}
      {dados?.frase_diagnostico && (
        <Paper elevation={0} sx={{
          mb: 4,
          p: 3,
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderLeftColor: 'primary.main',
          borderRightColor: 'divider',
          borderTopColor: 'divider',
          borderBottomColor: 'divider',
        }}>
          <Typography
            fontSize={17}
            fontWeight={700}
            fontStyle="italic"
            color="text.primary"
            lineHeight={1.6}
          >
            "{dados.frase_diagnostico}"
          </Typography>
          {dados.empresa && (
            <Typography fontSize={12} color="text.secondary" sx={{ mt: 1 }}>
              {dados.empresa}
            </Typography>
          )}
        </Paper>
      )}

      {/* ── 4. Top 3 oportunidades ── */}
      {oportunidades.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
            Top 3 oportunidades
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {oportunidades.map((op, i) => {
              const pratica = PRATICAS.find(p => p.key === op.pratica_loudr)
              return (
                <Card key={i}>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          <Typography
                            fontSize={11}
                            fontWeight={900}
                            sx={{
                              color: 'background.paper',
                              bgcolor: 'primary.main',
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </Typography>
                          <Typography fontWeight={800} fontSize={14}>
                            {op.titulo}
                          </Typography>
                        </Box>
                        <Typography fontSize={13} color="text.secondary" sx={{ mb: 1 }}>
                          {op.descricao}
                        </Typography>
                        {pratica && (
                          <Typography fontSize={11} sx={{ color: pratica.color }} fontWeight={700}>
                            {pratica.label}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
                        {op.impacto && (
                          <Chip
                            label={`Impacto ${op.impacto}`}
                            size="small"
                            color={impactoColor(op.impacto)}
                            sx={{ fontWeight: 700, fontSize: 11, height: 22 }}
                          />
                        )}
                        {op.prazo && (
                          <Chip
                            label={op.prazo}
                            size="small"
                            color={prazoColor(op.prazo)}
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: 11, height: 22 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 4 }} />

      {/* ── 5. Feed de alertas ── */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
          Alertas
        </Typography>

        {alertas.length === 0 ? (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 3,
            px: 2,
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
          }}>
            <CheckCircleIcon sx={{ color: 'primary.main' }} />
            <Typography color="text.secondary" fontSize={14}>
              Nenhum alerta — tudo certo.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {alertas.map(alerta => (
              <AlertRow
                key={alerta.id}
                alerta={alerta}
                onMarkRead={handleMarkRead}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* ── 6. CTA ── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => { window.location.hash = '#/app/diagnostico' }}
          sx={{ fontWeight: 800, px: 3 }}
        >
          Gerar novo diagnóstico →
        </Button>
      </Box>

    </Box>
  )
}
