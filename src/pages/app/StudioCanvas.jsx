import { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, NodeToolbar,
  addEdge, applyNodeChanges, applyEdgeChanges, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Box, Button, Typography, TextField, MenuItem, Select, ListSubheader, Paper,
  Stack, CircularProgress, Divider, Tooltip, IconButton, Menu, Dialog,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SaveIcon from '@mui/icons-material/Save'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CloseIcon from '@mui/icons-material/Close'
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { IMAGE_MODELS, resolveModel } from '../../lib/studioModels'

const PURPLE = '#7F77DD', TEAL = '#0D9E7A', GRAY = '#8A9AB0', CORAL = '#E8185A'
// Grupos do catálogo (inclui 'Automático') p/ o seletor do nó Generate.
const MODEL_GROUPS = [...new Set(IMAGE_MODELS.map(m => m.group))]
const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1' },
  { v: '9:16', label: 'Story 9:16' },
  { v: '16:9', label: 'Banner 16:9' },
  { v: '4:5',  label: 'Retrato 4:5' },
]

// ── Shell visual de um nó ────────────────────────────────────────────
function NodeShell({ id, color, title, children, inputs = true, output = true, onDelete, onDuplicate, onRun }) {
  return (
    <Paper elevation={0} sx={{
      minWidth: 200, maxWidth: 240, border: '1px solid', borderColor: 'divider',
      borderTop: `3px solid ${color}`, borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden',
    }}>
      {(onDelete || onDuplicate || onRun) && (
        <NodeToolbar position={Position.Top} offset={6}>
          <Paper elevation={3} className="nodrag" sx={{ display: 'flex', gap: 0.25, p: 0.25, borderRadius: 1.5 }}>
            {onRun && <Tooltip title="Rodar este"><IconButton size="small" onClick={() => onRun(id)}><PlayArrowIcon sx={{ fontSize: 16, color: TEAL }} /></IconButton></Tooltip>}
            {onDuplicate && <Tooltip title="Duplicar"><IconButton size="small" onClick={() => onDuplicate(id)}><ContentCopyIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>}
            {onDelete && <Tooltip title="Excluir"><IconButton size="small" onClick={() => onDelete(id)}><DeleteOutlineIcon sx={{ fontSize: 15, color: CORAL }} /></IconButton></Tooltip>}
          </Paper>
        </NodeToolbar>
      )}
      {inputs && <Handle type="target" position={Position.Left} style={{ background: color, width: 9, height: 9 }} />}
      <Box sx={{ px: 1.5, py: 1 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
          {title}
        </Typography>
        <Box sx={{ mt: 0.75 }}>{children}</Box>
      </Box>
      {output && <Handle type="source" position={Position.Right} style={{ background: color, width: 9, height: 9 }} />}
    </Paper>
  )
}

// ── Nós customizados ─────────────────────────────────────────────────
const BrandContextNode = memo(({ id, data }) => (
  <NodeShell id={id} color={PURPLE} title={data.title} inputs={false} onDelete={data.onDelete} onDuplicate={data.onDuplicate}>
    <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>{data.desc}</Typography>
  </NodeShell>
))

const PromptNode = memo(({ id, data }) => (
  <NodeShell id={id} color={GRAY} title="Prompt" inputs={false} onDelete={data.onDelete} onDuplicate={data.onDuplicate}>
    <Stack spacing={0.25} className="nodrag">
      <TextField
        value={data.text || ''} onChange={e => data.onChange(id, { text: e.target.value })}
        placeholder="O que criar…" multiline minRows={2} maxRows={5} fullWidth size="small"
        sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
      />
      <Button size="small" disabled={data.improving || !(data.text || '').trim()}
        startIcon={data.improving ? <CircularProgress size={11} /> : <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 14 }} />}
        onClick={() => data.onImprove?.(id)}
        sx={{ alignSelf: 'flex-end', fontSize: 10, fontWeight: 700, color: TEAL, minWidth: 0, py: 0 }}>
        {data.improving ? 'Melhorando…' : 'Melhorar'}
      </Button>
    </Stack>
  </NodeShell>
))

