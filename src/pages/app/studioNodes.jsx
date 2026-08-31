// studioNodes.jsx — componentes de nó do canvas do Studio (React Flow) + constantes/helpers.
// Extraído do StudioCanvas.jsx (que era 1198 linhas) — puramente presentacional, sem mudança de comportamento.
import { memo, useState } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar } from '@xyflow/react'
import {
  Box, Button, Typography, TextField, MenuItem, Select, ListSubheader, Paper,
  Stack, CircularProgress, Tooltip, IconButton, Chip, Menu, Popover, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { IMAGE_MODELS, IMAGE_MODEL_GROUPS, DEFAULT_IMAGE_MODEL, planoDeRefs, comoLeAsRefs, MAX_REFS_CANVAS, REGRA_VIDEO } from '../../lib/studioModels'
import { creditsForImage, creditsForVideo } from '../../lib/credits'
import { VIDEO_MODELS, VIDEO_MODEL_GROUPS, DEFAULT_VIDEO_MODEL, videoModelByKey, durLabel, modeLabel } from '../../lib/videoModels'
import { PALETTE } from '../../lib/theme'

const PURPLE = PALETTE.data.neutro, TEAL = PALETTE.data.positivo, GRAY = PALETTE.neutral[400], CORAL = PALETTE.data.critico, INDIGO = PALETTE.neutral[500], AMBER = PALETTE.data.atencao
const isVideoUrl = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || '')
const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1' },
  { v: '9:16', label: 'Story 9:16' },
  { v: '16:9', label: 'Banner 16:9' },
  { v: '4:5',  label: 'Retrato 4:5' },
]

// ── Shell visual de um nó ────────────────────────────────────────────
// Motivos do regen (telemetria do cérebro: POR QUE a peça falhou) — o chip
// "Não é fiel ao produto" é a telemetria do juiz de fidelidade do piloto Hering.
const REGEN_MOTIVOS = ['Fora da marca', 'Não é fiel ao produto', 'Qualidade baixa', 'Composição ruim']

