// studioNodes.jsx — componentes de nó do canvas do Studio (React Flow) + constantes/helpers.
// Extraído do StudioCanvas.jsx (que era 1198 linhas) — puramente presentacional, sem mudança de comportamento.
import { memo, useState } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar } from '@xyflow/react'
import {
  Box, Button, Typography, TextField, MenuItem, Select, ListSubheader, Paper,
  Stack, CircularProgress, Tooltip, IconButton, Chip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ReplayIcon from '@mui/icons-material/Replay'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import CloseIcon from '@mui/icons-material/Close'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined'
import { IMAGE_MODELS, IMAGE_MODEL_GROUPS, DEFAULT_IMAGE_MODEL } from '../../lib/studioModels'
import { VIDEO_MODELS, VIDEO_MODEL_GROUPS, DEFAULT_VIDEO_MODEL, videoModelByKey, durLabel, modeLabel } from '../../lib/videoModels'

const PURPLE = '#7F77DD', TEAL = '#0D9E7A', GRAY = '#8A9AB0', CORAL = '#E8185A', INDIGO = '#6C4BE0', AMBER = '#E0B33A'
const isVideoUrl = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || '')
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

// Contexto — texto longo livre que complementa o prompt (tema, briefing, referências
// conceituais). Conectado a um Gerar/Vídeo, entra como [CONTEXTO ADICIONAL] no prompt.
const ContextNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={AMBER} title="Contexto" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
    <TextField
      value={data.text || ''} onChange={e => data.onChange(id, { text: e.target.value })}
      placeholder="Contexto extra para compor o prompt: tema, briefing, público, restrições, referências conceituais…"
      multiline fullWidth size="small" className="nodrag"
      sx={{ flex: 1, minHeight: 0, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' }, '& textarea': { height: '100% !important', fontSize: 12, overflow: 'auto !important' } }}
    />
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
      {data.status === 'running' && <Stack direction="row" spacing={0.75} alignItems="center"><CircularProgress size={12} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: TEAL }}>gerando… {fmtElapsed(data.elapsed || 0)}</Typography></Stack>}
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
          ? <><CircularProgress size={20} sx={{ color: CORAL }} /><Typography sx={{ fontSize: 10, color: CORAL, fontWeight: 700 }}>gerando… {fmtElapsed(data.elapsed || 0)}</Typography></>
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
      {data.status === 'running' && <Stack direction="row" spacing={0.75} alignItems="center"><CircularProgress size={12} sx={{ color: GRAY }} /><Typography sx={{ fontSize: 10, color: 'text.secondary' }}>processando… {fmtElapsed(data.elapsed || 0)}</Typography></Stack>}
      {data.status === 'error'   && <Typography sx={{ fontSize: 10, color: CORAL }}>{data.error || 'erro'}</Typography>}
    </Stack>
  </NodeShell>
))

