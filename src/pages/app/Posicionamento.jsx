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
import ErrorOutlineIcon          from '@mui/icons-material/ErrorOutline'
import LightbulbOutlinedIcon     from '@mui/icons-material/LightbulbOutlined'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Label,
} from 'recharts'

import { useWorkspace }      from '../../lib/WorkspaceContext'
import { supabase }          from '../../lib/supabase'
import { PLANOS }            from '../../lib/constants'
import { fmtDate, sc, checkPlano } from '../../lib/helpers'
import { RelatorioCompleto }  from '../../components/RelatorioCompleto'
import { IdentityGapCard }    from '../../components/intelligence/IdentityGapCard'
import { PageHeader }         from '../../components/shell/PageHeader'

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

const STEPS = [
  'Pesquisando o site e fontes públicas...',
  'Aplicando framework Smart Branding...',
  'Calculando scores de singularidade e consistência...',
  'Mapeando gaps de identidade...',
  'Identificando oportunidades estratégicas...',
  'Finalizando o diagnóstico...',
]

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

function FormDialog({ open, onClose, onStart, workspace }) {
  const [contexto, setContexto] = useState('')

  const empresa = workspace?.dominio || workspace?.nome || ''

  function handleSubmit(e) {
    e.preventDefault()
    onStart(contexto.trim())
    setContexto('')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, pb: 0 }}>Novo diagnóstico</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Diagnóstico para <Box component="strong" sx={{ color: 'text.primary' }}>{workspace?.nome}</Box>
            {workspace?.dominio ? ` (${workspace.dominio})` : ''}. O agent pesquisará:
          </Typography>
          <Box component="ul" sx={{ m: 0, mb: 2.5, pl: 2.5, color: 'text.secondary' }}>
            {['Site oficial e proposta de valor', 'LinkedIn — cultura, vagas e posicionamento', 'Reputação pública — Reviews, Reclame Aqui, Glassdoor', 'Redes sociais e tom de voz', 'Concorrentes diretos e diferenciação'].map(f => (
              <Box component="li" key={f} sx={{ fontSize: 13, mb: 0.25 }}>{f}</Box>
            ))}
          </Box>
          <TextField
            label="Contexto adicional (opcional)"
            placeholder="Ex: startup B2B de logística, principal concorrente é a Loggi"
            fullWidth multiline rows={3}
            value={contexto}
            onChange={e => setContexto(e.target.value)}
            autoFocus
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

  async function addSugestao(sugestao) {
    if (concorrentes.length >= limite) return
    await supabase.from('concorrentes').insert({ workspace_id: workspace.id, nome: sugestao.nome, dominio: null, ativo: true })
    load()
  }

  async function removeConcorrente(id) {
    await supabase.from('concorrentes').update({ ativo: false }).eq('id', id)
    setConcorrentes(prev => prev.filter(c => c.id !== id))
  }

  function getLastDiag(concId) {
    const d = diags.find(x => x.concorrente_id === concId)
    if (!d) return null
    const s = d.scores || {}, dados = d.dados || {}
    return {
      ...d,
      score_singularidade:  s.singularidade  ?? dados.score_singularidade,
      score_consistencia:   s.consistencia   ?? dados.score_consistencia,
      score_posicionamento: s.posicionamento ?? dados.score_posicionamento,
    }
  }

  function getIntel(nome) {
    const lista = workspaceDiag?.data?.concorrentes || []
    return lista.find(c =>
      c.nome?.toLowerCase().includes(nome.toLowerCase()) ||
      nome.toLowerCase().includes(c.nome?.toLowerCase())
    ) || null
  }

  const sugeridos = (workspaceDiag?.data?.concorrentes || []).filter(s =>
    !concorrentes.some(c => c.nome.toLowerCase() === s.nome.toLowerCase())
  )

  const AMEACA_CFG = {
    alta:   { label: 'Alta',   color: '#E8185A', bg: 'rgba(232,24,90,0.1)'   },
    media:  { label: 'Média',  color: '#EF9F27', bg: 'rgba(239,159,39,0.1)'  },
    baixa:  { label: 'Baixa',  color: '#0D9E7A', bg: 'rgba(13,158,122,0.1)'  },
  }

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

      {/* Sugestões do diagnóstico */}
      {sugeridos.length > 0 && concorrentes.length < limite && (
        <Paper sx={{ p: 2, mb: 2.5, border: '1px solid', borderColor: 'primary.main', borderRadius: 2, bgcolor: 'rgba(13,158,122,0.04)' }}>
          <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ display: 'block', mb: 1 }}>
            Detectados no último diagnóstico — clique para adicionar
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {sugeridos.slice(0, limite - concorrentes.length).map(s => (
              <Chip
                key={s.nome}
                label={s.nome}
                size="small"
                variant="outlined"
                color="primary"
                icon={<AddIcon />}
                onClick={() => addSugestao(s)}
                sx={{ cursor: 'pointer', fontWeight: 700, '& .MuiChip-icon': { fontSize: 14 } }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Slots visuais */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5, mb: 3 }}>
        {concorrentes.map(c => {
          const intel = getIntel(c.nome)
          const ameacaCfg = intel?.ameaca ? AMEACA_CFG[intel.ameaca] : null
          return (
            <Card key={c.id} sx={{ p: 1.5, border: '1px solid', borderColor: ameacaCfg ? ameacaCfg.color + '55' : 'divider', position: 'relative', minHeight: 80 }}>
              <IconButton
                size="small"
                onClick={() => removeConcorrente(c.id)}
                sx={{ position: 'absolute', top: 2, right: 2, p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Typography fontWeight={800} fontSize={13} noWrap sx={{ pr: 2.5, mt: 0.25 }}>{c.nome}</Typography>
              {c.dominio && (
                <Typography variant="caption" color="text.secondary" noWrap display="block">{c.dominio}</Typography>
              )}
              {ameacaCfg && (
                <Chip label={`Ameaça ${ameacaCfg.label}`} size="small"
                  sx={{ mt: 0.75, height: 16, fontSize: '0.58rem', fontWeight: 800, bgcolor: ameacaCfg.bg, color: ameacaCfg.color }} />
              )}
              {intel?.diferencial && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}
                  sx={{ fontSize: '0.65rem', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {intel.diferencial}
                </Typography>
              )}
            </Card>
          )
        })}
        {concorrentes.length < limite && Array.from({ length: limite - concorrentes.length }).map((_, i) => (
          <Card key={`slot-${i}`} onClick={() => setDialogOpen(true)} sx={{
            minHeight: 64, border: '1px dashed', borderColor: 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(13,158,122,0.04)' },
          }}>
            <AddIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
          </Card>
        ))}
      </Box>

      {concorrentes.length > 0 && (
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

          {/* Inteligência Competitiva — dados do último diagnóstico */}
          {(() => {
            const matched   = concorrentes.map(c => ({ concorrente: c, intel: getIntel(c.nome) })).filter(x => x.intel)
            const opsConcorrentes = (workspaceDiag?.data?.oportunidades || []).filter(o =>
              o.impacto === 'alto' || o.pratica_loudr === 'inteligencia_singularidade'
            ).slice(0, 3)
            if (!matched.length && !opsConcorrentes.length) return null
            return (
              <>
                {matched.length > 0 && (
                  <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
                    <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorOutlineIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                      <Typography variant="overline" color="text.disabled">Ameaças & Movimentos Recentes</Typography>
                    </Box>
                    {[...matched].sort((a, b) => {
                      const ord = { alta: 0, media: 1, baixa: 2 }
                      return (ord[a.intel?.ameaca] ?? 3) - (ord[b.intel?.ameaca] ?? 3)
                    }).map(({ concorrente: c, intel }) => {
                      const cfg = AMEACA_CFG[intel.ameaca] || AMEACA_CFG.baixa
                      return (
                        <Box key={c.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography fontWeight={800} fontSize={13}>{c.nome}</Typography>
                            <Chip label={`Ameaça ${cfg.label}`} size="small"
                              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: cfg.bg, color: cfg.color }} />
                          </Box>
                          {intel.diferencial && (
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.4}>
                              <strong>Diferencial:</strong> {intel.diferencial}
                            </Typography>
                          )}
                          {intel.sinal && (
                            <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600 }}>
                              ↗ {intel.sinal}
                            </Typography>
                          )}
                        </Box>
                      )
                    })}
                  </Card>
                )}

                {opsConcorrentes.length > 0 && (
                  <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
                    <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LightbulbOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography variant="overline" color="text.disabled">Oportunidades Competitivas</Typography>
                    </Box>
                    {opsConcorrentes.map((op, i) => (
                      <Box key={i} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography fontWeight={800} fontSize={13}>{op.titulo}</Typography>
                          {op.impacto && (
                            <Chip label={op.impacto} size="small"
                              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
                                bgcolor: op.impacto === 'alto' ? 'rgba(13,158,122,0.1)' : 'rgba(239,159,39,0.1)',
                                color:   op.impacto === 'alto' ? '#0D9E7A' : '#EF9F27' }} />
                          )}
                          {op.prazo && (
                            <Typography variant="caption" color="text.disabled">{op.prazo}</Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">{op.descricao}</Typography>
                      </Box>
                    ))}
                  </Card>
                )}
              </>
            )
          })()}
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
  const { workspace } = useWorkspace()

  const [estado, setEstado]         = useState('lista')
  const [diagnosticos, setDiagnosticos] = useState([])
  const [loadingList, setLoadingList]   = useState(true)
  const [selectedDiag, setSelectedDiag] = useState(null)
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [formOpen, setFormOpen]     = useState(false)

  // server-side generation state
  const [gerando, setGerando]         = useState(false)
  const [gerandoStep, setGerandoStep] = useState(0)
  const [gerandoErro, setGerandoErro] = useState('')

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

  // Cycle through search steps while generating
  useEffect(() => {
    if (!gerando) return
    const id = setInterval(() => setGerandoStep(s => s + 1), 8000)
    return () => clearInterval(id)
  }, [gerando])

  const plano          = workspace ? (PLANOS[workspace.plano] || PLANOS.trial) : PLANOS.trial
  const limiteAtingido = workspace ? workspace.diagnosticos_mes >= plano.diagnosticos_mes : false

  function abrirForm() {
    if (limiteAtingido) { setError('Limite do plano atingido. Faça upgrade para continuar gerando diagnósticos.'); return }
    setError('')
    setFormOpen(true)
  }

  function pollForDiagnostico(since) {
    const MAX_WAIT = 180_000
    const start = Date.now()
    return new Promise((resolve, reject) => {
      const check = async () => {
        if (Date.now() - start > MAX_WAIT) {
          reject(new Error('O diagnóstico demorou mais que o esperado. Tente novamente.'))
          return
        }
        const { data } = await supabase
          .from('diagnosticos')
          .select('*')
          .eq('workspace_id', workspace.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) {
          if (data.data?._job_error) reject(new Error(data.data.error || 'Erro ao gerar diagnóstico.'))
          else resolve(data)
        } else {
          setTimeout(check, 3000)
        }
      }
      setTimeout(check, 3000)
    })
  }

  async function iniciar(contexto) {
    setFormOpen(false)
    setGerandoErro('')
    setGerandoStep(0)
    setGerando(true)
    const since = new Date().toISOString()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')
      const res = await fetch('/.netlify/functions/diagnostico-gerar-background', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ workspace_id: workspace.id, contexto: contexto || null }),
      })
      if (res.status === 401) throw new Error('Sessão expirada. Faça login novamente.')
      if (res.status === 403) throw new Error('Sem acesso ao workspace.')
      if (!res.ok && res.status !== 202) throw new Error(`Erro ${res.status}`)
      const diag = await pollForDiagnostico(since)
      await fetchDiagnosticos()
      setSelectedDiag({ ...diag, data: diag.data || {} })
      setGerando(false)
      setEstado('relatorio')
    } catch (e) {
      setGerandoErro(e.message || 'Erro inesperado. Tente novamente.')
    }
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

  if (gerando) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 4 }, py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textAlign: 'center' }}>
        {gerandoErro ? (
          <>
            <WarningAmberOutlinedIcon sx={{ fontSize: 48, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6" fontWeight={900} mb={1}>Erro ao gerar diagnóstico</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>{gerandoErro}</Typography>
            </Box>
            <Button variant="contained" onClick={() => { setGerando(false); setGerandoErro('') }}>
              Voltar
            </Button>
          </>
        ) : (
          <>
            <Box sx={{ position: 'relative', width: 80, height: 80 }}>
              <CircularProgress size={80} thickness={1.5} color="primary" sx={{ position: 'absolute', top: 0, left: 0 }} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AssessmentOutlinedIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={900} mb={0.75}>Gerando diagnóstico</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ minHeight: 22 }}>
                {STEPS[gerandoStep % STEPS.length]}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.disabled">
              Pode fechar esta aba com segurança — o diagnóstico continuará no servidor
            </Typography>
          </>
        )}
      </Box>
    )
  }

  // ── lista (página principal) ───────────────────────────────────────────────

  const ultimo   = diagnosticos[0] || null
  const restante = diagnosticos.slice(1)

  return (
    <Box>
      <PageHeader
        title="Posicionamento"
        subtitle={plano.diagnosticos_mes === Infinity
          ? `${workspace?.diagnosticos_mes ?? 0} diagnósticos gerados este mês · ilimitado`
          : `${workspace?.diagnosticos_mes ?? 0} de ${plano.diagnosticos_mes} usados este mês · plano ${plano.nome}`}
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />} endIcon={<ArrowForwardIcon />} onClick={abrirForm} sx={{ fontWeight: 800 }}>
            Gerar novo diagnóstico
          </Button>
        }
      />
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

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
                <Chip label="Starter+" size="small" sx={{ bgcolor: 'rgba(232,24,90,0.1)', color: '#E8185A', fontWeight: 800, fontSize: '0.6rem', height: 18 }} />
              )}
            </Box>
            {checkPlano(workspace, 'concorrentes') ? (
              <SecaoConcorrentes workspace={workspace} />
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography fontWeight={800} mb={1}>Disponível no plano Starter+</Typography>
                <Typography variant="body2" color="text.secondary">
                  Compare sua marca com os principais concorrentes do setor e visualize o território de mercado.
                </Typography>
              </Paper>
            )}
          </Box>
        </>
      )}

      {/* ── Form dialog ── */}
      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} onStart={iniciar} workspace={workspace} />

      </Box>
    </Box>
  )
}