function NodeShell({ id, color, title, children, acao, inputs = true, output = true, onDelete, onDuplicate, onRun, onRegen, onResize, selected, regenMenu = false }) {
  const [regenAnchor, setRegenAnchor] = useState(null)
  return (
    <Paper elevation={0} sx={{
      width: '100%', height: '100%', minWidth: 160, minHeight: 100, boxSizing: 'border-box', border: '1px solid', borderColor: 'divider',
      borderTop: `3px solid ${color}`,  bgcolor: 'background.paper', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <NodeResizer color={color} isVisible={selected} minWidth={160} minHeight={100} onResizeEnd={() => onResize?.()} />
      {(onDelete || onDuplicate || onRun || onRegen) && (
        <NodeToolbar position={Position.Top} offset={6}>
          <Paper elevation={3} className="nodrag" sx={{ display: 'flex', gap: 0.25, p: 0.25, borderRadius: 1.5 }}>
            {onRun && <Tooltip title="Rodar este + jusante"><IconButton size="small" onClick={() => onRun(id)}><PlayArrowIcon sx={{ fontSize: 16, color: TEAL }} /></IconButton></Tooltip>}
            {onRegen && <Tooltip title="Regerar só este (usa o que já veio antes)"><IconButton size="small" onClick={e => regenMenu ? setRegenAnchor(e.currentTarget) : onRegen(id)}><ReplayIcon sx={{ fontSize: 15, color: TEAL }} /></IconButton></Tooltip>}
            {regenMenu && (
              <Menu anchorEl={regenAnchor} open={!!regenAnchor} onClose={() => setRegenAnchor(null)} className="nodrag">
                <Typography sx={{ px: 1.5, py: 0.5, fontSize: 10.5, fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.4 }}>O que não funcionou?</Typography>
                {REGEN_MOTIVOS.map(m => (
                  <MenuItem key={m} sx={{ fontSize: 12.5 }} onClick={() => { setRegenAnchor(null); onRegen(id, m) }}>{m}</MenuItem>
                ))}
                <MenuItem sx={{ fontSize: 12.5, color: 'text.secondary' }} onClick={() => { setRegenAnchor(null); onRegen(id, null) }}>Só regerar</MenuItem>
              </Menu>
            )}
            {onDuplicate && <Tooltip title="Duplicar"><IconButton size="small" onClick={() => onDuplicate(id)}><ContentCopyIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>}
            {onDelete && <Tooltip title="Excluir"><IconButton size="small" onClick={() => onDelete(id)}><DeleteOutlineIcon sx={{ fontSize: 15, color: CORAL }} /></IconButton></Tooltip>}
          </Paper>
        </NodeToolbar>
      )}
      {inputs && <Handle type="target" position={Position.Left} style={{ background: color, width: 9, height: 9 }} />}
      <Box sx={{ px: 1.5, py: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Linha do título: rótulo à esquerda, ação do nó à direita. A `acao`
            fica aqui — e não no corpo — porque o corpo é onde o cliente
            trabalha; ícone de controle roubando altura do bloco de escrita foi
            exatamente a reclamação (Danilo, 31/ago). */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Typography noWrap sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color, flex: 1, minWidth: 0 }}>
            {title}
          </Typography>
          {acao}
        </Stack>
        <Box sx={{ mt: 0.75, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      </Box>
      {output && <Handle type="source" position={Position.Right} style={{ background: color, width: 9, height: 9 }} />}
    </Paper>
  )
}

// ── Editor grande de texto do nó ─────────────────────────────────────
// O nó tem 250×250: dá para conferir o que está escrito, não para escrever.
// "Fica muito ruim escrever ali naquele bloco" (Danilo, 31/ago) — então o
// campo inline continua para ajuste rápido, e o ícone do topo abre o mesmo
// texto em tela cheia. É a MESMA fonte de dado: o que se digita aqui já está
// no nó, sem salvar nem cancelar.
//
// A tecla de apagar do canvas não morde aqui: o xyflow lê `deleteKeyCode` com
// `actInsideInputWithModifier: false`, ou seja, não age dentro de campo de
// texto. Sem isso, escrever e apagar uma letra apagaria o nó.
function BotaoEditorGrande({ titulo, valor, placeholder, onChange, rodape }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Tooltip title="Abrir maior">
        <IconButton size="small" className="nodrag"
          onClick={e => { e.stopPropagation(); setAberto(true) }}
          sx={{ p: 0.25, color: 'text.disabled' }}>
          <OpenInFullIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Tooltip>
      <Dialog open={aberto} onClose={() => setAberto(false)} maxWidth="md" fullWidth className="nodrag">
        <DialogTitle sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
          {titulo}
        </DialogTitle>
        <DialogContent>
          <TextField autoFocus multiline minRows={16} maxRows={28} fullWidth
            value={valor || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            sx={{ '& textarea': { fontSize: 14, lineHeight: 1.6 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {rodape}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setAberto(false)} variant="contained" sx={{ fontWeight: 700 }}>Concluir</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ── Nós customizados ─────────────────────────────────────────────────
const BrandContextNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={PURPLE} title={data.title} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}>
    <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>{data.desc}</Typography>
  </NodeShell>
))

const PromptNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={GRAY} title="Prompt" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}
    acao={<BotaoEditorGrande titulo="Prompt" valor={data.text} placeholder="O que criar…"
      onChange={v => data.onChange(id, { text: v })}
      rodape={<Button size="small" disabled={data.improving || !(data.text || '').trim()}
        startIcon={data.improving ? <CircularProgress size={12} /> : <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 15 }} />}
        onClick={() => data.onImprove?.(id)} sx={{ fontWeight: 700 }}>
        {data.improving ? 'Melhorando…' : 'Melhorar'}
      </Button>} />}>
    <Stack spacing={0.25} className="nodrag" sx={{ flex: 1, minHeight: 0 }}>
      <TextField
        value={data.text || ''} onChange={e => data.onChange(id, { text: e.target.value })}
        placeholder="O que criar…" multiline fullWidth size="small"
        sx={{ flex: 1, minHeight: 0, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' }, '& textarea': { height: '100% !important', fontSize: 12, overflow: 'auto !important' } }}
      />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        {/* Regra do produto: todo "Melhorar" vem com o aviso de conferir antes de gerar */}
        <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1.2 }}>
          Confira o prompt antes de gerar
        </Typography>
        <Button size="small" disabled={data.improving || !(data.text || '').trim()}
          startIcon={data.improving ? <CircularProgress size={11} /> : <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={() => data.onImprove?.(id)}
          sx={{ fontSize: 10, fontWeight: 700, color: 'primary.main', minWidth: 0, py: 0 }}>
          {data.improving ? 'Melhorando…' : 'Melhorar'}
        </Button>
      </Stack>
    </Stack>
  </NodeShell>
))

// Contexto — texto longo livre que complementa o prompt (tema, briefing, referências
// conceituais). Conectado a um Gerar/Vídeo, entra como [CONTEXTO ADICIONAL] no prompt.
const ContextNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={AMBER} title="Contexto" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onResize={data.onResize} selected={selected}
    acao={<BotaoEditorGrande titulo="Contexto" valor={data.text}
      placeholder="Contexto extra para compor o prompt: tema, briefing, público, restrições, referências conceituais…"
      onChange={v => data.onChange(id, { text: v })} />}>
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
    <Stack spacing={0.5} className="nodrag">
      <Select
        value={data.formato || '1:1'} onChange={e => data.onChange(id, { formato: e.target.value })}
        fullWidth size="small" sx={{ fontSize: 12 }}
      >
        {FORMATOS.map(f => <MenuItem key={f.v} value={f.v} sx={{ fontSize: 12 }}>{f.label}</MenuItem>)}
        <MenuItem value="custom" sx={{ fontSize: 12 }}>Personalizado (px)</MenuItem>
      </Select>
      {data.formato === 'custom' && (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TextField size="small" type="number" value={data.width ?? 1080}
            onChange={e => data.onChange(id, { width: parseInt(e.target.value, 10) || 0 })}
            inputProps={{ min: 256, max: 4096, style: { fontSize: 11, padding: '5px 8px' } }} />
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>×</Typography>
          <TextField size="small" type="number" value={data.height ?? 1350}
            onChange={e => data.onChange(id, { height: parseInt(e.target.value, 10) || 0 })}
            inputProps={{ min: 256, max: 4096, style: { fontSize: 11, padding: '5px 8px' } }} />
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>px</Typography>
        </Stack>
      )}
    </Stack>
  </NodeShell>
))

