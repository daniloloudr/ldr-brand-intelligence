// Campanhas — o DOSSIÊ, não a fábrica (redesenho 2026-07-13).
// A produção acontece SEMPRE no Fluxos (um motor só, com os padrões da casa:
// prompts revisáveis, modelo por nó, diretor de arte, imagem limpa). Aqui a
// campanha organiza: brief + fluxo de produção + peças agrupadas + aprovação
// (que emite o sinal campaign_verdict pro cérebro — trigger da migration 025).
// É a página que o A3 do Copiloto preencherá sozinho.
import { useState, useEffect, useCallback } from 'react'
import { navigate } from '../../lib/helpers';
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { PALETTE } from '../../lib/theme'

const TEAL = PALETTE.data.positivo
const AMBER = PALETTE.data.atencao
const STATUS_COR = { rascunho: 'text.disabled', gerando: AMBER, concluida: TEAL, aprovada: TEAL }
const isVideo = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || '')

export function StudioCampaigns({ brandId }) {
  const { workspace } = useWorkspace()
  const [campanhas, setCampanhas] = useState(null)
  const [sel, setSel] = useState(null)            // campanha aberta (dossiê)
  const [gens, setGens] = useState([])            // peças visuais da campanha
  const [textos, setTextos] = useState([])        // peças escritas da campanha
  const [novaOpen, setNovaOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [conceito, setConceito] = useState('')
  const [criando, setCriando] = useState(false)
  const [msg, setMsg] = useState('')
  const [aprovando, setAprovando] = useState(false)

  const loadLista = useCallback(async () => {
    const { data } = await supabase.from('studio_campaigns')
      .select('id, nome, conceito, status, workflow_id, created_at')
      .eq('brand_id', brandId).order('created_at', { ascending: false }).limit(50)
    setCampanhas(data || [])
    return data || []
  }, [brandId])

  async function abrirDossie(c) {
    setSel(c)
    const [{ data: g }, { data: t }] = await Promise.all([
      supabase.from('studio_generations').select('id, formato, status, image_url, feedback, created_at')
        .eq('campaign_id', c.id).eq('status', 'done').not('image_url', 'is', null).order('created_at'),
      supabase.from('pecas_escritas').select('id, titulo, formato, conteudo, created_at')
        .eq('campaign_id', c.id).order('created_at'),
    ])
    setGens(g || []); setTextos(t || [])
  }

  useEffect(() => {
    if (!brandId) return
    ;(async () => {
      const lista = await loadLista()
      const m = window.location.search.match(/[?&]c=([\w-]+)/)
      if (m) { const c = lista.find(x => x.id === m[1]); if (c) abrirDossie(c) }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, loadLista])

  // Nova campanha = dossiê + FLUXO de produção (o builder monta o grafo do conceito)
  async function criarCampanha() {
    if (!nome.trim() || !conceito.trim() || criando) return
    setCriando(true); setMsg('')
    try {
      const { data: camp, error: e1 } = await supabase.from('studio_campaigns').insert({
        workspace_id: workspace?.id, brand_id: brandId,
        nome: nome.trim().slice(0, 80), conceito: conceito.trim(), formatos: [], status: 'rascunho',
      }).select().single()
      if (e1) throw new Error(e1.message)

      // o fluxo nasce do conceito (mesmo builder do "criar workflow por prompt")
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/studio-workflow-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ brand_id: brandId, prompt: `Campanha "${nome.trim()}": ${conceito.trim()}` }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)

      const { data: wf, error: e2 } = await supabase.from('studio_workflows').insert({
        workspace_id: workspace?.id, brand_id: brandId, is_template: false,
        nome: `Campanha — ${nome.trim().slice(0, 60)}`, nodes: j.nodes || [], edges: j.edges || [],
      }).select('id').single()
      if (e2) throw new Error(e2.message)

      await supabase.from('studio_campaigns').update({ workflow_id: wf.id }).eq('id', camp.id)
      // direto pro canvas: a produção acontece lá (peças nascem com campaign_id)
      navigate(`#/app/brands/${brandId}/studio/workflow/${wf.id}`)
    } catch (e) {
      setMsg(e.message); setCriando(false)
    }
  }

  async function aprovar() {
    if (!sel || aprovando) return
    setAprovando(true)
    const { error } = await supabase.from('studio_campaigns').update({ status: 'aprovada' }).eq('id', sel.id)
    setAprovando(false)
    if (!error) { setSel(s => ({ ...s, status: 'aprovada' })); loadLista() }
  }

  function baixar(url, nomeArq) {
    const a = document.createElement('a'); a.href = url; a.download = nomeArq; a.target = '_blank'; a.click()
  }

  // ── Dossiê de uma campanha ──────────────────────────────────────────
  if (sel) {
    const wfHash = sel.workflow_id ? `#/app/brands/${brandId}/studio/workflow/${sel.workflow_id}` : null
    return (
      <Box>
        <PageHeader title={sel.nome} subtitle="Campanha — o dossiê: brief, produção e peças"
          action={
            <Stack direction="row" spacing={1}>
              <Button startIcon={<ArrowBackIcon />} onClick={() => { setSel(null); navigate(`#/app/brands/${brandId}/studio/campanhas`) }}
                sx={{ color: 'text.secondary', fontWeight: 700 }}>Campanhas</Button>
              {sel.status !== 'aprovada' && (
                <Button variant="contained" disableElevation disabled={aprovando} onClick={aprovar}
                  startIcon={aprovando ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckCircleOutlineIcon />}
                  sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 800 }}>
                  Aprovar campanha
                </Button>
              )}
            </Stack>
          } />
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>
          <Stack spacing={3}>
            {/* Brief */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>BRIEF / CONCEITO</Typography>
                <Chip label={sel.status} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 800, color: STATUS_COR[sel.status] || 'text.secondary' }} variant="outlined" />
                <Box flex={1} />
                {wfHash && (
                  <Button size="small" variant="outlined" startIcon={<AccountTreeOutlinedIcon sx={{ fontSize: 15 }} />}
                    onClick={() => { navigate(wfHash) }} sx={{ fontWeight: 700 }}>
                    Abrir fluxo de produção
                  </Button>
                )}
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{sel.conceito}</Typography>
              {sel.status === 'aprovada' && (
                <Typography variant="caption" sx={{ mt: 1, color: 'primary.main', fontWeight: 700 }}>
                  ✓ Aprovada — a decisão virou aprendizado para a marca
                </Typography>
              )}
            </Paper>

            {/* Peças visuais */}
            <Box>
              <Typography variant="caption" color="text.secondary" mb={1.25} sx={{ letterSpacing: '0.08em' }}>
                PEÇAS VISUAIS · {gens.length}
              </Typography>
              {gens.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma peça ainda — produza no <b>fluxo da campanha</b>: cada geração de lá nasce vinculada aqui.
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
                  {gens.map(g => (
                    <Paper key={g.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default' }}>
                        {isVideo(g.image_url)
                          ? <Box component="video" src={g.image_url} muted loop playsInline
                              onMouseOver={e => e.currentTarget.play().catch(() => {})} onMouseOut={e => e.currentTarget.pause()}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <Box component="img" src={g.image_url} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </Box>
                      <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5 }}>
                        <Typography variant="caption" sx={{ flex: 1 }}>{g.formato || 'peça'}</Typography>
                        {g.feedback === 'up' && <Typography variant="caption">👍</Typography>}
                        {g.feedback === 'down' && <Typography variant="caption">👎</Typography>}
                        <Tooltip title="Baixar"><IconButton size="small" onClick={() => baixar(g.image_url, `campanha-${(g.formato || 'peca').replace(':', 'x')}.png`)}>
                          <DownloadOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            {/* Peças escritas */}
            {textos.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" mb={1.25} sx={{ letterSpacing: '0.08em' }}>
                  PEÇAS ESCRITAS · {textos.length}
                </Typography>
                <Stack spacing={1}>
                  {textos.map(t => (
                    <Paper key={t.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ArticleOutlinedIcon sx={{ fontSize: 17, color: TEAL }} />
                        <Typography variant="subtitle2" sx={{ flex: 1 }} noWrap>{t.titulo}</Typography>
                        <Typography variant="caption" color="text.disabled">{t.formato || ''}</Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    )
  }

  // ── Lista de campanhas ──────────────────────────────────────────────
  return (
    <Box>
      <PageHeader title="Campanhas" subtitle="Um conceito, um dossiê — a produção acontece no fluxo da campanha"
        action={
          <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => setNovaOpen(true)}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 800 }}>
            Nova campanha
          </Button>
        } />
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>
        {campanhas === null ? (
          <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: 'primary.main' }} /></Stack>
        ) : campanhas.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
            <CampaignOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="subtitle1" mb={0.5}>Nenhuma campanha ainda</Typography>
            <Typography variant="body2" color="text.secondary">
              A campanha é o dossiê de um conceito: o brief, o fluxo de produção e as peças, juntos.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.25}>
            {campanhas.map(c => (
              <Paper key={c.id} variant="outlined" onClick={() => abrirDossie(c)}
                sx={{ p: 2, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: TEAL } }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <CampaignOutlinedIcon sx={{ fontSize: 20, color: TEAL }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>{c.nome}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{(c.conceito || '').slice(0, 140)}</Typography>
                  </Box>
                  <Chip label={c.status} size="small" variant="outlined"
                    sx={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COR[c.status] || 'text.secondary' }} />
                  <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Nova campanha: brief → dossiê + fluxo de produção */}
      <Dialog open={novaOpen} onClose={() => !criando && setNovaOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 900 }}>Nova campanha</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <TextField label="Nome da campanha" value={nome} onChange={e => setNome(e.target.value)}
              fullWidth autoFocus disabled={criando} placeholder="Ex.: Lançamento coleção verão" />
            <TextField label="Conceito / brief" value={conceito} onChange={e => setConceito(e.target.value)}
              fullWidth multiline minRows={3} disabled={criando}
              placeholder="O que a campanha comunica, para quem, com que energia — o fluxo de produção nasce disso" />
            <Typography variant="caption" color="text.secondary">
              Ao criar, a inteligência monta o <b>fluxo de produção</b> a partir do conceito e abre o canvas —
              cada peça gerada lá nasce vinculada a esta campanha.
            </Typography>
            {msg && <Typography variant="caption" color="error">{msg}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNovaOpen(false)} disabled={criando} sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={criarCampanha} disabled={criando || !nome.trim() || !conceito.trim()}
            startIcon={criando ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 800 }}>
            {criando ? 'Montando o fluxo…' : 'Criar campanha'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
