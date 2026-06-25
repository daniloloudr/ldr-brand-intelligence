import { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, applyNodeChanges, applyEdgeChanges, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Box, Button, Typography, TextField, MenuItem, Select, Paper,
  Stack, CircularProgress, Divider, Tooltip, IconButton, Menu,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SaveIcon from '@mui/icons-material/Save'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { StudioTabs } from './StudioTabs'
import { IMAGE_MODELS, resolveModel } from '../../lib/studioModels'

const PURPLE = '#7F77DD', TEAL = '#0D9E7A', GRAY = '#8A9AB0', CORAL = '#E8185A'
const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1' },
  { v: '9:16', label: 'Story 9:16' },
  { v: '16:9', label: 'Banner 16:9' },
  { v: '4:5',  label: 'Retrato 4:5' },
]

// ── Shell visual de um nó ────────────────────────────────────────────
function NodeShell({ color, title, children, inputs = true, output = true }) {
  return (
    <Paper elevation={0} sx={{
      minWidth: 200, maxWidth: 240, border: '1px solid', borderColor: 'divider',
      borderTop: `3px solid ${color}`, borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden',
    }}>
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
const BrandContextNode = memo(({ data }) => (
  <NodeShell color={PURPLE} title={data.title} inputs={false}>
    <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>{data.desc}</Typography>
  </NodeShell>
))

const PromptNode = memo(({ id, data }) => (
  <NodeShell color={GRAY} title="Prompt" inputs={false}>
    <TextField
      value={data.text || ''} onChange={e => data.onChange(id, { text: e.target.value })}
      placeholder="O que criar…" multiline minRows={2} maxRows={5} fullWidth size="small"
      className="nodrag" sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
    />
  </NodeShell>
))

const FormatoNode = memo(({ id, data }) => (
  <NodeShell color={GRAY} title="Formato" inputs={false}>
    <Select
      value={data.formato || '1:1'} onChange={e => data.onChange(id, { formato: e.target.value })}
      fullWidth size="small" className="nodrag" sx={{ fontSize: 12 }}
    >
      {FORMATOS.map(f => <MenuItem key={f.v} value={f.v} sx={{ fontSize: 12 }}>{f.label}</MenuItem>)}
    </Select>
  </NodeShell>
))

const GenerateNode = memo(({ id, data }) => (
  <NodeShell color={TEAL} title="Generate">
    <Stack spacing={0.5} className="nodrag">
      <Select value={data.model || 'auto'} onChange={e => data.onChange(id, { model: e.target.value })}
        size="small" fullWidth sx={{ fontSize: 11 }}>
        {IMAGE_MODELS.map(m => <MenuItem key={m.id} value={m.id} sx={{ fontSize: 11 }}>{m.label}</MenuItem>)}
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
  <NodeShell color={CORAL} title="Preview" output={false}>
    {data.imageUrl ? (
      <>
        <Box component="img" src={data.imageUrl} alt="" sx={{ width: '100%', borderRadius: 1, display: 'block' }} />
        <Stack direction="row" spacing={0} justifyContent="flex-end" className="nodrag" sx={{ mt: 0.25 }}>
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

const nodeTypes = { brandContext: BrandContextNode, prompt: PromptNode, formato: FormatoNode, generate: GenerateNode, preview: PreviewNode }

// ── Grafo inicial ────────────────────────────────────────────────────
const seedNodes = (onChange) => [
  { id: 'dna',     type: 'brandContext', position: { x: 0,   y: 0 },   data: { title: 'Brand DNA', desc: 'Tom, personalidade e vocabulário da marca' } },
  { id: 'visual',  type: 'brandContext', position: { x: 0,   y: 140 }, data: { title: 'Brand Visual', desc: 'Paleta, tipografia e estética' } },
  { id: 'prompt',  type: 'prompt',       position: { x: 0,   y: 280 }, data: { text: '', onChange } },
  { id: 'formato', type: 'formato',      position: { x: 0,   y: 430 }, data: { formato: '1:1', onChange } },
  { id: 'gen',     type: 'generate',     position: { x: 300, y: 200 }, data: { status: 'idle', model: 'auto' } },
  { id: 'preview', type: 'preview',      position: { x: 600, y: 180 }, data: { imageUrl: null } },
]
const seedEdges = [
  { id: 'e1', source: 'dna',     target: 'gen' },
  { id: 'e2', source: 'visual',  target: 'gen' },
  { id: 'e3', source: 'prompt',  target: 'gen' },
  { id: 'e4', source: 'formato', target: 'gen' },
  { id: 'e5', source: 'gen',     target: 'preview' },
]

// Paleta de nós que podem ser adicionados ao canvas
const NODE_TEMPLATES = [
  { type: 'prompt',       label: 'Prompt',       data: { text: '' } },
  { type: 'formato',      label: 'Formato',      data: { formato: '1:1' } },
  { type: 'generate',     label: 'Generate',     data: { status: 'idle', model: 'auto' } },
  { type: 'preview',      label: 'Preview',      data: { imageUrl: null } },
  { type: 'brandContext', label: 'Brand DNA',    data: { title: 'Brand DNA', desc: 'Tom, personalidade e vocabulário da marca' } },
  { type: 'brandContext', label: 'Brand Visual', data: { title: 'Brand Visual', desc: 'Paleta, tipografia e estética' } },
]

export function StudioCanvas({ brandId, workflowId }) {
  const { workspace } = useWorkspace()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [wfId, setWfId]   = useState(workflowId || null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]     = useState('')
  const pollRef = useRef(null)

  const updateNodeData = useCallback((id, patch) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
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

  // Injeta callbacks nos nós interativos (não serializados)
  const attachHandlers = useCallback(n => {
    if (['prompt', 'formato', 'generate'].includes(n.type)) return { ...n, data: { ...n.data, onChange: updateNodeData } }
    if (n.type === 'preview') return { ...n, data: { ...n.data, onSave: savePiece, onDownload: downloadImage } }
    return n
  }, [updateNodeData, savePiece, downloadImage])

  const [addAnchor, setAddAnchor] = useState(null)
  function addNode(tpl) {
    setAddAnchor(null)
    const newNode = attachHandlers({
      id: `${tpl.type}-${Date.now()}`, type: tpl.type,
      position: { x: 260 + Math.random() * 120, y: 120 + Math.random() * 220 },
      data: { ...tpl.data },
    })
    setNodes(ns => [...ns, newNode])
  }

  // Carrega workflow salvo ou semeia o grafo inicial
  useEffect(() => {
    let active = true
    async function load() {
      if (wfId) {
        const { data } = await supabase.from('studio_workflows').select('nodes, edges').eq('id', wfId).maybeSingle()
        if (active && data?.nodes?.length) {
          setNodes(data.nodes.map(attachHandlers))
          setEdges(data.edges || [])
          return
        }
      }
      if (active) { setNodes(seedNodes(updateNodeData).map(attachHandlers)); setEdges(seedEdges) }
    }
    load()
    return () => { active = false; if (pollRef.current) clearInterval(pollRef.current) }
  }, [wfId, updateNodeData, attachHandlers])

  const onNodesChange = useCallback(ch => setNodes(ns => applyNodeChanges(ch, ns)), [])
  const onEdgesChange = useCallback(ch => setEdges(es => applyEdgeChanges(ch, es)), [])
  const onConnect     = useCallback(c => setEdges(es => addEdge(c, es)), [])

  function serializableNodes() {
    return nodes.map(({ id, type, position, data }) => {
      const rest = Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v !== 'function'))
      return { id, type, position, data: rest }
    })
  }

  async function save() {
    setSaving(true); setMsg('')
    const payload = {
      workspace_id: workspace?.id, brand_id: brandId,
      nome: 'Workflow', nodes: serializableNodes(), edges, updated_at: new Date().toISOString(),
    }
    let res
    if (wfId) res = await supabase.from('studio_workflows').update(payload).eq('id', wfId).select().single()
    else      res = await supabase.from('studio_workflows').insert(payload).select().single()
    setSaving(false)
    if (res.error) { setMsg('Erro ao salvar: ' + res.error.message); return }
    if (!wfId) { setWfId(res.data.id); window.location.hash = `#/app/brands/${brandId}/studio/workflow/${res.data.id}` }
    setMsg('Salvo ✓')
  }

  // Resolve os inputs conectados a um nó Generate (marca é opcional: só injeta
  // se houver um nó de marca conectado).
  function inputsFor(genId) {
    const inIds = edges.filter(e => e.target === genId).map(e => e.source)
    const ins = nodes.filter(n => inIds.includes(n.id))
    const promptNode  = ins.find(n => n.type === 'prompt')
    const formatoNode = ins.find(n => n.type === 'formato')
    const hasBrand    = ins.some(n => n.type === 'brandContext')
    const previewNode = nodes.find(n => n.type === 'preview' && edges.some(e => e.source === genId && e.target === n.id))
    return {
      prompt: (promptNode?.data?.text || '').trim(),
      formato: formatoNode?.data?.formato || '1:1',
      hasBrand, previewNodeId: previewNode?.id,
    }
  }

  async function run() {
    const genNodes = nodes.filter(n => n.type === 'generate')
    if (!genNodes.length) return setMsg('Adicione um nó Generate ao canvas.')
    setMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const jobs = []
    for (const g of genNodes) {
      const { prompt, formato, hasBrand, previewNodeId } = inputsFor(g.id)
      if (!prompt) { updateNodeData(g.id, { status: 'error', error: 'conecte um nó Prompt' }); continue }
      const model = resolveModel(g.data?.model === 'custom' ? g.data?.customModel : g.data?.model)
      updateNodeData(g.id, { status: 'running', error: null })
      if (previewNodeId) updateNodeData(previewNodeId, { imageUrl: null })
      try {
        const res = await fetch('/.netlify/functions/studio-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: g.id, prompt, formato, use_brand: hasBrand, model }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
        jobs.push({ genId: j.generation_id, genNodeId: g.id, previewNodeId, formato })
      } catch (e) {
        updateNodeData(g.id, { status: 'error', error: e.message })
      }
    }
    if (jobs.length) pollJobs(jobs)
  }

  function pollJobs(jobs) {
    if (pollRef.current) clearInterval(pollRef.current)
    const start = Date.now()
    const pending = new Set(jobs.map(j => j.genId))
    pollRef.current = setInterval(async () => {
      if (!pending.size || Date.now() - start > 180_000) { clearInterval(pollRef.current); return }
      const { data } = await supabase.from('studio_generations')
        .select('id, status, image_url, error').in('id', [...pending])
      for (const row of data || []) {
        const job = jobs.find(j => j.genId === row.id)
        if (!job) continue
        if (row.status === 'done') {
          pending.delete(row.id)
          updateNodeData(job.genNodeId, { status: 'done' })
          if (job.previewNodeId) updateNodeData(job.previewNodeId, { imageUrl: row.image_url, genId: row.id, formato: job.formato, saved: false })
        } else if (row.status === 'error') {
          pending.delete(row.id)
          updateNodeData(job.genNodeId, { status: 'error', error: row.error || 'erro na geração' })
        }
      }
      if (!pending.size) clearInterval(pollRef.current)
    }, 3000)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <PageHeader
        title="Studio"
        subtitle="Geração visual on-brand"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <StudioTabs brandId={brandId} active="workflow" />
            {msg && <Typography sx={{ fontSize: 12, color: msg.startsWith('Erro') || msg.includes('conecte') || msg.includes('Adicione') ? CORAL : 'text.secondary' }}>{msg}</Typography>}
            <Button size="small" startIcon={<AddIcon />} onClick={e => setAddAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>Adicionar</Button>
            <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}>
              {NODE_TEMPLATES.map((t, i) => <MenuItem key={i} onClick={() => addNode(t)} sx={{ fontSize: 13 }}>{t.label}</MenuItem>)}
            </Menu>
            <Button size="small" onClick={() => { window.location.hash = `#/app/brands/${brandId}/studio/campanhas` }} sx={{ color: 'text.secondary' }}>Campanhas</Button>
            <Button size="small" variant="outlined" startIcon={<SaveIcon />} onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            <Button size="small" variant="contained" startIcon={<AutoAwesomeIcon />} onClick={run} sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' } }}>Gerar</Button>
          </Stack>
        }
      />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          fitView proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#1E3550" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={() => PURPLE} style={{ background: '#162840' }} />
        </ReactFlow>
      </Box>
    </Box>
  )
}
