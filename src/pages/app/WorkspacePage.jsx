import { useState, useEffect } from 'react'
import { navigate } from '../../lib/helpers';
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
import {
  IMAGE_GUIDE, VIDEO_GUIDE, OP_GUIDE,
  creditsForImage, creditsForVideo, creditsForOp,
} from '../../lib/credits'
import { durLabel } from '../../lib/videoModels'
import { PageHeader }     from '../../components/shell/PageHeader'
import { PALETTE } from '../../lib/theme'

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
                      {m.nome || <Typography component="span" sx={{ color: PALETTE.neutral[400] }}>—</Typography>}
                      {m.is_self && <Chip label="você" size="small" sx={{ ml: 1, height: 16, fontSize: 9 }} />}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {m.email || <Typography component="span" sx={{ color: PALETTE.neutral[400] }}>—</Typography>}
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
                        <Typography component="span">
                          <IconButton size="small" disabled={m.is_self}
                            onClick={() => setConfirmDel(m)}
                            sx={{ color: 'error.main', '&.Mui-disabled': { color: 'action.disabled' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Typography>
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

function CreditRow({ label, beneficio, creditos }) {
  return (
    <TableRow>
      <TableCell sx={{ py: 1 }}>
        <Typography variant="subtitle2">{label}</Typography>
        {beneficio && <Typography variant="caption" color="text.secondary">{beneficio}</Typography>}
      </TableCell>
      <TableCell align="right" sx={{ py: 1, whiteSpace: 'nowrap' }}>
        <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>{creditos}</Typography>
      </TableCell>
    </TableRow>
  )
}

const OP_LABEL = { image: 'Imagem', video: 'Vídeo', content: 'Conteúdo', campaign: 'Campanha', upscale: 'Ampliar', removebg: 'Remover fundo', variation: 'Variação', ciclo: 'Recarga mensal' }
const TIPO_LABEL = { refill: 'Recarga', refund: 'Estorno', grant: 'Bônus' }

function TabPlano({ workspace }) {
  const [saldo, setSaldo]     = useState(null)   // null = ainda não inicializado (pool cheio)
  const [reset, setReset]     = useState(null)
  const [txs, setTxs]         = useState(null)
  const planoKey   = PLANOS[workspace.plano] ? workspace.plano : 'trial'
  const planoAtual = PLANOS[planoKey]

  useEffect(() => {
    let on = true
    ;(async () => {
      const [{ data: ws }, { data: log }] = await Promise.all([
        supabase.from('workspaces').select('creditos_saldo, creditos_ciclo_reset').eq('id', workspace.id).maybeSingle(),
        supabase.from('credit_transactions').select('id, created_at, delta, saldo_after, tipo, operacao, modelo')
          .eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(50),
      ])
      if (!on) return
      setSaldo(ws?.creditos_saldo ?? null)
      setReset(ws?.creditos_ciclo_reset ?? null)
      setTxs(log || [])
    })()
    return () => { on = false }
  }, [workspace.id])


  // Saldo do ciclo (null = pool cheio, ainda não consumido)
  const cMes       = workspace.creditos_mes ?? planoAtual.creditos_mes
  const saldoAtual = saldo == null ? cMes : saldo
  const saldoPct   = cMes ? Math.min((saldoAtual / cMes) * 100, 100) : 0
  const saldoBaixo = saldoPct <= 15

  return (
    <Box sx={{ maxWidth: 760 }}>
      {/* 1 ─ Contrato: créditos mensais + baliza de custo (sem SaaS — decisão
          2026-07-12: crédito é REPASSE de custo; o valor do serviço é negociado) */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em" mb={1}>
          Créditos do contrato
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ color: 'primary.main' }}>
            {cMes.toLocaleString('pt-BR')} créditos/mês
          </Typography>
          <Typography variant="caption" color="text.secondary">
            créditos cobrem o custo de geração (1 crédito ≈ R$0,33 de insumo de IA, repassado sem margem)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5 }}>
          {planoAtual.studio && <Chip label="Studio" size="small" variant="outlined" sx={{ fontWeight: 700 }} />}
          <Chip label="Brand Intelligence · fair-use" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
          {planoAtual.social_listening && <Chip label="Social Listening" size="small" variant="outlined" sx={{ fontWeight: 700 }} />}
          <Chip label={`${planoAtual.membros === Infinity ? '∞' : planoAtual.membros} membros`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
          <Chip label={`${planoAtual.concorrentes} concorrentes`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
        </Box>
        <Typography variant="caption" color="text.secondary" mt={1.5}>
          Diagnóstico, social listening e Brand Assistant não consomem crédito (fair-use).
        </Typography>
      </Paper>

      {/* 1b ─ Saldo do ciclo */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: saldoBaixo ? 'secondary.main' : 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em">
            Saldo do ciclo
          </Typography>
          {reset && <Typography variant="caption" color="text.secondary">renova em {new Date(reset).toLocaleDateString('pt-BR')}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
          <Typography variant="h4" sx={{ color: saldoBaixo ? 'secondary.main' : 'primary.main' }}>
            {saldoAtual.toLocaleString('pt-BR')}
          </Typography>
          <Typography variant="body1" color="text.secondary">de {cMes.toLocaleString('pt-BR')} créditos</Typography>
        </Box>
        <LinearProgress variant="determinate" value={saldoPct} color={saldoBaixo ? 'secondary' : 'primary'} sx={{ height: 6, borderRadius: 3, bgcolor: 'divider' }} />
        {saldoBaixo && (
          <Typography variant="caption" sx={{ color: 'secondary.main', mt: 1, fontWeight: 700 }}>
            Saldo baixo — fale com a LOUDR para ampliar os créditos do contrato.
          </Typography>
        )}
      </Paper>

      {/* 3 ─ Custo em créditos por modelo */}
      <Typography variant="body2" color="text.secondary" fontWeight={700} mb={0.5} textTransform="uppercase" letterSpacing="0.08em">
        Custo em créditos por modelo
      </Typography>
      <Typography variant="caption" color="text.secondary" mb={2}>
        Modelos mais caros custam mais créditos — você escolhe o equilíbrio entre qualidade e custo.
      </Typography>

      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagem</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>Créditos</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {IMAGE_GUIDE.map(m => (
            <CreditRow key={m.id} label={m.label} beneficio={m.beneficio} creditos={creditsForImage(m.id)} />
          ))}
        </TableBody>
      </Table>

      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vídeo</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>Créditos</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {VIDEO_GUIDE.map(m => {
            const cr = m.durations.length
              ? m.durations.map(d => `${creditsForVideo(m.key, d)} (${durLabel(d)})`).join(' · ')
              : `${creditsForVideo(m.key)}`
            return <CreditRow key={m.key} label={m.label} beneficio={m.beneficio} creditos={cr} />
          })}
        </TableBody>
      </Table>

      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outras operações</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>Créditos</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {OP_GUIDE.map(o => (
            <CreditRow key={o.op} label={o.label} creditos={creditsForOp(o.op)} />
          ))}
        </TableBody>
      </Table>

      <Typography variant="caption" color="text.secondary" mb={4}>
        <strong>Fair-use (0 crédito):</strong> Brand Intelligence — diagnóstico, social listening e Brand Assistant.
        Vídeos com áudio (Veo) e modelos premium consomem mais créditos por serem mais caros de gerar.
      </Typography>

      {/* 4 ─ Extrato / auditoria de consumo */}
      <Typography variant="body2" color="text.secondary" fontWeight={700} mb={1.5} textTransform="uppercase" letterSpacing="0.08em">
        Extrato de uso
      </Typography>
      {txs == null ? (
        <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={18} /></Box>
      ) : txs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Nenhum consumo de crédito ainda.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Data</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Operação</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>Créditos</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>Saldo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {txs.map(t => {
              const desc = TIPO_LABEL[t.tipo] || OP_LABEL[t.operacao] || t.operacao || '—'
              const pos = t.delta > 0
              return (
                <TableRow key={t.id}>
                  <TableCell sx={{ py: 0.75, fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Typography variant="subtitle2">{desc}</Typography>
                    {t.modelo && t.modelo !== 'auto' && <Typography variant="caption" color="text.secondary">{t.modelo}</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.75, whiteSpace: 'nowrap' }}>
                    <Typography variant="subtitle2" sx={{ color: pos ? 'primary.main' : 'text.primary' }}>
                      {pos ? '+' : ''}{t.delta}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.75, fontSize: 12, color: 'text.secondary' }}>{t.saldo_after}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
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
    <PageShell title="Créditos & Consumo" subtitle={`Workspace · ${workspace.nome}`}>
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
  if (typeof window !== 'undefined') navigate('#/app/conta')
  return null
}
