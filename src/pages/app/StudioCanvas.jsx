import { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, applyNodeChanges, applyEdgeChanges, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Box, Button, Typography, TextField, MenuItem, Select, Paper,
  Stack, CircularProgress, Divider, Tooltip, IconButton,
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

const GenerateNode = memo(({ data }) => (
  <NodeShell color={TEAL} title="Generate">
    <Stack spacing={0.75} alignItems="flex-start">
      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Gera a peça on-brand</Typography>
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
  { id: 'gen',     type: 'generate',     position: { x: 300, y: 200 }, data: { status: 'idle' } },
  { id: 'preview', type: 'preview',      position: { x: 600, y: 180 }, data: { imageUrl: null } },
]
const seedEdges = [
  { id: 'e1', source: 'dna',     target: 'gen' },
  { id: 'e2', source: 'visual',  target: 'gen' },
  { id: 'e3', source: 'prompt',  target: 'gen' },
  { id: 'e4', source: 'formato', target: 'gen' },
  { id: 'e5', source: 'gen',     target: 'preview' },
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
    if (['prompt', 'formato'].includes(n.type)) return { ...n, data: { ...n.data, onChange: updateNodeData } }
    if (n.type === 'preview') return { ...n, data: { ...n.data, onSave: savePiece, onDownload: downloadImage } }
    return n
  }, [updateNodeData, savePiece, downloadImage])

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
    if (!wfId) { setWfId(res.data.id); window.location.hash = `#/app/brands/${brandId}/studio/${res.data.id}` }
    setMsg('Salvo ✓')
  }

  async function run() {
    const genNode = nodes.find(n => n.type === 'generate')
    const promptNode = nodes.find(n => n.type === 'prompt')
    const formatoNode = nodes.find(n => n.type === 'formato')
    const hasBrand = nodes.some(n => n.type === 'brandContext')
    const previewNode = nodes.find(n => n.type === 'preview')
    const prompt = (promptNode?.data?.text || '').trim()

    if (!hasBrand) return setMsg('Conecte ao menos um nó de marca antes de gerar.')
    if (!prompt)   return setMsg('Escreva um prompt no nó Prompt.')

    setMsg(''); updateNodeData(genNode.id, { status: 'running', error: null })
    if (previewNode) updateNodeData(previewNode.id, { imageUrl: null })

    const { data: { session } } = await supabase.auth.getSession()
    let json
    try {
      const res = await fetch('/.netlify/functions/studio-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: genNode.id, prompt, formato: formatoNode?.data?.formato || '1:1' }),
      })
      json = await res.json()
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
    } catch (e) {
      updateNodeData(genNode.id, { status: 'error', error: e.message }); return
    }
    pollGeneration(json.generation_id, genNode.id, previewNode?.id, formatoNode?.data?.formato || '1:1')
  }

  function pollGeneration(genId, genNodeId, previewNodeId, formato) {
    if (pollRef.current) clearInterval(pollRef.current)
    const start = Date.now()
    pollRef.current = setInterval(async () => {
      if (Date.now() - start > 180_000) {
        clearInterval(pollRef.current)
        updateNodeData(genNodeId, { status: 'error', error: 'tempo esgotado' }); return
      }
      const { data } = await supabase.from('studio_generations').select('status, image_url, error').eq('id', genId).maybeSingle()
      if (!data) return
      if (data.status === 'done') {
        clearInterval(pollRef.current)
        updateNodeData(genNodeId, { status: 'done' })
        if (previewNodeId) updateNodeData(previewNodeId, { imageUrl: data.image_url, genId, formato, saved: false })
      } else if (data.status === 'error') {
        clearInterval(pollRef.current)
        updateNodeData(genNodeId, { status: 'error', error: data.error || 'erro na geração' })
      }
    }, 3000)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <PageHeader
        title="Studio"
        subtitle="Geração visual on-brand"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {msg && <Typography sx={{ fontSize: 12, color: msg.startsWith('Erro') || msg.includes('antes') || msg.includes('prompt') ? CORAL : 'text.secondary' }}>{msg}</Typography>}
            <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => { window.location.hash = `#/app/brands/${brandId}/brand-book` }} sx={{ color: 'text.secondary' }}>Marca</Button>
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
