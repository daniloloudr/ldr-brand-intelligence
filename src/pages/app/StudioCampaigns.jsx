import { useState, useRef, useEffect } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip, IconButton, Tooltip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A', CORAL = '#E8185A'
const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1',   ar: '1 / 1' },
  { v: '9:16', label: 'Story 9:16', ar: '9 / 16' },
  { v: '16:9', label: 'Banner 16:9', ar: '16 / 9' },
  { v: '4:5',  label: 'Retrato 4:5', ar: '4 / 5' },
]
const ar = f => (FORMATOS.find(x => x.v === f)?.ar) || '1 / 1'

export function StudioCampaigns({ brandId }) {
  const [conceito, setConceito] = useState('')
  const [selected, setSelected] = useState(['1:1', '9:16', '16:9'])
  const [mode, setMode] = useState('independent')
  const [generating, setGenerating] = useState(false)
  const [pieces, setPieces] = useState([])   // { id, formato, status, image_url, error }
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState({})    // generationId -> true
  const [saving, setSaving] = useState({})
  const [history, setHistory] = useState([])
  const pollRef = useRef(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])
  useEffect(() => { loadHistory() }, [brandId])

  // Deep-link da Biblioteca: #/…/studio/campanhas?c={id} abre a campanha
  useEffect(() => {
    const m = window.location.hash.match(/[?&]c=([\w-]+)/)
    if (!m) return
    ;(async () => {
      const { data: c } = await supabase.from('studio_campaigns')
        .select('id, nome, status').eq('id', m[1]).maybeSingle()
      if (c) loadCampaign(c)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId])

  function toggle(v) {
    setSelected(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
  }

  async function loadHistory() {
    const { data } = await supabase.from('studio_campaigns')
      .select('id, nome, status, mode, created_at, formatos')
      .eq('brand_id', brandId).order('created_at', { ascending: false }).limit(12)
    setHistory(data || [])
  }

  async function loadCampaign(c) {
    if (pollRef.current) clearInterval(pollRef.current)
    setConceito(c.nome || ''); setMsg('')
    const { data } = await supabase.from('studio_generations')
      .select('id, formato, status, image_url, error').eq('campaign_id', c.id).order('created_at')
    setPieces((data || []).map(d => ({ id: d.id, formato: d.formato, status: d.status, image_url: d.image_url, error: d.error })))
    if (c.status === 'gerando') { setGenerating(true); pollCampaign(c.id) }
  }

  async function downloadImage(url, filename) {
    try {
      const res = await fetch(url); const blob = await res.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
      URL.revokeObjectURL(a.href)
    } catch { window.open(url, '_blank') }
  }

  async function saveToAssets(p) {
    if (saving[p.id] || saved[p.id]) return
    setSaving(s => ({ ...s, [p.id]: true }))
    const label = FORMATOS.find(f => f.v === p.formato)?.label || p.formato
    const { error } = await supabase.from('brand_assets').insert({
      brand_id: brandId, tipo: 'foto',
      nome: `Studio · ${label}`, descricao: (conceito || '').slice(0, 140),
      valor: p.image_url, mime_type: 'image/png',
      metadata: { source: 'studio', generation_id: p.id, formato: p.formato },
    })
    setSaving(s => ({ ...s, [p.id]: false }))
    if (!error) setSaved(s => ({ ...s, [p.id]: true }))
    else setMsg('Erro ao salvar nos assets: ' + error.message)
  }

  async function gerar() {
    if (!conceito.trim()) return setMsg('Descreva o conceito da campanha.')
    if (!selected.length) return setMsg('Selecione ao menos um formato.')
    setMsg(''); setGenerating(true); setPieces([])

    const { data: { session } } = await supabase.auth.getSession()
    let json
    try {
      const res = await fetch('/.netlify/functions/studio-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brand_id: brandId, conceito: conceito.trim(), formatos: selected, mode }),
      })
      json = await res.json()
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
    } catch (e) {
      setMsg(e.message); setGenerating(false); return
    }

    setPieces(json.generations.map(g => ({ ...g, status: 'processing', image_url: null })))
    pollCampaign(json.campaign_id)
  }

  function pollCampaign(campaignId) {
    if (pollRef.current) clearInterval(pollRef.current)
    const start = Date.now()
    pollRef.current = setInterval(async () => {
      if (Date.now() - start > 300_000) { clearInterval(pollRef.current); setGenerating(false); return }
      const [{ data: gens }, { data: camp }] = await Promise.all([
        supabase.from('studio_generations').select('id, formato, status, image_url, error').eq('campaign_id', campaignId).order('created_at'),
        supabase.from('studio_campaigns').select('status').eq('id', campaignId).maybeSingle(),
      ])
      if (gens) setPieces(gens.map(d => ({ id: d.id, formato: d.formato, status: d.status, image_url: d.image_url, error: d.error })))
      // Para quando a campanha sai de "gerando" (concluida/rascunho) — robusto para
      // o modo adapt, onde as adaptações só surgem depois do hero concluir.
      if (camp && camp.status !== 'gerando') { clearInterval(pollRef.current); setGenerating(false); loadHistory() }
    }, 3000)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader
        title="Studio · Campanhas"
        subtitle="Um conceito, várias peças coerentes"
      />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        {/* Brief */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
            Conceito da campanha
          </Typography>
          <TextField
            value={conceito} onChange={e => setConceito(e.target.value)}
            placeholder="Ex: campanha de lançamento da nova fase da marca — tom acolhedor, foco em conexão e movimento"
            multiline minRows={2} maxRows={5} fullWidth disabled={generating}
            sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 14 } }}
          />
          <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
            Formatos
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
            {FORMATOS.map(f => (
              <Chip key={f.v} label={f.label} clickable disabled={generating}
                onClick={() => toggle(f.v)}
                variant={selected.includes(f.v) ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, ...(selected.includes(f.v) && { bgcolor: TEAL, color: '#fff', '&:hover': { bgcolor: '#0B8567' } }) }}
              />
            ))}
          </Stack>

          <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
            Modo
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2.5 }}>
            {[
              { v: 'independent', label: 'Variações independentes', hint: 'N peças do mesmo conceito — mais variedade' },
              { v: 'adapt',       label: 'Adaptar de uma peça',     hint: 'gera 1 (1º formato) e reenquadra as demais — mais coerente' },
            ].map(m => (
              <Paper key={m.v} variant="outlined" onClick={() => !generating && setMode(m.v)}
                sx={{ p: 1.25, flex: 1, cursor: generating ? 'default' : 'pointer', borderRadius: 2,
                  borderColor: mode === m.v ? TEAL : 'divider', borderWidth: mode === m.v ? 2 : 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: mode === m.v ? TEAL : 'text.primary' }}>{m.label}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{m.hint}</Typography>
              </Paper>
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button variant="contained" startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
              onClick={gerar} disabled={generating}
              sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}>
              {generating ? 'Gerando campanha…' : `Gerar campanha (${selected.length})`}
            </Button>
            {msg && <Typography sx={{ fontSize: 13, color: CORAL }}>{msg}</Typography>}
          </Stack>
        </Paper>

        {/* Galeria */}
        {pieces.length > 0 && (
          <>
            <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
              Peças da campanha
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
              {pieces.map(p => (
                <Paper key={p.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ aspectRatio: ar(p.formato), bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {p.status === 'done' && p.image_url
                      ? <Box component="img" src={p.image_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : p.status === 'error'
                      ? <Typography sx={{ fontSize: 11, color: CORAL, px: 2, textAlign: 'center' }}>{p.error || 'erro'}</Typography>
                      : <Stack alignItems="center" spacing={1}><CircularProgress size={18} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: 'text.disabled' }}>gerando…</Typography></Stack>}
                  </Box>
                  <Box sx={{ px: 1.25, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{FORMATOS.find(f => f.v === p.formato)?.label || p.formato}</Typography>
                    {p.status === 'done' && p.image_url && (
                      <Stack direction="row" spacing={0}>
                        <Tooltip title="Baixar">
                          <IconButton size="small" onClick={() => downloadImage(p.image_url, `loudr-${p.formato.replace(':', 'x')}.png`)}>
                            <DownloadOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={saved[p.id] ? 'Salvo nos assets' : 'Salvar nos assets'}>
                          <span>
                            <IconButton size="small" disabled={saved[p.id] || saving[p.id]} onClick={() => saveToAssets(p)}>
                              {saving[p.id]
                                ? <CircularProgress size={14} />
                                : <BookmarkAddOutlinedIcon sx={{ fontSize: 16, color: saved[p.id] ? TEAL : 'inherit' }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          </>
        )}

        {/* Histórico de campanhas */}
        {history.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
              Campanhas anteriores
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
              {history.map(c => (
                <Paper key={c.id} variant="outlined" onClick={() => loadCampaign(c)}
                  sx={{ p: 1.5, minWidth: 200, flexShrink: 0, cursor: 'pointer', borderRadius: 2, '&:hover': { borderColor: TEAL } }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip size="small" label={c.status}
                      sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: c.status === 'concluida' ? 'rgba(13,158,122,0.12)' : 'rgba(255,255,255,0.06)', color: c.status === 'concluida' ? TEAL : 'text.secondary' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{(c.formatos || []).length} peças · {c.mode === 'adapt' ? 'adapt' : 'indep'}</Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  )
}
