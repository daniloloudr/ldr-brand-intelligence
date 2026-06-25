import { useState, useRef, useEffect } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
  Select, MenuItem, Switch, FormControlLabel, IconButton, Tooltip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'
import { StudioTabs } from './StudioTabs'
import { IMAGE_MODELS, resolveModel, FORMATOS, arOf } from '../../lib/studioModels'

const TEAL = '#0D9E7A', CORAL = '#E8185A'

export function StudioImage({ brandId }) {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('auto')
  const [customModel, setCustomModel] = useState('')
  const [useBrand, setUseBrand] = useState(true)
  const [formato, setFormato] = useState('1:1')
  const [count, setCount] = useState(1)
  const [pieces, setPieces] = useState([])
  const [saved, setSaved] = useState({})
  const [saving, setSaving] = useState({})
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const pollRef = useRef(null)
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  async function gerar() {
    if (!prompt.trim()) return setMsg('Escreva um prompt.')
    if (model === 'custom' && !customModel.trim()) return setMsg('Informe o ID do modelo custom.')
    setMsg(''); setGenerating(true); setPieces([]); setSaved({})

    const { data: { session } } = await supabase.auth.getSession()
    const modelId = resolveModel(model === 'custom' ? customModel.trim() : model)
    const body = JSON.stringify({ brand_id: brandId, prompt: prompt.trim(), formato, use_brand: useBrand, model: modelId })

    const ids = []
    for (let i = 0; i < count; i++) {
      try {
        const res = await fetch('/.netlify/functions/studio-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body,
        })
        const j = await res.json()
        if (res.ok) ids.push(j.generation_id)
        else if (i === 0) { setMsg(j.error || `Erro ${res.status}`); setGenerating(false); return }
      } catch (e) { if (i === 0) { setMsg(e.message); setGenerating(false); return } }
    }
    if (!ids.length) { setGenerating(false); return }
    setPieces(ids.map(id => ({ id, status: 'processing', image_url: null, formato })))
    poll(ids)
  }

  function poll(ids) {
    if (pollRef.current) clearInterval(pollRef.current)
    const start = Date.now()
    pollRef.current = setInterval(async () => {
      if (Date.now() - start > 300_000) { clearInterval(pollRef.current); setGenerating(false); return }
      const { data } = await supabase.from('studio_generations')
        .select('id, formato, status, image_url, error').in('id', ids)
      if (data) setPieces(data.map(d => ({ id: d.id, formato: d.formato, status: d.status, image_url: d.image_url, error: d.error })))
      if (data && data.length && data.every(d => d.status !== 'processing')) { clearInterval(pollRef.current); setGenerating(false) }
    }, 3000)
  }

  async function downloadImage(url) {
    try {
      const res = await fetch(url); const blob = await res.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'loudr-studio.png'; a.click(); URL.revokeObjectURL(a.href)
    } catch { window.open(url, '_blank') }
  }
  async function saveToAssets(p) {
    if (saving[p.id] || saved[p.id]) return
    setSaving(s => ({ ...s, [p.id]: true }))
    const { error } = await supabase.from('brand_assets').insert({
      brand_id: brandId, tipo: 'foto', nome: `Studio · ${p.formato}`, descricao: prompt.slice(0, 140),
      valor: p.image_url, mime_type: 'image/png', metadata: { source: 'studio', generation_id: p.id, formato: p.formato },
    })
    setSaving(s => ({ ...s, [p.id]: false }))
    if (!error) setSaved(s => ({ ...s, [p.id]: true }))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Studio" subtitle="Geração de imagem" action={<StudioTabs brandId={brandId} active="image" />} />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
          {/* Modelo */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>Modelo</Typography>
              <Select value={model} onChange={e => setModel(e.target.value)} fullWidth size="small" disabled={generating} sx={{ fontSize: 13 }}>
                {IMAGE_MODELS.map(m => <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13 }}>{m.label}</MenuItem>)}
                <MenuItem value="custom" sx={{ fontSize: 13 }}>ID custom (qualquer modelo do fal)…</MenuItem>
              </Select>
            </Box>
            {model === 'custom' && (
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>ID do modelo (fal)</Typography>
                <TextField value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="fal-ai/…" fullWidth size="small" disabled={generating} sx={{ '& .MuiInputBase-input': { fontSize: 13 } }} />
              </Box>
            )}
          </Stack>

          {/* Prompt */}
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>Prompt</Typography>
          <TextField value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Descreva a imagem…" multiline minRows={2} maxRows={6} fullWidth disabled={generating} sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 14 } }} />

          {/* Formato + nº + marca */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
            {FORMATOS.map(f => (
              <Chip key={f.v} label={f.label} clickable disabled={generating} onClick={() => setFormato(f.v)}
                variant={formato === f.v ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, ...(formato === f.v && { bgcolor: TEAL, color: '#fff', '&:hover': { bgcolor: '#0B8567' } }) }} />
            ))}
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Imagens:</Typography>
            {[1, 2, 4].map(n => (
              <Chip key={n} label={n} clickable disabled={generating} onClick={() => setCount(n)} size="small"
                variant={count === n ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, ...(count === n && { bgcolor: TEAL, color: '#fff' }) }} />
            ))}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Switch checked={useBrand} onChange={e => setUseBrand(e.target.checked)} disabled={generating} size="small" />}
              label={<Typography sx={{ fontSize: 13 }}>Usar marca como referência</Typography>} />
            <Box sx={{ flex: 1 }} />
            {msg && <Typography sx={{ fontSize: 13, color: CORAL }}>{msg}</Typography>}
            <Button variant="contained" startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
              onClick={gerar} disabled={generating} sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}>
              {generating ? 'Gerando…' : 'Gerar'}
            </Button>
          </Stack>
        </Paper>

        {/* Galeria */}
        {pieces.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
            {pieces.map(p => (
              <Paper key={p.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ aspectRatio: arOf(p.formato), bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.status === 'done' && p.image_url
                    ? <Box component="img" src={p.image_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : p.status === 'error'
                    ? <Typography sx={{ fontSize: 11, color: CORAL, px: 2, textAlign: 'center' }}>{p.error || 'erro'}</Typography>
                    : <Stack alignItems="center" spacing={1}><CircularProgress size={18} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: 'text.disabled' }}>gerando…</Typography></Stack>}
                </Box>
                {p.status === 'done' && p.image_url && (
                  <Box sx={{ px: 1, py: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Tooltip title="Baixar"><IconButton size="small" onClick={() => downloadImage(p.image_url)}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    <Tooltip title={saved[p.id] ? 'Salvo nos assets' : 'Salvar nos assets'}>
                      <span><IconButton size="small" disabled={saved[p.id] || saving[p.id]} onClick={() => saveToAssets(p)}>
                        {saving[p.id] ? <CircularProgress size={14} /> : <BookmarkAddOutlinedIcon sx={{ fontSize: 16, color: saved[p.id] ? TEAL : 'inherit' }} />}
                      </IconButton></span>
                    </Tooltip>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
