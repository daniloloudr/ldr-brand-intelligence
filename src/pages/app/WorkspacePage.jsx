import { useState, useEffect } from 'react'
import { navigate, novaSenha } from '../../lib/helpers';
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
import { PRESETS, ORDEM_PRESETS, presetDoMembro, papelDoPreset } from '../../lib/papeis'

const SETORES = ["Tecnologia","Saúde","Educação","Finanças","Varejo","Fashion","Indústria","Serviços","Alimentação","Imóveis","Logística","Mídia","Energia","Agronegócio","Outro"]
const PORTES  = ["Startup","PME","Médio porte","Grande empresa"]
// Papéis: ver src/lib/papeis.js. O dado é role + duas capacidades; a tela fala
// em presets nomeados porque "member + pode_aprovar_pecas" não é frase que se
// mostre a um cliente.


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
      <TextField fullWidth select label="Setor" value={form.setor} onChange={setF('setor')} SelectProps={{ displayEmpty: true }}>
        <MenuItem value="">Selecione...</MenuItem>
        {SETORES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>
      <TextField fullWidth select label="Porte" value={form.porte} onChange={setF('porte')} SelectProps={{ displayEmpty: true }}>
        <MenuItem value="">Selecione...</MenuItem>
        {PORTES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
      </TextField>
      <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ alignSelf: 'flex-start', fontWeight: 800, px: 3 }}>
        {loading ? <CircularProgress size={16} color="inherit" /> : 'Salvar alterações'}
      </Button>
    </Box>
  )
}

