import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Button, Paper, Chip, CircularProgress,
  TextField, Alert, Divider, Card, CardContent,
  ToggleButtonGroup, ToggleButton, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton,
} from '@mui/material'
import AssessmentOutlinedIcon    from '@mui/icons-material/AssessmentOutlined'
import AddIcon                   from '@mui/icons-material/Add'
import ShareIcon                 from '@mui/icons-material/Share'
import PictureAsPdfOutlinedIcon  from '@mui/icons-material/PictureAsPdfOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import BusinessOutlinedIcon      from '@mui/icons-material/BusinessOutlined'
import ArrowForwardIcon          from '@mui/icons-material/ArrowForward'
import WarningAmberOutlinedIcon  from '@mui/icons-material/WarningAmberOutlined'
import DeleteIcon                from '@mui/icons-material/Delete'
import TrendingUpIcon            from '@mui/icons-material/TrendingUp'
import TrendingDownIcon          from '@mui/icons-material/TrendingDown'
import CheckIcon                 from '@mui/icons-material/Check'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Label,
} from 'recharts'

import { useWorkspace }      from '../../lib/WorkspaceContext'
import { supabase }          from '../../lib/supabase'
import { PLANOS }            from '../../lib/constants'
import { fmtDate, sc, tryParseJSON, checkPlano } from '../../lib/helpers'
import { runStream }         from '../../lib/api'
import { RelatorioCompleto } from '../RelatorioCompleto'
import { StreamingView }     from '../StreamingView'
import { IdentityGapCard }   from '../../components/intelligence/IdentityGapCard'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function fmtDataCurta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function ScoreChip({ label, value }) {
  const color = sc(value)
  return (
    <Chip
      label={`${label} ${value}/10`}
      size="small"
      sx={{ fontWeight: 700, fontSize: 11, color, bgcolor: `${color}18`, border: `1px solid ${color}44` }}
    />
  )
}

function ScoreBar({ value, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={(value ?? 0) * 10}
        sx={{ flex: 1, height: 6, borderRadius: 1, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: color } }}
      />
      <Typography variant="caption" fontWeight={700} sx={{ color, minWidth: 20 }}>{value ?? '—'}</Typography>
    </Box>
  )
}

/* ─── line chart tooltip ──────────────────────────────────────────────────── */

function LineTooltip({ active, payload, label }) {
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

/* ─── scatter tooltip ─────────────────────────────────────────────────────── */

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <Paper sx={{ p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', minWidth: 160 }}>
      <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>{d.nome}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">Singularidade: {d.x}/10</Typography>
      <Typography variant="caption" color="text.secondary" display="block">Posicionamento: {d.y}/10</Typography>
    </Paper>
  )
}

/* ─── empty state ─────────────────────────────────────────────────────────── */

function EmptyState({ onGerar }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2, textAlign: 'center' }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.12, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        <AssessmentOutlinedIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 1 }} />
      </Box>
      <Typography variant="h6" fontWeight={900}>Nenhum diagnóstico ainda</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        Gere o primeiro diagnóstico de marca do seu workspace e receba uma análise completa
        baseada no framework Smart Branding da LOUDR.
      </Typography>
      <Button variant="contained" color="primary" endIcon={<ArrowForwardIcon />} onClick={onGerar} sx={{ mt: 1 }}>
        Gerar primeiro diagnóstico
      </Button>
    </Box>
  )
}

/* ─── form dialog ─────────────────────────────────────────────────────────── */

