import { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, CircularProgress, Chip, LinearProgress, Paper,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import RemoveIcon from '@mui/icons-material/Remove'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { fmtDate } from '../../lib/helpers'

function calcConsistenciaScore(designSystem) {
  if (!designSystem) return 0
  const campos = ['colors', 'typography', 'spacing', 'border_radius']
  const preenchidos = campos.filter(c => designSystem[c]).length
  return (preenchidos / campos.length) * 10
}

function calcReferencesScore(references) {
  if (!references) return 0
  const campos = ['moodboard', 'brands', 'differentiation']
  const preenchidos = campos.filter(c => references[c] && references[c].length > 0).length
  return (preenchidos / campos.length) * 10
}

export function calcIdentityGap(brandBook, diagnostico) {
  const dims = [
    { nome: 'Singularidade',  declarado: brandBook.identity?.positioning_clarity ?? 5, percebido: diagnostico.score_singularidade  ?? 5 },
    { nome: 'Consistência',   declarado: calcConsistenciaScore(brandBook.design_system),  percebido: diagnostico.score_consistencia   ?? 5 },
    { nome: 'Posicionamento', declarado: brandBook.positioning?.differentiation_score ?? 5, percebido: diagnostico.score_posicionamento ?? 5 },
    { nome: 'Experiência',    declarado: brandBook.identity?.tone_clarity ?? 5,          percebido: diagnostico.score_experiencia    ?? 5 },
    { nome: 'Escala',         declarado: calcReferencesScore(brandBook.references),      percebido: diagnostico.score_escala         ?? 5 },
  ]
  const gaps = dims.map(d => ({
    ...d,
    gap: Math.abs(d.declarado - d.percebido),
    direcao: d.percebido > d.declarado ? 'mercado_supera' : 'marca_supera',
  }))
  const gap_score = gaps.reduce((sum, d) => sum + d.gap, 0) / gaps.length
  return { gap_score: parseFloat(gap_score.toFixed(1)), dimensoes: gaps }
}

function GapTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Paper sx={{ p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      <Typography variant="caption" fontWeight={700} sx={{ color: '#7F77DD' }}>
        Gap: {payload[0]?.value}
      </Typography>
    </Paper>
  )
}

function gapColor(score) {
  if (score <= 2) return '#0D9E7A'
  if (score <= 4) return '#EF9F27'
  return '#E8185A'
}

function gapLabel(score) {
  if (score <= 2) return 'Alinhamento forte'
  if (score <= 4) return 'Gap moderado'
  return 'Gap crítico'
}

export function IdentityGapCard({ workspaceId, compact = false }) {
  const [loading, setLoading]   = useState(true)
  const [snapshots, setSnapshots] = useState([])
  const [latest, setLatest]     = useState(null)

  useEffect(() => {
    if (!workspaceId) return
    load()
  }, [workspaceId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('identity_gap_snapshots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10)

    const snaps = data || []
    setSnapshots(snaps)
    setLatest(snaps[0] || null)
    setLoading(false)
  }

  if (loading) {
    return (
      <Card sx={{ border: '1px solid', borderColor: 'divider', p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} color="primary" />
      </Card>
    )
  }

  if (!latest) {
    return (
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography fontWeight={700} mb={0.5}>Identity Gap</Typography>
          <Typography variant="body2" color="text.secondary">
            Nenhum snapshot disponível. O gap é calculado quando você tem um brand book ativo e diagnósticos gerados.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const score   = latest.gap_score ?? 0
  const color   = gapColor(score)
  const label   = gapLabel(score)
  const dimensoes = Array.isArray(latest.dimensoes) ? latest.dimensoes : []

  const chartData = [...snapshots].reverse().map(s => ({
    data: new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    gap: s.gap_score,
  }))

  if (compact) {
    return (
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="overline" color="text.disabled">Identity Gap</Typography>
            <Chip label={label} size="small"
              sx={{ bgcolor: color + '18', color, fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1 }}>
            <Typography fontSize={36} fontWeight={900} sx={{ color, lineHeight: 1 }}>{score}</Typography>
            <Typography color="text.disabled" fontSize={13}>/10</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(score / 10) * 100}
            sx={{ height: 4, borderRadius: 1, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: color } }}
          />
          {latest.gap_narrativa && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}>
              {latest.gap_narrativa.slice(0, 120)}…
            </Typography>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.disabled">Identity Gap Score</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 0.25 }}>
              <Typography fontSize={48} fontWeight={900} sx={{ color, lineHeight: 1 }}>{score}</Typography>
              <Typography color="text.disabled" fontSize={16}>/10</Typography>
            </Box>
            <Typography variant="caption" color="text.disabled">
              Última atualização: {fmtDate(latest.created_at)}
            </Typography>
          </Box>
          <Chip label={label} sx={{ bgcolor: color + '18', color, fontWeight: 800 }} />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          0 = alinhamento perfeito · 10 = gap máximo entre identidade declarada e percebida
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(score / 10) * 100}
          sx={{ height: 6, borderRadius: 1, mb: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: color } }}
        />

        {/* Narrativa */}
        {latest.gap_narrativa && (
          <Box sx={{ p: 2, mb: 3, bgcolor: 'background.default', borderLeft: '3px solid', borderColor: color, borderRadius: '0 8px 8px 0' }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {latest.gap_narrativa}
            </Typography>
          </Box>
        )}

        {/* Dimensões */}
        {dimensoes.length > 0 && (
          <>
            <Typography variant="overline" color="text.disabled" display="block" mb={1.5}>
              Gap por dimensão
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {dimensoes.map(d => {
                const dimColor = gapColor(d.gap)
                const IconDir  = d.direcao === 'mercado_supera' ? TrendingUpIcon
                               : d.gap === 0 ? RemoveIcon
                               : TrendingDownIcon
                return (
                  <Box key={d.nome}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 100 }}>{d.nome}</Typography>
                      <IconDir sx={{ fontSize: 14, color: dimColor }} />
                      <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
                        declarado {d.declarado?.toFixed(1)} · percebido {d.percebido?.toFixed(1)}
                      </Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ color: dimColor }}>
                        Δ {d.gap?.toFixed(1)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(d.gap / 10) * 100}
                      sx={{ height: 4, borderRadius: 1, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: dimColor } }}
                    />
                  </Box>
                )
              })}
            </Box>
          </>
        )}

        {/* Evolução */}
        {chartData.length > 1 && (
          <>
            <Typography variant="overline" color="text.disabled" display="block" mb={1.5}>
              Evolução do gap
            </Typography>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3550" />
                <XAxis dataKey="data" tick={{ fill: '#8A9AB0', fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fill: '#8A9AB0', fontSize: 10 }} />
                <Tooltip content={<GapTooltip />} />
                <Line type="monotone" dataKey="gap" stroke="#7F77DD" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#7F77DD', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
