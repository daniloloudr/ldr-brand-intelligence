import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button, MenuItem,
  Tab, Tabs, Chip, CircularProgress, Alert, IconButton, Select, FormControl,
  InputLabel, Paper, Divider, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Tooltip,
} from '@mui/material'
import DeleteIcon      from '@mui/icons-material/DeleteOutline'
import EditIcon        from '@mui/icons-material/EditOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useWorkspace }    from '../../lib/WorkspaceContext'
import { supabase }        from '../../lib/supabase'
import { PLANOS }          from '../../lib/constants'
import { redirectToCheckout } from '../../lib/stripe'
import { PageHeader }     from '../../components/shell/PageHeader'

const SETORES = ["Tecnologia","Saúde","Educação","Finanças","Varejo","Fashion","Indústria","Serviços","Alimentação","Imóveis","Logística","Mídia","Energia","Agronegócio","Outro"]
const PORTES  = ["Startup","PME","Médio porte","Grande empresa"]
const ROLES   = ['admin', 'member']
const ROLE_LABEL = { admin: 'Administrador', member: 'Membro' }

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
  const [error, setError]       = useState('')
  const [email, setEmail]       = useState('')
  const [convMsg, setConvMsg]   = useState('')
  const [editing, setEditing]   = useState(null) // { membro }
  const [editRole, setEditRole] = useState('member')
  const [saving, setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null) // { membro }
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadMembros() }, [workspace.id])

  async function loadMembros() {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada.')
      const res = await fetch(`/.netlify/functions/workspace-members?workspace_id=${workspace.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const { members } = await res.json()
      setMembros(members || [])
    } catch (e) {
      setError(e.message || 'Erro ao carregar membros.')
    } finally {
      setLoading(false)
    }
  }

  async function convidar(e) {
    e.preventDefault()
    if (!email) return
    setConvMsg('Funcionalidade de convite via e-mail requer Edge Function. O link de convite foi copiado.')
    const link = `${window.location.origin}/#/register?workspace=${workspace.id}`
    navigator.clipboard.writeText(link).catch(() => {})
    setEmail('')
  }

  function abrirEditar(m) {
    setEditing(m)
    setEditRole(m.role || 'member')
  }

  async function salvarEdicao() {
    if (!editing) return
    setSaving(true)
    try {
      await supabase.from('workspace_members').update({ role: editRole }).eq('id', editing.id)
      setEditing(null)
      await loadMembros()
    } finally {
      setSaving(false)
    }
  }

  async function confirmarRemocao() {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await supabase.from('workspace_members').delete().eq('id', confirmDel.id)
      setConfirmDel(null)
      await loadMembros()
    } finally {
      setDeleting(false)
    }
  }

  const plano  = PLANOS[workspace.plano] || PLANOS.trial
  const limite = plano.membros === Infinity ? '∞' : plano.membros

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {membros.length}/{limite} membros no plano {plano.nome}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {convMsg && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setConvMsg('')}>{convMsg}</Alert>}

      <Box component="form" onSubmit={convidar} sx={{ display: 'flex', gap: 1.5, mb: 3, maxWidth: 560 }}>
        <TextField
          fullWidth size="small" label="E-mail do convidado"
          value={email} onChange={e => setEmail(e.target.value)} type="email"
        />
        <Button type="submit" variant="contained" color="primary" sx={{ whiteSpace: 'nowrap', fontWeight: 800 }}>
          Convidar
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <Paper sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>E-mail</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>Acesso</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12, width: 110 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {membros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.disabled', fontSize: 13 }}>
                    Nenhum membro ainda.
                  </TableCell>
                </TableRow>
              ) : (
                membros.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>
                      {m.nome || <span style={{ color: '#8A9AB0' }}>—</span>}
                      {m.is_self && <Chip label="você" size="small" sx={{ ml: 1, height: 16, fontSize: 9 }} />}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {m.email || <span style={{ color: '#8A9AB0' }}>—</span>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      <Chip
                        label={ROLE_LABEL[m.role] || m.role}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: 11,
                          bgcolor: m.role === 'admin' ? 'rgba(13,158,122,0.12)' : 'action.hover',
                          color:   m.role === 'admin' ? 'primary.main' : 'text.secondary',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => abrirEditar(m)} sx={{ color: 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={m.is_self ? 'Não é possível remover você mesmo' : 'Remover'}>
                        <span>
                          <IconButton size="small" disabled={m.is_self}
                            onClick={() => setConfirmDel(m)}
                            sx={{ color: 'error.main', '&.Mui-disabled': { color: 'action.disabled' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Editar acesso */}
      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Editar acesso</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: 13 }}>
            {editing?.nome || editing?.email || 'Membro'}
          </DialogContentText>
          <FormControl fullWidth size="small">
            <InputLabel>Acesso</InputLabel>
            <Select value={editRole} label="Acesso" onChange={e => setEditRole(e.target.value)}>
              {ROLES.map(r => <MenuItem key={r} value={r}>{ROLE_LABEL[r]}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditing(null)} disabled={saving} color="inherit">Cancelar</Button>
          <Button onClick={salvarEdicao} disabled={saving} variant="contained" sx={{ fontWeight: 800 }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar remoção */}
      <Dialog open={Boolean(confirmDel)} onClose={() => !deleting && setConfirmDel(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Remover membro?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13 }}>
            Você tem certeza que deseja remover <strong>{confirmDel?.nome || confirmDel?.email || 'este membro'}</strong> do workspace?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDel(null)} disabled={deleting} color="inherit">Cancelar</Button>
          <Button onClick={confirmarRemocao} disabled={deleting} variant="contained" color="error" sx={{ fontWeight: 800 }}>
            {deleting ? 'Removendo…' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>
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

function PageShell({ title, subtitle, children }) {
  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle} />
      <Box sx={{ p: 4, maxWidth: 720 }}>{children}</Box>
    </Box>
  )
}

export function ContaPage() {
  const { workspace, reload } = useWorkspace()
  if (!workspace) return null
  return (
    <PageShell title="Configurações da conta" subtitle={`Workspace · ${workspace.nome}`}>
      <TabEmpresa workspace={workspace} reload={reload} />
    </PageShell>
  )
}

export function TimePage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return (
    <PageShell title="Gestão de time" subtitle={`Workspace · ${workspace.nome}`}>
      <TabEquipe workspace={workspace} />
    </PageShell>
  )
}

export function PlanoPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return (
    <PageShell title="Plano e cobrança" subtitle={`Workspace · ${workspace.nome}`}>
      <TabPlano workspace={workspace} />
    </PageShell>
  )
}

export function AlertasPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return (
    <PageShell title="Alertas" subtitle={`Workspace · ${workspace.nome}`}>
      <TabAlertas workspace={workspace} />
    </PageShell>
  )
}

// Compat shim: a página antiga `WorkspacePage` redireciona pra Conta.
export function WorkspacePage() {
  if (typeof window !== 'undefined') window.location.hash = '#/app/conta'
  return null
}