const FormatoNode = memo(({ id, data }) => (
  <NodeShell id={id} color={GRAY} title="Formato" inputs={false} onDelete={data.onDelete} onDuplicate={data.onDuplicate}>
    <Select
      value={data.formato || '1:1'} onChange={e => data.onChange(id, { formato: e.target.value })}
      fullWidth size="small" className="nodrag" sx={{ fontSize: 12 }}
    >
      {FORMATOS.map(f => <MenuItem key={f.v} value={f.v} sx={{ fontSize: 12 }}>{f.label}</MenuItem>)}
    </Select>
  </NodeShell>
))

const GenerateNode = memo(({ id, data }) => (
  <NodeShell id={id} color={TEAL} title="Generate" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRun={data.onRun}>
    <Stack spacing={0.5} className="nodrag">
      <Select value={data.model || 'auto'} onChange={e => data.onChange(id, { model: e.target.value })}
        size="small" fullWidth sx={{ fontSize: 11 }}>
        {MODEL_GROUPS.flatMap(g => [
          <ListSubheader key={g} sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 2.2, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
          ...IMAGE_MODELS.filter(m => m.group === g).map(m => <MenuItem key={m.id} value={m.id} sx={{ fontSize: 11 }}>{m.label}</MenuItem>),
        ])}
        <MenuItem value="custom" sx={{ fontSize: 11 }}>ID custom…</MenuItem>
      </Select>
      {data.model === 'custom' && (
        <TextField value={data.customModel || ''} onChange={e => data.onChange(id, { customModel: e.target.value })}
          placeholder="fal-ai/…" size="small" fullWidth sx={{ '& .MuiInputBase-input': { fontSize: 11 } }} />
      )}
      {data.status === 'running' && <Stack direction="row" spacing={0.75} alignItems="center"><CircularProgress size={12} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: TEAL }}>gerando…</Typography></Stack>}
      {data.status === 'done'    && <Typography sx={{ fontSize: 10, color: TEAL, fontWeight: 700 }}>✓ concluído</Typography>}
      {data.status === 'error'   && <Typography sx={{ fontSize: 10, color: CORAL }}>{data.error || 'erro'}</Typography>}
    </Stack>
  </NodeShell>
))