// Geração de IMAGEM. Mostra o resultado NO PRÓPRIO NÓ, como o de Vídeo — pedido
// do Danilo (19/08) durante o piloto Hering: com 6 saídas no canvas, abrir a
// prévia de cada uma para conferir era o gargalo da revisão.
// ── Entradas de um nó de geração — o que entra, em que ordem ─────────
// Nasceu do "o sapato não pegou" (reunião Hering, 31/ago/2026). O nó mostrava
// modelo, custo e saída — nada do que ENTRAVA. E a ordem das referências, que
// muda o resultado (e em alguns modelos É o resultado), era a ordem em que as
// conexões foram feitas: histórico de edição, invisível na tela.
//
// Aqui a ordem vira dado editável (`data.refOrder`, persistido no workflow) e o
// que some passa a ser dito: por teto nosso ou por limite do modelo.
const ROTULO_ENTRADA = {
  prompt: 'Prompt', context: 'Contexto', formato: 'Formato',
  brandContext: 'Marca', imageInput: 'Imagem', generate: 'Imagem gerada',
  app: 'Edição', preview: 'Prévia', artGate: 'Diretor de Arte',
}

function LinhaDeRef({ n, papel, entram, primeira, ultima, onSobe, onDesce, onSolta }) {
  // Uma linha é um NÓ, mas ele pode carregar VÁRIAS imagens — então a posição é
  // uma faixa ("4–5"), e o corte pode partir a linha ao meio.
  const ignorada = entram === 0
  const parcial  = entram > 0 && entram < n.urls
  const faixa = n.urls > 1 ? `${n.de + 1}–${n.de + n.urls}` : `${n.de + 1}`
  const cor = ignorada ? 'text.disabled' : parcial ? CORAL : TEAL
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}
      sx={{ py: 0.4, opacity: ignorada ? 0.45 : 1 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, minWidth: 26, textAlign: 'right', color: cor }}>
        {faixa}
      </Typography>
      <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: 0.75, overflow: 'hidden', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {n.url
          ? <Box component="img" src={n.url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Typography sx={{ fontSize: 8, color: 'text.disabled' }}>—</Typography>}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 11, fontWeight: 600, textDecoration: ignorada ? 'line-through' : 'none' }}>
          {n.label}{n.urls > 1 ? ` · ${n.urls} imagens` : ''}
        </Typography>
        <Typography noWrap sx={{ fontSize: 9.5, color: (ignorada || parcial) ? CORAL : 'text.disabled' }}>
          {ignorada ? 'ignorada nesta geração'
            : parcial ? `só ${entram} de ${n.urls} entram`
            : (papel || 'referência')}
        </Typography>
      </Box>
      <Tooltip title="Subir"><Typography component="span"><IconButton size="small" disabled={primeira} onClick={onSobe} sx={{ p: 0.25 }}>
        <ArrowUpwardIcon sx={{ fontSize: 13 }} /></IconButton></Typography></Tooltip>
      <Tooltip title="Descer"><Typography component="span"><IconButton size="small" disabled={ultima} onClick={onDesce} sx={{ p: 0.25 }}>
        <ArrowDownwardIcon sx={{ fontSize: 13 }} /></IconButton></Typography></Tooltip>
      <Tooltip title="Desconectar"><IconButton size="small" onClick={onSolta} sx={{ p: 0.25 }}>
        <LinkOffOutlinedIcon sx={{ fontSize: 13, color: CORAL }} /></IconButton></Tooltip>
    </Stack>
  )
}

