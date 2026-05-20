import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button, MenuItem,
  Tab, Tabs, Chip, CircularProgress, Alert, IconButton, Select, FormControl,
  InputLabel, Paper, Divider, LinearProgress,
} from '@mui/material'
import DeleteIcon      from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useWorkspace }    from '../../lib/WorkspaceContext'
import { supabase }        from '../../lib/supabase'
import { PLANOS }          from '../../lib/constants'
import { redirectToCheckout } from '../../lib/stripe'

const SETORES = ["Tecnologia","Saúde","Educação","Finanças","Varejo","Fashion","Indústria","Serviços","Alimentação","Imóveis","Logística","Mídia","Energia","Agronegócio","Outro"]
const PORTES  = ["Startup","PME","Médio porte","Grande empresa"]
const ROLES   = ['admin', 'member']

function TabEmpresa({ workspace, reload }) {
  const [form, setForm]       = useState({ nome: workspace.nome || '', dominio: workspace.dominio || '', setor: workspace.setor || '', porte: workspace.porte || '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    if (!form.nome) return
    setLoading(true); setMsg('')
    await supabase.from('workspaces').update(form).eq('id', workspace.id)
    await reload()
    setMsg('Salvo!')
    setLoading(false)
  }

  return (
    <Box component="form" onSubmit={save} sx={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {msg && <Alert severity="success" sx={{ borderRadius: 2 }}>{msg}</Alert>}
      <TextField fullWidth label="Nome da empresa *" value={form.nome} onChange={setF('nome')} required />
      <TextField fullWidth label="Domínio" value={form.dominio} onChange={setF('dominio')} placeholder="www.empresa.com.br" />
      <TextField fullWidth select label="Setor" value={form.setor} onChange={setF('setor')}>
        <MenuItem value="">Selecione...</MenuItem>
        {SETORES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>
      <TextField fullWidth select label="Porte" value={form.porte} onChange={setF('porte')}>
        <MenuItem value="">Selecione...</MenuItem>
        {PORTES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
      </TextField>
      <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ alignSelf: 'flex-start', fontWeight: 800, px: 3 }}>
        {loading ? <CircularProgress size={16} color="inherit" /> : 'Salvar alterações'}
      </Button>
    </Box>
  )
}

function TabEquipe({ workspace }) {
  const [membros, setMembros]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [email, setEmail]       = useState('')
  const [convMsg, setConvMsg]   = useState('')

  useEffect(() => { loadMembros() }, [workspace.id])

  async function loadMembros() {
    setLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('id, role, user_id, created_at')
      .eq('workspace_id', workspace.id)
    setMembros(data || [])
    setLoading(false)
  }

  async function convidar(e) {
    e.preventDefault()
    if (!email) return
    setConvMsg('Funcionalidade de convite via e-mail requer Edge Function. O link de convite foi copiado.')
    const link = `${window.location.origin}/#/register?workspace=${workspace.id}`
    navigator.clipboard.writeText(link).catch(() => {})
    setEmail('')
  }

  async function remover(membroId) {
    await supabase.from('workspace_members').delete().eq('id', membroId)
    await loadMembros()
  }

  async function mudarRole(membroId, role) {
    await supabase.from('workspace_members').update({ role }).eq('id', membroId)
    await loadMembros()
  }

  const plano  = PLANOS[workspace.plano] || PLANOS.trial
  const limite = plano.membros === Infinity ? '∞' : plano.membros

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {membros.length}/{limite} membros no plano {plano.nome}
        </Typography>
      </Box>

      {convMsg && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setConvMsg('')}>{convMsg}</Alert>}

      <Box component="form" onSubmit={convidar} sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <TextField
          fullWidth size="small" label="E-mail do convidado"
          value={email} onChange={e => setEmail(e.target.value)} type="email"
        />
        <Button type="submit" variant="outlined" color="primary" sx={{ whiteSpace: 'nowrap', fontWeight: 800 }}>
          Convidar
        </Button>
      </Box>

      {loading ? <CircularProgress size={20} /> : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {membros.map(m => (
            <Paper key={m.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>ID: {m.user_id?.slice(0, 8)}…</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(m.created_at).toLocaleDateString('pt-BR')}</Typography>
              </Box>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select value={m.role} onChange={e => mudarRole(m.id, e.target.value)} sx={{ fontSize: 12 }}>
                  {ROLES.map(r => <MenuItem key={r} value={r} sx={{ fontSize: 12 }}>{r}</MenuItem>)}
                </Select>
              </FormControl>
              <IconButton size="small" color="error" onClick={() => remover(m.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}

function TabPlano({ workspace }) {
  const [loadingUpgrade, setLoadingUpgrade] = useState(null)
  const planoAtual = PLANOS[workspace.plano] || PLANOS.trial
  const uso        = workspace.diagnosticos_mes || 0
  const limite     = planoAtual.diagnosticos_mes === Infinity ? null : planoAtual.diagnosticos_mes
  const usoPct     = limite ? Math.min((uso / limite) * 100, 100) : 0

  async function upgrade(plano) {
    setLoadingUpgrade(plano)
    try {
      await redirectToCheckout(workspace.id, plano)
    } catch (e) {
      setLoadingUpgrade(null)
    }
  }

  const OPCOES = [
    { key: 'starter',    destaque: false },
    { key: 'pro',        destaque: true  },
    { key: 'enterprise', destaque: false },
  ]

  return (
    <Box sx={{ maxWidth: 700 }}>
      {/* Uso atual */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em" mb={1}>
          Plano atual: {planoAtual.nome}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: limite ? 1 : 0 }}>
          <Typography fontWeight={900} fontSize={28} sx={{ color: 'primary.main' }}>
            {planoAtual.preco === 0 ? 'Grátis' : `R$${planoAtual.preco.toLocaleString('pt-BR')}/mês`}
          </Typography>
        </Box>
        {limite && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Diagnósticos este mês</Typography>
              <Typography variant="caption" fontWeight={700}>{uso}/{limite}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={usoPct} color={usoPct >= 100 ? 'secondary' : 'primary'} sx={{ height: 6, borderRadius: 3, bgcolor: 'divider' }} />
          </>
        )}
      </Paper>

      {/* Opções de upgrade */}
      {workspace.plano !== 'enterprise' && (
        <>
          <Typography variant="body2" color="text.secondary" fontWeight={700} mb={2} textTransform="uppercase" letterSpacing="0.08em">
            Fazer upgrade
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {OPCOES.filter(o => o.key !== workspace.plano).map(({ key, destaque }) => {
              const p = PLANOS[key]
              return (
                <Card key={key} sx={{ border: '2px solid', borderColor: destaque ? 'secondary.main' : 'divider', borderRadius: 3, position: 'relative' }}>
                  {destaque && (
                    <Chip label="Recomendado" color="secondary" size="small"
                      sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontWeight: 700, fontSize: 10 }} />
                  )}
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography fontWeight={900} fontSize={13} textTransform="uppercase" letterSpacing="0.1em">{p.nome}</Typography>
                    <Typography fontWeight={900} fontSize={24} letterSpacing="-0.02em" my={0.5}>
                      R${p.preco.toLocaleString('pt-BR')}
                      <Typography component="span" fontSize={11} color="text.secondary">/mês</Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                      {p.diagnosticos_mes === Infinity ? 'Diagnósticos ilimitados' : `${p.diagnosticos_mes} diagnóstico${p.diagnosticos_mes > 1 ? 's' : ''}/mês`}
                    </Typography>
                    <Button fullWidth variant={destaque ? 'contained' : 'outlined'} color={destaque ? 'secondary' : 'primary'}
                      onClick={() => upgrade(key)}
                      disabled={loadingUpgrade === key}
                      sx={{ fontWeight: 800, fontSize: 12, py: 1 }}>
                      {loadingUpgrade === key ? <CircularProgress size={14} color="inherit" /> : `Assinar ${p.nome}`}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        </>
      )}
    </Box>
  )
}

function TabAlertas({ workspace }) {
  const [config, setConfig]   = useState({ email_alertas: true, slack_webhook: '', frequencia: 'diario' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('workspaces').update({ dados_alertas: config }).eq('id', workspace.id)
    setMsg('Configurações salvas!')
    setLoading(false)
  }

  return (
    <Box component="form" onSubmit={save} sx={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {msg && <Alert severity="success" sx={{ borderRadius: 2 }}>{msg}</Alert>}
      <TextField fullWidth select label="Frequência de alertas" value={config.frequencia}
        onChange={e => setConfig(c => ({ ...c, frequencia: e.target.value }))}>
        <MenuItem value="diario">Diário</MenuItem>
        <MenuItem value="semanal">Semanal</MenuItem>
        <MenuItem value="imediato">Imediato</MenuItem>
      </TextField>
      <TextField fullWidth label="Slack Webhook URL" value={config.slack_webhook}
        onChange={e => setConfig(c => ({ ...c, slack_webhook: e.target.value }))}
        placeholder="https://hooks.slack.com/services/..." />
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Alertas por e-mail são enviados automaticamente para todos os membros do workspace.
      </Alert>
      <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ alignSelf: 'flex-start', fontWeight: 800, px: 3 }}>
        {loading ? <CircularProgress size={16} color="inherit" /> : 'Salvar configurações'}
      </Button>
    </Box>
  )
}

const TABS = [
  { label: 'Empresa' },
  { label: 'Equipe' },
  { label: 'Plano' },
  { label: 'Alertas' },
]

export function WorkspacePage() {
  const { workspace, reload } = useWorkspace()
  const [tab, setTab]         = useState(0)

  if (!workspace) return null

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">Workspace</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{workspace.nome}</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} sx={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13 }} />
          ))}
        </Tabs>
      </Box>

      {tab === 0 && <TabEmpresa workspace={workspace} reload={reload} />}
      {tab === 1 && <TabEquipe  workspace={workspace} />}
      {tab === 2 && <TabPlano   workspace={workspace} />}
      {tab === 3 && <TabAlertas workspace={workspace} />}
    </Box>
  )
}