const PreviewNode = memo(({ id, data }) => (
  <NodeShell id={id} color={CORAL} title="Preview" output={false} onDelete={data.onDelete} onDuplicate={data.onDuplicate}>
    {data.imageUrl ? (
      <>
        <Box component="img" src={data.imageUrl} alt="" className="nodrag" onClick={() => data.onOpen?.(data.imageUrl)}
          sx={{ width: '100%', borderRadius: 1, display: 'block', cursor: 'zoom-in' }} />
        <Stack direction="row" spacing={0} alignItems="center" className="nodrag" sx={{ mt: 0.25 }}>
          <Tooltip title="Aprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'up')}>
            {data.feedback === 'up' ? <ThumbUpIcon sx={{ fontSize: 14, color: TEAL }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />}
          </IconButton></Tooltip>
          <Tooltip title="Reprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'down')}>
            {data.feedback === 'down' ? <ThumbDownIcon sx={{ fontSize: 14, color: CORAL }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />}
          </IconButton></Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Baixar">
            <IconButton size="small" onClick={() => data.onDownload?.(data.imageUrl)}>
              <DownloadOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={data.saved ? 'Salvo nos assets' : 'Salvar nos assets'}>
            <span>
              <IconButton size="small" disabled={data.saved} onClick={() => data.onSave?.(id, data)}>
                <BookmarkAddOutlinedIcon sx={{ fontSize: 15, color: data.saved ? TEAL : 'inherit' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </>
    ) : (
      <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>aguardando geração</Typography>
      </Box>
    )}
  </NodeShell>
))

const APP_DESC = { upscale: 'Aumenta resolução (impressão)', removebg: 'Remove o fundo', variation: 'Gera variação da imagem' }

const AppNode = memo(({ id, data }) => (
  <NodeShell id={id} color={GRAY} title={data.label || data.op} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRun={data.onRun}>
    <Stack spacing={0.5} className="nodrag">
      {data.outputUrl ? (
        <>
          <Box component="img" src={data.outputUrl} alt="" onClick={() => data.onOpen?.(data.outputUrl)}
            sx={{ width: '100%', borderRadius: 1, display: 'block', cursor: 'zoom-in' }} />
          <Stack direction="row" spacing={0} alignItems="center" sx={{ mt: 0.25 }}>
            <Tooltip title="Aprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'up')}>
              {data.feedback === 'up' ? <ThumbUpIcon sx={{ fontSize: 14, color: TEAL }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />}
            </IconButton></Tooltip>
            <Tooltip title="Reprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'down')}>
              {data.feedback === 'down' ? <ThumbDownIcon sx={{ fontSize: 14, color: CORAL }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />}
            </IconButton></Tooltip>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Baixar"><IconButton size="small" onClick={() => data.onDownload?.(data.outputUrl)}><DownloadOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
            <Tooltip title={data.saved ? 'Salvo nos assets' : 'Salvar nos assets'}>
              <span><IconButton size="small" disabled={data.saved} onClick={() => data.onSave?.(id, { imageUrl: data.outputUrl, genId: data.genId, formato: data.op })}>
                <BookmarkAddOutlinedIcon sx={{ fontSize: 15, color: data.saved ? TEAL : 'inherit' }} />
              </IconButton></span>
            </Tooltip>
          </Stack>
        </>
      ) : (
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{APP_DESC[data.op] || ''}</Typography>
      )}
      {data.status === 'running' && <Stack direction="row" spacing={0.75} alignItems="center"><CircularProgress size={12} sx={{ color: GRAY }} /><Typography sx={{ fontSize: 10, color: 'text.secondary' }}>processando…</Typography></Stack>}
      {data.status === 'error'   && <Typography sx={{ fontSize: 10, color: CORAL }}>{data.error || 'erro'}</Typography>}
    </Stack>
  </NodeShell>
))

// Imagem externa (upload) — traz arquivos para compor o workflow
const ImageInputNode = memo(({ id, data }) => (
  <NodeShell id={id} color={GRAY} title="Imagem" inputs={false} onDelete={data.onDelete} onDuplicate={data.onDuplicate}>
    {data.url ? (
      <Box component="img" src={data.url} alt="" sx={{ width: '100%', borderRadius: 1, display: 'block' }} />
    ) : (
      <Box component="label" className="nodrag" sx={{
        aspectRatio: '4 / 3', border: '1px dashed', borderColor: 'divider', borderRadius: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer',
      }}>
        {data.uploading
          ? <CircularProgress size={16} />
          : <><ImageOutlinedIcon sx={{ fontSize: 22, color: 'text.disabled' }} /><Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Subir imagem</Typography></>}
        <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) data.onUpload?.(id, f) }} />
      </Box>
    )}
  </NodeShell>
))

const nodeTypes = { brandContext: BrandContextNode, prompt: PromptNode, formato: FormatoNode, generate: GenerateNode, preview: PreviewNode, app: AppNode, imageInput: ImageInputNode }

// Nós que produzem imagem (podem alimentar apps a jusante)
const PRODUCES_IMAGE = new Set(['generate', 'app', 'imageInput'])

// Paleta de nós que podem ser adicionados ao canvas (novo workflow = canvas em branco)
const NODE_TEMPLATES = [
  { type: 'prompt',       label: 'Prompt',       data: { text: '' } },
  { type: 'formato',      label: 'Formato',      data: { formato: '1:1' } },
  { type: 'generate',     label: 'Generate',     data: { status: 'idle', model: 'auto' } },
  { type: 'preview',      label: 'Preview',      data: { imageUrl: null } },
  { type: 'imageInput',   label: 'Imagem (upload)', data: {} },
  { type: 'brandContext', label: 'Brand Voice',  data: { title: 'Brand Voice', desc: 'Tom de voz, personalidade e vocabulário da marca' } },
  { type: 'brandContext', label: 'Brand Visual', data: { title: 'Brand Visual', desc: 'Paleta, tipografia e estética' } },
  { type: 'app',          label: 'Upscale',      data: { op: 'upscale',   label: 'Upscale',   status: 'idle' } },
  { type: 'app',          label: 'Remove BG',    data: { op: 'removebg',  label: 'Remove BG', status: 'idle' } },
  { type: 'app',          label: 'Variation',    data: { op: 'variation', label: 'Variation', status: 'idle' } },
]

export function StudioCanvas({ brandId, workflowId }) {
  const { workspace } = useWorkspace()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [wfId, setWfId]   = useState(workflowId || null)
  const [nome, setNome]   = useState('Novo workflow')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]     = useState('')
  const [lightbox, setLightbox] = useState(null)   // url aberta em tela cheia
  const pollRef = useRef(null)
  const rfRef = useRef(null)
  const connectSrcRef = useRef(null)
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  const markDirty = useCallback(() => setDirty(true), [])
  const runRef = useRef(null)                       // run() estável p/ os nós (run seletivo)
  const runNode = useCallback(id => runRef.current?.(id), [])

  const updateNodeData = useCallback((id, patch) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    setDirty(true)
  }, [])

  const downloadImage = useCallback(async (url) => {
    try {
      const res = await fetch(url); const blob = await res.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'loudr-studio.png'; a.click(); URL.revokeObjectURL(a.href)
    } catch { window.open(url, '_blank') }
  }, [])

  const savePiece = useCallback(async (nodeId, data) => {
    if (!data?.imageUrl || data.saved) return
    const { error } = await supabase.from('brand_assets').insert({
      brand_id: brandId, tipo: 'foto',
      nome: `Studio · ${data.formato || 'peça'}`, descricao: 'Gerado no Studio',
      valor: data.imageUrl, mime_type: 'image/png',
      metadata: { source: 'studio', generation_id: data.genId, formato: data.formato },
    })
    if (!error) updateNodeData(nodeId, { saved: true })
  }, [brandId, updateNodeData])

  const uploadImageInput = useCallback(async (id, file) => {
    updateNodeData(id, { uploading: true })
    const path = `${brandId}/workflow/${Date.now()}-${(file.name || 'img').replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
    if (error) { updateNodeData(id, { uploading: false }); return }
    const { data } = supabase.storage.from('brand-assets').getPublicUrl(path)
    updateNodeData(id, { url: data.publicUrl, uploading: false })
  }, [brandId, updateNodeData])

  // Melhorar o prompt do nó (Sonnet 4.6 via studio-prompt.js). Marca como on-brand
  // se houver algum nó de marca no grafo.
  const improvePrompt = useCallback(async (id) => {
    const node = nodesRef.current.find(n => n.id === id)
    const idea = (node?.data?.text || '').trim()
    if (!idea) return
    const useBrand = nodesRef.current.some(n => n.type === 'brandContext')
    updateNodeData(id, { improving: true })
    try {
      const session = (await supabase.auth.getSession()).data.session
      const res = await fetch('/.netlify/functions/studio-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brand_id: brandId, idea, use_brand: useBrand }),
      })
      const j = await res.json()
      updateNodeData(id, { improving: false, ...(res.ok && j.prompt ? { text: j.prompt } : {}) })
    } catch { updateNodeData(id, { improving: false }) }
  }, [brandId, updateNodeData])

  // Votação/aprovação da peça do nó → studio_generations.feedback (RLS for all).
  const votePiece = useCallback(async (id, genId, voto) => {
    if (!genId) return
    const node = nodesRef.current.find(n => n.id === id)
    const novo = node?.data?.feedback === voto ? null : voto
    updateNodeData(id, { feedback: novo })
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('studio_generations')
      .update({ feedback: novo, feedback_at: novo ? new Date().toISOString() : null, feedback_by: novo ? user?.id : null })
      .eq('id', genId)
  }, [updateNodeData])

  const openLightbox = useCallback(url => url && setLightbox(url), [])

  const deleteNode = useCallback((id) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.source !== id && e.target !== id))
    setDirty(true)
  }, [])

  const attachHandlersRef = useRef(null)
  const duplicateNode = useCallback((id) => {
    setNodes(ns => {
      const n = ns.find(x => x.id === id); if (!n) return ns
      const copy = attachHandlersRef.current({
        ...n, id: `${n.type}-${Date.now()}`,
        position: { x: n.position.x + 48, y: n.position.y + 48 },
        data: { ...n.data, status: 'idle', outputUrl: null, imageUrl: null, saved: false },
      })
      return [...ns, copy]
    })
    setDirty(true)
  }, [])

  // Injeta callbacks nos nós (não serializados): ações + edição
  const attachHandlers = useCallback(n => {
    const data = { ...n.data, onDelete: deleteNode, onDuplicate: duplicateNode }
    if (['prompt', 'formato', 'generate'].includes(n.type)) data.onChange = updateNodeData
    if (n.type === 'prompt') data.onImprove = improvePrompt
    if (['generate', 'app'].includes(n.type)) data.onRun = runNode
    if (['preview', 'app'].includes(n.type)) { data.onSave = savePiece; data.onDownload = downloadImage; data.onOpen = openLightbox; data.onVote = votePiece }
    if (n.type === 'imageInput') data.onUpload = uploadImageInput
    return { ...n, data }
  }, [updateNodeData, savePiece, downloadImage, deleteNode, duplicateNode, uploadImageInput, improvePrompt, openLightbox, votePiece, runNode])
  attachHandlersRef.current = attachHandlers

  const [addAnchor, setAddAnchor] = useState(null)
  const [connectMenu, setConnectMenu] = useState(null)
  function addNode(tpl) {
    setAddAnchor(null)
    const newNode = attachHandlers({
      id: `${tpl.type}-${Date.now()}`, type: tpl.type,
      position: { x: 260 + Math.random() * 120, y: 120 + Math.random() * 220 },
      data: { ...tpl.data },
    })
    setNodes(ns => [...ns, newNode])
    setDirty(true)
  }

  // Carrega workflow salvo ou semeia o grafo inicial
  useEffect(() => {
    let active = true
    async function load() {
      if (wfId) {
        const { data } = await supabase.from('studio_workflows').select('nome, nodes, edges').eq('id', wfId).maybeSingle()
        if (active && data) {
          if (data.nome) setNome(data.nome)
          setNodes((data.nodes || []).map(attachHandlers))
          setEdges(data.edges || [])
          setDirty(false)
          return
        }
      }
      if (active) { setNodes([]); setEdges([]); setDirty(false) }   // novo workflow = canvas em branco
    }
    load()
    return () => { active = false; if (pollRef.current) clearInterval(pollRef.current) }
  }, [wfId, updateNodeData, attachHandlers])

  // Aviso ao fechar/recarregar a aba com alterações não salvas
  useEffect(() => {
    if (!dirty) return
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const onNodesChange = useCallback(ch => {
    if (ch.some(c => !['dimensions', 'select'].includes(c.type))) setDirty(true)
    setNodes(ns => applyNodeChanges(ch, ns))
  }, [])
  const onEdgesChange = useCallback(ch => {
    if (ch.some(c => c.type !== 'select')) setDirty(true)
    setEdges(es => applyEdgeChanges(ch, es))
  }, [])
  const onConnect     = useCallback(c => { setEdges(es => addEdge(c, es)); setDirty(true) }, [])
  const onConnectStart = useCallback((_, p) => { connectSrcRef.current = p?.nodeId || null }, [])
  const onConnectEnd = useCallback((event) => {
    const source = connectSrcRef.current; connectSrcRef.current = null
    if (!source) return
    // soltou no vazio (pane) → oferece criar um nó conectado
    if (!event.target?.classList?.contains('react-flow__pane')) return
    const p = event.changedTouches ? event.changedTouches[0] : event
    const flowPos = rfRef.current?.screenToFlowPosition?.({ x: p.clientX, y: p.clientY })
    setConnectMenu({ left: p.clientX, top: p.clientY, source, flowPos })
  }, [])
  function addNodeFromConnect(tpl) {
    const { source, flowPos } = connectMenu
    setConnectMenu(null)
    const newNode = attachHandlers({ id: `${tpl.type}-${Date.now()}`, type: tpl.type, position: flowPos || { x: 300, y: 200 }, data: { ...tpl.data } })
    setNodes(ns => [...ns, newNode])
    setEdges(es => addEdge({ id: `e-${Date.now()}`, source, target: newNode.id }, es))
    setDirty(true)
  }

  function serializableNodes() {
    return nodes.map(({ id, type, position, data }) => {
      const rest = Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v !== 'function'))
      return { id, type, position, data: rest }
    })
  }

  async function save() {
    setSaving(true); setMsg('')
    // thumbnail = 1ª imagem produzida no grafo (preview/app/imageInput)
    const thumb = nodes.map(n => n.data?.imageUrl || n.data?.outputUrl || n.data?.url).find(Boolean) || null
    const payload = {
      workspace_id: workspace?.id, brand_id: brandId,
      nome: (nome || 'Novo workflow').trim(), nodes: serializableNodes(), edges,
      thumbnail_url: thumb, updated_at: new Date().toISOString(),
    }
    let res
    if (wfId) res = await supabase.from('studio_workflows').update(payload).eq('id', wfId).select().single()
    else      res = await supabase.from('studio_workflows').insert(payload).select().single()
    setSaving(false)
    if (res.error) { setMsg('Erro ao salvar: ' + res.error.message); return }
    if (!wfId) { setWfId(res.data.id); window.location.hash = `#/app/brands/${brandId}/studio/workflow/${res.data.id}` }
    setDirty(false)
    setMsg('Salvo ✓')
  }

  // Resolve os inputs conectados a um nó Generate (marca é opcional: só injeta
  // se houver um nó de marca conectado).
  function inputsFor(genId) {
    const inIds = edges.filter(e => e.target === genId).map(e => e.source)
    const ins = nodes.filter(n => inIds.includes(n.id))
    const promptNode  = ins.find(n => n.type === 'prompt')
    const formatoNode = ins.find(n => n.type === 'formato')
    const brandNodes  = ins.filter(n => n.type === 'brandContext')
    const previewNode = nodes.find(n => n.type === 'preview' && edges.some(e => e.source === genId && e.target === n.id))
    // Faceta da marca por nó conectado (Brand Voice → verbal, Brand Visual → visual)
    const brandFacets = []
    if (brandNodes.some(n => /voz|voice|verbal/i.test(n.data?.title || ''))) brandFacets.push('verbal')
    if (brandNodes.some(n => /visual/i.test(n.data?.title || ''))) brandFacets.push('visual')
    return {
      prompt: (promptNode?.data?.text || '').trim(),
      formato: formatoNode?.data?.formato || '1:1',
      hasBrand: brandNodes.length > 0, brandFacets, previewNodeId: previewNode?.id,
    }
  }

  // Nó produtor de imagem conectado à entrada de um nó (encadeamento)
  function imageUpstreamOf(nodeId) {
    const inIds = edges.filter(e => e.target === nodeId).map(e => e.source)
    return nodes.find(n => inIds.includes(n.id) && PRODUCES_IMAGE.has(n.type))
  }
  // Todos os nós produtores de imagem conectados → viram referências (image-to-image)
  function imageUpstreamsOf(nodeId) {
    const inIds = edges.filter(e => e.target === nodeId).map(e => e.source)
    return nodes.filter(n => inIds.includes(n.id) && PRODUCES_IMAGE.has(n.type))
  }
  // Fecho a jusante de um nó (ele + tudo que descende dele) — p/ run seletivo
  function downstreamClosure(rootId) {
    const keep = new Set([rootId]); const stack = [rootId]
    while (stack.length) {
      const cur = stack.pop()
      for (const e of edges) if (e.source === cur && !keep.has(e.target)) { keep.add(e.target); stack.push(e.target) }
    }
    return keep
  }

  async function run(rootId = null) {
    let genNodes = nodes.filter(n => n.type === 'generate')
    let appNodes = nodes.filter(n => n.type === 'app')
    if (rootId) {                                  // run seletivo: só o nó + descendentes
      const keep = downstreamClosure(rootId)
      genNodes = genNodes.filter(n => keep.has(n.id))
      appNodes = appNodes.filter(n => keep.has(n.id))
    }
    if (!genNodes.length && !appNodes.length) return setMsg('Adicione nós ao canvas.')
    setMsg('')

    const session = (await supabase.auth.getSession()).data.session
    const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    const outputs = {}            // nodeId -> image_url pronto (encadeamento)
    const dispatched = new Set()

    async function dispatchGenerate(g) {
      const { prompt, formato, hasBrand, brandFacets, previewNodeId } = inputsFor(g.id)
      if (!prompt) { updateNodeData(g.id, { status: 'error', error: 'conecte um nó Prompt' }); return null }
      const references = imageUpstreamsOf(g.id).map(u => outputs[u.id]).filter(Boolean)
      const model = resolveModel(g.data?.model === 'custom' ? g.data?.customModel : g.data?.model)
      updateNodeData(g.id, { status: 'running', error: null })
      if (previewNodeId) updateNodeData(previewNodeId, { imageUrl: null })
      try {
        const res = await fetch('/.netlify/functions/studio-generate', { method: 'POST', headers: auth,
          body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: g.id, prompt, formato, use_brand: hasBrand, brand_facets: brandFacets, model, references }) })
        const j = await res.json(); if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
        dispatched.add(g.id)
        return { genId: j.generation_id, nodeId: g.id, kind: 'generate', previewNodeId, formato }
      } catch (e) { updateNodeData(g.id, { status: 'error', error: e.message }); return null }
    }

    async function dispatchApp(a) {
      const up = imageUpstreamOf(a.id)
      const imageUrl = outputs[up?.id]
      if (!imageUrl) { updateNodeData(a.id, { status: 'error', error: 'conecte uma imagem de entrada' }); return null }
      updateNodeData(a.id, { status: 'running', error: null, outputUrl: null })
      try {
        const res = await fetch('/.netlify/functions/studio-edit', { method: 'POST', headers: auth,
          body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: a.id, op: a.data.op, image_url: imageUrl }) })
        const j = await res.json(); if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
        dispatched.add(a.id)
        return { genId: j.generation_id, nodeId: a.id, kind: 'app' }
      } catch (e) { updateNodeData(a.id, { status: 'error', error: e.message }); return null }
    }

    // imageInput já tem a imagem pronta → semeia outputs (alimenta apps/refs a jusante)
    for (const n of nodes.filter(n => n.type === 'imageInput' && n.data?.url)) outputs[n.id] = n.data.url
    // Run seletivo: reusa imagens já produzidas a montante (apps) sem reprocessar
    if (rootId) for (const n of nodes.filter(n => n.type === 'app' && n.data?.outputUrl && !appNodes.includes(n))) outputs[n.id] = n.data.outputUrl
    // Generate só dispara quando todas as referências de imagem conectadas estão prontas
    const genReady = g => imageUpstreamsOf(g.id).every(u => outputs[u.id])

    const jobs = []
    for (const g of genNodes) { if (genReady(g)) { const job = await dispatchGenerate(g); if (job) jobs.push(job) } }
    for (const a of appNodes) {
      if (dispatched.has(a.id)) continue
      const up = imageUpstreamOf(a.id)
      if (up && outputs[up.id]) { const job = await dispatchApp(a); if (job) jobs.push(job) }
    }
    if (!jobs.length) return setMsg('Nada para gerar — adicione um Generate ou conecte uma imagem a um app.')
    pollEngine(jobs, { outputs, dispatched, genNodes, appNodes, dispatchGenerate, dispatchApp, genReady })
  }

  // Poll concorrente + dispara apps/generates a jusante quando o upstream conclui
  function pollEngine(initialJobs, ctx) {
    if (pollRef.current) clearInterval(pollRef.current)
    const { outputs, dispatched, genNodes, appNodes, dispatchGenerate, dispatchApp, genReady } = ctx
    const jobs = [...initialJobs]
    const pending = new Set(jobs.map(j => j.genId))
    const start = Date.now()
    pollRef.current = setInterval(async () => {
      if (!pending.size || Date.now() - start > 300_000) { clearInterval(pollRef.current); return }
      const { data } = await supabase.from('studio_generations').select('id, status, image_url, error').in('id', [...pending])
      const settled = []
      for (const row of data || []) {
        const job = jobs.find(j => j.genId === row.id); if (!job) continue
        if (row.status === 'done') {
          pending.delete(row.id); settled.push(job); outputs[job.nodeId] = row.image_url
          if (job.kind === 'generate') {
            updateNodeData(job.nodeId, { status: 'done' })
            if (job.previewNodeId) updateNodeData(job.previewNodeId, { imageUrl: row.image_url, genId: row.id, formato: job.formato, saved: false })
          } else {
            updateNodeData(job.nodeId, { status: 'done', outputUrl: row.image_url, genId: row.id, saved: false })
          }
        } else if (row.status === 'error') {
          pending.delete(row.id)
          updateNodeData(job.nodeId, { status: 'error', error: row.error || 'erro na geração' })
        }
      }
      // encadeamento: dispara apps e generates cujo upstream acabou de concluir
      for (const job of settled) {
        const readyApps = appNodes.filter(a => !dispatched.has(a.id) && imageUpstreamOf(a.id)?.id === job.nodeId)
        for (const a of readyApps) {
          const newJob = await dispatchApp(a)
          if (newJob) { jobs.push(newJob); pending.add(newJob.genId) }
        }
        // generates que usam a saída deste nó como referência (image-to-image)
        const readyGens = genNodes.filter(g => !dispatched.has(g.id)
          && imageUpstreamsOf(g.id).some(u => u.id === job.nodeId) && genReady(g))
        for (const g of readyGens) {
          const newJob = await dispatchGenerate(g)
          if (newJob) { jobs.push(newJob); pending.add(newJob.genId) }
        }
      }
      if (!pending.size) clearInterval(pollRef.current)
    }, 3000)
  }

  runRef.current = run   // mantém a referência estável apontando p/ o run atual

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <PageHeader
        title="Studio"
        subtitle="Geração visual on-brand"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Renomear workflow">
              <TextField value={nome} onChange={e => { setNome(e.target.value); setDirty(true) }}
                variant="standard" placeholder="Nome do workflow"
                sx={{ minWidth: 220, maxWidth: 360, '& .MuiInputBase-input': { fontSize: 14, fontWeight: 800, py: 0.25 } }} />
            </Tooltip>
            {dirty && <Tooltip title="Alterações não salvas"><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF9F27', flexShrink: 0 }} /></Tooltip>}
            {msg && <Typography sx={{ fontSize: 12, color: msg.startsWith('Erro') || msg.includes('conecte') || msg.includes('Adicione') ? CORAL : 'text.secondary' }}>{msg}</Typography>}
            <Button size="small" onClick={() => { window.location.hash = `#/app/brands/${brandId}/studio/campanhas` }} sx={{ color: 'text.secondary' }}>Campanhas</Button>
            <Button size="small" variant="outlined" startIcon={<SaveIcon />} onClick={save} disabled={saving || !dirty}>{saving ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}</Button>
            <Button size="small" variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => run()} sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' } }}>Gerar</Button>
          </Stack>
        }
      />
      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Toolbar lateral de controle */}
        <Paper elevation={3} sx={{ position: 'absolute', top: 16, left: 16, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 0.5, p: 0.5, borderRadius: 2 }}>
          <Tooltip title="Adicionar nó" placement="right">
            <IconButton onClick={e => setAddAnchor(e.currentTarget)} sx={{ bgcolor: TEAL, color: '#fff', '&:hover': { bgcolor: '#0B8567' } }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Paper>
        <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
          {NODE_TEMPLATES.map((t, i) => <MenuItem key={i} onClick={() => addNode(t)} sx={{ fontSize: 13 }}>{t.label}</MenuItem>)}
        </Menu>
        {/* Soltar conexão no vazio → escolher o tipo do novo nó */}
        <Menu open={!!connectMenu} onClose={() => setConnectMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={connectMenu ? { top: connectMenu.top, left: connectMenu.left } : undefined}>
          {NODE_TEMPLATES.map((t, i) => <MenuItem key={i} onClick={() => addNodeFromConnect(t)} sx={{ fontSize: 13 }}>{t.label}</MenuItem>)}
        </Menu>
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onConnectStart={onConnectStart} onConnectEnd={onConnectEnd} onInit={inst => { rfRef.current = inst }}
          fitView proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#1E3550" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={() => PURPLE} style={{ background: '#162840' }} />
        </ReactFlow>
      </Box>

      {/* Lightbox — abre a imagem do R2 em tela cheia */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={() => setLightbox(null)} sx={{ position: 'absolute', top: -14, right: -14, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {lightbox && <Box component="img" src={lightbox} alt="" sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2 }} />}
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