const EntradasDoNo = memo(({ id, data, modelo, regra = null }) => {
  const [anchor, setAnchor] = useState(null)
  const refs   = data.entradas?.refs   || []
  const outros = data.entradas?.outros || []
  // O teto morde URLs, não nós — ver o comentário em StudioCanvas.
  const totalUrls = data.entradas?.totalUrls ?? refs.length
  const plano  = planoDeRefs(modelo, totalUrls, MAX_REFS_CANVAS, regra)

  const mover = (de, para) => {
    if (para < 0 || para >= refs.length) return
    const ordem = refs.map(r => r.id)
    const [x] = ordem.splice(de, 1); ordem.splice(para, 0, x)
    data.onReordenarRefs?.(id, ordem)
  }

  const alerta = plano.ignoradas > 0 || plano.faltam > 0
  const resumo = [
    totalUrls ? `${totalUrls} imagem${totalUrls > 1 ? 'ns' : ''}` : 'sem referência',
    outros.some(o => o.tipo === 'brandContext') ? 'marca ✓' : null,
    outros.some(o => o.tipo === 'context') ? 'contexto ✓' : null,
  ].filter(Boolean).join(' · ')
  const aviso = plano.faltam > 0
    ? `faltam ${plano.faltam} referências`
    : `${plano.ignoradas} imagem${plano.ignoradas > 1 ? 'ns' : ''} não ${plano.ignoradas > 1 ? 'chegam' : 'chega'} ao modelo`

  // Só o ícone, no topo à direita (Danilo, 31/ago). O estado inteiro cabe na
  // COR — vermelho quando algo está sendo cortado — e o detalhe no tooltip;
  // o corpo do nó fica livre para a imagem.
  return (
    <>
      <Tooltip title={alerta ? `Entradas — ${aviso}` : `Entradas — ${resumo}`}>
        <IconButton size="small" className="nodrag"
          onClick={e => { e.stopPropagation(); setAnchor(e.currentTarget) }}
          sx={{ p: 0.25, color: alerta ? CORAL : 'text.disabled' }}>
          {alerta ? <WarningAmberOutlinedIcon sx={{ fontSize: 15 }} /> : <TuneOutlinedIcon sx={{ fontSize: 15 }} />}
        </IconButton>
      </Tooltip>

      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 330, p: 1.25, borderRadius: 2 } } }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.disabled' }}>
          Entradas deste nó
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.5, lineHeight: 1.4 }}>
          {comoLeAsRefs(modelo, regra)}
        </Typography>

        {refs.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {refs.map((n, i) => (
              <LinhaDeRef key={n.id} n={n}
                papel={plano.papeis?.[n.de]}
                entram={Math.max(0, Math.min(plano.usadas - n.de, n.urls))}
                primeira={i === 0} ultima={i === refs.length - 1}
                onSobe={() => mover(i, i - 1)} onDesce={() => mover(i, i + 1)}
                onSolta={() => data.onDesconectar?.(id, n.id)} />
            ))}
          </Box>
        )}

        {plano.ignoradas > 0 && (
          <Typography sx={{ fontSize: 10, color: CORAL, mt: 0.75, lineHeight: 1.4 }}>
            {plano.porQue === 'modelo'
              ? `Este modelo lê ${plano.limite === 1 ? 'uma referência só' : `${plano.limite} referências`}. Reordene para deixar em cima a que importa, ou troque de modelo.`
              : `O canvas envia no máximo ${MAX_REFS_CANVAS} referências. Desconecte o que não for essencial ou reordene.`}
          </Typography>
        )}
        {plano.faltam > 0 && (
          <Typography sx={{ fontSize: 10, color: CORAL, mt: 0.75, lineHeight: 1.4 }}>
            Este modelo exige {plano.exatas} referências na ordem acima — conecte mais {plano.faltam}.
          </Typography>
        )}

        {outros.length > 0 && <Divider sx={{ my: 1 }} />}
        {outros.map(o => (
          <Stack key={o.id} direction="row" alignItems="center" spacing={0.75} sx={{ py: 0.3 }}>
            <Chip label={ROTULO_ENTRADA[o.tipo] || o.tipo} size="small"
              sx={{ height: 17, fontSize: 9, fontWeight: 700 }} />
            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', flex: 1, minWidth: 0 }}>{o.label}</Typography>
            <Tooltip title="Desconectar"><IconButton size="small" onClick={() => data.onDesconectar?.(id, o.id)} sx={{ p: 0.25 }}>
              <LinkOffOutlinedIcon sx={{ fontSize: 13, color: CORAL }} /></IconButton></Tooltip>
          </Stack>
        ))}

        {!refs.length && !outros.length && (
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 1 }}>
            Nada conectado ainda. Ligue um Prompt, referências de imagem e o contexto da marca.
          </Typography>
        )}
      </Popover>
    </>
  )
})

