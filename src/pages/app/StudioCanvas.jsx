import { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, NodeToolbar, NodeResizer,
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
import ReplayIcon from '@mui/icons-material/Replay'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft'
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter'
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight'
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop'
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter'
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom'
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined'
import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined'
import GroupWorkOutlinedIcon from '@mui/icons-material/GroupWorkOutlined'
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined'
import CloseIcon from '@mui/icons-material/Close'
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { IMAGE_MODELS, IMAGE_MODEL_GROUPS, DEFAULT_IMAGE_MODEL, resolveModel } from '../../lib/studioModels'

const PURPLE = '#7F77DD', TEAL = '#0D9E7A', GRAY = '#8A9AB0', CORAL = '#E8185A'
const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1' },
  { v: '9:16', label: 'Story 9:16' },
  { v: '16:9', label: 'Banner 16:9' },
  { v: '4:5',  label: 'Retrato 4:5' },
]

// ── Shell visual de um nó ────────────────────────────────────────────
function NodeShell({ id, color, title, children, inputs = true, output = true, onDelete, onDuplicate, onRun, onRegen, onResize, selected }) {
  return (
    <Paper elevation={0} sx={{
      width: '100%', height: '100%', minWidth: 160, minHeight: 100, boxSizing: 'border-box', border: '1px solid', borderColor: 'divider',
      borderTop: `3px solid ${color}`, borderRadius: '5px', bgcolor: 'background.paper', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <NodeResizer color={color} isVisible={selected} minWidth={160} minHeight={100} onResizeEnd={() => onResize?.()} />
      {(onDelete || onDuplicate || onRun || onRegen) && (
        <NodeToolbar position={Position.Top} offset={6}>
          <Paper elevation={3} className="nodrag" sx={{ display: 'flex', gap: 0.25, p: 0.25, borderRadius: 1.5 }}>
            {onRun && <Tooltip title="Rodar este + jusante"><IconButton size="small" onClick={() => onRun(id)}><PlayArrowIcon sx={{ fontSize: 16, color: TEAL }} /></IconButton></Tooltip>}
            {onRegen && <Tooltip title="Regerar só este (usa o que já veio antes)"><IconButton size="small" onClick={() => onRegen(id)}><ReplayIcon sx={{ fontSize: 15, color: TEAL }} /></IconButton></Tooltip>}
            {onDuplicate && <Tooltip title="Duplicar"><IconButton size="small" onClick={() => onDuplicate(id)}><ContentCopyIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>}
            {onDelete && <Tooltip title="Excluir"><IconButton size="small" onClick={() => onDelete(id)}><DeleteOutlineIcon sx={{ fontSize: 15, color: CORAL }} /></IconButton></Tooltip>}
          </Paper>
        </NodeToolbar>
      )}
      {inputs && <Handle type="target" position={Position.Left} style={{ background: color, width: 9, height: 9 }} />}
      <Box sx={{ px: 1.5, py: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color, flexShrink: 0 }}>
          {title}
        </Typography>
        <Box sx={{ mt: 0.75, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      </Box>
      {output && <Handle type="source" position={Position.Right} style={{ background: color, width: 9, height: 9 }} />}
    </Paper>
  )
}

// ── Nós customizados ─────────────────────────────────────────────────
const BrandContextNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={PURPLE} title={data.title} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
    <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>{data.desc}</Typography>
  </NodeShell>
))

const PromptNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={GRAY} title="Prompt" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
    <Stack spacing={0.25} className="nodrag" sx={{ flex: 1, minHeight: 0 }}>
      <TextField
        value={data.text || ''} onChange={e => data.onChange(id, { text: e.target.value })}
        placeholder="O que criar…" multiline fullWidth size="small"
        sx={{ flex: 1, minHeight: 0, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' }, '& textarea': { height: '100% !important', fontSize: 12, overflow: 'auto !important' } }}
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

const FormatoNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={GRAY} title="Formato" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
    <Select
      value={data.formato || '1:1'} onChange={e => data.onChange(id, { formato: e.target.value })}
      fullWidth size="small" className="nodrag" sx={{ fontSize: 12 }}
    >
      {FORMATOS.map(f => <MenuItem key={f.v} value={f.v} sx={{ fontSize: 12 }}>{f.label}</MenuItem>)}
    </Select>
  </NodeShell>
))

const GenerateNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={TEAL} title="Gerar" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRun={data.onRun} onRegen={data.onRegen} onResize={data.onResize} selected={selected}>
    <Stack spacing={0.5} className="nodrag">
      <Select value={(data.model && data.model !== 'auto' && data.model !== 'custom') ? data.model : DEFAULT_IMAGE_MODEL}
        onChange={e => data.onChange(id, { model: e.target.value })} size="small" fullWidth sx={{ fontSize: 11 }}>
        {IMAGE_MODEL_GROUPS.flatMap(g => [
          <ListSubheader key={g} sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 2.2, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
          ...IMAGE_MODELS.filter(m => m.group === g).map(m => <MenuItem key={m.id} value={m.id} sx={{ fontSize: 11 }}>{m.label}</MenuItem>),
        ])}
      </Select>
      {data.status === 'running' && <Stack direction="row" spacing={0.75} alignItems="center"><CircularProgress size={12} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: TEAL }}>gerando…</Typography></Stack>}
      {data.status === 'done'    && <Typography sx={{ fontSize: 10, color: TEAL, fontWeight: 700 }}>✓ concluído</Typography>}
      {data.status === 'error'   && <Typography sx={{ fontSize: 10, color: CORAL }}>{data.error || 'erro'}</Typography>}
    </Stack>
  </NodeShell>
))

const PreviewNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={CORAL} title="Prévia" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
    {data.imageUrl ? (
      <>
        <Box className="nodrag" onClick={() => data.onOpen?.(data.imageUrl)}
          sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}>
          <Box component="img" src={data.imageUrl} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 1, display: 'block' }} />
        </Box>
        <Stack direction="row" spacing={0} alignItems="center" className="nodrag" sx={{ mt: 0.25, flexShrink: 0 }}>
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
      <Box sx={{ flex: 1, minHeight: 0, bgcolor: 'background.default', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'center', justifyContent: 'center' }}>
        {data.loading
          ? <><CircularProgress size={20} sx={{ color: CORAL }} /><Typography sx={{ fontSize: 10, color: CORAL, fontWeight: 700 }}>gerando…</Typography></>
          : <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>aguardando geração</Typography>}
      </Box>
    )}
  </NodeShell>
))

const APP_DESC = { upscale: 'Aumenta resolução (impressão)', removebg: 'Remove o fundo', variation: 'Gera variação da imagem' }

const AppNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={GRAY} title={data.label || data.op} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRun={data.onRun} onRegen={data.onRegen} onResize={data.onResize} selected={selected}>
    <Stack spacing={0.5} className="nodrag" sx={{ flex: 1, minHeight: 0 }}>
      {data.outputUrl ? (
        <>
          <Box onClick={() => data.onOpen?.(data.outputUrl)}
            sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}>
            <Box component="img" src={data.outputUrl} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 1, display: 'block' }} />
          </Box>
          <Stack direction="row" spacing={0} alignItems="center" sx={{ mt: 0.25, flexShrink: 0 }}>
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