// ── Gestão de time ───────────────────────────────────────────────────
// Toda escrita aqui passa pelo servidor (workspace-member / workspace-create-user).
// Antes era `supabase.from('workspace_members').update(...)` direto do browser,
// e a policy que "protegia" era `for all using (é membro)` — ou seja, qualquer
// pessoa do tenant podia se promover, rebaixar o dono ou remover um colega.
//
// Com a RLS corrigida (migration 052) o browser passaria a receber "0 linhas
// afetadas" em silêncio, e a tela diria "salvo". Por isso a escrita mudou de
// lugar junto com a policy: quem não pode precisa ouvir POR QUE não pode.
function TabEquipe({ workspace }) {
  const { ehOwner } = useWorkspace()
  const [membros, setMembros]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [editing, setEditing]   = useState(null) // { membro }
  const [editPreset, setEditPreset] = useState('criador')
  const [saving, setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null) // { membro }
  const [deleting, setDeleting] = useState(false)
  const [novo, setNovo]         = useState(null)   // form de criar acesso
  const [criando, setCriando]   = useState(false)
  const [criado, setCriado]     = useState(null)   // credencial recém-gerada

  useEffect(() => { loadMembros() }, [workspace.id])

  async function autorizacao() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada.')
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
  }

  async function loadMembros() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/.netlify/functions/workspace-members?workspace_id=${workspace.id}`, {
        headers: await autorizacao(),
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

  /** O servidor é quem decide; a tela só traduz o "não" para português. */
  async function chamar(url, opcoes) {
    const res = await fetch(url, { headers: await autorizacao(), ...opcoes })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
    return json
  }

  function abrirEditar(m) {
    setEditing(m)
    setEditPreset(presetDoMembro(m))
  }

  async function salvarEdicao() {
    if (!editing) return
    setSaving(true); setError('')
    try {
      await chamar('/.netlify/functions/workspace-member', {
        method: 'PATCH',
        body: JSON.stringify({
          workspace_id: workspace.id, member_id: editing.id, ...papelDoPreset(editPreset),
        }),
      })
      setEditing(null)
      await loadMembros()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmarRemocao() {
    if (!confirmDel) return
    setDeleting(true); setError('')
    try {
      await chamar('/.netlify/functions/workspace-member', {
        method: 'DELETE',
        body: JSON.stringify({ workspace_id: workspace.id, member_id: confirmDel.id }),
      })
      setConfirmDel(null)
      await loadMembros()
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  function abrirNovo() {
    setCriado(null); setError('')
    setNovo({ nome: '', email: '', password: novaSenha(), preset: 'criador' })
  }

  async function criarAcesso(e) {
    e.preventDefault()
    if (!novo?.email?.trim()) return
    setCriando(true); setError('')
    try {
      const r = await chamar('/.netlify/functions/workspace-create-user', {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspace.id,
          nome: novo.nome, email: novo.email, password: novo.password,
          ...papelDoPreset(novo.preset),
        }),
      })
      // O servidor só chega aqui quando criou a conta — e-mail já cadastrado é
      // recusado com 409 e cai no catch. Então a senha mostrada é sempre a que
      // vale.
      setCriado({ ...r, password: novo.password })
      setNovo(null)
      await loadMembros()
    } catch (e) {
      setError(e.message)
    } finally {
      setCriando(false)
    }
  }

  const plano  = PLANOS[workspace.plano] || PLANOS.trial
  const limite = plano.membros === Infinity ? '∞' : plano.membros

  // Quem opera a plataforma não conta como membro do time do cliente — nem na
  // contagem, nem no limite do plano. A lista da Pixel dizia "2 membros" sendo
  // que um era o suporte da LOUDR. Para o cliente essas linhas nem chegam do
  // servidor; este recorte é para a visão de quem opera.
  const doCliente = membros.filter(m => !m.plataforma)
  const operadores = membros.filter(m => m.plataforma)

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {doCliente.length}/{limite} membros no plano {plano.nome}
        {operadores.length > 0 && (
          <Typography component="span" sx={{ ml: 1, fontSize: 12, color: 'text.disabled' }}>
            · +{operadores.length} operador{operadores.length > 1 ? 'es' : ''} da plataforma (invisível para o cliente)
          </Typography>
        )}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {criado && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setCriado(null)}
          action={
            <Button size="small" onClick={() => navigator.clipboard?.writeText(`${criado.email} / ${criado.password}`)}>Copiar</Button>
          }>
          Acesso criado: <strong>{criado.email}</strong> · senha temporária <strong>{criado.password}</strong>.
          Entregue de forma segura — no primeiro acesso a pessoa define a senha dela.
        </Alert>
      )}

      {ehOwner ? (
        <Box sx={{ mb: 3 }}>
          <Button variant="contained" color="primary" onClick={abrirNovo} sx={{ fontWeight: 800 }}>
            Criar acesso
          </Button>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Só o dono do workspace pode criar acessos e alterar papéis.
        </Alert>
      )}

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
              {doCliente.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.disabled', fontSize: 13 }}>
                    Nenhum membro ainda.
                  </TableCell>
                </TableRow>
              ) : (
                doCliente.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>
                      {m.nome || <Typography component="span" sx={{ color: PALETTE.neutral[400] }}>—</Typography>}
                      {m.is_self && <Chip label="você" size="small" sx={{ ml: 1, height: 16, fontSize: 9 }} />}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {m.email || <Typography component="span" sx={{ color: PALETTE.neutral[400] }}>—</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      <Tooltip title={PRESETS[presetDoMembro(m)].descricao}>
                        <Chip
                          label={PRESETS[presetDoMembro(m)].label}
                          size="small"
                          sx={{
                            fontWeight: 700, fontSize: 11,
                            bgcolor: m.role === 'owner' ? 'rgba(13,158,122,0.12)' : 'action.hover',
                            color:   m.role === 'owner' ? 'primary.main' : 'text.secondary',
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      {/* Sem dono, sem botão. A RLS recusa de qualquer jeito; o
                          que se evita aqui é o clique que não faz nada. */}
                      <Tooltip title={ehOwner ? 'Editar' : 'Só o dono altera papéis'}>
                        <Typography component="span">
                          <IconButton size="small" disabled={!ehOwner} onClick={() => abrirEditar(m)} sx={{ color: 'text.secondary' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Typography>
                      </Tooltip>
                      <Tooltip title={m.is_self ? 'Não é possível remover você mesmo' : ehOwner ? 'Remover' : 'Só o dono remove membros'}>
                        <Typography component="span">
                          <IconButton size="small" disabled={m.is_self || !ehOwner}
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
            <Select value={editPreset} label="Acesso" onChange={e => setEditPreset(e.target.value)}>
              {ORDEM_PRESETS.map(k => <MenuItem key={k} value={k}>{PRESETS[k].label}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {PRESETS[editPreset]?.descricao}
          </Typography>
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

      {/* Criar acesso — o dono do tenant dá entrada no próprio time */}
      <Dialog open={Boolean(novo)} onClose={() => !criando && setNovo(null)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={criarAcesso}>
          <DialogTitle sx={{ fontWeight: 900 }}>Criar acesso</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2, fontSize: 13 }}>
              A pessoa entra com uma senha temporária e define a dela no primeiro acesso.
            </DialogContentText>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField size="small" label="Nome" value={novo?.nome || ''}
                onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} />
              <TextField size="small" label="E-mail" type="email" required value={novo?.email || ''}
                onChange={e => setNovo(n => ({ ...n, email: e.target.value }))} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" label="Senha temporária" sx={{ flex: 1 }} required
                  value={novo?.password || ''}
                  onChange={e => setNovo(n => ({ ...n, password: e.target.value }))} />
                <Button size="small" variant="outlined" onClick={() => setNovo(n => ({ ...n, password: novaSenha() }))}>
                  Gerar
                </Button>
              </Box>
              <FormControl fullWidth size="small">
                <InputLabel>Acesso</InputLabel>
                <Select value={novo?.preset || 'criador'} label="Acesso"
                  onChange={e => setNovo(n => ({ ...n, preset: e.target.value }))}>
                  {ORDEM_PRESETS.map(k => <MenuItem key={k} value={k}>{PRESETS[k].label}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                {PRESETS[novo?.preset || 'criador']?.descricao}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setNovo(null)} disabled={criando} color="inherit">Cancelar</Button>
            <Button type="submit" disabled={criando} variant="contained" sx={{ fontWeight: 800 }}>
              {criando ? 'Criando…' : 'Criar acesso'}
            </Button>
          </DialogActions>
        </Box>
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

// ── Minha conta ──────────────────────────────────────────────────────
// A página da PESSOA. Não existia: `/app/conta` se chamava "Configurações da
// conta" e mostrava dados da EMPRESA. Depois da tela forçada de primeiro acesso
// não havia caminho nenhum para trocar o próprio nome ou a própria senha — por
// isso a senha temporária que o admin gera acabava virando a senha definitiva,
// circulando em texto por e-mail e WhatsApp.
function TabMinhaConta() {
  const { user } = useWorkspace()
  const [nome, setNome]     = useState(user?.user_metadata?.full_name || '')
  const [senha, setSenha]   = useState('')
  const [confirma, setConfirma] = useState('')
  const [msg, setMsg]       = useState('')
  const [erro, setErro]     = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvarNome(e) {
    e.preventDefault()
    setSalvando(true); setMsg(''); setErro('')
    const { error } = await supabase.auth.updateUser({ data: { full_name: nome.trim() || null } })
    setSalvando(false)
    if (error) return setErro(error.message)
    setMsg('Nome atualizado.')
  }

  async function trocarSenha(e) {
    e.preventDefault()
    setMsg(''); setErro('')
    if (senha.length < 8)   return setErro('A senha deve ter pelo menos 8 caracteres.')
    if (senha !== confirma) return setErro('As senhas não coincidem.')
    setSalvando(true)
    // must_change_password cai junto: quem escolheu a própria senha já cumpriu
    // a exigência do primeiro acesso, e deixá-la de pé faria a tela forçada
    // reaparecer no próximo login.
    const { error } = await supabase.auth.updateUser({
      password: senha,
      data: { must_change_password: false },
    })
    setSalvando(false)
    if (error) return setErro(error.message)
    setSenha(''); setConfirma('')
    setMsg('Senha alterada.')
  }

  return (
    <Box sx={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {msg  && <Alert severity="success" sx={{ borderRadius: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {erro && <Alert severity="error"   sx={{ borderRadius: 2 }} onClose={() => setErro('')}>{erro}</Alert>}

      <Box component="form" onSubmit={salvarNome} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Seus dados</Typography>
        <TextField fullWidth label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
        {/* E-mail é o login: trocar exige reconfirmação e é caminho de suporte,
            não de autoatendimento. Mostrar bloqueado evita a pergunta. */}
        <TextField fullWidth label="E-mail (login)" value={user?.email || ''} disabled
          helperText="Para alterar o e-mail de acesso, fale com o suporte." />
        <Button type="submit" variant="contained" disabled={salvando} sx={{ alignSelf: 'flex-start', fontWeight: 800, px: 3 }}>
          Salvar
        </Button>
      </Box>

      <Divider />

      <Box component="form" onSubmit={trocarSenha} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Trocar senha</Typography>
        <TextField fullWidth type="password" label="Nova senha" value={senha}
          onChange={e => setSenha(e.target.value)} autoComplete="new-password" />
        <TextField fullWidth type="password" label="Confirmar nova senha" value={confirma}
          onChange={e => setConfirma(e.target.value)} autoComplete="new-password" />
        <Button type="submit" variant="outlined" disabled={salvando || !senha} sx={{ alignSelf: 'flex-start', fontWeight: 800, px: 3 }}>
          Alterar senha
        </Button>
      </Box>
    </Box>
  )
}

export function ContaPage() {
  const { workspace, reload, ehOwner } = useWorkspace()
  const [aba, setAba] = useState(0)
  if (!workspace) return null
  return (
    <PageShell title="Minha conta" subtitle={`Workspace · ${workspace.nome}`}>
      <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Meus dados" sx={{ fontWeight: 700 }} />
        <Tab label="Empresa" sx={{ fontWeight: 700 }} />
      </Tabs>
      {aba === 0 && <TabMinhaConta />}
      {aba === 1 && (
        ehOwner
          ? <TabEmpresa workspace={workspace} reload={reload} />
          : <Alert severity="info" sx={{ borderRadius: 2, maxWidth: 480 }}>
              Os dados da empresa são editados pelo dono do workspace.
            </Alert>
      )}
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