const GenerateNode = memo(({ id, data, selected }) => {
  const modelo = (data.model && data.model !== 'auto' && data.model !== 'custom') ? data.model : DEFAULT_IMAGE_MODEL
  return (
    <NodeShell id={id} color={TEAL} title="Imagem" acao={<EntradasDoNo id={id} data={data} modelo={modelo} />} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRun={data.onRun} onRegen={data.onRegen} onResize={data.onResize} regenMenu={data.regenMenu} selected={selected}>
      <Stack spacing={0.5} className="nodrag" sx={{ flex: 1, minHeight: 0 }}>
        <Select value={modelo} onChange={e => data.onChange(id, { model: e.target.value })} size="small" fullWidth sx={{ fontSize: 11, flexShrink: 0 }}>
          {IMAGE_MODEL_GROUPS.flatMap(g => [
            <ListSubheader key={g} sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 2.2, bgcolor: 'background.paper' }}>{g}</ListSubheader>,
            ...IMAGE_MODELS.filter(m => m.group === g).map(m => <MenuItem key={m.id} value={m.id} sx={{ fontSize: 11 }}>{m.label}</MenuItem>),
          ])}
        </Select>
        {/* visão de custo: o cliente sabe quanto CADA geração consome */}
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', flexShrink: 0 }}>
          {(() => { const c = creditsForImage(modelo); return `${c} crédito${c > 1 ? 's' : ''} por geração` })()}
        </Typography>

        {data.outputUrl ? (
          <>
            <Box onClick={() => data.onOpen?.(data.outputUrl)}
              sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}>
              <Box component="img" src={data.outputUrl} alt=""
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 1, display: 'block' }} />
            </Box>
            <Stack direction="row" spacing={0} alignItems="center" sx={{ mt: 0.25, flexShrink: 0 }}>
              <Tooltip title="Aprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'up')}>
                {data.feedback === 'up' ? <ThumbUpIcon sx={{ fontSize: 14, color: TEAL }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />}
              </IconButton></Tooltip>
              <Tooltip title="Reprovar"><IconButton size="small" onClick={() => data.onVote?.(id, data.genId, 'down')}>
                {data.feedback === 'down' ? <ThumbDownIcon sx={{ fontSize: 14, color: CORAL }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />}
              </IconButton></Tooltip>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Baixar"><IconButton size="small" onClick={() => data.onDownload?.(data.outputUrl)}>
                <DownloadOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton></Tooltip>
              <Tooltip title={data.saved ? 'Salvo nos assets' : 'Salvar nos assets'}>
                <Typography component="span"><IconButton size="small" disabled={data.saved}
                  onClick={() => data.onSave?.(id, { imageUrl: data.outputUrl, genId: data.genId, formato: data.formato, saved: data.saved })}>
                  <BookmarkAddOutlinedIcon sx={{ fontSize: 15, color: data.saved ? TEAL : 'inherit' }} />
                </IconButton></Typography>
              </Tooltip>
            </Stack>
          </>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 1 }}>
            {data.status === 'running'
              ? <Stack alignItems="center" spacing={0.5}><CircularProgress size={18} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: TEAL, fontWeight: 700 }}>gerando… {fmtElapsed(data.elapsed || 0)}</Typography></Stack>
              : data.status === 'error'
                ? <Typography sx={{ fontSize: 10, color: CORAL }}>{data.error || 'erro'}</Typography>
                : <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>conecte um prompt e rode</Typography>}
          </Box>
        )}
      </Stack>
    </NodeShell>
  )
})

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
            <Typography component="span">
              <IconButton size="small" disabled={data.saved} onClick={() => data.onSave?.(id, data)}>
                <BookmarkAddOutlinedIcon sx={{ fontSize: 15, color: data.saved ? TEAL : 'inherit' }} />
              </IconButton>
            </Typography>
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

