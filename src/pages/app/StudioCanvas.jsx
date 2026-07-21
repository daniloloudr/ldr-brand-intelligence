import { useState, useEffect, useCallback, useRef } from 'react'
import { navigate } from '../../lib/helpers';
import {
  ReactFlow, Background, Controls, MiniMap, NodeToolbar, NodeResizer,
  addEdge, applyNodeChanges, applyEdgeChanges, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Box, Button, Typography, TextField, MenuItem, Select, ListSubheader, Paper,
  Stack, CircularProgress, Divider, Tooltip, IconButton, Menu, Dialog, Chip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
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
import CloseIcon from '@mui/icons-material/Close'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { CreditBadge } from '../../components/CreditBadge'
import { PageHeader } from '../../components/shell/PageHeader'
import { IMAGE_MODELS, IMAGE_MODEL_GROUPS, DEFAULT_IMAGE_MODEL, resolveModel } from '../../lib/studioModels'
import { VIDEO_MODELS, VIDEO_MODEL_GROUPS, DEFAULT_VIDEO_MODEL, videoModelByKey, durLabel, modeLabel } from '../../lib/videoModels'
import {
  nodeTypes, PURPLE, TEAL, GRAY, CORAL, INDIGO, AMBER,
  fmtElapsed, imgUrls, toUrls, sizeFor, PRODUCES_IMAGE, NODE_TEMPLATES, MAX_REF, isVideoUrl,
} from './studioNodes'

export function StudioCanvas({ brandId, workflowId }) {
  const { workspace, reload: reloadWorkspace } = useWorkspace()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [wfId, setWfId]   = useState(workflowId || null)
  const [nome, setNome]   = useState('Novo workflow')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]     = useState('')
  const [lightbox, setLightbox] = useState(null)   // { list: [url...], index } aberto em tela cheia
  const [running, setRunning] = useState(false)    // execução em andamento
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [elapsed, setElapsed] = useState(0)        // segundos desde o início do run
  const pollRef = useRef(null)
  const campaignRef = useRef(null)   // campanha dona deste fluxo (peças nascem vinculadas)
  const rfRef = useRef(null)
  const flowWrapRef = useRef(null)
  const connectSrcRef = useRef(null)
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  const markDirty = useCallback(() => setDirty(true), [])
  const runRef = useRef(null)                       // run() estável p/ os nós (run seletivo)
  const runNode = useCallback(id => runRef.current?.(id), [])
  const regenRef = useRef(null)                     // regenNode() estável p/ os nós
  const regenNodeCb = useCallback((id, motivo) => regenRef.current?.(id, motivo), [])
  const saveRef = useRef(null)                       // save() atual p/ autosave pós-run
  const wfIdRef = useRef(wfId)
  useEffect(() => { wfIdRef.current = wfId }, [wfId])

  const updateNodeData = useCallback((id, patch) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    setDirty(true)
  }, [])

  const downloadImage = useCallback(async (url) => {
    try {
      const res = await fetch(url); const blob = await res.blob()
      const ext = (url.split('?')[0].match(/\.(mp4|webm|mov|png|jpe?g|webp)$/i)?.[1] || 'png').toLowerCase()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `loudr-studio.${ext}`; a.click(); URL.revokeObjectURL(a.href)
    } catch { window.open(url, '_blank') }
  }, [])

  const savePiece = useCallback(async (nodeId, data) => {
    if (!data?.imageUrl || data.saved) return
    const isVideo = data.mediaType === 'video'
    const { error } = await supabase.from('brand_assets').insert({
      brand_id: brandId, tipo: isVideo ? 'video' : 'foto',
      nome: `Studio · ${isVideo ? 'vídeo' : (data.formato || 'peça')}`, descricao: 'Gerado no Studio',
      valor: data.imageUrl, mime_type: isVideo ? 'video/mp4' : 'image/png',
      metadata: { source: isVideo ? 'studio-video' : 'studio', generation_id: data.genId, formato: data.formato },
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
    // Persiste na hora (workflow já salvo): upload é caro demais pra viver só
    // em memória — qualquer remount/crash perderia a referência.
    if (novas.length && wfIdRef.current) setTimeout(() => saveRef.current?.(), 0)
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
        body: JSON.stringify({ brand_id: brandId, idea, use_brand: useBrand, model: 'haiku', max_chars: 250 }),
      })
      const j = await res.json()
      updateNodeData(id, { improving: false, ...(res.ok && j.prompt ? { text: j.prompt } : {}) })
      if (res.ok && j.prompt) setMsg('Prompt melhorado — confira se faz sentido com o direcionamento da peça.')
    } catch { updateNodeData(id, { improving: false }) }
  }, [brandId, updateNodeData, setMsg])

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

  const openLightbox = useCallback((url, list) => {
    const arr = (Array.isArray(list) && list.length) ? list : (url ? [url] : [])
    if (!arr.length) return
    const idx = Math.max(0, arr.indexOf(url))
    setLightbox({ list: arr, index: idx })
  }, [])
  const stepLightbox = useCallback(dir => {
    setLightbox(lb => lb && lb.list.length > 1 ? { ...lb, index: (lb.index + dir + lb.list.length) % lb.list.length } : lb)
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const onKey = e => {
      if (e.key === 'ArrowRight') stepLightbox(1)
      else if (e.key === 'ArrowLeft') stepLightbox(-1)
      else if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, stepLightbox])

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
    if (['prompt', 'context', 'formato', 'generate', 'videoGen', 'note'].includes(n.type)) data.onChange = updateNodeData
    if (n.type === 'prompt') data.onImprove = improvePrompt
    if (['generate', 'videoGen', 'app'].includes(n.type)) { data.onRun = runNode; data.onRegen = regenNodeCb }
    // regen de GERAÇÃO pede o motivo (telemetria do juiz: por que falhou?)
    if (['generate', 'videoGen'].includes(n.type)) data.regenMenu = true
    if (n.type === 'artGate') data.onRegen = regenNodeCb   // re-julgar a peça
    if (['preview', 'app', 'videoGen'].includes(n.type)) { data.onSave = savePiece; data.onDownload = downloadImage; data.onOpen = openLightbox; data.onVote = votePiece }
    if (n.type === 'imageInput') { data.onUpload = uploadImageInput; data.onRemoveImg = removeImageInput; data.onOpen = openLightbox }
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
        // Campanha → fluxo: toda peça gerada aqui nasce no dossiê da campanha
        const { data: camp } = await supabase.from('studio_campaigns').select('id').eq('workflow_id', wfId).maybeSingle()
        campaignRef.current = camp?.id || null
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

          const loaded = (data.nodes || []).map(n => attachHandlersRef.current(n)).map(n => {
            const d = { ...n.data }
            if (d.status === 'running' || d.status === 'julgando') d.status = 'idle'   // limpa estados transitórios
            if (d.loading) d.loading = false
            const hit = byNode[n.id]
            if (hit) {
              if (n.type === 'generate') { d.outputUrl = d.outputUrl || hit.url; d.status = 'done' }
              if (n.type === 'app' || n.type === 'videoGen') { d.outputUrl = d.outputUrl || hit.url; d.genId = d.genId || hit.id; d.status = 'done' }
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
    // Só wfId nas deps: recarregar por identidade de callback (attachHandlers)
    // descartava estado não salvo do canvas — o "pisca" que perde upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wfId])

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
      delete rest.loading; delete rest.improving; delete rest.uploading; delete rest.elapsed   // estados transitórios não persistem
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
    if (!wfId) { setWfId(res.data.id); navigate(`#/app/brands/${brandId}/studio/workflow/${res.data.id}`) }
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
    const contextNodes = ins.filter(n => n.type === 'context')
    const context = contextNodes.map(n => (n.data?.text || '').trim()).filter(Boolean).join('\n\n')
    const previewNode = nodes.find(n => n.type === 'preview' && edges.some(e => e.source === genId && e.target === n.id))
    // Faceta da marca por nó conectado (Brand Voice → verbal, Brand Visual → visual)
    const brandFacets = []
    if (brandNodes.some(n => /voz|voice|verbal/i.test(n.data?.title || ''))) brandFacets.push('verbal')
    if (brandNodes.some(n => /visual/i.test(n.data?.title || ''))) brandFacets.push('visual')
    // Formato personalizado: o nó manda px exatos (image_size na fal) em vez de proporção
    const fd = formatoNode?.data || {}
    const customSize = fd.formato === 'custom'
      ? { width: Math.min(4096, Math.max(256, fd.width || 1080)), height: Math.min(4096, Math.max(256, fd.height || 1350)) }
      : null
    return {
      prompt: (promptNode?.data?.text || '').trim(),
      formato: customSize ? `${customSize.width}x${customSize.height}` : (fd.formato || '1:1'),
      customSize,
      hasBrand: brandNodes.length > 0, brandFacets, context, previewNodeId: previewNode?.id,
    }
  }
  // Junta prompt + contexto extra (nós Contexto) num único texto para o backend
  const withContext = (prompt, context) => context ? `${prompt}\n\n[CONTEXTO ADICIONAL]\n${context}` : prompt
  // Ajuste fino do vídeo: reaproveita os mesmos inputs e pede só o retoque pontual
  const withAdjust = (prompt, adjust) => adjust
    ? `${prompt}\n\n[AJUSTE FINO]\nMantenha o vídeo praticamente igual (mesma cena, composição e movimento); ajuste apenas, de forma sutil: ${adjust}`
    : prompt

  // Nó produtor de imagem conectado à entrada de um nó (encadeamento)
  function imageUpstreamOf(nodeId) {
    const inIds = edges.filter(e => e.target === nodeId).map(e => e.source)
    return nodes.find(n => inIds.includes(n.id) && PRODUCES_IMAGE.has(n.type))
  }
  // Todos os nós produtores de imagem conectados → viram referências (image-to-image)
  function imageUpstreamsOf(nodeId) {
    // Ordem das EDGES (1ª conexão = 1ª referência), não do array de nós —
    // a convenção do try-on (1ª = modelo, 2ª = peça) depende disso.
    const inIds = [...new Set(edges.filter(e => e.target === nodeId).map(e => e.source))]
    return inIds.map(id => nodes.find(n => n.id === id)).filter(n => n && PRODUCES_IMAGE.has(n.type))
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
    const { prompt, formato, customSize, hasBrand, brandFacets, context, previewNodeId } = inputsFor(g.id)
    const model = resolveModel(g.data?.model === 'custom' ? g.data?.customModel : g.data?.model)
    // FASHN try-on não usa prompt: veste a 2ª imagem (peça) na 1ª (modelo)
    const isTryon = /fashn\/tryon/.test(model || '')
    if (!prompt && !isTryon) { updateNodeData(g.id, { status: 'error', error: 'conecte um nó Prompt' }); dispatched.add(g.id); return null }
    const references = imageUpstreamsOf(g.id).flatMap(u => toUrls(outputs[u.id])).slice(0, MAX_REF)
    if (isTryon && references.length < 2) { updateNodeData(g.id, { status: 'error', error: 'try-on: conecte 2 imagens (1ª modelo, 2ª peça)' }); dispatched.add(g.id); return null }
    updateNodeData(g.id, { status: 'running', error: null })
    if (previewNodeId) updateNodeData(previewNodeId, { imageUrl: null, loading: true })
    try {
      const res = await fetch('/.netlify/functions/studio-generate', { method: 'POST', headers: auth,
        body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: g.id, campaign_id: campaignRef.current, prompt: isTryon ? 'try-on' : withContext(prompt, context), formato, custom_size: customSize || undefined, use_brand: isTryon ? false : hasBrand, brand_facets: brandFacets, model, references, regen: !!ctx.regen, motivo: ctx.motivo || undefined }) })
      const j = await res.json(); if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
      dispatched.add(g.id)
      ;(ctx.genIds ||= {})[g.id] = j.generation_id   // portões a jusante carimbam o parecer na geração
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
        body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: a.id, op: a.data.op, image_url: imageUrl,
          ...(a.data.op === 'crop' ? { width: a.data.width || 1080, height: a.data.height || 1080, focal: a.data.focal || 'attention' } : {}) }) })
      // (apps não emitem sinal de regen — reprocessar ≠ reprovar)
      const j = await res.json(); if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
      dispatched.add(a.id)
      ;(ctx.genIds ||= {})[a.id] = j.generation_id
      return { genId: j.generation_id, nodeId: a.id, kind: 'app' }
    } catch (e) { updateNodeData(a.id, { status: 'error', error: e.message }); return null }
  }

  async function dispatchVideoNode(v, ctx) {
    const { outputs, auth, dispatched } = ctx
    const { prompt, hasBrand, brandFacets, context } = inputsFor(v.id)
    if (!prompt) { updateNodeData(v.id, { status: 'error', error: 'conecte um nó Prompt' }); dispatched.add(v.id); return null }
    const mk = v.data?.model || DEFAULT_VIDEO_MODEL
    const m = videoModelByKey(mk)
    const up = imageUpstreamOf(v.id)
    const imageUrl = toUrls(outputs[up?.id])[0] || null
    // i2v-only exige imagem de origem
    if (m && m.modes.includes('i2v') && !m.modes.includes('t2v') && !imageUrl) {
      updateNodeData(v.id, { status: 'error', error: 'conecte uma imagem (image-to-video)' }); dispatched.add(v.id); return null
    }
    const duration = v.data?.duration || m?.defaultDuration
    updateNodeData(v.id, { status: 'running', error: null, outputUrl: null })
    try {
      const res = await fetch('/.netlify/functions/studio-generate-video', { method: 'POST', headers: auth,
        body: JSON.stringify({ brand_id: brandId, workflow_id: wfId, node_id: v.id, prompt: withAdjust(withContext(prompt, context), (v.data?.adjust || '').trim()), model: mk, use_brand: hasBrand, brand_facets: brandFacets,
          image_url: m?.modes.includes('i2v') ? imageUrl : null, duration: m?.durations ? duration : undefined,
          regen: !!ctx.regen, motivo: ctx.motivo || undefined, ajuste: (v.data?.adjust || '').trim() || undefined }) })
      const j = await res.json(); if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
      dispatched.add(v.id)
      return { genId: j.generation_id, nodeId: v.id, kind: 'video' }
    } catch (e) { updateNodeData(v.id, { status: 'error', error: e.message }); return null }
  }

  // F2 · Portão do Diretor de Arte: julga a peça vinda de montante contra o
  // cérebro (art-review). Aprovada/ressalvas → a imagem passa adiante; reprovada
  // → o fluxo PARA neste ramo, com o parecer no nó. Cada parecer vira sinal.
  async function runGate(gate, ctx) {
    // Peça julgada = o 1º PRODUTOR conectado (ordem das conexões). Referência de
    // fidelidade: imageInput conectado OU um 2º produtor (ex.: master gerado —
    // caso do fluxo "1 peça → N formatos", em que o gate compara adaptação vs master).
    const ups = imageUpstreamsOf(gate.id)
    const produtores = ups.filter(u => ['generate', 'app', 'artGate', 'preview'].includes(u.type))
    const produtor = produtores[0]
    const refNode = ups.find(u => u.type === 'imageInput') || produtores[1]
    const imageUrl = toUrls(ctx.outputs[produtor?.id])[0] || (!produtor ? toUrls(ctx.outputs[ups[0]?.id])[0] : null)
    const referenceUrl = produtor && refNode ? toUrls(ctx.outputs[refNode.id])[0] : null
    if (!imageUrl) return false
    ctx.dispatched.add(gate.id)
    updateNodeData(gate.id, { status: 'julgando', veredito: null, resumo: null, ajustes: null, error: null, outputUrl: null })
    try {
      // generation_id: liga o parecer à geração (ref_id do sinal → certidão do asset).
      // No regen sem ctx.genIds, cai no genId do preview do produtor.
      const previewDoProdutor = produtor ? nodes.find(n => n.type === 'preview' && edges.some(e => e.source === produtor.id && e.target === n.id)) : null
      const generationId = ctx.genIds?.[produtor?.id] || previewDoProdutor?.data?.genId || undefined
      const res = await fetch('/.netlify/functions/art-review', { method: 'POST', headers: ctx.auth,
        body: JSON.stringify({ brand_id: brandId, image_url: imageUrl, generation_id: generationId,
          criterio: (gate.data?.criterio || '').trim() || undefined,
          reference_url: referenceUrl || undefined, modo: gate.data?.modo || undefined }) })
      const j = await res.json()
      if (!res.ok) { updateNodeData(gate.id, { status: 'error', error: j.error || `Erro ${res.status}` }); return false }
      const passou = j.veredito !== 'reprovada'
      updateNodeData(gate.id, { status: 'done', veredito: j.veredito, resumo: j.resumo, ajustes: j.ajustes, outputUrl: passou ? imageUrl : null })
      if (passou) ctx.outputs[gate.id] = imageUrl
      return passou
    } catch (e) {
      updateNodeData(gate.id, { status: 'error', error: e.message })
      return false
    }
  }

  // Roda todos os portões prontos (upstream com imagem) ainda não julgados; em
  // série, repetindo até estabilizar (portão atrás de portão).
  async function runReadyGates(gateNodes, ctx) {
    let rodou = true
    while (rodou) {
      rodou = false
      for (const g of gateNodes) {
        if (ctx.dispatched.has(g.id)) continue
        const ups = imageUpstreamsOf(g.id)
        const produtor = ups.find(u => ['generate', 'app', 'artGate', 'preview'].includes(u.type)) || ups[0]
        if (produtor && toUrls(ctx.outputs[produtor.id]).length) { await runGate(g, ctx); rodou = true }
      }
    }
  }

  // Semeia tudo que já foi produzido no grafo (imageInput, app, generate) — base
  // para regerar 1 nó usando as infos anteriores (estilo n8n).
  function seedExistingOutputs() {
    const out = {}
    for (const n of nodes) {
      if (n.type === 'imageInput' && imgUrls(n.data).length) out[n.id] = imgUrls(n.data)
      else if (n.type === 'preview' && n.data?.imageUrl) out[n.id] = n.data.imageUrl
      else if ((n.type === 'app' || n.type === 'generate' || n.type === 'artGate') && n.data?.outputUrl) out[n.id] = n.data.outputUrl
    }
    return out
  }

  async function run(rootId = null) {
    let genNodes = nodes.filter(n => n.type === 'generate')
    let appNodes = nodes.filter(n => n.type === 'app')
    let vidNodes = nodes.filter(n => n.type === 'videoGen')
    let gateNodes = nodes.filter(n => n.type === 'artGate')
    if (rootId) {                                  // run seletivo: só o nó + descendentes
      const keep = downstreamClosure(rootId)
      genNodes = genNodes.filter(n => keep.has(n.id))
      appNodes = appNodes.filter(n => keep.has(n.id))
      vidNodes = vidNodes.filter(n => keep.has(n.id))
      gateNodes = gateNodes.filter(n => keep.has(n.id))
    }
    if (!genNodes.length && !appNodes.length && !vidNodes.length && !gateNodes.length) return setMsg('Adicione nós ao canvas.')
    setMsg('')

    const auth = await authHeaders()
    const outputs = {}            // nodeId -> image_url pronto (encadeamento)
    const dispatched = new Set()
    const ctx = { outputs, auth, dispatched }

    // imageInput já tem a imagem pronta → semeia outputs (alimenta apps/refs a jusante)
    for (const n of nodes.filter(n => n.type === 'imageInput' && imgUrls(n.data).length)) outputs[n.id] = imgUrls(n.data)
    // Run seletivo: reusa imagens já produzidas a montante (apps/generates) sem reprocessar
    if (rootId) for (const [nid, url] of Object.entries(seedExistingOutputs())) { const node = nodes.find(n => n.id === nid); if (node && !genNodes.includes(node) && !appNodes.includes(node) && !gateNodes.includes(node)) outputs[nid] = url }
    // Portões prontos já na largada (ex.: imagem de upload → diretor de arte)
    await runReadyGates(gateNodes, ctx)
    // Generate só dispara quando todas as referências de imagem conectadas estão prontas
    const genReady = g => imageUpstreamsOf(g.id).every(u => toUrls(outputs[u.id]).length > 0)

    const jobs = []
    for (const g of genNodes) { if (genReady(g)) { const job = await dispatchGenerateNode(g, ctx); if (job) jobs.push(job) } }
    for (const v of vidNodes) { if (genReady(v)) { const job = await dispatchVideoNode(v, ctx); if (job) jobs.push(job) } }
    for (const a of appNodes) {
      if (dispatched.has(a.id)) continue
      const up = imageUpstreamOf(a.id)
      if (up && toUrls(outputs[up.id]).length) { const job = await dispatchAppNode(a, ctx); if (job) jobs.push(job) }
    }
    if (!jobs.length) {
      // só portões rodaram (julgamento sem geração nova) — nada a acompanhar
      if (gateNodes.some(g => dispatched.has(g.id))) { if (wfId) saveRef.current?.(); return }
      return setMsg('Nada para gerar — adicione um Generate/Vídeo ou conecte uma imagem a um app.')
    }
    pollEngine(jobs, { outputs, dispatched, genNodes, appNodes, vidNodes, gateNodes, auth,
      dispatchGenerate: g => dispatchGenerateNode(g, ctx), dispatchApp: a => dispatchAppNode(a, ctx), dispatchVideo: v => dispatchVideoNode(v, ctx), genReady })
    reloadWorkspace?.()   // saldo cai assim que os jobs são submetidos (débito já ocorreu)
  }

  // Regerar UM nó usando as saídas já produzidas até aqui (sem cascata a jusante).
  // motivo (opcional): categoria da falha escolhida no menu — vira telemetria do sinal.
  async function regenNode(nodeId, motivo = null) {
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node || !['generate', 'videoGen', 'app', 'artGate'].includes(node.type)) return
    setMsg('')
    const auth = await authHeaders()
    const outputs = seedExistingOutputs()
    if (node.type === 'artGate') {   // re-julgar: usa a peça de montante já produzida
      await runGate(node, { outputs, dispatched: new Set(), auth })
      if (wfIdRef.current) saveRef.current?.()
      return
    }
    // regen: true → o servidor emite sinal de reprovação implícita da peça anterior
    const ctx = { outputs, auth, dispatched: new Set(), regen: true, motivo }
    const job = node.type === 'generate' ? await dispatchGenerateNode(node, ctx)
      : node.type === 'videoGen' ? await dispatchVideoNode(node, ctx)
      : await dispatchAppNode(node, ctx)
    if (!job) return
    pollEngine([job], { outputs, dispatched: ctx.dispatched, genNodes: [], appNodes: [], vidNodes: [],
      dispatchGenerate: () => null, dispatchApp: () => null, dispatchVideo: () => null, genReady: () => false })
  }

  // Poll concorrente + dispara apps/generates a jusante quando o upstream conclui
  function pollEngine(initialJobs, ctx) {
    if (pollRef.current) clearInterval(pollRef.current)
    const { outputs, dispatched, genNodes, appNodes, vidNodes = [], gateNodes = [], auth = null, dispatchGenerate, dispatchApp, dispatchVideo, genReady } = ctx
    const jobs = [...initialJobs]
    const pending = new Set(jobs.map(j => j.genId))
    const start = Date.now()
    setRunning(true); setProgress({ done: 0, total: jobs.length }); setElapsed(0)
    const stop = () => {
      clearInterval(pollRef.current); pollRef.current = null; setRunning(false); setElapsed(0)
      if (wfId) setTimeout(() => saveRef.current?.(), 400)   // autosave após o estado assentar
      reloadWorkspace?.()             // atualiza saldo de créditos ao fim do run
    }
    pollRef.current = setInterval(async () => {
      const secs = Math.floor((Date.now() - start) / 1000)
      setElapsed(secs)
      // tempo decorrido por nó vivo (atualização "silenciosa" — não marca não-salvo)
      const liveIds = new Set()
      for (const id of pending) { const j = jobs.find(x => x.genId === id); if (j) { liveIds.add(j.nodeId); if (j.previewNodeId) liveIds.add(j.previewNodeId) } }
      setNodes(ns => ns.map(n => (liveIds.has(n.id) && (n.data.status === 'running' || n.data.loading)) ? { ...n, data: { ...n.data, elapsed: secs } } : n))

      if (Date.now() - start > 600_000) {                 // timeout de segurança (10 min)
        for (const id of pending) {
          const j = jobs.find(x => x.genId === id); if (!j) continue
          updateNodeData(j.nodeId, { status: 'error', error: 'tempo esgotado (10 min)' })
          if (j.previewNodeId) updateNodeData(j.previewNodeId, { loading: false })
        }
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
            // app/recorte com Prévia conectada a jusante: preenche também
            const pv = nodes.find(n => n.type === 'preview' && edges.some(e => e.source === job.nodeId && e.target === n.id))
            if (pv) { outputs[pv.id] = row.image_url; updateNodeData(pv.id, { imageUrl: row.image_url, genId: row.id, saved: false, loading: false }) }
          }
        } else if (row.status === 'error') {
          pending.delete(row.id)
          updateNodeData(job.nodeId, { status: 'error', error: row.error || 'erro na geração' })
          if (job.previewNodeId) updateNodeData(job.previewNodeId, { loading: false })
        }
      }
      // encadeamento: re-varre tudo que ainda não rodou e cujas entradas já estão prontas
      // (cobre app←imagem, generate←referência e continuar a partir de um Preview)
      // Portões primeiro: o veredito decide se o ramo continua (aprovada → outputs)
      if (gateNodes.length && auth) await runReadyGates(gateNodes, { outputs, dispatched, auth })
      for (const a of appNodes) {
        if (dispatched.has(a.id)) continue
        const up = imageUpstreamOf(a.id)
        if (up && toUrls(outputs[up.id]).length) { const nj = await dispatchApp(a); if (nj) { jobs.push(nj); pending.add(nj.genId) } }
      }
      for (const g of genNodes) {
        if (dispatched.has(g.id) || !imageUpstreamsOf(g.id).length) continue
        if (genReady(g)) { const nj = await dispatchGenerate(g); if (nj) { jobs.push(nj); pending.add(nj.genId) } }
      }
      for (const v of vidNodes) {
        if (dispatched.has(v.id) || !imageUpstreamsOf(v.id).length) continue   // só os que esperam imagem upstream
        if (genReady(v)) { const nj = await dispatchVideo(v); if (nj) { jobs.push(nj); pending.add(nj.genId) } }
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
            {running && (
              <Typography sx={{ fontSize: 12, color: elapsed >= 90 ? '#EF9F27' : 'text.secondary' }}>
                {fmtElapsed(elapsed)}{elapsed >= 90 ? ' · modelos lentos podem levar alguns min' : ''}
              </Typography>
            )}
            {msg && <Typography sx={{ fontSize: 12, color: msg.startsWith('Erro') || msg.includes('conecte') || msg.includes('Adicione') ? CORAL : 'text.secondary' }}>{msg}</Typography>}
            <CreditBadge />
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
          <Tooltip title="Contexto" placement="right"><IconButton size="small" onClick={() => addNode(NODE_TEMPLATES.find(t => t.type === 'context'))}><NotesOutlinedIcon sx={{ fontSize: 19, color: AMBER }} /></IconButton></Tooltip>
          <Tooltip title="Gerar" placement="right"><IconButton size="small" onClick={() => addNode(NODE_TEMPLATES.find(t => t.type === 'generate'))}><AutoFixHighOutlinedIcon sx={{ fontSize: 19, color: TEAL }} /></IconButton></Tooltip>
          <Tooltip title="Vídeo" placement="right"><IconButton size="small" onClick={() => addNode(NODE_TEMPLATES.find(t => t.type === 'videoGen'))}><MovieOutlinedIcon sx={{ fontSize: 19, color: INDIGO }} /></IconButton></Tooltip>
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
        {lightbox && (() => {
          const url = lightbox.list[lightbox.index]
          const multi = lightbox.list.length > 1
          return (
            <Box sx={{ position: 'relative' }}>
              <IconButton onClick={() => setLightbox(null)} sx={{ position: 'absolute', top: -14, right: -14, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
              {isVideoUrl(url)
                ? <Box component="video" src={url} controls autoPlay loop sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2 }} />
                : <Box component="img" src={url} alt="" sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2 }} />}
              {multi && (
                <>
                  <IconButton onClick={() => stepLightbox(-1)} sx={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,.85)' } }}>
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton onClick={() => stepLightbox(1)} sx={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,.85)' } }}>
                    <ChevronRightIcon />
                  </IconButton>
                  <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,.6)', color: '#fff', px: 1.2, py: 0.3, borderRadius: 5, fontSize: 12, fontWeight: 700 }}>
                    {lightbox.index + 1} / {lightbox.list.length}
                  </Box>
                </>
              )}
              <Button startIcon={<DownloadOutlinedIcon />} onClick={() => downloadImage(url)}
                sx={{ position: 'absolute', bottom: 12, right: 12, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
                Baixar
              </Button>
            </Box>
          )
        })()}
      </Dialog>
    </Box>
  )
}
