import { useState, useRef, useEffect } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
  Select, MenuItem, ListSubheader, Switch, FormControlLabel, IconButton, Tooltip, Dialog,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import HighQualityOutlinedIcon from '@mui/icons-material/HighQualityOutlined'
import LayersClearOutlinedIcon from '@mui/icons-material/LayersClearOutlined'
import AutoAwesomeMotionOutlinedIcon from '@mui/icons-material/AutoAwesomeMotionOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import CloseIcon from '@mui/icons-material/Close'
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, IMAGE_MODEL_GROUPS, resolveModel, FORMATOS, PROMPT_TEMPLATES } from '../../lib/studioModels'

const TEAL = '#0D9E7A', CORAL = '#E8185A'
const MAX_REFS = 5   // até 5 referências p/ ajudar composições e banners

// Ações inline pós-geração (reaproveitam studio-edit.js)
const APP_ACTIONS = [
  { op: 'upscale',   label: 'Upscale',       Icon: HighQualityOutlinedIcon },
  { op: 'removebg',  label: 'Remover fundo', Icon: LayersClearOutlinedIcon },
  { op: 'variation', label: 'Variação',      Icon: AutoAwesomeMotionOutlinedIcon },
]

export function StudioImage({ brandId }) {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(DEFAULT_IMAGE_MODEL)
  const [useBrand, setUseBrand] = useState(true)
  const [formato, setFormato] = useState('1:1')
  const [count, setCount] = useState(1)
  const [items, setItems] = useState([])          // galeria persistente + peças vivas
  const [saved, setSaved] = useState({})
  const [saving, setSaving] = useState({})
  const [acting, setActing] = useState({})        // `${id}:${op}` -> bool
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [refUrls, setRefUrls] = useState([])      // referências (upload) — até MAX_REFS
  const [refUploading, setRefUploading] = useState(false)
  const [improving, setImproving] = useState(false)
  const [voting, setVoting] = useState({})        // id -> bool
  const [lightbox, setLightbox] = useState(null)  // url da imagem aberta em tela cheia

  const fileRef = useRef(null)
  const pollRef = useRef(null)
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])
  useEffect(() => { loadGallery() }, [brandId])

  // ── Galeria persistente — gerações standalone da marca (sem workflow/campanha) ──
  async function loadGallery() {
    setLoading(true)
    const base = 'id, formato, status, image_url, error, created_at'
    const q = b => supabase.from('studio_generations').select(b)
      .eq('brand_id', brandId).is('workflow_id', null).is('campaign_id', null)
      .order('created_at', { ascending: false }).limit(60)
    // Tenta com `feedback`; se a coluna ainda não existir (migration 021 não rodada),
    // recarrega sem ela em vez de deixar a galeria vazia.
    let { data, error } = await q(`${base}, feedback`)
    if (error) ({ data } = await q(base))
    setItems(data || [])
    setLoading(false)
    if ((data || []).some(d => d.status === 'processing')) ensurePolling()
  }

  // ── Poll único: atualiza toda peça em 'processing' até concluir ──
  function ensurePolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const ids = itemsRef.current.filter(i => i.status === 'processing').map(i => i.id)
      if (!ids.length) { clearInterval(pollRef.current); pollRef.current = null; return }
      const { data } = await supabase.from('studio_generations')
        .select('id, formato, status, image_url, error').in('id', ids)
      if (data) setItems(prev => prev.map(it => {
        const f = data.find(d => d.id === it.id); return f ? { ...it, ...f } : it
      }))
    }, 3000)
  }

  async function gerar() {
    if (!prompt.trim()) return setMsg('Escreva um prompt.')
    setMsg(''); setGenerating(true)

    const { data: { session } } = await supabase.auth.getSession()
    const modelId = resolveModel(model)
    const body = JSON.stringify({
      brand_id: brandId, prompt: prompt.trim(), formato, use_brand: useBrand, model: modelId,
      references: refUrls,
    })

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
    setGenerating(false)
    if (!ids.length) return
    setItems(prev => [...ids.map(id => ({ id, status: 'processing', image_url: null, formato })), ...prev])
    ensurePolling()
  }

  // ── Ação inline (upscale/removebg/variação) sobre uma peça pronta ──
  async function runApp(item, op) {
    const key = `${item.id}:${op}`
    if (acting[key] || !item.image_url) return
    setActing(a => ({ ...a, [key]: true })); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/.netlify/functions/studio-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brand_id: brandId, op, image_url: item.image_url }),
      })
      const j = await res.json()
      if (res.ok) {
        setItems(prev => [{ id: j.generation_id, status: 'processing', image_url: null, formato: item.formato }, ...prev])
        ensurePolling()
      } else setMsg(j.error || `Erro ${res.status}`)
    } catch (e) { setMsg(e.message) }
    setActing(a => ({ ...a, [key]: false }))
  }

  // ── Referências (upload p/ bucket brand-assets, mesma fundação do Workflow) ──
  async function uploadRefs(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const livres = MAX_REFS - refUrls.length
    if (livres <= 0) { setMsg(`Máximo de ${MAX_REFS} referências.`); return }
    const aSubir = files.slice(0, livres)
    if (files.length > livres) setMsg(`Só cabem mais ${livres} (máx. ${MAX_REFS}).`)
    setRefUploading(true)
    const novas = []
    for (const file of aSubir) {
      const path = `${brandId}/studio-ref/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${(file.name || 'img').replace(/[^\w.\-]/g, '_')}`
      const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
      if (error) { setMsg('Falha no upload de uma referência.'); continue }
      novas.push(supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl)
    }
    if (novas.length) setRefUrls(prev => [...prev, ...novas].slice(0, MAX_REFS))
    setRefUploading(false)
  }

  // ── Melhorar o prompt (Sonnet 4.6, on-brand) ──
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
      if (res.ok && j.prompt) setPrompt(j.prompt)
      else setMsg(j.error || `Erro ${res.status}`)
    } catch (e) { setMsg(e.message) }
    setImproving(false)
  }

  // ── Votação/aprovação — alimenta o aprendizado do que funciona por modelo/marca ──
  async function votar(p, voto) {
    if (voting[p.id]) return
    const novo = p.feedback === voto ? null : voto   // clicar de novo desfaz o voto
    setVoting(v => ({ ...v, [p.id]: true }))
    setItems(prev => prev.map(it => it.id === p.id ? { ...it, feedback: novo } : it))
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('studio_generations')
      .update({ feedback: novo, feedback_at: novo ? new Date().toISOString() : null, feedback_by: novo ? user?.id : null })
      .eq('id', p.id)
    if (error) {   // reverte em caso de falha
      setItems(prev => prev.map(it => it.id === p.id ? { ...it, feedback: p.feedback } : it))
      setMsg('Não foi possível salvar o voto.')
    }
    setVoting(v => ({ ...v, [p.id]: false }))
  }

  function aplicarTemplate(t) {
    setPrompt(t.prompt)
    if (t.formato) setFormato(t.formato)
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
      brand_id: brandId, tipo: 'foto', nome: `Studio · ${p.formato || '1:1'}`, descricao: prompt.slice(0, 140),
      valor: p.image_url, mime_type: 'image/png', metadata: { source: 'studio', generation_id: p.id, formato: p.formato },
    })
    setSaving(s => ({ ...s, [p.id]: false }))
    if (!error) setSaved(s => ({ ...s, [p.id]: true }))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Studio" subtitle="Geração de imagem" />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
          {/* Modelo */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>Modelo</Typography>
            <Select value={model} onChange={e => setModel(e.target.value)} fullWidth size="small" disabled={generating} sx={{ fontSize: 13 }}>
              {IMAGE_MODEL_GROUPS.flatMap(g => [
                <ListSubheader key={g} sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', lineHeight: 2.4, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
                ...IMAGE_MODELS.filter(m => m.group === g).map(m => (
                  <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13 }}>{m.label}</MenuItem>
                )),
              ])}
            </Select>
          </Box>

          {/* Templates */}
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mr: 0.5 }}>Templates</Typography>
            {PROMPT_TEMPLATES.map(t => (
              <Chip key={t.label} label={t.label} size="small" clickable disabled={generating}
                onClick={() => aplicarTemplate(t)} variant="outlined" sx={{ fontWeight: 600 }} />
            ))}
          </Stack>

          {/* Prompt */}
          <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>Prompt</Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" startIcon={improving ? <CircularProgress size={12} /> : <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={melhorarPrompt} disabled={generating || improving} sx={{ fontSize: 12, fontWeight: 700, color: TEAL }}>
              {improving ? 'Melhorando…' : 'Melhorar o Prompt'}
            </Button>
          </Stack>
          <TextField value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Descreva a imagem…" multiline minRows={2} maxRows={6} fullWidth disabled={generating} sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 14 } }} />

          {/* Referências (upload) — até MAX_REFS p/ compor cenas/banners */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { uploadRefs(e.target.files); e.target.value = '' }} />
            {refUrls.map((url, i) => (
              <Box key={url} sx={{ position: 'relative', width: 56, height: 56, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box component="img" src={url} alt={`ref ${i + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton size="small" onClick={() => setRefUrls(prev => prev.filter(u => u !== url))}
                  sx={{ position: 'absolute', top: -2, right: -2, bgcolor: 'rgba(0,0,0,.55)', color: '#fff', p: 0.25, '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}>
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Box>
            ))}
            {refUrls.length < MAX_REFS && (
              <Tooltip title={refUrls.length ? 'Adicionar referência' : 'Imagens de referência'}>
                <Box onClick={() => !generating && !refUploading && fileRef.current?.click()}
                  sx={{ width: 56, height: 56, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: generating || refUploading ? 'default' : 'pointer', color: 'text.secondary', '&:hover': { borderColor: TEAL, color: TEAL } }}>
                  {refUploading ? <CircularProgress size={16} /> : <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 20 }} />}
                </Box>
              </Tooltip>
            )}
            <Typography sx={{ fontSize: 11, color: 'text.disabled', ml: 0.5 }}>
              {refUrls.length
                ? `${refUrls.length}/${MAX_REFS} referência${refUrls.length > 1 ? 's' : ''} (image-to-image)`
                : `Opcional — até ${MAX_REFS} imagens p/ compor cenas e banners (melhor com Nano Banana)`}
            </Typography>
          </Stack>

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

        {/* Galeria persistente */}
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : items.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <ImageOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography variant="h6" fontWeight={900}>Nenhuma imagem ainda</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
              Escreva um prompt e gere — suas criações ficam salvas aqui na galeria da marca.
            </Typography>
          </Stack>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
            {items.map(p => {
              const done = p.status === 'done' && p.image_url
              return (
              <Paper key={p.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* Box quadrado e uniforme — imagem se adapta (cover), mantendo a ordem visual */}
                <Box
                  onClick={() => done && setLightbox(p.image_url)}
                  sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: done ? 'zoom-in' : 'default' }}>
                  {done
                    ? <Box component="img" src={p.image_url} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : p.status === 'error'
                    ? <Typography sx={{ fontSize: 11, color: CORAL, px: 2, textAlign: 'center' }}>{p.error || 'erro'}</Typography>
                    : <Stack alignItems="center" spacing={1}><CircularProgress size={18} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: 'text.disabled' }}>gerando…</Typography></Stack>}
                </Box>
                {done && (
                  <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center' }}>
                    {APP_ACTIONS.map(({ op, label, Icon }) => (
                      <Tooltip key={op} title={label}>
                        <span><IconButton size="small" disabled={acting[`${p.id}:${op}`]} onClick={() => runApp(p, op)}>
                          {acting[`${p.id}:${op}`] ? <CircularProgress size={14} /> : <Icon sx={{ fontSize: 16 }} />}
                        </IconButton></span>
                      </Tooltip>
                    ))}
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Aprovar">
                      <span><IconButton size="small" disabled={voting[p.id]} onClick={() => votar(p, 'up')}>
                        {p.feedback === 'up' ? <ThumbUpIcon sx={{ fontSize: 16, color: TEAL }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />}
                      </IconButton></span>
                    </Tooltip>
                    <Tooltip title="Reprovar">
                      <span><IconButton size="small" disabled={voting[p.id]} onClick={() => votar(p, 'down')}>
                        {p.feedback === 'down' ? <ThumbDownIcon sx={{ fontSize: 16, color: CORAL }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />}
                      </IconButton></span>
                    </Tooltip>
                    <Tooltip title="Baixar"><IconButton size="small" onClick={() => downloadImage(p.image_url)}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    <Tooltip title={saved[p.id] ? 'Salvo nos assets' : 'Salvar nos assets'}>
                      <span><IconButton size="small" disabled={saved[p.id] || saving[p.id]} onClick={() => saveToAssets(p)}>
                        {saving[p.id] ? <CircularProgress size={14} /> : <BookmarkAddOutlinedIcon sx={{ fontSize: 16, color: saved[p.id] ? TEAL : 'inherit' }} />}
                      </IconButton></span>
                    </Tooltip>
                  </Box>
                )}
              </Paper>
              )
            })}
          </Box>
        )}
      </Box>

      {/* Lightbox — abre a imagem do R2 em tela cheia */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={() => setLightbox(null)} sx={{ position: 'absolute', top: -14, right: -14, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {lightbox && (
            <Box component="img" src={lightbox} alt="" sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2 }} />
          )}
          {lightbox && (
            <Button startIcon={<DownloadOutlinedIcon />} onClick={() => downloadImage(lightbox)}
              sx={{ position: 'absolute', bottom: 12, right: 12, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
              Baixar
            </Button>
          )}
        </Box>
      </Dialog>
    </Box>
  )
}