const APP_DESC = { upscale: 'Aumenta resolução (impressão)', removebg: 'Remove o fundo', variation: 'Gera variação da imagem', crop: 'Recorta/redimensiona em px exato — sem IA, 0 crédito' }

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
              <Typography component="span"><IconButton size="small" disabled={data.saved} onClick={() => data.onSave?.(id, { imageUrl: data.outputUrl, genId: data.genId, formato: data.op })}>
                <BookmarkAddOutlinedIcon sx={{ fontSize: 15, color: data.saved ? TEAL : 'inherit' }} />
              </IconButton></Typography>
            </Tooltip>
          </Stack>
        </>
      ) : (
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{APP_DESC[data.op] || ''}</Typography>
      )}
      {/* Recortar: alvo em px + ponto focal — determinístico, 0 crédito */}
      {data.op === 'crop' && (
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TextField size="small" type="number" value={data.width ?? 1080}
              onChange={e => data.onChange(id, { width: parseInt(e.target.value, 10) || 0 })}
              inputProps={{ min: 64, max: 4096, style: { fontSize: 11, padding: '5px 8px' } }} />
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>×</Typography>
            <TextField size="small" type="number" value={data.height ?? 1080}
              onChange={e => data.onChange(id, { height: parseInt(e.target.value, 10) || 0 })}
              inputProps={{ min: 64, max: 4096, style: { fontSize: 11, padding: '5px 8px' } }} />
          </Stack>
          <Select size="small" value={data.focal || 'attention'} onChange={e => data.onChange(id, { focal: e.target.value })} sx={{ fontSize: 11 }}>
            <MenuItem value="attention" sx={{ fontSize: 11 }}>Foco automático</MenuItem>
            <MenuItem value="centre" sx={{ fontSize: 11 }}>Centro</MenuItem>
            <MenuItem value="top" sx={{ fontSize: 11 }}>Topo</MenuItem>
            <MenuItem value="bottom" sx={{ fontSize: 11 }}>Base</MenuItem>
            <MenuItem value="left" sx={{ fontSize: 11 }}>Esquerda</MenuItem>
            <MenuItem value="right" sx={{ fontSize: 11 }}>Direita</MenuItem>
          </Select>
        </Stack>
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
    <NodeResizer color={PALETTE.data.atencao} isVisible={selected} minWidth={150} minHeight={80} onResizeEnd={() => data.onResize?.()} />
    <NodeToolbar position={Position.Top} offset={6}>
      <Paper elevation={3} className="nodrag" sx={{ p: 0.25, borderRadius: 1.5 }}>
        <Tooltip title="Excluir"><IconButton size="small" onClick={() => data.onDelete(id)}><DeleteOutlineIcon sx={{ fontSize: 15, color: CORAL }} /></IconButton></Tooltip>
      </Paper>
    </NodeToolbar>
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', bgcolor: PALETTE.data.atencaoFraco, border: '1px solid ${PALETTE.neutral[50]}',  p: 1 }}>
      <TextField value={data.text || ''} onChange={e => data.onChange(id, { text: e.target.value })}
        placeholder="Anotação…" multiline variant="standard" fullWidth className="nodrag" InputProps={{ disableUnderline: true }}
        sx={{ height: '100%', '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', p: 0 }, '& textarea': { fontSize: 12, color: PALETTE.neutral[500], lineHeight: 1.4 } }} />
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
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', border: `1.5px dashed ${PURPLE}`,  bgcolor: 'rgba(127,119,221,0.06)' }}>
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
    <NodeShell id={id} color={INDIGO} title="Vídeo"
      acao={<EntradasDoNo id={id} data={data} regra={REGRA_VIDEO} />} onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRun={data.onRun} onRegen={data.onRegen} onResize={data.onResize} regenMenu={data.regenMenu} selected={selected}>
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
                <Typography component="span"><IconButton size="small" disabled={data.saved} onClick={() => data.onSave?.(id, { imageUrl: data.outputUrl, genId: data.genId, mediaType: 'video', formato: data.formato, saved: data.saved })}>
                  <BookmarkAddOutlinedIcon sx={{ fontSize: 15, color: data.saved ? TEAL : 'inherit' }} />
                </IconButton></Typography>
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
                  sx={{ alignSelf: 'flex-end', fontSize: 10, fontWeight: 700, bgcolor: AMBER, color: '#000', py: 0.25, '&:hover': { bgcolor: PALETTE.data.atencaoDim } }}>
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

// Portão do Diretor de Arte (F2): recebe a peça do fluxo, julga contra o
// cérebro e SÓ deixa passar o que sustenta a marca. Reprovada = fluxo para ali,
// com o parecer e os ajustes na cara do nó.
const GATE_COR = { aprovada: TEAL, aprovada_com_ressalvas: AMBER, reprovada: CORAL }
const GATE_LABEL = { aprovada: 'Aprovada', aprovada_com_ressalvas: 'Com ressalvas', reprovada: 'Reprovada' }
const ArtGateNode = memo(({ id, data, selected }) => (
  <NodeShell id={id} color={PURPLE} title="Diretor de Arte" onDelete={data.onDelete} onDuplicate={data.onDuplicate} onRegen={data.onRegen} onResize={data.onResize} selected={selected}>
    <Stack spacing={0.5} className="nodrag" sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {data.status === 'julgando' ? (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <CircularProgress size={12} sx={{ color: PURPLE }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Julgando a peça…</Typography>
        </Stack>
      ) : data.veredito ? (
        <>
          <Box sx={{ alignSelf: 'flex-start', px: 0.75, py: 0.1, borderRadius: 1, fontSize: 10, fontWeight: 800, color: '#fff', bgcolor: GATE_COR[data.veredito] || GRAY }}>
            {GATE_LABEL[data.veredito] || data.veredito}
          </Box>
          {data.resumo && <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.35 }}>{data.resumo}</Typography>}
          {(data.ajustes || []).slice(0, 3).map((a, i) => (
            <Typography key={i} sx={{ fontSize: 10, color: 'text.disabled', lineHeight: 1.3 }}>• {a}</Typography>
          ))}
          {data.veredito === 'reprovada' && <Typography sx={{ fontSize: 9.5, color: CORAL, fontWeight: 700 }}>fluxo interrompido aqui</Typography>}
        </>
      ) : data.error ? (
        <Typography sx={{ fontSize: 10.5, color: CORAL }}>{data.error}</Typography>
      ) : (
        <Typography sx={{ fontSize: 11, color: 'text.disabled', lineHeight: 1.4 }}>
          Conecte uma peça gerada — só passa adiante o que sustenta a marca.
        </Typography>
      )}
    </Stack>
  </NodeShell>
))

