import { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CircularProgress, Chip, Paper,
  ToggleButtonGroup, ToggleButton, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { fmtDate } from '../../lib/helpers'

const PERIODOS = [
  { label: '7 dias',  value: '7d',  days: 7  },
  { label: '30 dias', value: '30d', days: 30 },
  { label: '90 dias', value: '90d', days: 90 },
]

const SENT_CFG = {
  positivo: { color: '#0D9E7A', Icon: SentimentSatisfiedAltIcon },
  neutro:   { color: '#EF9F27', Icon: SentimentNeutralIcon      },
  negativo: { color: '#E8185A', Icon: SentimentDissatisfiedIcon },
}

function fmtCurta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Paper sx={{ p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      {payload.map(p => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: p.color }}>
            {p.name}: {p.value}%
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

function SentimentScore({ label, value, color, Icon }) {
  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Icon sx={{ color, fontSize: 28, flexShrink: 0 }} />
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}
            textTransform="uppercase" letterSpacing="0.08em" display="block">
            {label}
          </Typography>
          <Typography fontSize={30} fontWeight={900} sx={{ color, lineHeight: 1 }}>
            {value > 0 ? `${Math.round(value)}%` : '—'}
          </Typography>
        </Box>
      </Box>
    </Card>
  )
}

function EventRow({ ev }) {
  const cfg = SENT_CFG[ev.sentiment] || SENT_CFG.neutro
  const { Icon } = cfg
  return (
    <Box sx={{
      display: 'flex', gap: 2, p: '12px 16px',
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
    }}>
      <Icon sx={{ color: cfg.color, fontSize: 20, mt: 0.25, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{ev.titulo}</Typography>
          {ev.fonte && (
            <Chip label={ev.fonte} size="small"
              sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
          )}
        </Box>
        {ev.conteudo && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5, lineHeight: 1.5 }}>
            {ev.conteudo.length > 200 ? ev.conteudo.slice(0, 200) + '…' : ev.conteudo}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Typography variant="caption" color="text.disabled">{fmtDate(ev.created_at)}</Typography>
          {ev.score_impacto != null && (
            <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 700 }}>
              Impacto {ev.score_impacto}/10
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export function SocialListening() {
  const { workspace } = useWorkspace()
  const [loading, setLoading]         = useState(true)
  const [snapshots, setSnapshots]     = useState([])
  const [events, setEvents]           = useState([])
  const [periodo, setPeriodo]         = useState('30d')
  const [filtroFonte, setFiltroFonte] = useState('todas')
  const [filtroSent, setFiltroSent]   = useState('todos')

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id, periodo])

  async function load() {
    setLoading(true)
    const days  = PERIODOS.find(p => p.value === periodo)?.days || 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceISO  = since.toISOString()
    const sinceDate = sinceISO.split('T')[0]

    const [{ data: snaps }, { data: evs }] = await Promise.all([
      supabase
        .from('sentiment_snapshots')
        .select('*')
        .eq('workspace_id', workspace.id)
        .gte('data', sinceDate)
        .order('data', { ascending: true }),
      supabase
        .from('listening_events')
        .select('*')
        .eq('workspace_id', workspace.id)
        .gte('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    setSnapshots(snaps || [])
    setEvents(evs || [])
    setLoading(false)
  }

  const total = snapshots.length
  const avgPos = total ? snapshots.reduce((s, x) => s + (x.positivo_pct || 0), 0) / total : 0
  const avgNeu = total ? snapshots.reduce((s, x) => s + (x.neutro_pct   || 0), 0) / total : 0
  const avgNeg = total ? snapshots.reduce((s, x) => s + (x.negativo_pct || 0), 0) / total : 0

  const chartData = snapshots.map(s => ({
    data:     fmtCurta(s.data),
    Positivo: Math.round(s.positivo_pct || 0),
    Neutro:   Math.round(s.neutro_pct   || 0),
    Negativo: Math.round(s.negativo_pct || 0),
  }))

  const fontes = ['todas', ...new Set(events.map(e => e.fonte).filter(Boolean))]

  const evtFiltrados = events.filter(e => {
    const okFonte = filtroFonte === 'todas' || e.fonte === filtroFonte
    const okSent  = filtroSent  === 'todos' || e.sentiment === filtroSent
    return okFonte && okSent
  })

  const topicos = (() => {
    if (!events.length) return []
    const counts = {}
    events.forEach(e => {
      const text = ((e.titulo || '') + ' ' + (e.conteudo || '')).toLowerCase()
      text.split(/\W+/).filter(w => w.length > 5 && w.length < 20).forEach(w => {
        counts[w] = (counts[w] || 0) + 1
      })
    })
    return Object.entries(counts)
      .filter(([, n]) => n > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  })()

  return (
    <Box sx={{ p: 4 }}>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">Social Listening</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Monitoramento de sentimento e menções da sua marca no mercado.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <>
          {/* Selector período */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <ToggleButtonGroup value={periodo} exclusive onChange={(_, v) => { if (v) setPeriodo(v) }} size="small"
              sx={{ '& .MuiToggleButton-root': { px: 2, py: 0.5, fontSize: 12, fontWeight: 700, fontFamily: "'Cairo', sans-serif" } }}>
              {PERIODOS.map(p => <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>

          {/* Score cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
            <SentimentScore label="Positivo" value={avgPos} color="#0D9E7A" Icon={SentimentSatisfiedAltIcon} />
            <SentimentScore label="Neutro"   value={avgNeu} color="#EF9F27" Icon={SentimentNeutralIcon}     />
            <SentimentScore label="Negativo" value={avgNeg} color="#E8185A" Icon={SentimentDissatisfiedIcon} />
          </Box>

          {/* Gráfico de área */}
          <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="overline" color="text.disabled" display="block" mb={2}>
              Evolução do sentimento no período
            </Typography>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    {[['gPos', '#0D9E7A'], ['gNeu', '#EF9F27'], ['gNeg', '#E8185A']].map(([id, c]) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={c} stopOpacity={0.0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3550" />
                  <XAxis dataKey="data" tick={{ fill: '#8A9AB0', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#8A9AB0', fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: "'Cairo', sans-serif", paddingTop: 12 }} iconType="circle" />
                  <Area type="monotone" dataKey="Positivo" stroke="#0D9E7A" strokeWidth={2} fill="url(#gPos)" />
                  <Area type="monotone" dataKey="Neutro"   stroke="#EF9F27" strokeWidth={2} fill="url(#gNeu)" />
                  <Area type="monotone" dataKey="Negativo" stroke="#E8185A" strokeWidth={2} fill="url(#gNeg)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  Dados insuficientes para exibir o gráfico. O monitor gera snapshots automaticamente.
                </Typography>
              </Box>
            )}
          </Card>

          {/* Tópicos em alta */}
          {topicos.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.disabled" display="block" mb={1}>
                Tópicos em alta — Trend Discovery
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {topicos.map(([word, count]) => (
                  <Chip key={word}
                    label={`${word} (${count})`}
                    icon={<TrendingUpIcon />}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(13,158,122,0.08)', color: 'primary.main', fontWeight: 700,
                      '& .MuiChip-icon': { color: 'primary.main', fontSize: 14 },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Feed */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="overline" color="text.disabled">Feed de menções</Typography>
            <Box sx={{ flex: 1 }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Fonte</InputLabel>
              <Select value={filtroFonte} label="Fonte" onChange={e => setFiltroFonte(e.target.value)}>
                {fontes.map(f => <MenuItem key={f} value={f}>{f === 'todas' ? 'Todas as fontes' : f}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sentimento</InputLabel>
              <Select value={filtroSent} label="Sentimento" onChange={e => setFiltroSent(e.target.value)}>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="positivo">Positivo</MenuItem>
                <MenuItem value="neutro">Neutro</MenuItem>
                <MenuItem value="negativo">Negativo</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            {evtFiltrados.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {events.length === 0
                    ? 'Nenhuma menção registrada no período. O monitor coleta menções automaticamente.'
                    : 'Nenhuma menção com os filtros selecionados.'}
                </Typography>
              </Box>
            ) : (
              evtFiltrados.map(ev => <EventRow key={ev.id} ev={ev} />)
            )}
          </Card>
        </>
      )}
    </Box>
  )
}
