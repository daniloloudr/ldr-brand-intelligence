import { useState, useRef, useEffect } from 'react'
import { navigate } from '../../lib/helpers';
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
import { CreditBadge } from '../../components/CreditBadge'
import { creditsForImage } from '../../lib/credits'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, IMAGE_MODEL_GROUPS, resolveModel, FORMATOS, PROMPT_TEMPLATES,
  MAX_REFS_CANVAS, planoDeRefs, comoLeAsRefs } from '../../lib/studioModels'
import { PALETTE } from '../../lib/theme'

const TEAL = PALETTE.data.positivo, CORAL = PALETTE.data.critico
// Mesmo teto do canvas — eram duas constantes de 5 em telas diferentes, e
// consertar só uma deixaria a página Imagem cortando onde o Fluxo não corta.
const MAX_REFS = MAX_REFS_CANVAS

// Ações inline pós-geração (reaproveitam studio-edit.js)
const APP_ACTIONS = [
  { op: 'upscale',   label: 'Ampliar',       Icon: HighQualityOutlinedIcon },
  { op: 'removebg',  label: 'Remover fundo', Icon: LayersClearOutlinedIcon },
  { op: 'variation', label: 'Variação',      Icon: AutoAwesomeMotionOutlinedIcon },
]

export function StudioImage({ brandId, cabecalho = true }) {
  const { reload: reloadWorkspace } = useWorkspace()
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
  const [broken, setBroken] = useState({})        // ids de imagens que falharam ao carregar (404) → ocultas
  // ⚔️ Duelo de Modelos: mesma peça em 2–3 providers lado a lado + voto do
  // vencedor → preferência PAREADA (sinal model_duel, o dado mais forte pro
  // win_rate do cérebro) + aprovação da vencedora (reusa o flywheel do voto).
  const [duelMode, setDuelMode] = useState(false)
  const [duelModels, setDuelModels] = useState([DEFAULT_IMAGE_MODEL, 'openai/gpt-image-2'])
  const [duel, setDuel] = useState(null)          // { prompt, formato, entries:[{model,genId}], winner, saving }

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
    // A página mostra só as 20 últimas — o acervo completo mora na Biblioteca
    const q = b => supabase.from('studio_generations').select(b)
      .eq('brand_id', brandId).is('workflow_id', null).is('campaign_id', null)
      .order('created_at', { ascending: false }).limit(20)
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
    if (duelMode) return gerarDuelo()
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
    reloadWorkspace?.()   // atualiza o saldo de créditos (débito já ocorreu no submit)
  }

  // ── ⚔️ Duelo: dispara a MESMA peça em cada modelo escolhido ──
  async function gerarDuelo() {
    if (!prompt.trim()) return setMsg('Escreva um prompt.')
    if (duelModels.length < 2) return setMsg('Escolha 2 ou 3 modelos para o duelo.')
    setMsg(''); setGenerating(true)
    const { data: { session } } = await supabase.auth.getSession()
    const entries = []
    for (const m of duelModels) {
      const modelId = resolveModel(m)
      try {
        const res = await fetch('/.netlify/functions/studio-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ brand_id: brandId, prompt: prompt.trim(), formato, use_brand: useBrand, model: modelId, references: refUrls }),
        })
        const j = await res.json()
        if (res.ok) entries.push({ model: modelId, genId: j.generation_id })
        else setMsg(j.error || `Erro ${res.status}`)
      } catch (e) { setMsg(e.message) }
    }
    setGenerating(false)
    if (entries.length < 2) return setMsg(prev => prev || 'O duelo precisa de pelo menos 2 gerações.')
    setItems(prev => [...entries.map(e => ({ id: e.genId, status: 'processing', image_url: null, formato })), ...prev])
    setDuel({ prompt: prompt.trim(), formato, entries, winner: null, saving: false })
    ensurePolling()
    reloadWorkspace?.()
  }

  // Voto do duelo: sinal model_duel (preferência pareada) + feedback 'up' na
  // vencedora — o update dispara o trigger image_vote (flywheel existente).
  async function escolherVencedora(entry) {
    if (!duel || duel.winner || duel.saving) return
    setDuel(d => ({ ...d, saving: true }))
    const [{ data: { user } }, { data: brand }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('brands').select('workspace_id').eq('id', brandId).single(),
    ])
    const perdedores = duel.entries.filter(e => e.genId !== entry.genId).map(e => e.model)
    const [{ error: sigErr }] = await Promise.all([
      supabase.from('brand_signals').insert({
        brand_id: brandId, workspace_id: brand?.workspace_id, tipo: 'model_duel', fonte: 'studio-duelo',
        ref_id: entry.genId, peso: 2,
        payload: { vencedor: entry.model, perdedores, formato: duel.formato,
          prompt: duel.prompt.slice(0, 2000), generation_ids: duel.entries.map(e => e.genId) },
      }),
      supabase.from('studio_generations')
        .update({ feedback: 'up', feedback_at: new Date().toISOString(), feedback_by: user?.id })
        .eq('id', entry.genId),
    ])
    if (sigErr) { setMsg('Não foi possível registrar a preferência.'); setDuel(d => ({ ...d, saving: false })); return }
    setItems(prev => prev.map(it => it.id === entry.genId ? { ...it, feedback: 'up' } : it))
    setDuel(d => ({ ...d, winner: entry.genId, saving: false }))
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
      if (res.ok && j.prompt) { setPrompt(j.prompt); setMsg('Prompt melhorado — confira se faz sentido com o direcionamento da peça.') }
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

  // Galeria visível: oculta gerações com erro e imagens que não carregam (404)
  const visibleItems = items.filter(p => p.status !== 'error' && !broken[p.id])

  return (
    <Box>
      {cabecalho && <PageHeader title="Estúdio" subtitle="Geração de imagem" />}

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
          {/* Modelo (ou modelos, no duelo) */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
                {duelMode ? 'Modelos em duelo (2–3)' : 'Modelo'}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Chip label="⚔️ Duelo de modelos" size="small" clickable disabled={generating}
                onClick={() => setDuelMode(v => !v)} variant={duelMode ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, fontSize: 11.5, ...(duelMode && { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }) }} />
            </Stack>
            {duelMode ? (<>
              <Select multiple value={duelModels}
                onChange={e => { const v = e.target.value; if (v.length >= 1 && v.length <= 3) setDuelModels(v) }}
                renderValue={sel => sel.map(id => IMAGE_MODELS.find(m => m.id === id)?.label || id).join('  ⚔️  ')}
                fullWidth size="small" disabled={generating} sx={{ fontSize: 13 }}>
                {IMAGE_MODEL_GROUPS.flatMap(g => [
                  <ListSubheader key={g} sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', lineHeight: 2.4, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
                  ...IMAGE_MODELS.filter(m => m.group === g && !/fashn\/tryon/.test(m.id)).map(m => (
                    <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13 }}>{m.label}</MenuItem>
                  )),
                ])}
              </Select>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
                A mesma peça é gerada em todos — você escolhe a vencedora e a marca aprende qual modelo funciona melhor pra ela.
              </Typography>
            </>) : (
            <Select value={model} onChange={e => setModel(e.target.value)} fullWidth size="small" disabled={generating} sx={{ fontSize: 13 }}>
              {IMAGE_MODEL_GROUPS.flatMap(g => [
                <ListSubheader key={g} sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', lineHeight: 2.4, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
                ...IMAGE_MODELS.filter(m => m.group === g).map(m => (
                  <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13 }}>{m.label}</MenuItem>
                )),
              ])}
            </Select>
            )}
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
              onClick={melhorarPrompt} disabled={generating || improving} sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
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
                    cursor: generating || refUploading ? 'default' : 'pointer', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}>
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

          {/* O aviso que faltava nesta tela. O nó do Fluxo passou a dizer como
              cada modelo lê as referências (31/ago); aqui não dizia nada, e um
              modelo de referência única descartava da 2ª em diante em silêncio —
              o mesmo defeito do "sapato não pegou", na outra superfície. */}
          {refUrls.length > 0 && (() => {
            const plano = planoDeRefs(model, refUrls.length, MAX_REFS)
            return (
              <Typography sx={{ fontSize: 11.5, mb: 2, lineHeight: 1.5, color: plano.ignoradas ? 'error.main' : 'text.secondary' }}>
                {comoLeAsRefs(model)}
                {plano.ignoradas > 0 && ` Das ${refUrls.length} conectadas, ${plano.usadas} ${plano.usadas > 1 ? 'chegam' : 'chega'} ao modelo — ${plano.ignoradas} ${plano.ignoradas > 1 ? 'são ignoradas' : 'é ignorada'}.`}
                {plano.faltam > 0 && ` Faltam ${plano.faltam}: este modelo exige ${plano.exatas}.`}
              </Typography>
            )
          })()}

          {/* Formato + nº + marca */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
            {FORMATOS.map(f => (
              <Chip key={f.v} label={f.label} clickable disabled={generating} onClick={() => setFormato(f.v)}
                variant={formato === f.v ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, ...(formato === f.v && { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }) }} />
            ))}
            <Box sx={{ flex: 1 }} />
            {!duelMode && (<>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Imagens:</Typography>
              {[1, 2, 4].map(n => (
                <Chip key={n} label={n} clickable disabled={generating} onClick={() => setCount(n)} size="small"
                  variant={count === n ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700, ...(count === n && { bgcolor: 'primary.main', color: '#fff' }) }} />
              ))}
            </>)}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Switch checked={useBrand} onChange={e => setUseBrand(e.target.checked)} disabled={generating} size="small" />}
              label={<Typography sx={{ fontSize: 13 }}>Usar marca como referência</Typography>} />
            <Box sx={{ flex: 1 }} />
            {msg && <Typography sx={{ fontSize: 13, color: msg.startsWith('Prompt melhorado') ? 'text.secondary' : CORAL }}>{msg}</Typography>}
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>
              {(() => {
                const c = duelMode
                  ? duelModels.reduce((acc, m) => acc + creditsForImage(resolveModel(m) || undefined), 0)
                  : creditsForImage(resolveModel(model) || undefined) * count
                return `esta rodada: ${c} crédito${c > 1 ? 's' : ''}`
              })()}
            </Typography>
            <CreditBadge />
            <Button variant="contained" startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
              onClick={gerar} disabled={generating} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 800 }}>
              {generating ? 'Gerando…' : duelMode ? 'Gerar duelo' : 'Gerar'}
            </Button>
          </Stack>
        </Paper>

        {/* ⚔️ Arena do duelo — lado a lado, voto único na vencedora */}
        {duel && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, borderColor: duel.winner ? TEAL : 'divider', borderWidth: duel.winner ? 2 : 1 }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900 }}>
                ⚔️ Duelo de modelos {duel.winner ? '— vencedora escolhida' : '— compare e escolha a vencedora'}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => setDuel(null)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${duel.entries.length}, 1fr)` }, gap: 1.5 }}>
              {duel.entries.map(e => {
                const it = items.find(i => i.id === e.genId)
                const done = it?.status === 'done' && it.image_url
                const isWinner = duel.winner === e.genId
                const label = IMAGE_MODELS.find(m => m.id === e.model)?.label || e.model
                return (
                  <Box key={e.genId} sx={{ border: '2px solid', borderColor: isWinner ? TEAL : 'divider', borderRadius: 2, overflow: 'hidden',
                    opacity: duel.winner && !isWinner ? 0.55 : 1, transition: 'opacity .2s' }}>
                    <Box onClick={() => done && setLightbox(it.image_url)}
                      sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: done ? 'zoom-in' : 'default' }}>
                      {done
                        ? <Box component="img" src={it.image_url} alt={label} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <Stack alignItems="center" spacing={1}><CircularProgress size={18} sx={{ color: 'primary.main' }} /><Typography sx={{ fontSize: 10, color: 'text.disabled' }}>gerando…</Typography></Stack>}
                    </Box>
                    <Stack sx={{ p: 1 }} spacing={0.75} alignItems="center">
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{label}</Typography>
                      {isWinner
                        ? <Chip size="small" label="🏆 Vencedora" sx={{ fontWeight: 800, fontSize: 11, bgcolor: 'primary.main', color: '#fff' }} />
                        : !duel.winner && (
                          <Button size="small" variant="outlined" disabled={!done || duel.saving} onClick={() => escolherVencedora(e)}
                            sx={{ fontSize: 11, fontWeight: 800, borderColor: TEAL, color: TEAL, '&:hover': { borderColor: PALETTE.data.positivoDim, bgcolor: 'rgba(13,158,122,.06)' } }}>
                            Escolher vencedora
                          </Button>
                        )}
                    </Stack>
                  </Box>
                )
              })}
            </Box>
            {duel.winner && (
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1.25 }}>
                Preferência registrada — o cérebro da marca aprendeu com esta escolha (vitória pareada alimenta o win-rate por modelo).
              </Typography>
            )}
          </Paper>
        )}

        {/* Galeria persistente */}
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={22} sx={{ color: 'primary.main' }} /></Stack>
        ) : visibleItems.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <ImageOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography variant="h6" fontWeight={900}>Nenhuma imagem ainda</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
              Escreva um prompt e gere — suas criações ficam salvas aqui na galeria da marca.
            </Typography>
          </Stack>
        ) : (
          <><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
            {visibleItems.map(p => {
              const done = p.status === 'done' && p.image_url
              return (
              <Paper key={p.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* Box quadrado e uniforme — imagem se adapta (cover), mantendo a ordem visual */}
                <Box
                  onClick={() => done && setLightbox(p.image_url)}
                  sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: done ? 'zoom-in' : 'default' }}>
                  {done
                    ? <Box component="img" src={p.image_url} alt="" loading="lazy"
                        onError={() => setBroken(b => ({ ...b, [p.id]: true }))}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <Stack alignItems="center" spacing={1}><CircularProgress size={18} sx={{ color: 'primary.main' }} /><Typography sx={{ fontSize: 10, color: 'text.disabled' }}>gerando…</Typography></Stack>}
                </Box>
                {done && (
                  <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center' }}>
                    {APP_ACTIONS.map(({ op, label, Icon }) => (
                      <Tooltip key={op} title={label}>
                        <Typography component="span"><IconButton size="small" disabled={acting[`${p.id}:${op}`]} onClick={() => runApp(p, op)}>
                          {acting[`${p.id}:${op}`] ? <CircularProgress size={14} /> : <Icon sx={{ fontSize: 16 }} />}
                        </IconButton></Typography>
                      </Tooltip>
                    ))}
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Aprovar">
                      <Typography component="span"><IconButton size="small" disabled={voting[p.id]} onClick={() => votar(p, 'up')}>
                        {p.feedback === 'up' ? <ThumbUpIcon sx={{ fontSize: 16, color: TEAL }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />}
                      </IconButton></Typography>
                    </Tooltip>
                    <Tooltip title="Reprovar">
                      <Typography component="span"><IconButton size="small" disabled={voting[p.id]} onClick={() => votar(p, 'down')}>
                        {p.feedback === 'down' ? <ThumbDownIcon sx={{ fontSize: 16, color: CORAL }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />}
                      </IconButton></Typography>
                    </Tooltip>
                    <Tooltip title="Baixar"><IconButton size="small" onClick={() => downloadImage(p.image_url)}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    <Tooltip title={saved[p.id] ? 'Salvo nos assets' : 'Salvar nos assets'}>
                      <Typography component="span"><IconButton size="small" disabled={saved[p.id] || saving[p.id]} onClick={() => saveToAssets(p)}>
                        {saving[p.id] ? <CircularProgress size={14} /> : <BookmarkAddOutlinedIcon sx={{ fontSize: 16, color: saved[p.id] ? TEAL : 'inherit' }} />}
                      </IconButton></Typography>
                    </Tooltip>
                  </Box>
                )}
              </Paper>
              )
            })}
          </Box>
          <Stack alignItems="center" mt={2.5}>
            <Button variant="outlined" size="small"
              onClick={() => { sessionStorage.setItem('biblioteca_root', 'imagens'); navigate(`#/app/brands/${brandId}/studio/biblioteca`) }}
              sx={{ fontWeight: 800, borderColor: TEAL, color: TEAL, '&:hover': { borderColor: PALETTE.data.positivoDim, bgcolor: 'rgba(13,158,122,.06)' } }}>
              Ver todas na Biblioteca →
            </Button>
          </Stack></>
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
