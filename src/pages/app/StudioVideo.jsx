import { useState, useRef, useEffect } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
  Select, MenuItem, ListSubheader, Switch, FormControlLabel, IconButton, Tooltip, Dialog,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import ReplayIcon from '@mui/icons-material/Replay'
import CloseIcon from '@mui/icons-material/Close'
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'
import { VIDEO_MODELS, VIDEO_MODEL_GROUPS, DEFAULT_VIDEO_MODEL, videoModelByKey, durLabel, modeLabel } from '../../lib/videoModels'

const TEAL = '#0D9E7A', CORAL = '#E8185A', AMBER = '#E0B33A'
const ARMAP = { '16:9': '16 / 9', '9:16': '9 / 16', '1:1': '1 / 1', '4:5': '4 / 5' }

export function StudioVideo({ brandId }) {
  const [prompt, setPrompt] = useState('')
  const [modelKey, setModelKey] = useState(DEFAULT_VIDEO_MODEL)
  const [useBrand, setUseBrand] = useState(true)
  const [duration, setDuration] = useState(videoModelByKey(DEFAULT_VIDEO_MODEL)?.defaultDuration || null)
  const [aspect, setAspect] = useState(videoModelByKey(DEFAULT_VIDEO_MODEL)?.aspects?.[0] || null)
  const [srcUrl, setSrcUrl] = useState(null)          // imagem de origem (i2v)
  const [srcUploading, setSrcUploading] = useState(false)
  const [items, setItems] = useState([])
  const [saved, setSaved] = useState({})
  const [saving, setSaving] = useState({})
  const [voting, setVoting] = useState({})
  const [adjOpen, setAdjOpen] = useState({})      // id -> campo de ajuste aberto
  const [adjText, setAdjText] = useState({})      // id -> texto do ajuste
  const [adjusting, setAdjusting] = useState({})  // id -> reajuste em andamento
  const [generating, setGenerating] = useState(false)
  const [improving, setImproving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [lightbox, setLightbox] = useState(null)

  const fileRef = useRef(null)
  const pollRef = useRef(null)
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])
  useEffect(() => { loadGallery() }, [brandId])

  const model = videoModelByKey(modelKey)
  const supportsI2V = model?.modes.includes('i2v')
  const supportsT2V = model?.modes.includes('t2v')
  const i2vOnly = supportsI2V && !supportsT2V

  // Troca de modelo: ajusta duração/formato e limpa a origem se incompatível
  function changeModel(k) {
    const m = videoModelByKey(k)
    setModelKey(k)
    setDuration(m?.defaultDuration || null)
    setAspect(m?.aspects?.[0] || null)
    if (!m?.modes.includes('i2v')) setSrcUrl(null)
    setMsg('')
  }

  async function loadGallery() {
    setLoading(true)
    const cols = 'id, formato, status, image_url, error, created_at'
    const q = b => supabase.from('studio_generations').select(b)
      .eq('brand_id', brandId).eq('media_type', 'video').is('workflow_id', null).is('campaign_id', null)
      .order('created_at', { ascending: false }).limit(60)
    let { data, error } = await q(`${cols}, feedback`)
    if (error) ({ data, error } = await q(cols))
    setItems(error ? [] : (data || []))   // coluna media_type ausente (migration 022) → galeria vazia
    setLoading(false)
    if ((data || []).some(d => d.status === 'processing')) ensurePolling()
  }

  function ensurePolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const ids = itemsRef.current.filter(i => i.status === 'processing').map(i => i.id)
      if (!ids.length) { clearInterval(pollRef.current); pollRef.current = null; return }
      const { data } = await supabase.from('studio_generations')
        .select('id, formato, status, image_url, error').in('id', ids)
      if (data) setItems(prev => prev.map(it => { const f = data.find(d => d.id === it.id); return f ? { ...it, ...f } : it }))
    }, 4000)
  }

  async function uploadSrc(fileList) {
    const file = Array.from(fileList || [])[0]
    if (!file) return
    setSrcUploading(true)
    const path = `${brandId}/studio-video-src/${Date.now()}-${(file.name || 'img').replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
    if (error) setMsg('Falha no upload da imagem de origem.')
    else setSrcUrl(supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl)
    setSrcUploading(false)
  }

  async function gerar() {
    if (!prompt.trim()) return setMsg('Escreva um prompt.')
    if (i2vOnly && !srcUrl) return setMsg('Este modelo precisa de uma imagem de origem (image-to-video).')
    setMsg(''); setGenerating(true)
    // params usados — guardados no item p/ permitir reajuste fiel depois
    const params = { model: modelKey, prompt: prompt.trim(), srcUrl: supportsI2V ? srcUrl : null, duration: model?.durations ? duration : null, aspect, useBrand }
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/.netlify/functions/studio-generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          brand_id: brandId, prompt: params.prompt, model: modelKey, use_brand: useBrand,
          image_url: params.srcUrl,
          duration: model?.durations ? duration : undefined,
          aspect_ratio: model?.aspects && !srcUrl ? aspect : undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setMsg(j.error || `Erro ${res.status}`); setGenerating(false); return }
      setItems(prev => [{ id: j.generation_id, status: 'processing', image_url: null, formato: aspect, params }, ...prev])
      ensurePolling()
    } catch (e) { setMsg(e.message) }
    setGenerating(false)
  }

  // Reajuste fino: re-roda com os MESMOS params do item + instrução de retoque sutil
  async function reajustar(item) {
    const txt = (adjText[item.id] || '').trim()
    if (!txt || !item.params) return
    setAdjusting(a => ({ ...a, [item.id]: true })); setMsg('')
    const p = item.params
    const m = videoModelByKey(p.model)
    const promptFinal = `${p.prompt}\n\n[AJUSTE FINO]\nMantenha o vídeo praticamente igual (mesma cena, composição e movimento); ajuste apenas, de forma sutil: ${txt}`
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/.netlify/functions/studio-generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          brand_id: brandId, prompt: promptFinal, model: p.model, use_brand: p.useBrand,
          image_url: m?.modes.includes('i2v') ? p.srcUrl : null,
          duration: m?.durations ? p.duration : undefined,
          aspect_ratio: m?.aspects && !p.srcUrl ? p.aspect : undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setMsg(j.error || `Erro ${res.status}`); setAdjusting(a => ({ ...a, [item.id]: false })); return }
      setItems(prev => [{ id: j.generation_id, status: 'processing', image_url: null, formato: p.aspect, params: p }, ...prev])
      setAdjOpen(o => ({ ...o, [item.id]: false }))
      ensurePolling()
    } catch (e) { setMsg(e.message) }
    setAdjusting(a => ({ ...a, [item.id]: false }))
  }

  async function melhorarPrompt() {
    if (!prompt.trim()) return setMsg('Escreva um prompt para melhorar.')
    setImproving(true); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/.netlify/functions/studio-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brand_id: brandId, idea: prompt.trim(), use_brand: useBrand }),
      })
      const j = await res.json()
      if (res.ok && j.prompt) { setPrompt(j.prompt); setMsg('Prompt melhorado — confira se faz sentido com o direcionamento da peça.') }
      else setMsg(j.error || `Erro ${res.status}`)
    } catch (e) { setMsg(e.message) }
    setImproving(false)
  }

  async function votar(p, voto) {
    if (voting[p.id]) return
    const novo = p.feedback === voto ? null : voto
    setVoting(v => ({ ...v, [p.id]: true }))
    setItems(prev => prev.map(it => it.id === p.id ? { ...it, feedback: novo } : it))
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('studio_generations')
      .update({ feedback: novo, feedback_at: novo ? new Date().toISOString() : null, feedback_by: novo ? user?.id : null })
      .eq('id', p.id)
    if (error) { setItems(prev => prev.map(it => it.id === p.id ? { ...it, feedback: p.feedback } : it)); setMsg('Não foi possível salvar o voto.') }
    setVoting(v => ({ ...v, [p.id]: false }))
  }

  async function downloadVideo(url) {
    try {
      const res = await fetch(url); const blob = await res.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'loudr-studio.mp4'; a.click(); URL.revokeObjectURL(a.href)
    } catch { window.open(url, '_blank') }
  }

  async function saveToAssets(p) {
    if (saving[p.id] || saved[p.id]) return
    setSaving(s => ({ ...s, [p.id]: true }))
    const { error } = await supabase.from('brand_assets').insert({
      brand_id: brandId, tipo: 'video', nome: `Studio · vídeo ${p.formato || ''}`.trim(), descricao: prompt.slice(0, 140),
      valor: p.image_url, mime_type: 'video/mp4', metadata: { source: 'studio-video', generation_id: p.id, formato: p.formato },
    })
    setSaving(s => ({ ...s, [p.id]: false }))
    if (!error) setSaved(s => ({ ...s, [p.id]: true }))
  }

  const inpLabel = { fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Studio" subtitle="Geração de vídeo" />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
          {/* Modelo */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ ...inpLabel, mb: 0.5 }}>Modelo</Typography>
            <Select value={modelKey} onChange={e => changeModel(e.target.value)} fullWidth size="small" disabled={generating} sx={{ fontSize: 13 }}>
              {VIDEO_MODEL_GROUPS.flatMap(g => [
                <ListSubheader key={g} sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', lineHeight: 2.4, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
                ...VIDEO_MODELS.filter(m => m.group === g).map(m => (
                  <MenuItem key={m.key} value={m.key} sx={{ fontSize: 13 }}>
                    {m.label}
                    <Typography component="span" sx={{ ml: 1, fontSize: 11, color: 'text.disabled' }}>{modeLabel(m)}</Typography>
                  </MenuItem>
                )),
              ])}
            </Select>
            {model?.nota && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>{model.nota}</Typography>}
          </Box>

          {/* Prompt */}
          <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography sx={inpLabel}>Prompt</Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" startIcon={improving ? <CircularProgress size={12} /> : <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={melhorarPrompt} disabled={generating || improving} sx={{ fontSize: 12, fontWeight: 700, color: TEAL }}>
              {improving ? 'Melhorando…' : 'Melhorar o Prompt'}
            </Button>
          </Stack>
          <TextField value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Descreva o movimento, a cena, a câmera…" multiline minRows={2} maxRows={6} fullWidth disabled={generating} sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 14 } }} />

          {/* Imagem de origem (i2v) */}
          {supportsI2V && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { uploadSrc(e.target.files); e.target.value = '' }} />
              {srcUrl ? (
                <Box sx={{ position: 'relative', width: 64, height: 64, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box component="img" src={srcUrl} alt="origem" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" onClick={() => setSrcUrl(null)} sx={{ position: 'absolute', top: -2, right: -2, bgcolor: 'rgba(0,0,0,.55)', color: '#fff', p: 0.25, '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}>
                    <CloseIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              ) : (
                <Tooltip title="Imagem de origem (image-to-video)">
                  <Box onClick={() => !generating && !srcUploading && fileRef.current?.click()}
                    sx={{ width: 64, height: 64, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: generating || srcUploading ? 'default' : 'pointer', color: 'text.secondary', '&:hover': { borderColor: TEAL, color: TEAL } }}>
                    {srcUploading ? <CircularProgress size={16} /> : <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 22 }} />}
                  </Box>
                </Tooltip>
              )}
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {i2vOnly ? 'Obrigatório — este modelo anima a partir de uma imagem.' : 'Opcional — anexe para animar uma imagem (image-to-video).'}
              </Typography>
            </Stack>
          )}

          {/* Duração + Formato */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
            {model?.durations && <>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Duração:</Typography>
              {model.durations.map(d => (
                <Chip key={d} label={durLabel(d)} clickable disabled={generating} onClick={() => setDuration(d)} size="small"
                  variant={duration === d ? 'filled' : 'outlined'} sx={{ fontWeight: 700, ...(duration === d && { bgcolor: TEAL, color: '#fff' }) }} />
              ))}
            </>}
            {model?.aspects && !srcUrl && <>
              <Box sx={{ width: 12 }} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Formato:</Typography>
              {model.aspects.map(a => (
                <Chip key={a} label={a} clickable disabled={generating} onClick={() => setAspect(a)} size="small"
                  variant={aspect === a ? 'filled' : 'outlined'} sx={{ fontWeight: 700, ...(aspect === a && { bgcolor: TEAL, color: '#fff' }) }} />
              ))}
            </>}
            {srcUrl && model?.aspects && <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Formato vem da imagem de origem</Typography>}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Switch checked={useBrand} onChange={e => setUseBrand(e.target.checked)} disabled={generating} size="small" />}
              label={<Typography sx={{ fontSize: 13 }}>Usar marca como referência</Typography>} />
            <Box sx={{ flex: 1 }} />
            {msg && <Typography sx={{ fontSize: 13, color: msg.startsWith('Prompt melhorado') ? 'text.secondary' : CORAL }}>{msg}</Typography>}
            <Button variant="contained" startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
              onClick={gerar} disabled={generating} sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}>
              {generating ? 'Enviando…' : 'Gerar vídeo'}
            </Button>
          </Stack>
        </Paper>

        {/* Galeria */}
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : items.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <MovieOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography variant="h6" fontWeight={900}>Nenhum vídeo ainda</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
              Escreva um prompt (e opcionalmente uma imagem de origem) e gere — vídeo leva mais tempo que imagem.
            </Typography>
          </Stack>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
            {items.map(p => {
              const done = p.status === 'done' && p.image_url
              const ar = ARMAP[p.formato] || '16 / 9'
              return (
                <Paper key={p.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Box onClick={() => done && setLightbox(p.image_url)}
                    sx={{ aspectRatio: ar, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: done ? 'zoom-in' : 'default' }}>
                    {done
                      ? <Box component="video" src={p.image_url} muted loop playsInline preload="metadata"
                          onMouseEnter={e => e.currentTarget.play?.().catch(() => {})} onMouseLeave={e => e.currentTarget.pause?.()}
                          sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                      : p.status === 'error'
                      ? <Typography sx={{ fontSize: 11, color: CORAL, px: 2, textAlign: 'center' }}>{p.error || 'erro'}</Typography>
                      : <Stack alignItems="center" spacing={1}><CircularProgress size={18} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: '#bbb' }}>gerando vídeo…</Typography></Stack>}
                  </Box>
                  {done && (
                    <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center' }}>
                      <Tooltip title="Aprovar"><span><IconButton size="small" disabled={voting[p.id]} onClick={() => votar(p, 'up')}>
                        {p.feedback === 'up' ? <ThumbUpIcon sx={{ fontSize: 16, color: TEAL }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />}
                      </IconButton></span></Tooltip>
                      <Tooltip title="Reprovar"><span><IconButton size="small" disabled={voting[p.id]} onClick={() => votar(p, 'down')}>
                        {p.feedback === 'down' ? <ThumbDownIcon sx={{ fontSize: 16, color: CORAL }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />}
                      </IconButton></span></Tooltip>
                      {p.params && (
                        <Tooltip title="Ajustar (retoque sutil + reajustar)"><IconButton size="small" onClick={() => setAdjOpen(o => ({ ...o, [p.id]: !o[p.id] }))}>
                          <TuneOutlinedIcon sx={{ fontSize: 16, color: adjOpen[p.id] || adjText[p.id] ? AMBER : 'inherit' }} />
                        </IconButton></Tooltip>
                      )}
                      <Box sx={{ flex: 1 }} />
                      <Tooltip title="Baixar"><IconButton size="small" onClick={() => downloadVideo(p.image_url)}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      <Tooltip title={saved[p.id] ? 'Salvo nos assets' : 'Salvar nos assets'}>
                        <span><IconButton size="small" disabled={saved[p.id] || saving[p.id]} onClick={() => saveToAssets(p)}>
                          {saving[p.id] ? <CircularProgress size={14} /> : <BookmarkAddOutlinedIcon sx={{ fontSize: 16, color: saved[p.id] ? TEAL : 'inherit' }} />}
                        </IconButton></span>
                      </Tooltip>
                    </Box>
                  )}
                  {done && p.params && adjOpen[p.id] && (
                    <Stack spacing={0.75} sx={{ px: 1, pb: 1 }}>
                      <TextField value={adjText[p.id] || ''} onChange={e => setAdjText(t => ({ ...t, [p.id]: e.target.value }))}
                        placeholder="Ajuste pontual: ex. 'luz mais quente', 'movimento mais lento no fim'…"
                        multiline minRows={2} maxRows={4} fullWidth size="small" sx={{ '& .MuiInputBase-input': { fontSize: 12 } }} />
                      <Button size="small" variant="contained" disabled={adjusting[p.id] || !(adjText[p.id] || '').trim()}
                        startIcon={adjusting[p.id] ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <ReplayIcon sx={{ fontSize: 15 }} />}
                        onClick={() => reajustar(p)}
                        sx={{ alignSelf: 'flex-end', fontWeight: 800, bgcolor: AMBER, color: '#000', '&:hover': { bgcolor: '#CDA02F' } }}>
                        {adjusting[p.id] ? 'Reajustando…' : 'Reajustar'}
                      </Button>
                    </Stack>
                  )}
                </Paper>
              )
            })}
          </Box>
        )}
      </Box>

      {/* Lightbox — player em tela cheia */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={() => setLightbox(null)} sx={{ position: 'absolute', top: -14, right: -14, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,.8)' }, zIndex: 1 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {lightbox && <Box component="video" src={lightbox} controls autoPlay loop sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2 }} />}
          {lightbox && (
            <Button startIcon={<DownloadOutlinedIcon />} onClick={() => downloadVideo(lightbox)}
              sx={{ position: 'absolute', bottom: 12, right: 12, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
              Baixar
            </Button>
          )}
        </Box>
      </Dialog>
    </Box>
  )
}
