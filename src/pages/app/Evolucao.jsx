import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, ToggleButtonGroup, ToggleButton,
  CircularProgress, Chip, Paper,
} from '@mui/material'
import TrendingUpIcon  from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase }     from '../../lib/supabase'
import { checkPlano }   from '../../lib/helpers'

const PERIODOS = [
  { label: '3 meses', value: '3m', days: 90  },
  { label: '6 meses', value: '6m', days: 180 },
  { label: '1 ano',   value: '1a', days: 365 },
  { label: 'Tudo',    value: 'all',days: null },
]

const DIMENSOES = [
  { key: 'score_singularidade',  label: 'Singularidade',  color: '#0D9E7A' },
  { key: 'score_consistencia',   label: 'Consistência',   color: '#7F77DD' },
  { key: 'score_posicionamento', label: 'Posicionamento', color: '#EF9F27' },
]

function fmtDataCurta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Paper sx={{ p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      {payload.map(p => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: p.color }}>
            {p.name}: {p.value}/10
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

export function Evolucao() {
  const { workspace }         = useWorkspace()
  const [diags, setDiags]     = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('6m')

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('diagnosticos')
      .select('id, created_at, empresa, score_singularidade, score_consistencia, score_posicionamento')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: true })
    setDiags(data || [])
    setLoading(false)
  }

  const pDef = PERIODOS.find(p => p.value === periodo)
  const filtrado = pDef?.days
    ? diags.filter(d => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - pDef.days)
        return new Date(d.created_at) >= cutoff
      })
    : diags

  const chartData = filtrado.map(d => ({
    data: fmtDataCurta(d.created_at),
    Singularidade:  d.score_singularidade,
    Consistência:   d.score_consistencia,
    Posicionamento: d.score_posicionamento,
  }))

  // Insight: maior variação entre primeiro e último do período
  function calcVariacao(key) {
    if (filtrado.length < 2) return null
    const first = filtrado[0][key]
    const last  = filtrado[filtrado.length - 1][key]
    if (first == null || last == null) return null
    return last - first
  }

  const variacoes = DIMENSOES.map(d => ({
    ...d,
    variacao: calcVariacao(d.key),
    ultimo: filtrado.length ? filtrado[filtrado.length - 1][d.key] : null,
  }))

  const maiorVar = [...variacoes].sort((a, b) => Math.abs(b.variacao ?? 0) - Math.abs(a.variacao ?? 0))[0]

  if (!checkPlano(workspace, 'evolucao')) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Upgrade para Starter para ver a evolução.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">Evolução de scores</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Acompanhe a evolução das 3 dimensões do framework Smart Branding ao longo do tempo.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : filtrado.length < 2 ? (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography color="text.secondary" mb={1}>
            São necessários pelo menos 2 diagnósticos para exibir a evolução.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gere um novo diagnóstico na aba <strong>Diagnóstico</strong>.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Score cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
            {variacoes.map(({ key, label, color, variacao, ultimo }) => (
              <Card key={key} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em">
                    {label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mt: 0.5 }}>
                    <Typography fontSize={32} fontWeight={900} sx={{ color, lineHeight: 1 }}>
                      {ultimo ?? '—'}
                    </Typography>
                    <Typography color="text.secondary" fontSize={13} mb={0.5}>/10</Typography>
                    {variacao != null && variacao !== 0 && (
                      <Chip
                        icon={variacao > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        label={`${variacao > 0 ? '+' : ''}${variacao.toFixed(1)}`}
                        size="small"
                        sx={{
                          bgcolor: variacao > 0 ? '#0D9E7A22' : '#E8185A22',
                          color: variacao > 0 ? '#0D9E7A' : '#E8185A',
                          fontWeight: 800, fontSize: 11, height: 22, mb: 0.5,
                          '& .MuiChip-icon': { fontSize: 13, color: 'inherit' },
                        }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Insight */}
          {maiorVar?.variacao != null && maiorVar.variacao !== 0 && (
            <Paper sx={{ p: 2, mb: 3, borderLeft: '4px solid', borderColor: maiorVar.variacao > 0 ? 'primary.main' : 'secondary.main', bgcolor: 'background.paper', borderRadius: '0 8px 8px 0' }}>
              <Typography variant="body2" fontWeight={700} sx={{ color: maiorVar.variacao > 0 ? 'primary.main' : 'secondary.main' }}>
                {maiorVar.variacao > 0 ? 'Maior avanço' : 'Maior queda'}: {maiorVar.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Variação de {maiorVar.variacao > 0 ? '+' : ''}{maiorVar.variacao.toFixed(1)} pontos no período selecionado.
              </Typography>
            </Paper>
          )}

          {/* Seletor de período */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup
              value={periodo}
              exclusive
              onChange={(_, v) => { if (v) setPeriodo(v) }}
              size="small"
              sx={{ '& .MuiToggleButton-root': { px: 2, py: 0.5, fontSize: 12, fontWeight: 700, fontFamily: "'Cairo', sans-serif" } }}
            >
              {PERIODOS.map(p => (
                <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Gráfico */}
          <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3550" />
                <XAxis dataKey="data" tick={{ fill: '#8A9AB0', fontSize: 11 }} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: '#8A9AB0', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, fontFamily: "'Cairo', sans-serif", paddingTop: 16 }}
                  iconType="circle"
                />
                {DIMENSOES.map(d => (
                  <Line
                    key={d.key}
                    type="monotone"
                    dataKey={d.label}
                    stroke={d.color}
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: d.color, strokeWidth: 0 }}
                    activeDot={{ r: 7 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </Box>
  )
}