// Imagem externa (upload) — até MAX_REF referências para compor o workflow
const ImageInputNode = memo(({ id, data, selected }) => {
  const urls = imgUrls(data)
  return (
    <NodeShell id={id} color={GRAY} title={`Imagem${urls.length ? ` (${urls.length}/${MAX_REF})` : ''}`} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
      <Stack className="nodrag" spacing={0.5} sx={{ flex: 1, minHeight: 0 }}>
        {/* Primeira imagem em destaque */}
        {urls.length > 0 && (
          <Box onClick={() => data.onOpen?.(urls[0], urls)}
            sx={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', cursor: 'zoom-in', '&:hover .rmBtn': { opacity: 1 } }}>
            <Box component="img" src={urls[0]} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <IconButton size="small" className="rmBtn" onClick={e => { e.stopPropagation(); data.onRemoveImg?.(id, urls[0]) }}
              sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: 'opacity .15s', bgcolor: 'rgba(0,0,0,.55)', color: '#fff', p: 0.3, '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}>
              <CloseIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Box>
        )}

        {/* Demais imagens (até 4) + upload */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, flexShrink: 0 }}>
          {urls.slice(1).map(u => (
            <Box key={u} onClick={() => data.onOpen?.(u, urls)}
              sx={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', cursor: 'zoom-in', '&:hover .rmBtn': { opacity: 1 } }}>
              <Box component="img" src={u} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <IconButton size="small" className="rmBtn" onClick={e => { e.stopPropagation(); data.onRemoveImg?.(id, u) }}
                sx={{ position: 'absolute', top: 1, right: 1, opacity: 0, transition: 'opacity .15s', bgcolor: 'rgba(0,0,0,.55)', color: '#fff', p: 0.15, '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}>
                <CloseIcon sx={{ fontSize: 10 }} />
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
      </Stack>
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

// Geração de VÍDEO — t2v (Prompt) ou i2v (imagem de um nó upstream). Player inline.
const VideoGenNode = memo(({ id, data, selected }) => {
  const mk = data.model || DEFAULT_VIDEO_MODEL
  const m  = videoModelByKey(mk)
  const [adjOpen, setAdjOpen] = useState(false)
  const adjusting = data.status === 'running'
  return (
    <NodeShell id={id} color={INDIGO} title="Vídeo" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRun={data.onRun} onRegen={data.onRegen} onResize={data.onResize} selected={selected}>
      <Stack spacing={0.5} className="nodrag" sx={{ flex: 1, minHeight: 0 }}>
        <Select value={mk} onChange={e => data.onChange(id, { model: e.target.value, duration: videoModelByKey(e.target.value)?.defaultDuration })}
          size="small" fullWidth sx={{ fontSize: 11 }}>
          {VIDEO_MODEL_GROUPS.flatMap(g => [
            <ListSubheader key={g} sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 2.2, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
            ...VIDEO_MODELS.filter(x => x.group === g).map(x => (
              <MenuItem key={x.key} value={x.key} sx={{ fontSize: 11 }}>
                {x.label}
                <Typography component="span" sx={{ ml: 0.75, fontSize: 9, color: 'text.disabled' }}>{modeLabel(x)}</Typography>
              </MenuItem>
            )),
          ])}
        </Select>
        <Typography sx={{ fontSize: 9, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {modeLabel(m)}{m?.modes?.includes('i2v') && !m?.modes?.includes('t2v') ? ' · conecte uma imagem' : ''}
        </Typography>
        {m?.durations && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {m.durations.map(d => (
              <Chip key={d} label={durLabel(d)} size="small" clickable onClick={() => data.onChange(id, { duration: d })}
                variant={(data.duration || m.defaultDuration) === d ? 'filled' : 'outlined'}
                sx={{ height: 20, fontSize: 10, fontWeight: 700, ...((data.duration || m.defaultDuration) === d && { bgcolor: INDIGO, color: '#fff' }) }} />
            ))}
          </Stack>
        )}
        {data.outputUrl ? (
          <>
            <Box onClick={() => data.onOpen?.(data.outputUrl)} sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', bgcolor: '#000', borderRadius: 1, overflow: 'hidden' }}>
              <Box component="video" src={data.outputUrl} muted loop playsInline preload="metadata"
                onMouseEnter={e => e.currentTarget.play?.().catch(() => {})} onMouseLeave={e => e.currentTarget.pause?.()}
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
            </Box>
            <Stack direction="row" spacing={0} alignItems="center" sx={{ mt: 0.25, flexShrink: 0 }}>
              <Tooltip title="Aprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'up')}>
                {data.feedback === 'up' ? <ThumbUpIcon sx={{ fontSize: 14, color: TEAL }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />}
              </IconButton></Tooltip>
              <Tooltip title="Reprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'down')}>
                {data.feedback === 'down' ? <ThumbDownIcon sx={{ fontSize: 14, color: CORAL }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />}
              </IconButton></Tooltip>
              <Tooltip title="Ajustar (retoque sutil + reajustar)"><IconButton size="small" onClick={() => setAdjOpen(o => !o)}>
                <TuneOutlinedIcon sx={{ fontSize: 15, color: adjOpen || data.adjust ? AMBER : 'inherit' }} />
              </IconButton></Tooltip>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Baixar"><IconButton size="small" onClick={() => data.onDownload?.(data.outputUrl)}><DownloadOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
              <Tooltip title={data.saved ? 'Salvo nos assets' : 'Salvar nos assets'}>
                <span><IconButton size="small" disabled={data.saved} onClick={() => data.onSave?.(id, { imageUrl: data.outputUrl, genId: data.genId, mediaType: 'video', formato: data.formato, saved: data.saved })}>
                  <BookmarkAddOutlinedIcon sx={{ fontSize: 15, color: data.saved ? TEAL : 'inherit' }} />
                </IconButton></span>
              </Tooltip>
            </Stack>
            {adjOpen && (
              <Stack spacing={0.5} className="nodrag" sx={{ flexShrink: 0, pt: 0.25 }}>
                <TextField value={data.adjust || ''} onChange={e => data.onChange(id, { adjust: e.target.value })}
                  placeholder="Ajuste pontual: ex. 'luz um pouco mais quente', 'movimento mais lento'…"
                  multiline minRows={2} maxRows={4} fullWidth size="small"
                  sx={{ '& textarea': { fontSize: 11 } }} />
                <Button size="small" variant="contained" disabled={adjusting || !(data.adjust || '').trim()}
                  startIcon={adjusting ? <CircularProgress size={11} sx={{ color: '#fff' }} /> : <ReplayIcon sx={{ fontSize: 14 }} />}
                  onClick={() => data.onRegen?.(id)}
                  sx={{ alignSelf: 'flex-end', fontSize: 10, fontWeight: 700, bgcolor: AMBER, color: '#000', py: 0.25, '&:hover': { bgcolor: '#CDA02F' } }}>
                  {adjusting ? 'Reajustando…' : 'Reajustar'}
                </Button>
              </Stack>
            )}
          </>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 1 }}>
            {data.status === 'running'
              ? <Stack alignItems="center" spacing={0.5}><CircularProgress size={18} sx={{ color: INDIGO }} /><Typography sx={{ fontSize: 10, color: INDIGO, fontWeight: 700 }}>gerando vídeo… {fmtElapsed(data.elapsed || 0)}</Typography></Stack>
              : data.status === 'error'
              ? <Typography sx={{ fontSize: 10, color: CORAL }}>{data.error || 'erro'}</Typography>
              : <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>conecte um Prompt{m?.modes?.includes('i2v') && !m?.modes?.includes('t2v') ? ' + uma imagem' : m?.modes?.includes('i2v') ? ' (imagem opcional p/ i2v)' : ''}</Typography>}
          </Box>
        )}
      </Stack>
    </NodeShell>
  )
})

const nodeTypes = { brandContext: BrandContextNode, prompt: PromptNode, context: ContextNode, formato: FormatoNode, generate: GenerateNode, preview: PreviewNode, app: AppNode, imageInput: ImageInputNode, videoGen: VideoGenNode, note: NoteNode, group: GroupNode }

// Nós que produzem imagem (podem alimentar apps/generates a jusante)
const PRODUCES_IMAGE = new Set(['generate', 'app', 'imageInput', 'preview'])
const MAX_REF = 5
const DEFAULT_NODE = 250   // tamanho padrão uniforme dos nós (px)
// Formato e Gerar têm pouco conteúdo → altura fixa compacta p/ não ficar feio
const NODE_SIZE = { formato: { width: 250, height: 116 }, generate: { width: 250, height: 140 } }
const sizeFor = type => NODE_SIZE[type] || { width: DEFAULT_NODE, height: DEFAULT_NODE }
const fmtElapsed = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`
// Normaliza a saída de um nó em lista de URLs (imageInput pode ter várias)
const toUrls = v => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : [])
const imgUrls = data => data?.urls?.length ? data.urls : (data?.url ? [data.url] : [])

// Paleta de nós que podem ser adicionados ao canvas (novo workflow = canvas em branco)
const NODE_TEMPLATES = [
  { type: 'prompt',       label: 'Prompt',       data: { text: '' } },
  { type: 'context',      label: 'Contexto',     data: { text: '' }, style: { width: 280, height: 220 } },
  { type: 'formato',      label: 'Formato',      data: { formato: '1:1' } },
  { type: 'generate',     label: 'Gerar',        data: { status: 'idle', model: DEFAULT_IMAGE_MODEL } },
  { type: 'videoGen',     label: 'Vídeo',        data: { status: 'idle', model: DEFAULT_VIDEO_MODEL, duration: videoModelByKey(DEFAULT_VIDEO_MODEL)?.defaultDuration } },
  { type: 'preview',      label: 'Prévia',       data: { imageUrl: null } },
  { type: 'imageInput',   label: 'Imagem (upload)', data: {} },
  { type: 'brandContext', label: 'Voz da marca',    data: { title: 'Voz da marca', desc: 'Tom de voz, personalidade e vocabulário da marca' } },
  { type: 'brandContext', label: 'Visual da marca', data: { title: 'Visual da marca', desc: 'Paleta, tipografia e estética' } },
  { type: 'app',          label: 'Ampliar',         data: { op: 'upscale',   label: 'Ampliar',        status: 'idle' } },
  { type: 'app',          label: 'Remover fundo',   data: { op: 'removebg',  label: 'Remover fundo',  status: 'idle' } },
  { type: 'app',          label: 'Variação',        data: { op: 'variation', label: 'Variação',       status: 'idle' } },
  { type: 'note',         label: 'Nota (sticky)', data: { text: '' }, style: { width: 250, height: 250 } },
]

export {
  nodeTypes, PURPLE, TEAL, GRAY, CORAL, INDIGO, AMBER,
  fmtElapsed, imgUrls, toUrls, sizeFor, PRODUCES_IMAGE, NODE_TEMPLATES, MAX_REF, isVideoUrl,
}