// Imagem externa (upload) — até MAX_REF referências para compor o workflow
const ImageInputNode = memo(({ id, data, selected }) => {
  const urls = imgUrls(data)
  return (
    <NodeShell id={id} color={GRAY} title={`Imagem${urls.length ? ` (${urls.length}/${MAX_REF})` : ''}`} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
      <Box className="nodrag" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
        {urls.map(u => (
          <Box key={u} sx={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <Box component="img" src={u} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <IconButton size="small" onClick={() => data.onRemoveImg?.(id, u)} sx={{ position: 'absolute', top: -2, right: -2, bgcolor: 'rgba(0,0,0,.55)', color: '#fff', p: 0.2, '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}>
              <CloseIcon sx={{ fontSize: 11 }} />
            </IconButton>
          </Box>
        ))}
        {urls.length < MAX_REF && (
          <Box component="label" sx={{ aspectRatio: '1 / 1', border: '1px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: TEAL } }}>
            {data.uploading ? <CircularProgress size={14} /> : <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
            <input type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files?.length) data.onUpload?.(id, e.target.files); e.target.value = '' }} />
          </Box>
        )}
      </Box>
    </NodeShell>
  )
})

// Sticky note — organização visual (não entra na execução). Redimensionável.
const NoteNode = memo(({ id, data, selected }) => (
  <Box sx={{ width: '100%', height: '100%' }}>
    <NodeResizer color="#E0B33A" isVisible={selected} minWidth={150} minHeight={80} onResizeEnd={() => data.onResize?.()} />
    <NodeToolbar position={Position.Top} offset={6}>
      <Paper elevation={3} className="nodrag" sx={{ p: 0.25, borderRadius: 1.5 }}>
        <Tooltip title="Excluir"><IconButton size="small" onClick={() => data.onDelete(id)}><DeleteOutlineIcon sx={{ fontSize: 15, color: CORAL }} /></IconButton></Tooltip>
      </Paper>
    </NodeToolbar>
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', bgcolor: '#FFF6C8', border: '1px solid #ECD27A', borderRadius: '5px', p: 1 }}>
      <TextField value={data.text || ''} onChange={e => data.onChange(id, { text: e.target.value })}
        placeholder="Anotação…" multiline variant="standard" fullWidth className="nodrag" InputProps={{ disableUnderline: true }}
        sx={{ height: '100%', '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', p: 0 }, '& textarea': { fontSize: 12, color: '#7A6A20', lineHeight: 1.4 } }} />
    </Box>
  </Box>
))

// Grupo — container que move os filhos juntos (parentId do React Flow). Renderiza atrás.
const GroupNode = memo(({ id, data, selected }) => (
  <Box sx={{ width: '100%', height: '100%' }}>
    <NodeResizer color={PURPLE} isVisible={selected} minWidth={180} minHeight={140} onResizeEnd={() => data.onResize?.()} />
    <NodeToolbar position={Position.Top} offset={6}>
      <Paper elevation={3} className="nodrag" sx={{ display: 'flex', gap: 0.25, p: 0.25, borderRadius: 1.5 }}>
        <Tooltip title="Desagrupar"><IconButton size="small" onClick={() => data.onUngroup(id)}><WorkspacesOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
        <Tooltip title="Excluir grupo e nós"><IconButton size="small" onClick={() => data.onDelete(id)}><DeleteOutlineIcon sx={{ fontSize: 15, color: CORAL }} /></IconButton></Tooltip>
      </Paper>
    </NodeToolbar>
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', border: `1.5px dashed ${PURPLE}`, borderRadius: '5px', bgcolor: 'rgba(127,119,221,0.06)' }}>
      <TextField value={data.label ?? 'Grupo'} onChange={e => data.onChange(id, { label: e.target.value })}
        variant="standard" className="nodrag" InputProps={{ disableUnderline: true }}
        sx={{ position: 'absolute', top: 4, left: 8, '& input': { fontSize: 11, fontWeight: 800, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.06em', py: 0 } }} />
    </Box>
  </Box>
))

const nodeTypes = { brandContext: BrandContextNode, prompt: PromptNode, formato: FormatoNode, generate: GenerateNode, preview: PreviewNode, app: AppNode, imageInput: ImageInputNode, note: NoteNode, group: GroupNode }

// Nós que produzem imagem (podem alimentar apps/generates a jusante)
const PRODUCES_IMAGE = new Set(['generate', 'app', 'imageInput', 'preview'])
const MAX_REF = 5
const DEFAULT_NODE = 250   // tamanho padrão uniforme dos nós (px)
// Formato e Gerar têm pouco conteúdo → altura fixa compacta p/ não ficar feio
const NODE_SIZE = { formato: { width: 250, height: 116 }, generate: { width: 250, height: 140 } }
const sizeFor = type => NODE_SIZE[type] || { width: DEFAULT_NODE, height: DEFAULT_NODE }
// Normaliza a saída de um nó em lista de URLs (imageInput pode ter várias)
const toUrls = v => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : [])
const imgUrls = data => data?.urls?.length ? data.urls : (data?.url ? [data.url] : [])

// Paleta de nós que podem ser adicionados ao canvas (novo workflow = canvas em branco)
const NODE_TEMPLATES = [
  { type: 'prompt',       label: 'Prompt',       data: { text: '' } },
  { type: 'formato',      label: 'Formato',      data: { formato: '1:1' } },
  { type: 'generate',     label: 'Gerar',        data: { status: 'idle', model: DEFAULT_IMAGE_MODEL } },
  { type: 'preview',      label: 'Prévia',       data: { imageUrl: null } },
  { type: 'imageInput',   label: 'Imagem (upload)', data: {} },
  { type: 'brandContext', label: 'Voz da marca',    data: { title: 'Voz da marca', desc: 'Tom de voz, personalidade e vocabulário da marca' } },
  { type: 'brandContext', label: 'Visual da marca', data: { title: 'Visual da marca', desc: 'Paleta, tipografia e estética' } },
  { type: 'app',          label: 'Ampliar',         data: { op: 'upscale',   label: 'Ampliar',        status: 'idle' } },
  { type: 'app',          label: 'Remover fundo',   data: { op: 'removebg',  label: 'Remover fundo',  status: 'idle' } },
  { type: 'app',          label: 'Variação',        data: { op: 'variation', label: 'Variação',       status: 'idle' } },
  { type: 'note',         label: 'Nota (sticky)', data: { text: '' }, style: { width: 250, height: 250 } },
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
  const [running, setRunning] = useState(false)    // execução em andamento
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const pollRef = useRef(null)
  const rfRef = useRef(null)
  const flowWrapRef = useRef(null)
  const connectSrcRef = useRef(null)
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  const markDirty = useCallback(() => setDirty(true), [])
  const runRef = useRef(null)                       // run() estável p/ os nós (run seletivo)
  const runNode = useCallback(id => runRef.current?.(id), [])
  const regenRef = useRef(null)                     // regenNode() estável p/ os nós
  const regenNodeCb = useCallback(id => regenRef.current?.(id), [])
  const saveRef = useRef(null)                       // save() atual p/ autosave pós-run

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

  const uploadImageInput = useCallback(async (id, fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const node = nodesRef.current.find(n => n.id === id)
    const current = imgUrls(node?.data)
    const livres = MAX_REF - current.length
    if (livres <= 0) return
    updateNodeData(id, { uploading: true })
    const novas = []
    for (const file of files.slice(0, livres)) {
      const path = `${brandId}/workflow/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${(file.name || 'img').replace(/[^\w.\-]/g, '_')}`
      const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
      if (error) continue
      novas.push(supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl)
    }
    updateNodeData(id, { urls: [...current, ...novas].slice(0, MAX_REF), url: undefined, uploading: false })
  }, [brandId, updateNodeData])

  const removeImageInput = useCallback((id, url) => {
    const node = nodesRef.current.find(n => n.id === id)
    updateNodeData(id, { urls: imgUrls(node?.data).filter(u => u !== url), url: undefined })
  }, [updateNodeData])

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

  // Desfaz o grupo: solta os filhos de volta em coordenadas absolutas
  const ungroup = useCallback((gid) => {
    setNodes(ns => {
      const g = ns.find(n => n.id === gid); if (!g) return ns
      const gp = g.position
      return ns.filter(n => n.id !== gid).map(n => n.parentId === gid
        ? { ...n, parentId: undefined, extent: undefined, position: { x: n.position.x + gp.x, y: n.position.y + gp.y } }
        : n)
    })
    setDirty(true)
  }, [])

  // Exclui o grupo E os nós dentro dele
  const deleteGroup = useCallback((gid) => {
    const kids = nodesRef.current.filter(n => n.parentId === gid).map(n => n.id)
    const dead = new Set([gid, ...kids])
    setNodes(ns => ns.filter(n => !dead.has(n.id)))
    setEdges(es => es.filter(e => !dead.has(e.source) && !dead.has(e.target)))
    setDirty(true)
  }, [])

  // Injeta callbacks nos nós (não serializados): ações + edição
  const attachHandlers = useCallback(n => {
    const data = { ...n.data }
    // tamanho padrão uniforme (250×250) p/ nós sem tamanho salvo — não toca grupos
    const style = (n.type !== 'group' && !n.style?.width) ? { ...sizeFor(n.type), ...(n.style || {}) } : n.style
    if (n.type === 'group') { data.onChange = updateNodeData; data.onUngroup = ungroup; data.onDelete = deleteGroup; data.onResize = markDirty; return { ...n, data } }
    data.onDelete = deleteNode; data.onDuplicate = duplicateNode; data.onResize = markDirty
    if (['prompt', 'formato', 'generate', 'note'].includes(n.type)) data.onChange = updateNodeData
    if (n.type === 'prompt') data.onImprove = improvePrompt
    if (['generate', 'app'].includes(n.type)) { data.onRun = runNode; data.onRegen = regenNodeCb }
    if (['preview', 'app'].includes(n.type)) { data.onSave = savePiece; data.onDownload = downloadImage; data.onOpen = openLightbox; data.onVote = votePiece }
    if (n.type === 'imageInput') { data.onUpload = uploadImageInput; data.onRemoveImg = removeImageInput }
    return { ...n, style, data }
  }, [updateNodeData, savePiece, downloadImage, deleteNode, duplicateNode, uploadImageInput, removeImageInput, improvePrompt, openLightbox, votePiece, runNode, regenNodeCb, ungroup, deleteGroup, markDirty])
  attachHandlersRef.current = attachHandlers

  const [addAnchor, setAddAnchor] = useState(null)
  const [connectMenu, setConnectMenu] = useState(null)
  // Centro do viewport atual (em coordenadas do grafo) — nó nasce visível
  function centerPos() {
    const el = flowWrapRef.current, inst = rfRef.current
    if (el && inst?.screenToFlowPosition) {
      const r = el.getBoundingClientRect()
      return inst.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    return { x: 300, y: 200 }
  }

  function addNode(tpl) {
    setAddAnchor(null)
    const c = centerPos(); const j = () => (Math.random() - 0.5) * 60
    const newNode = attachHandlers({
      id: `${tpl.type}-${Date.now()}`, type: tpl.type,
      position: { x: c.x - 110 + j(), y: c.y - 70 + j() },   // centraliza o nó no viewport
      data: { ...tpl.data }, style: tpl.style ? { ...tpl.style } : sizeFor(tpl.type),
    })
    // notas ficam atrás dos demais nós (são fundo organizacional)
    setNodes(ns => tpl.type === 'note' ? [newNode, ...ns] : [...ns, newNode])
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
          const edgesLoaded = data.edges || []
          // Fonte de verdade das imagens = studio_generations (recupera mesmo se o
          // node data não tinha sido salvo com a imagem final).
          const { data: gens } = await supabase.from('studio_generations')
            .select('id, node_id, image_url, created_at')
            .eq('workflow_id', wfId).eq('status', 'done').not('image_url', 'is', null)
            .order('created_at', { ascending: true })
          const byNode = {}
          for (const g of gens || []) if (g.node_id) byNode[g.node_id] = { url: g.image_url, id: g.id }

          const loaded = (data.nodes || []).map(attachHandlers).map(n => {
            const d = { ...n.data }
            if (d.status === 'running') d.status = 'idle'   // limpa estados transitórios
            if (d.loading) d.loading = false
            const hit = byNode[n.id]
            if (hit) {
              if (n.type === 'generate') { d.outputUrl = d.outputUrl || hit.url; d.status = 'done' }
              if (n.type === 'app') { d.outputUrl = d.outputUrl || hit.url; d.genId = d.genId || hit.id; d.status = 'done' }
            }
            return { ...n, data: d }
          })
          // prévias recebem a imagem do generate conectado
          for (const n of loaded) {
            if (n.type !== 'generate') continue
            const hit = byNode[n.id]; if (!hit) continue
            const pv = loaded.find(x => x.type === 'preview' && edgesLoaded.some(e => e.source === n.id && e.target === x.id))
            if (pv && !pv.data.imageUrl) { pv.data = { ...pv.data, imageUrl: hit.url, genId: hit.id, loading: false } }
          }
          loaded.sort((a, b) => (a.type === 'group' ? -1 : 0) - (b.type === 'group' ? -1 : 0))  // grupos antes dos filhos
          setNodes(loaded)
          setEdges(edgesLoaded)
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
    const newNode = attachHandlers({ id: `${tpl.type}-${Date.now()}`, type: tpl.type, position: flowPos || { x: 300, y: 200 }, data: { ...tpl.data }, style: tpl.style ? { ...tpl.style } : sizeFor(tpl.type) })
    setNodes(ns => [...ns, newNode])
    setEdges(es => addEdge({ id: `e-${Date.now()}`, source, target: newNode.id }, es))
    setDirty(true)
  }

  function serializableNodes() {
    return nodes.map(({ id, type, position, data, style, parentId, extent, width, height }) => {
      const rest = Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v !== 'function'))
      delete rest.loading; delete rest.improving; delete rest.uploading   // estados transitórios não persistem
      if (rest.status === 'running') rest.status = 'idle'
      const out = { id, type, position, data: rest }
      // tamanho de notas/grupos (NodeResizer) + vínculo de grupo
      const w = width || style?.width, h = height || style?.height
      if (w || h) out.style = { ...(style || {}), ...(w ? { width: w } : {}), ...(h ? { height: h } : {}) }
      if (parentId) { out.parentId = parentId; out.extent = extent || 'parent' }
      return out
    })
  }

  async function save() {
    setSaving(true); setMsg('')
    // thumbnail = 1ª imagem produzida no grafo (preview/app/imageInput)
    const thumb = nodes.map(n => n.data?.imageUrl || n.data?.outputUrl || n.data?.url || n.data?.urls?.[0]).find(Boolean) || null
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

  async function authHeaders() {
    const session = (await supabase.auth.getSession()).data.session
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
  }

  // Dispatchers reutilizáveis (run completo, run seletivo e regerar 1 nó).
  // ctx = { outputs, auth, dispatched }
  async function dispatchGenerateNode(g, ctx) {
    const { outputs, auth, dispatched } = ctx
    const { prompt, formato, hasBrand, brandFacets, previewNodeId } = inputsFor(g.id)
    if (!prompt) { updateNodeData(g.id, { status: 'error', error: 'conecte um nó Prompt' }); dispatched.add(g.id); return null }
    const references = imageUpstreamsOf(g.id).flatMap(u => toUrls(outputs[u.id])).slice(0, MAX_REF)
    const model = resolveModel(g.data?.model === 'custom' ? g.data?.customModel : g.data?.model)
    updateNodeData(g.id, { status: 'running', error: null })
    if (previewNodeId) updateNodeData(previewNodeId, { imageUrl: null, loading: true })
    try {
      const res = await fetch('/.netlify/functions/studio-generate', { method: 'POST', headers: auth,
        body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: g.id, prompt, formato, use_brand: hasBrand, brand_facets: brandFacets, model, references }) })
      const j = await res.json(); if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
      dispatched.add(g.id)
      return { genId: j.generation_id, nodeId: g.id, kind: 'generate', previewNodeId, formato }
    } catch (e) { updateNodeData(g.id, { status: 'error', error: e.message }); return null }
  }

  async function dispatchAppNode(a, ctx) {
    const { outputs, auth, dispatched } = ctx
    const up = imageUpstreamOf(a.id)
    const imageUrl = toUrls(outputs[up?.id])[0]
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

  // Semeia tudo que já foi produzido no grafo (imageInput, app, generate) — base
  // para regerar 1 nó usando as infos anteriores (estilo n8n).
  function seedExistingOutputs() {
    const out = {}
    for (const n of nodes) {
      if (n.type === 'imageInput' && imgUrls(n.data).length) out[n.id] = imgUrls(n.data)
      else if (n.type === 'preview' && n.data?.imageUrl) out[n.id] = n.data.imageUrl
      else if ((n.type === 'app' || n.type === 'generate') && n.data?.outputUrl) out[n.id] = n.data.outputUrl
    }
    return out
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

    const auth = await authHeaders()
    const outputs = {}            // nodeId -> image_url pronto (encadeamento)
    const dispatched = new Set()
    const ctx = { outputs, auth, dispatched }

    // imageInput já tem a imagem pronta → semeia outputs (alimenta apps/refs a jusante)
    for (const n of nodes.filter(n => n.type === 'imageInput' && imgUrls(n.data).length)) outputs[n.id] = imgUrls(n.data)
    // Run seletivo: reusa imagens já produzidas a montante (apps/generates) sem reprocessar
    if (rootId) for (const [nid, url] of Object.entries(seedExistingOutputs())) { const node = nodes.find(n => n.id === nid); if (node && !genNodes.includes(node) && !appNodes.includes(node)) outputs[nid] = url }
    // Generate só dispara quando todas as referências de imagem conectadas estão prontas
    const genReady = g => imageUpstreamsOf(g.id).every(u => toUrls(outputs[u.id]).length > 0)

    const jobs = []
    for (const g of genNodes) { if (genReady(g)) { const job = await dispatchGenerateNode(g, ctx); if (job) jobs.push(job) } }
    for (const a of appNodes) {
      if (dispatched.has(a.id)) continue
      const up = imageUpstreamOf(a.id)
      if (up && toUrls(outputs[up.id]).length) { const job = await dispatchAppNode(a, ctx); if (job) jobs.push(job) }
    }
    if (!jobs.length) return setMsg('Nada para gerar — adicione um Generate ou conecte uma imagem a um app.')
    pollEngine(jobs, { outputs, dispatched, genNodes, appNodes,
      dispatchGenerate: g => dispatchGenerateNode(g, ctx), dispatchApp: a => dispatchAppNode(a, ctx), genReady })
  }

  // Regerar UM nó usando as saídas já produzidas até aqui (sem cascata a jusante)
  async function regenNode(nodeId) {
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node || !['generate', 'app'].includes(node.type)) return
    setMsg('')
    const auth = await authHeaders()
    const outputs = seedExistingOutputs()
    const ctx = { outputs, auth, dispatched: new Set() }
    const job = node.type === 'generate' ? await dispatchGenerateNode(node, ctx) : await dispatchAppNode(node, ctx)
    if (!job) return
    pollEngine([job], { outputs, dispatched: ctx.dispatched, genNodes: [], appNodes: [],
      dispatchGenerate: () => null, dispatchApp: () => null, genReady: () => false })
  }

  // Poll concorrente + dispara apps/generates a jusante quando o upstream conclui
  function pollEngine(initialJobs, ctx) {
    if (pollRef.current) clearInterval(pollRef.current)
    const { outputs, dispatched, genNodes, appNodes, dispatchGenerate, dispatchApp, genReady } = ctx
    const jobs = [...initialJobs]
    const pending = new Set(jobs.map(j => j.genId))
    const start = Date.now()
    setRunning(true); setProgress({ done: 0, total: jobs.length })
    const stop = () => {
      clearInterval(pollRef.current); pollRef.current = null; setRunning(false)
      if (wfId) saveRef.current?.()   // autosave após cada run
    }
    pollRef.current = setInterval(async () => {
      if (Date.now() - start > 300_000) {                 // timeout de segurança (5 min)
        for (const id of pending) { const j = jobs.find(x => x.genId === id); if (j?.previewNodeId) updateNodeData(j.previewNodeId, { loading: false }) }
        return stop()
      }
      if (!pending.size) return stop()
      const { data } = await supabase.from('studio_generations').select('id, status, image_url, error').in('id', [...pending])
      for (const row of data || []) {
        const job = jobs.find(j => j.genId === row.id); if (!job) continue
        if (row.status === 'done') {
          pending.delete(row.id); outputs[job.nodeId] = row.image_url
          if (job.kind === 'generate') {
            updateNodeData(job.nodeId, { status: 'done', outputUrl: row.image_url })
            if (job.previewNodeId) { outputs[job.previewNodeId] = row.image_url; updateNodeData(job.previewNodeId, { imageUrl: row.image_url, genId: row.id, formato: job.formato, saved: false, loading: false }) }
          } else {
            updateNodeData(job.nodeId, { status: 'done', outputUrl: row.image_url, genId: row.id, saved: false })
          }
        } else if (row.status === 'error') {
          pending.delete(row.id)
          updateNodeData(job.nodeId, { status: 'error', error: row.error || 'erro na geração' })
          if (job.previewNodeId) updateNodeData(job.previewNodeId, { loading: false })
        }
      }
      // encadeamento: re-varre tudo que ainda não rodou e cujas entradas já estão prontas
      // (cobre app←imagem, generate←referência e continuar a partir de um Preview)
      for (const a of appNodes) {
        if (dispatched.has(a.id)) continue
        const up = imageUpstreamOf(a.id)
        if (up && toUrls(outputs[up.id]).length) { const nj = await dispatchApp(a); if (nj) { jobs.push(nj); pending.add(nj.genId) } }
      }
      for (const g of genNodes) {
        if (dispatched.has(g.id) || !imageUpstreamsOf(g.id).length) continue
        if (genReady(g)) { const nj = await dispatchGenerate(g); if (nj) { jobs.push(nj); pending.add(nj.genId) } }
      }
      setProgress({ done: jobs.length - pending.size, total: jobs.length })
      if (!pending.size) stop()
    }, 3000)
  }

  // ── Organização: alinhar, distribuir, agrupar ───────────────────────
  const dim = n => ({ w: n.width || n.measured?.width || n.style?.width || 220, h: n.height || n.measured?.height || n.style?.height || 120 })
  const selectedTop = nodes.filter(n => n.selected && n.type !== 'group' && !n.parentId)

  function align(kind) {
    const sel = selectedTop; if (sel.length < 2) return
    const ids = new Set(sel.map(n => n.id))
    const minX = Math.min(...sel.map(n => n.position.x))
    const maxR = Math.max(...sel.map(n => n.position.x + dim(n).w))
    const minY = Math.min(...sel.map(n => n.position.y))
    const maxB = Math.max(...sel.map(n => n.position.y + dim(n).h))
    const cx = (minX + maxR) / 2, cy = (minY + maxB) / 2
    setNodes(ns => ns.map(n => {
      if (!ids.has(n.id)) return n
      const { w, h } = dim(n); const p = { ...n.position }
      if (kind === 'left') p.x = minX
      else if (kind === 'right') p.x = maxR - w
      else if (kind === 'hcenter') p.x = cx - w / 2
      else if (kind === 'top') p.y = minY
      else if (kind === 'bottom') p.y = maxB - h
      else if (kind === 'vcenter') p.y = cy - h / 2
      return { ...n, position: p }
    }))
    setDirty(true)
  }

  function distribute(axis) {
    if (selectedTop.length < 3) return
    const sorted = [...selectedTop].sort((a, b) => axis === 'h' ? a.position.x - b.position.x : a.position.y - b.position.y)
    const first = sorted[0], last = sorted[sorted.length - 1]
    const span = (axis === 'h' ? last.position.x - first.position.x : last.position.y - first.position.y)
    const step = span / (sorted.length - 1)
    const base = axis === 'h' ? first.position.x : first.position.y
    const target = new Map(); sorted.forEach((n, i) => target.set(n.id, base + step * i))
    setNodes(ns => ns.map(n => target.has(n.id)
      ? { ...n, position: axis === 'h' ? { ...n.position, x: target.get(n.id) } : { ...n.position, y: target.get(n.id) } }
      : n))
    setDirty(true)
  }

  function groupSelection() {
    const sel = selectedTop
    if (sel.length < 2) return setMsg('Selecione 2+ nós para agrupar.')
    const pad = 28, header = 22
    const minX = Math.min(...sel.map(n => n.position.x))
    const minY = Math.min(...sel.map(n => n.position.y))
    const maxR = Math.max(...sel.map(n => n.position.x + dim(n).w))
    const maxB = Math.max(...sel.map(n => n.position.y + dim(n).h))
    const gx = minX - pad, gy = minY - pad - header
    const gw = (maxR - minX) + pad * 2, gh = (maxB - minY) + pad * 2 + header
    const gid = `group-${Date.now()}`
    const groupNode = attachHandlers({ id: gid, type: 'group', position: { x: gx, y: gy }, data: { label: 'Grupo' }, style: { width: gw, height: gh } })
    const ids = new Set(sel.map(n => n.id))
    setNodes(ns => [groupNode, ...ns.map(n => ids.has(n.id)
      ? { ...n, parentId: gid, extent: 'parent', position: { x: n.position.x - gx, y: n.position.y - gy }, selected: false }
      : n)])
    setDirty(true); setMsg('')
  }

  runRef.current = run       // mantém as referências estáveis apontando p/ as versões atuais
  regenRef.current = regenNode
  saveRef.current = save

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <PageHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Renomear workflow">
              <TextField value={nome} onChange={e => { setNome(e.target.value); setDirty(true) }}
                variant="standard" placeholder="Nome do workflow" InputProps={{ disableUnderline: true }}
                sx={{ minWidth: 200, maxWidth: 460, '& input': { fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', py: 0 } }} />
            </Tooltip>
            {dirty && <Tooltip title="Alterações não salvas"><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF9F27', flexShrink: 0 }} /></Tooltip>}
          </Stack>
        }
        subtitle="Studio · Workflow"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {msg && <Typography sx={{ fontSize: 12, color: msg.startsWith('Erro') || msg.includes('conecte') || msg.includes('Adicione') ? CORAL : 'text.secondary' }}>{msg}</Typography>}
            <Button size="small" variant="outlined" startIcon={<SaveIcon />} onClick={save} disabled={saving || !dirty}>{saving ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}</Button>
            <Button size="small" variant="contained" disabled={running} onClick={() => run()}
              startIcon={running ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
              sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, minWidth: 104 }}>
              {running ? (progress.total ? `Gerando… ${progress.done}/${progress.total}` : 'Gerando…') : 'Gerar'}
            </Button>
          </Stack>
        }
      />
      <Box ref={flowWrapRef} sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Rail vertical de ações do workflow */}
        <Paper elevation={3} sx={{ position: 'absolute', top: 16, left: 16, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, p: 0.5, borderRadius: 3 }}>
          <Tooltip title="Adicionar nó" placement="right">
            <IconButton onClick={e => setAddAnchor(e.currentTarget)} sx={{ bgcolor: TEAL, color: '#fff', '&:hover': { bgcolor: '#0B8567' }, mb: 0.25 }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Divider flexItem sx={{ my: 0.25 }} />
          <Tooltip title="Prompt" placement="right"><IconButton size="small" onClick={() => addNode(NODE_TEMPLATES.find(t => t.type === 'prompt'))}><TextFieldsIcon sx={{ fontSize: 19, color: GRAY }} /></IconButton></Tooltip>
          <Tooltip title="Gerar" placement="right"><IconButton size="small" onClick={() => addNode(NODE_TEMPLATES.find(t => t.type === 'generate'))}><AutoFixHighOutlinedIcon sx={{ fontSize: 19, color: TEAL }} /></IconButton></Tooltip>
          <Tooltip title="Imagem (upload)" placement="right"><IconButton size="small" onClick={() => addNode(NODE_TEMPLATES.find(t => t.type === 'imageInput'))}><ImageOutlinedIcon sx={{ fontSize: 19, color: GRAY }} /></IconButton></Tooltip>
          <Tooltip title="Nota (sticky)" placement="right"><IconButton size="small" onClick={() => addNode(NODE_TEMPLATES.find(t => t.type === 'note'))}><StickyNote2OutlinedIcon sx={{ fontSize: 19, color: '#E0B33A' }} /></IconButton></Tooltip>
          <Divider flexItem sx={{ my: 0.25 }} />
          <Tooltip title="Rodar tudo" placement="right">
            <span><IconButton size="small" onClick={() => run()} disabled={running}>
              {running ? <CircularProgress size={18} sx={{ color: TEAL }} /> : <PlayArrowIcon sx={{ fontSize: 21, color: TEAL }} />}
            </IconButton></span>
          </Tooltip>
          <Tooltip title="Ajustar à tela" placement="right"><IconButton size="small" onClick={() => rfRef.current?.fitView({ padding: 0.2, duration: 300 })}><FitScreenIcon sx={{ fontSize: 19, color: GRAY }} /></IconButton></Tooltip>
        </Paper>
        <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
          {NODE_TEMPLATES.map((t, i) => <MenuItem key={i} onClick={() => addNode(t)} sx={{ fontSize: 13 }}>{t.label}</MenuItem>)}
        </Menu>
        {/* Alinhar / distribuir / agrupar — aparece com 2+ nós selecionados */}
        {selectedTop.length >= 2 && (
          <Paper elevation={3} sx={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 6, display: 'flex', alignItems: 'center', gap: 0.25, p: 0.5, borderRadius: 2 }}>
            <Tooltip title="Alinhar à esquerda"><IconButton size="small" onClick={() => align('left')}><AlignHorizontalLeftIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            <Tooltip title="Centralizar horizontal"><IconButton size="small" onClick={() => align('hcenter')}><AlignHorizontalCenterIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            <Tooltip title="Alinhar à direita"><IconButton size="small" onClick={() => align('right')}><AlignHorizontalRightIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="Alinhar ao topo"><IconButton size="small" onClick={() => align('top')}><AlignVerticalTopIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            <Tooltip title="Centralizar vertical"><IconButton size="small" onClick={() => align('vcenter')}><AlignVerticalCenterIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            <Tooltip title="Alinhar à base"><IconButton size="small" onClick={() => align('bottom')}><AlignVerticalBottomIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="Distribuir horizontal (3+)"><span><IconButton size="small" disabled={selectedTop.length < 3} onClick={() => distribute('h')}><ViewWeekOutlinedIcon sx={{ fontSize: 18 }} /></IconButton></span></Tooltip>
            <Tooltip title="Distribuir vertical (3+)"><span><IconButton size="small" disabled={selectedTop.length < 3} onClick={() => distribute('v')}><ViewStreamOutlinedIcon sx={{ fontSize: 18 }} /></IconButton></span></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="Agrupar"><IconButton size="small" onClick={groupSelection}><GroupWorkOutlinedIcon sx={{ fontSize: 18, color: PURPLE }} /></IconButton></Tooltip>
          </Paper>
        )}
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
