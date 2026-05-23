import { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, CircularProgress, Button,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Paper, Divider, LinearProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label,
} from 'recharts'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { PLANOS } from '../../lib/constants'
import { fmtDate } from '../../lib/helpers'

const CORES = ['#0D9E7A', '#7F77DD', '#EF9F27', '#E8185A', '#4FC3F7']

function ScoreBar({ value, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={(value ?? 0) * 10}
        sx={{
          flex: 1, height: 6, borderRadius: 1,
          bgcolor: 'divider',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
      <Typography variant="caption" fontWeight={700} sx={{ color, minWidth: 20 }}>
        {value ?? '—'}
      </Typography>
    </Box>
  )
}

function CustomScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <Paper sx={{ p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', minWidth: 160 }}>
      <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>{d.nome}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Singularidade: {d.x}/10
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Posicionamento: {d.y}/10
      </Typography>
    </Paper>
  )
}

export function Concorrentes() {
  const { workspace } = useWorkspace()
  const [loading, setLoading]         = useState(true)
  const [concorrentes, setConcorrentes] = useState([])
  const [diags, setDiags]             = useState([])
  const [workspaceDiag, setWorkspaceDiag] = useState(null)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [nome, setNome]               = useState('')
  const [dominio, setDominio]         = useState('')
  const [saving, setSaving]           = useState(false)

  const plano    = PLANOS[workspace?.plano] || PLANOS.trial
  const limite   = plano.concorrentes || 0

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id])

  async function load() {
    setLoading(true)
    const [{ data: concs }, { data: concDiags }, { data: wsDiag }] = await Promise.all([
      supabase
        .from('concorrentes')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('ativo', true)
        .order('created_at'),
      supabase
        .from('diagnosticos_concorrentes')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('diagnosticos')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    setConcorrentes(concs || [])
    setDiags(concDiags || [])
    setWorkspaceDiag(wsDiag || null)
    setLoading(false)
  }

  async function addConcorrente() {
    if (!nome.trim()) return
    setSaving(true)
    await supabase.from('concorrentes').insert({
      workspace_id: workspace.id,
      nome: nome.trim(),
      dominio: dominio.trim() || null,
      ativo: true,
    })
    setNome('')
    setDominio('')
    setDialogOpen(false)
    setSaving(false)
    load()
  }

  async function removeConcorrente(id) {
    await supabase.from('concorrentes').update({ ativo: false }).eq('id', id)
    setConcorrentes(prev => prev.filter(c => c.id !== id))
  }

  function getLastDiag(concorrenteId) {
    return diags.find(d => d.concorrente_id === concorrenteId) || null
  }

  // Territory Map data — minha marca + concorrentes
  const scatterData = [
    ...(workspaceDiag ? [{
      nome: workspace?.nome || 'Minha marca',
      x: workspaceDiag.score_singularidade || 5,
      y: workspaceDiag.score_posicionamento || 5,
      z: 200,
      cor: '#0D9E7A',
      isSelf: true,
    }] : []),
    ...concorrentes.map((c, i) => {
      const d = getLastDiag(c.id)
      return {
        nome: c.nome,
        x: d?.score_singularidade || 5,
        y: d?.score_posicionamento || 5,
        z: 150,
        cor: CORES[(i + 1) % CORES.length],
        isSelf: false,
      }
    }),
  ]

  const DIMENSOES = [
    { key: 'score_singularidade',  label: 'Singularidade'  },
    { key: 'score_consistencia',   label: 'Consistência'   },
    { key: 'score_posicionamento', label: 'Posicionamento' },
  ]

  return (
    <Box sx={{ p: 4 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">Inteligência Competitiva</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Compare sua marca com os principais concorrentes do setor.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          disabled={concorrentes.length >= limite}
          onClick={() => setDialogOpen(true)}
          sx={{ fontWeight: 800, flexShrink: 0 }}
        >
          Adicionar
        </Button>
      </Box>

      {/* Limite */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Concorrentes: {concorrentes.length}/{limite}
        </Typography>
        {concorrentes.length >= limite && limite > 0 && (
          <Chip label="Limite atingido" size="small"
            sx={{ bgcolor: 'rgba(239,159,39,0.1)', color: '#EF9F27', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <>
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
                <Typography variant="overline" color="text.disabled" display="block" mb={0.5}>
                  Territory Map — Singularidade × Posicionamento
                </Typography>
                <Typography variant="caption" color="text.disabled" display="block" mb={2}>
                  Scores gerados nos diagnósticos. Concorrentes sem diagnóstico aparecem no centro.
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
                    <Tooltip content={<CustomScatterTooltip />} />
                    {scatterData.map((d, i) => (
                      <Scatter
                        key={d.nome}
                        name={d.nome}
                        data={[d]}
                        fill={d.cor}
                        opacity={d.isSelf ? 1 : 0.7}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>

                {/* Legenda */}
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

              {/* Score comparison table */}
              <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="overline" color="text.disabled">Gap Analysis — Scores por dimensão</Typography>
                </Box>

                {/* Header row */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: `180px repeat(${concorrentes.length + 1}, 1fr)`,
                  gap: 0,
                  bgcolor: 'background.default',
                  borderBottom: '1px solid', borderColor: 'divider',
                  px: 2.5, py: 1,
                }}>
                  <Typography variant="caption" color="text.disabled" fontWeight={700}>Dimensão</Typography>
                  <Typography variant="caption" fontWeight={800} sx={{ color: '#0D9E7A' }}>
                    {workspace?.nome || 'Sua marca'}
                  </Typography>
                  {concorrentes.map(c => (
                    <Typography key={c.id} variant="caption" fontWeight={700} color="text.secondary">{c.nome}</Typography>
                  ))}
                </Box>

                {DIMENSOES.map((dim, di) => (
                  <Box key={dim.key} sx={{
                    display: 'grid',
                    gridTemplateColumns: `180px repeat(${concorrentes.length + 1}, 1fr)`,
                    gap: 0,
                    px: 2.5, py: 1.5,
                    borderBottom: di < DIMENSOES.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    alignItems: 'center',
                  }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{dim.label}</Typography>
                    <ScoreBar value={workspaceDiag?.[dim.key]} color="#0D9E7A" />
                    {concorrentes.map(c => {
                      const d = getLastDiag(c.id)
                      return <ScoreBar key={c.id} value={d?.[dim.key]} color="#7F77DD" />
                    })}
                  </Box>
                ))}
              </Card>

              {/* Lista de concorrentes */}
              <Typography variant="overline" color="text.disabled" display="block" mb={1.5}>
                Concorrentes monitorados
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {concorrentes.map((c, i) => {
                  const d = getLastDiag(c.id)
                  return (
                    <Card key={c.id} sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CORES[(i + 1) % CORES.length], flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={800} fontSize={14}>{c.nome}</Typography>
                            {c.dominio && (
                              <Typography variant="caption" color="text.disabled">{c.dominio}</Typography>
                            )}
                          </Box>
                          {d ? (
                            <Box sx={{ display: 'flex', gap: 0.75 }}>
                              <Chip label={`S: ${d.score_singularidade}`} size="small"
                                sx={{ bgcolor: 'rgba(13,158,122,0.08)', color: 'primary.main', fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                              <Chip label={`P: ${d.score_posicionamento}`} size="small"
                                sx={{ bgcolor: 'rgba(127,119,221,0.08)', color: '#7F77DD', fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                            </Box>
                          ) : (
                            <Chip label="Sem diagnóstico" size="small"
                              sx={{ bgcolor: 'background.default', color: 'text.disabled', fontSize: '0.6rem', height: 18 }} />
                          )}
                          <IconButton size="small" onClick={() => removeConcorrente(c.id)}
                            sx={{ color: 'text.disabled', '&:hover': { color: 'secondary.main' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        {d && (
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                            Diagnóstico em {fmtDate(d.created_at)}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </Box>
            </>
          )}
        </>
      )}

      {/* Dialog adicionar concorrente */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Adicionar concorrente</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome da empresa"
            fullWidth
            value={nome}
            onChange={e => setNome(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            autoFocus
          />
          <TextField
            label="Domínio (opcional)"
            fullWidth
            value={dominio}
            onChange={e => setDominio(e.target.value)}
            placeholder="empresa.com.br"
          />
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
            O diagnóstico do concorrente será gerado automaticamente pelo monitor no próximo ciclo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={addConcorrente} disabled={saving || !nome.trim()}>
            {saving ? 'Salvando…' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