function FormDialog({ open, onClose, onStart }) {
  const [empresa, setEmpresa]   = useState('')
  const [contexto, setContexto] = useState('')
  const [err, setErr]           = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!empresa.trim()) { setErr('Informe a empresa ou domínio.'); return }
    onStart(empresa.trim(), contexto.trim())
    setEmpresa('')
    setContexto('')
    setErr('')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, pb: 0 }}>Novo diagnóstico</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Informe a empresa que deseja analisar. O agent pesquisará até 5 fontes e aplicará
            o framework Smart Branding da LOUDR.
          </Typography>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <TextField
            label="Empresa ou domínio"
            placeholder="Ex: nubank.com ou Magazine Luiza"
            fullWidth required value={empresa}
            onChange={e => { setEmpresa(e.target.value); setErr('') }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Contexto adicional (opcional)"
            placeholder="Ex: startup B2B de logística, principal concorrente é a Loggi"
            fullWidth multiline rows={3}
            value={contexto}
            onChange={e => setContexto(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" endIcon={<ArrowForwardIcon />}>
            Gerar diagnóstico
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

/* ─── seção 2: evolução ───────────────────────────────────────────────────── */

const PERIODOS = [
  { label: '3m',  value: '3m',  days: 90  },
  { label: '6m',  value: '6m',  days: 180 },
  { label: '1a',  value: '1a',  days: 365 },
  { label: 'Tudo', value: 'all', days: null },
]

const DIMENSOES_LINHA = [
  { key: 'score_singularidade',  label: 'Singularidade',  color: '#0D9E7A' },
  { key: 'score_consistencia',   label: 'Consistência',   color: '#7F77DD' },
  { key: 'score_posicionamento', label: 'Posicionamento', color: '#EF9F27' },
]

function SecaoEvolucao({ diagnosticos }) {
  const [periodo, setPeriodo] = useState('6m')

  const pDef = PERIODOS.find(p => p.value === periodo)
  const filtrado = pDef?.days
    ? diagnosticos.filter(d => {
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - pDef.days)
        return new Date(d.created_at) >= cutoff
      })
    : diagnosticos

  const chronological = [...filtrado].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const chartData = chronological.map(d => ({
    data:          fmtDataCurta(d.created_at),
    Singularidade: d.score_singularidade,
    Consistência:  d.score_consistencia,
    Posicionamento: d.score_posicionamento,
  }))

  function calcVariacao(key) {
    if (chronological.length < 2) return null
    const first = chronological[0][key]
    const last  = chronological[chronological.length - 1][key]
    if (first == null || last == null) return null
    return last - first
  }

  const variacoes = DIMENSOES_LINHA.map(d => ({
    ...d,
    variacao: calcVariacao(d.key),
    ultimo: chronological.length ? chronological[chronological.length - 1][d.key] : null,
  }))
  const maiorVar = [...variacoes].sort((a, b) => Math.abs(b.variacao ?? 0) - Math.abs(a.variacao ?? 0))[0]

  if (diagnosticos.length < 2) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography color="text.secondary" variant="body2">
          São necessários pelo menos 2 diagnósticos para exibir a evolução.
        </Typography>
      </Paper>
    )
  }

  return (
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
                <Typography fontSize={32} fontWeight={900} sx={{ color, lineHeight: 1 }}>{ultimo ?? '—'}</Typography>
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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ToggleButtonGroup
          value={periodo} exclusive onChange={(_, v) => { if (v) setPeriodo(v) }}
          size="small"
          sx={{ '& .MuiToggleButton-root': { px: 2, py: 0.5, fontSize: 12, fontWeight: 700, fontFamily: "'Cairo', sans-serif" } }}
        >
          {PERIODOS.map(p => <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>)}
        </ToggleButtonGroup>
      </Box>

      <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3550" />
            <XAxis dataKey="data" tick={{ fill: '#8A9AB0', fontSize: 11 }} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: '#8A9AB0', fontSize: 11 }} />
            <RechartTooltip content={<LineTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: "'Cairo', sans-serif", paddingTop: 16 }} iconType="circle" />
            {DIMENSOES_LINHA.map(d => (
              <Line key={d.key} type="monotone" dataKey={d.label} stroke={d.color}
                strokeWidth={2.5} dot={{ r: 5, fill: d.color, strokeWidth: 0 }} activeDot={{ r: 7 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  )
}

/* ─── seção 3: concorrentes ───────────────────────────────────────────────── */

const CORES_CONC = ['#0D9E7A', '#7F77DD', '#EF9F27', '#E8185A', '#4FC3F7']
const DIMS_CONC  = [
  { key: 'score_singularidade',  label: 'Singularidade'  },
  { key: 'score_consistencia',   label: 'Consistência'   },
  { key: 'score_posicionamento', label: 'Posicionamento' },
]

function SecaoConcorrentes({ workspace }) {
  const [loading, setLoading]           = useState(true)
  const [concorrentes, setConcorrentes] = useState([])
  const [diags, setDiags]               = useState([])
  const [workspaceDiag, setWorkspaceDiag] = useState(null)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [nome, setNome]                 = useState('')
  const [dominio, setDominio]           = useState('')
  const [saving, setSaving]             = useState(false)

  const plano  = PLANOS[workspace?.plano] || PLANOS.trial
  const limite = plano.concorrentes || 0

  useEffect(() => { if (workspace?.id) load() }, [workspace?.id])

  async function load() {
    setLoading(true)
    const [{ data: concs }, { data: concDiags }, { data: wsDiag }] = await Promise.all([
      supabase.from('concorrentes').select('*').eq('workspace_id', workspace.id).eq('ativo', true).order('created_at'),
      supabase.from('diagnosticos_concorrentes').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
      supabase.from('diagnosticos').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setConcorrentes(concs || [])
    setDiags(concDiags || [])
    setWorkspaceDiag(wsDiag || null)
    setLoading(false)
  }

  async function addConcorrente() {
    if (!nome.trim()) return
    setSaving(true)
    await supabase.from('concorrentes').insert({ workspace_id: workspace.id, nome: nome.trim(), dominio: dominio.trim() || null, ativo: true })
    setNome(''); setDominio(''); setDialogOpen(false); setSaving(false)
    load()
  }

  async function removeConcorrente(id) {
    await supabase.from('concorrentes').update({ ativo: false }).eq('id', id)
    setConcorrentes(prev => prev.filter(c => c.id !== id))
  }

  function getLastDiag(concId) { return diags.find(d => d.concorrente_id === concId) || null }

  const scatterData = [
    ...(workspaceDiag ? [{ nome: workspace?.nome || 'Minha marca', x: workspaceDiag.score_singularidade || 5, y: workspaceDiag.score_posicionamento || 5, z: 200, cor: '#0D9E7A', isSelf: true }] : []),
    ...concorrentes.map((c, i) => {
      const d = getLastDiag(c.id)
      return { nome: c.nome, x: d?.score_singularidade || 5, y: d?.score_posicionamento || 5, z: 150, cor: CORES_CONC[(i + 1) % CORES_CONC.length], isSelf: false }
    }),
  ]

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} color="primary" /></Box>

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Concorrentes: {concorrentes.length}/{limite}
          {concorrentes.length >= limite && limite > 0 && (
            <Chip label="Limite atingido" size="small" sx={{ ml: 1, bgcolor: 'rgba(239,159,39,0.1)', color: '#EF9F27', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
          )}
        </Typography>
        <Button variant="outlined" size="small" startIcon={<AddIcon />}
          disabled={concorrentes.length >= limite}
          onClick={() => setDialogOpen(true)}
        >
          Adicionar concorrente
        </Button>
      </Box>

      {concorrentes.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
          <Typography fontWeight={800} mb={1}>Nenhum concorrente adicionado</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Adicione até {limite} concorrentes para comparar scores e mapear o território de mercado.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Adicionar concorrente
          </Button>
        </Card>
      ) : (
        <>
          {/* Territory Map */}
          <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="overline" color="text.disabled" display="block" mb={0.5}>Territory Map — Singularidade × Posicionamento</Typography>
            <Typography variant="caption" color="text.disabled" display="block" mb={2}>
              Scores dos diagnósticos. Concorrentes sem diagnóstico aparecem no centro.
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 12, right: 24, bottom: 24, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3550" />
                <XAxis type="number" dataKey="x" domain={[0, 10]} tick={{ fill: '#8A9AB0', fontSize: 11 }}>
                  <Label value="Singularidade" position="insideBottom" offset={-16} fill="#8A9AB0" fontSize={11} />
                </XAxis>
                <YAxis type="number" dataKey="y" domain={[0, 10]} tick={{ fill: '#8A9AB0', fontSize: 11 }}>
                  <Label value="Posicionamento" angle={-90} position="insideLeft" offset={12} fill="#8A9AB0" fontSize={11} />
                </YAxis>
                <ZAxis type="number" dataKey="z" range={[60, 240]} />
                <RechartTooltip content={<ScatterTooltip />} />
                {scatterData.map(d => (
                  <Scatter key={d.nome} name={d.nome} data={[d]} fill={d.cor} opacity={d.isSelf ? 1 : 0.7} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              {scatterData.map(d => (
                <Box key={d.nome} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.cor }} />
                  <Typography variant="caption" fontWeight={d.isSelf ? 800 : 500} color={d.isSelf ? 'text.primary' : 'text.secondary'}>
                    {d.nome}{d.isSelf ? ' (você)' : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>

          {/* Gap analysis */}
          <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="overline" color="text.disabled">Gap Analysis — Scores por dimensão</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: `180px repeat(${concorrentes.length + 1}, 1fr)`, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', px: 2.5, py: 1, gap: 0 }}>
              <Typography variant="caption" color="text.disabled" fontWeight={700}>Dimensão</Typography>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#0D9E7A' }}>{workspace?.nome || 'Sua marca'}</Typography>
              {concorrentes.map(c => (
                <Typography key={c.id} variant="caption" fontWeight={700} color="text.secondary">{c.nome}</Typography>
              ))}
            </Box>
            {DIMS_CONC.map((dim) => (
              <Box key={dim.key} sx={{
                display: 'grid',
                gridTemplateColumns: `180px repeat(${concorrentes.length + 1}, 1fr)`,
                px: 2.5, py: 1.5, gap: 0,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
              }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center' }}>{dim.label}</Typography>
                <Box sx={{ pr: 2 }}>
                  <ScoreBar value={workspaceDiag?.[dim.key]} color="#0D9E7A" />
                </Box>
                {concorrentes.map((c, ci) => {
                  const d = getLastDiag(c.id)
                  return (
                    <Box key={c.id} sx={{ pr: 2 }}>
                      <ScoreBar value={d?.[dim.key]} color={CORES_CONC[(ci + 1) % CORES_CONC.length]} />
                    </Box>
                  )
                })}
              </Box>
            ))}
          </Card>

          {/* Lista de concorrentes */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {concorrentes.map(c => (
              <Chip
                key={c.id}
                label={c.nome}
                onDelete={() => removeConcorrente(c.id)}
                deleteIcon={<DeleteIcon />}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={900}>Adicionar concorrente</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Nome *" value={nome} onChange={e => setNome(e.target.value)} fullWidth size="small" />
          <TextField label="Domínio (opcional)" placeholder="ex: concorrente.com.br" value={dominio} onChange={e => setDominio(e.target.value)} fullWidth size="small" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={addConcorrente} disabled={saving || !nome.trim()}>
            {saving ? <CircularProgress size={18} /> : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

/* ─── página principal ────────────────────────────────────────────────────── */

export function Posicionamento() {
  const { workspace, user } = useWorkspace()

  const [estado, setEstado]                 = useState('lista')
  const [diagnosticos, setDiagnosticos]     = useState([])
  const [loadingList, setLoadingList]       = useState(true)
  const [selectedDiag, setSelectedDiag]     = useState(null)
  const [error, setError]                   = useState('')
  const [copied, setCopied]                 = useState(false)
  const [pdfLoading, setPdfLoading]         = useState(false)
  const [formOpen, setFormOpen]             = useState(false)

  // streaming
  const [searchSteps, setSearchSteps]                   = useState([])
  const [partialData, setPartialData]                   = useState(null)
  const [rateLimitCountdown, setRateLimitCountdown]     = useState(0)
  const [rateLimitAttempt, setRateLimitAttempt]         = useState(0)

  const fetchDiagnosticos = useCallback(async () => {
    if (!workspace?.id) return
    setLoadingList(true)
    const { data } = await supabase
      .from('diagnosticos').select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
    setDiagnosticos(data || [])
    setLoadingList(false)
  }, [workspace?.id])

  useEffect(() => { fetchDiagnosticos() }, [fetchDiagnosticos])

  const plano           = workspace ? (PLANOS[workspace.plano] || PLANOS.trial) : PLANOS.trial
  const limiteAtingido  = workspace ? workspace.diagnosticos_mes >= plano.diagnosticos_mes : false

  function abrirForm() {
    if (limiteAtingido) { setError('Limite do plano atingido. Faça upgrade para continuar gerando diagnósticos.'); return }
    setError('')
    setFormOpen(true)
  }

  function iniciarStream(empresa, contexto) {
    setFormOpen(false)
    setSearchSteps([])
    setPartialData(null)
    setRateLimitCountdown(0)
    setRateLimitAttempt(0)
    setEstado('streaming')

    runStream({
      empresa, contexto,
      onSearchStep: (_count, query) => setSearchSteps(prev => [...prev, query]),
      onText: (txt) => { const p = tryParseJSON(txt); if (p) setPartialData(p) },
      onRateLimit: (s, t) => { setRateLimitCountdown(s); setRateLimitAttempt(t) },
      onDone: async (parsed) => {
        const { data: diag } = await supabase.from('diagnosticos').insert({
          workspace_id: workspace.id, user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email.split('@')[0],
          empresa: parsed.empresa, dominio: parsed.dominio,
          setor: parsed.setor, porte: parsed.porte,
          score_singularidade: parsed.score_singularidade,
          score_consistencia: parsed.score_consistencia,
          score_posicionamento: parsed.score_posicionamento,
          frase_diagnostico: parsed.frase_diagnostico,
          data: parsed, publico: true, tipo: 'manual',
        }).select().single()

        await supabase.from('workspaces').update({ diagnosticos_mes: workspace.diagnosticos_mes + 1 }).eq('id', workspace.id)
        await fetchDiagnosticos()
        setSelectedDiag({ ...diag, data: parsed })
        setEstado('relatorio')
      },
      onError: (msg) => { setError(msg); setEstado('lista') },
    })
  }

  async function handleShare(diag) {
    const url = window.location.origin + '/#/relatorio/' + diag.id
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handlePDF(diag) {
    setPdfLoading(true)
    try { const { gerarPDF } = await import('../../lib/pdf'); await gerarPDF(diag.data) }
    finally { setPdfLoading(false) }
  }

  // ── estados de tela cheia ──────────────────────────────────────────────────

  if (estado === 'relatorio' && selectedDiag) {
    return (
      <RelatorioCompleto
        data={{ ...selectedDiag, ...(selectedDiag.data || {}) }}
        meta={selectedDiag}
        onBack={() => { setEstado('lista'); setSelectedDiag(null) }}
        backLabel="← Voltar ao Posicionamento"
      />
    )
  }

  if (estado === 'streaming') {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <StreamingView
          searchSteps={searchSteps}
          partialData={partialData}
          rateLimitCountdown={rateLimitCountdown}
          rateLimitAttempt={rateLimitAttempt}
        />
      </Box>
    )
  }

  // ── lista (página principal) ───────────────────────────────────────────────

  const ultimo   = diagnosticos[0] || null
  const restante = diagnosticos.slice(1)

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Posicionamento</Typography>
          <Typography variant="body2" color="text.secondary">
            {plano.diagnosticos_mes === Infinity
              ? `${workspace?.diagnosticos_mes ?? 0} diagnósticos gerados este mês · ilimitado`
              : `${workspace?.diagnosticos_mes ?? 0} de ${plano.diagnosticos_mes} usados este mês · plano ${plano.nome}`}
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} endIcon={<ArrowForwardIcon />} onClick={abrirForm}>
          Gerar novo diagnóstico
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" icon={<WarningAmberOutlinedIcon fontSize="small" />} onClose={() => setError('')} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loadingList ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress color="primary" size={32} /></Box>
      ) : !ultimo ? (
        <EmptyState onGerar={abrirForm} />
      ) : (
        <>
          {/* ── Último diagnóstico em destaque ── */}
          <Paper sx={{
            p: 3, mb: 4, border: '1px solid', borderColor: 'primary.main', borderRadius: 3,
            position: 'relative', overflow: 'hidden',
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main', borderRadius: '3px 3px 0 0' },
          }}>
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'primary.main', display: 'block', mb: 1.5 }}>
              Último diagnóstico
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.2 }}>{ultimo.empresa}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">{fmtDate(ultimo.created_at)}</Typography>
              </Box>
            </Box>
            {(ultimo.setor || ultimo.porte) && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {[ultimo.setor, ultimo.porte].filter(Boolean).join(' · ')}
              </Typography>
            )}
            {ultimo.frase_diagnostico && (
              <Box sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.5, mb: 2, fontStyle: 'italic', color: 'text.secondary', fontSize: 13, lineHeight: 1.65 }}>
                "{ultimo.frase_diagnostico}"
              </Box>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
              {ultimo.score_singularidade != null && <ScoreChip label="Singularidade" value={ultimo.score_singularidade} />}
              {ultimo.score_consistencia  != null && <ScoreChip label="Consistência"  value={ultimo.score_consistencia}  />}
              {ultimo.score_posicionamento != null && <ScoreChip label="Posicionamento" value={ultimo.score_posicionamento} />}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" startIcon={<ArrowForwardIcon />}
                onClick={() => { setSelectedDiag(ultimo); setEstado('relatorio') }}>
                Ver relatório
              </Button>
              <Button size="small" variant="text" color="inherit"
                startIcon={copied ? <CheckIcon fontSize="small" /> : <ShareIcon fontSize="small" />}
                onClick={() => handleShare(ultimo)}
                sx={{ color: copied ? 'primary.main' : 'text.secondary' }}>
                {copied ? 'Copiado!' : 'Compartilhar'}
              </Button>
              <Button size="small" variant="text" color="inherit"
                startIcon={pdfLoading ? <CircularProgress size={14} /> : <PictureAsPdfOutlinedIcon fontSize="small" />}
                onClick={() => handlePDF(ultimo)} disabled={pdfLoading}
                sx={{ color: 'text.secondary' }}>
                PDF
              </Button>
            </Box>
          </Paper>

          {/* ── Histórico ── */}
          {restante.length > 0 && (
            <>
              <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>Histórico</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 5 }}>
                {restante.map(diag => (
                  <Paper key={diag.id}
                    onClick={() => { setSelectedDiag(diag); setEstado('relatorio') }}
                    sx={{ p: 2, cursor: 'pointer', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'border-color 0.18s, background 0.18s', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(13,158,122,0.04)' } }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <BusinessOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography fontWeight={800} fontSize={14} noWrap>{diag.empresa}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{fmtDate(diag.created_at)}</Typography>
                      </Box>
                    </Box>
                    {diag.setor && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {[diag.setor, diag.porte].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {diag.score_singularidade  != null && <ScoreChip label="Singularidade"  value={diag.score_singularidade}  />}
                      {diag.score_consistencia   != null && <ScoreChip label="Consistência"   value={diag.score_consistencia}   />}
                      {diag.score_posicionamento != null && <ScoreChip label="Posicionamento" value={diag.score_posicionamento} />}
                    </Box>
                  </Paper>
                ))}
              </Box>
            </>
          )}

          {/* ── Seção 2: Evolução ── */}
          <Box sx={{ mb: 5 }}>
            <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 2 }}>Evolução de scores</Typography>
            <SecaoEvolucao diagnosticos={diagnosticos} />
          </Box>

          {/* ── Seção 3: Concorrentes ── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Typography variant="overline" color="text.disabled">Inteligência Competitiva</Typography>
              {!checkPlano(workspace, 'concorrentes') && (
                <Chip label="Pro+" size="small" sx={{ bgcolor: 'rgba(232,24,90,0.1)', color: '#E8185A', fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
              )}
            </Box>
            {checkPlano(workspace, 'concorrentes') ? (
              <SecaoConcorrentes workspace={workspace} />
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography fontWeight={800} mb={1}>Disponível no plano Pro+</Typography>
                <Typography variant="body2" color="text.secondary">
                  Compare sua marca com os principais concorrentes do setor e visualize o território de mercado.
                </Typography>
              </Paper>
            )}
          </Box>
        </>
      )}

      {/* ── Form dialog ── */}
      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} onStart={iniciarStream} />

    </Box>
  )
}