const nodeTypes = { artGate: ArtGateNode, brandContext: BrandContextNode, prompt: PromptNode, context: ContextNode, formato: FormatoNode, generate: GenerateNode, preview: PreviewNode, app: AppNode, imageInput: ImageInputNode, videoGen: VideoGenNode, note: NoteNode, group: GroupNode }

// Nós que produzem imagem (podem alimentar apps/generates a jusante)
const PRODUCES_IMAGE = new Set(['generate', 'app', 'imageInput', 'preview', 'artGate'])
// O teto do canvas mora em studioModels.js, junto de `planoDeRefs` — que é
// quem AVISA sobre o corte. Duas constantes de 5 em arquivos diferentes
// significavam: subir uma e esquecer a outra faz o nó prometer um número e
// o canvas cortar noutro. O aviso passaria a mentir.
const MAX_REF = MAX_REFS_CANVAS
const DEFAULT_NODE = 250   // tamanho padrão uniforme dos nós (px)
// Formato e Gerar têm pouco conteúdo → altura fixa compacta p/ não ficar feio
// generate cresceu: agora mostra a imagem gerada dentro do nó.
const NODE_SIZE = { formato: { width: 250, height: 150 }, generate: { width: 250, height: 330 } }
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
  { type: 'generate',     label: 'Imagem',       data: { status: 'idle', model: DEFAULT_IMAGE_MODEL } },
  { type: 'videoGen',     label: 'Vídeo',        data: { status: 'idle', model: DEFAULT_VIDEO_MODEL, duration: videoModelByKey(DEFAULT_VIDEO_MODEL)?.defaultDuration } },
  { type: 'preview',      label: 'Prévia',       data: { imageUrl: null } },
  { type: 'imageInput',   label: 'Imagem (upload)', data: {} },
  { type: 'brandContext', label: 'Voz da marca',    data: { title: 'Voz da marca', desc: 'Tom de voz, personalidade e vocabulário da marca' } },
  { type: 'brandContext', label: 'Visual da marca', data: { title: 'Visual da marca', desc: 'Paleta, tipografia e estética' } },
  { type: 'artGate',      label: 'Diretor de Arte', data: { status: 'idle' } },
  { type: 'app',          label: 'Ampliar',         data: { op: 'upscale',   label: 'Ampliar',        status: 'idle' } },
  { type: 'app',          label: 'Remover fundo',   data: { op: 'removebg',  label: 'Remover fundo',  status: 'idle' } },
  { type: 'app',          label: 'Variação',        data: { op: 'variation', label: 'Variação',       status: 'idle' } },
  { type: 'app',          label: 'Recortar',        data: { op: 'crop',      label: 'Recortar',       status: 'idle', width: 1080, height: 1080, focal: 'attention' } },
  { type: 'note',         label: 'Nota (sticky)', data: { text: '' }, style: { width: 250, height: 250 } },
]

export {
  nodeTypes, PURPLE, TEAL, GRAY, CORAL, INDIGO, AMBER,
  fmtElapsed, imgUrls, toUrls, sizeFor, PRODUCES_IMAGE, NODE_TEMPLATES, MAX_REF, isVideoUrl,
}
