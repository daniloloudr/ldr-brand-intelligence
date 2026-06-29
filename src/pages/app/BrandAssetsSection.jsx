import { useState, useRef } from 'react'
import {
  Box, Typography, Chip, IconButton, Tooltip, Button,
  TextField, MenuItem, LinearProgress, Alert,
} from '@mui/material'
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon    from '@mui/icons-material/ContentCopy'
import CheckIcon          from '@mui/icons-material/Check'
import UploadFileIcon     from '@mui/icons-material/UploadFile'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import OpenInNewIcon      from '@mui/icons-material/OpenInNew'
import { supabase }       from '../../lib/supabase'

const STORAGE_BUCKET = 'brand-assets'

const TIPO_OPCOES = [
  { value: 'logo',         label: 'Logo' },
  { value: 'foto',         label: 'Foto de referência' },
  { value: 'ilustracao',   label: 'Ilustração' },
  { value: 'icone',        label: 'Ícone' },
  { value: 'padrao',       label: 'Padrão / textura' },
  { value: 'mockup',       label: 'Mockup / aplicação' },
  { value: 'tipografia',   label: 'Tipografia (arquivo)' },
  { value: 'documento',    label: 'Documento' },
  { value: 'outro',        label: 'Outro' },
]

/* ─── helpers ──────────────────────────────────────────────────────── */

function isHex(v) { return /^#[0-9A-Fa-f]{6}$/i.test(v?.trim()) }
function isDark(hex) {
  if (!isHex(hex)) return false
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

/* ─── Logo / SVG upload ─────────────────────────────────────────────── */

function LogoPanel({ asset, brandId, onSave, onDelete }) {
  const [dark, setDark]       = useState(false)
  const [copied, setCopied]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function handleSVG(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.svg') && f.type !== 'image/svg+xml') return
    setUploading(true)
    const svgText = await f.text()
    await onSave({ tipo: 'logo', nome: f.name.replace('.svg',''), descricao: 'Logo principal', valor: svgText })
    setUploading(false)
  }

  function copyValue() {
    if (!asset?.valor) return
    navigator.clipboard.writeText(asset.valor).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Box sx={{ mb: 6 }}>
      <SectionLabel label="Brand Mark" color="#7F77DD" count={asset ? 1 : 0} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        {/* Preview fundo claro */}
        <PreviewFrame bg={dark ? '#111827' : '#FFFFFF'} label={dark ? 'Dark' : 'Light'}
          onToggle={() => setDark(d => !d)} asset={asset} />
        {/* Preview fundo cinza */}
        <PreviewFrame bg={dark ? '#1F2937' : '#F3F4F6'} label={dark ? 'Dark Gray' : 'Light Gray'}
          onToggle={() => setDark(d => !d)} asset={asset} />
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Button
          size="small" variant="outlined" color="inherit"
          startIcon={<UploadFileIcon />}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          sx={{ fontWeight: 700, fontSize: 11, borderColor: 'divider', color: 'text.secondary' }}
        >
          {uploading ? 'Enviando...' : asset ? 'Substituir SVG' : 'Upload SVG'}
        </Button>
        {asset && (
          <>
            <Tooltip title={copied ? 'Copiado!' : 'Copiar SVG'}>
              <IconButton size="small" onClick={copyValue}
                sx={{ color: copied ? '#0D9E7A' : 'text.disabled' }}>
                {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Remover logo">
              <IconButton size="small" onClick={() => onDelete(asset.id)}
                sx={{ color: 'text.disabled', '&:hover': { color: '#E8185A' } }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
      <input ref={fileRef} type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }}
        onChange={handleSVG} />
    </Box>
  )
}

function PreviewFrame({ bg, label, asset, onToggle }) {
  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
    }}>
      <Box sx={{
        bgcolor: bg, minHeight: 140,
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4,
        cursor: 'pointer', transition: 'background 0.2s',
      }} onClick={onToggle}>
        {asset?.valor ? (
          <Box
            component="div"
            sx={{ maxWidth: 200, maxHeight: 100, '& svg': { width: '100%', height: 'auto' } }}
            dangerouslySetInnerHTML={{ __html: asset.valor }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', opacity: 0.3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700,
              color: bg === '#FFFFFF' || bg === '#F3F4F6' ? '#111' : '#fff' }}>
              Sem logo
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.disabled" fontWeight={700}
          textTransform="uppercase" letterSpacing="0.08em">{label}</Typography>
        <Typography variant="caption" color="text.disabled" fontSize="0.58rem">
          Clique para alternar
        </Typography>
      </Box>
    </Box>
  )
}

/* ─── Color palette ─────────────────────────────────────────────────── */

function ColorPalette({ items, onDelete }) {
  const [copiedId, setCopiedId] = useState(null)

  function copy(id, val) {
    navigator.clipboard.writeText(val).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (!items.length) return null
  return (
    <Box sx={{ mb: 6 }}>
      <SectionLabel label="Cores" color="#0D9E7A" count={items.length} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, mt: 2,
        border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        {items.map((asset, i) => {
          const hex   = isHex(asset.valor) ? asset.valor.trim() : null
          const dark2 = hex ? isDark(hex) : false
          return (
            <Box key={asset.id}
              sx={{
                flex: '0 0 auto', width: { xs: '50%', sm: '33.33%', md: '20%' },
                borderRight: i % 5 !== 4 ? '1px solid' : 'none',
                borderBottom: '1px solid', borderColor: 'divider',
                '&:nth-last-of-type(-n+5)': { borderBottom: 'none' },
                '&:hover .swatch-actions': { opacity: 1 },
                position: 'relative',
              }}>
              {/* Swatch */}
              <Box sx={{ height: 100, bgcolor: hex || 'divider', position: 'relative' }}>
                <Box className="swatch-actions" sx={{
                  position: 'absolute', top: 6, right: 6,
                  display: 'flex', gap: 0.5, opacity: 0, transition: 'opacity 0.15s',
                }}>
                  <Tooltip title={copiedId === asset.id ? 'Copiado!' : 'Copiar hex'}>
                    <IconButton size="small" onClick={() => copy(asset.id, hex || asset.valor)}
                      sx={{ bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', width: 24, height: 24,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}>
                      {copiedId === asset.id
                        ? <CheckIcon sx={{ fontSize: 13 }} />
                        : <ContentCopyIcon sx={{ fontSize: 13 }} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover">
                    <IconButton size="small" onClick={() => onDelete(asset.id)}
                      sx={{ bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', width: 24, height: 24,
                        '&:hover': { bgcolor: 'rgba(200,0,0,0.6)' } }}>
                      <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              {/* Info */}
              <Box sx={{ p: '10px 12px' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.3 }}>
                  {asset.nome}
                </Typography>
                {hex && (
                  <Typography sx={{ fontSize: 11, fontFamily: 'monospace',
                    color: '#0D9E7A', fontWeight: 700, mt: 0.25 }}>
                    {hex.toUpperCase()}
                  </Typography>
                )}
                {asset.descricao && (
                  <Typography variant="caption" color="text.disabled"
                    sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                    {asset.descricao}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

/* ─── Typography ────────────────────────────────────────────────────── */

const TYPE_SCALE = [
  { label: 'Display',   size: 48, weight: 900 },
  { label: 'H1',        size: 32, weight: 800 },
  { label: 'H2',        size: 24, weight: 700 },
  { label: 'Body',      size: 16, weight: 400 },
  { label: 'Caption',   size: 12, weight: 400 },
]

function TypographyCard({ asset, onDelete }) {
  const fontFamily = asset.valor || asset.nome
  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
      '&:hover .del': { opacity: 1 },
    }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Chip label="Tipografia" size="small"
            sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, mb: 1,
              bgcolor: 'rgba(239,159,39,0.12)', color: '#EF9F27' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 900 }}>{asset.nome}</Typography>
          {asset.valor && (
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'text.disabled', mt: 0.25 }}>
              {asset.valor}
            </Typography>
          )}
        </Box>
        <IconButton className="del" size="small" onClick={() => onDelete(asset.id)}
          sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
            '&:hover': { color: '#E8185A' } }}>
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      {/* Scale preview */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TYPE_SCALE.map(({ label, size, weight }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled',
              textTransform: 'uppercase', letterSpacing: '0.1em', width: 52, flexShrink: 0 }}>
              {label}
            </Typography>
            <Typography sx={{
              fontFamily: `"${fontFamily}", sans-serif`,
              fontSize: size, fontWeight: weight,
              lineHeight: 1.1, color: 'text.primary',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              Aa Bb Cc
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', flexShrink: 0 }}>
              {size}px
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/* ─── Other assets ──────────────────────────────────────────────────── */

const TIPO_COR = { icone: '#4A9ECC', padrao: '#E8185A', outro: '#8A9AB0' }

function OtherCard({ asset, onDelete }) {
  const cor = TIPO_COR[asset.tipo] || TIPO_COR.outro
  const isImg = asset.mime_type?.startsWith('image/')
  const isPdf = asset.mime_type === 'application/pdf'
  const isUrl = asset.valor && /^https?:\/\//.test(asset.valor)
  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2,
      borderTop: `3px solid ${cor}`, overflow: 'hidden',
      '&:hover .del': { opacity: 1 },
      display: 'flex', flexDirection: 'column',
    }}>
      {isImg && isUrl && (
        <Box sx={{ aspectRatio: '4 / 3', bgcolor: 'background.default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Box component="img" src={asset.valor} alt={asset.nome}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </Box>
      )}
      {isPdf && isUrl && (
        <Box sx={{ aspectRatio: '4 / 3', bgcolor: 'background.default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontSize: 32, fontWeight: 900, color: 'text.disabled' }}>PDF</Typography>
          <Button size="small" href={asset.valor} target="_blank" startIcon={<OpenInNewIcon fontSize="small" />}
            sx={{ textTransform: 'none', fontSize: 11 }}>
            Abrir
          </Button>
        </Box>
      )}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip label={TIPO_OPCOES.find(t => t.value === asset.tipo)?.label || asset.tipo} size="small"
            sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800,
              bgcolor: cor + '18', color: cor }} />
          <IconButton className="del" size="small" onClick={() => onDelete(asset.id)}
            sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
              '&:hover': { color: '#E8185A' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.nome}
        </Typography>
        {asset.descricao && (
          <Typography variant="caption" color="text.disabled">{asset.descricao}</Typography>
        )}
      </Box>
    </Box>
  )
}

/* ─── Upload de arquivos ────────────────────────────────────────────── */

function UploadPanel({ brandId, onUploaded }) {
  const [files, setFiles]       = useState([]) // [{ file, tipo, nome, descricao, progress, status, error }]
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  function addFiles(list) {
    const arr = Array.from(list).map(f => ({
      file: f,
      tipo: f.type === 'image/svg+xml' ? 'logo' : (f.type?.startsWith('image/') ? 'foto' : 'documento'),
      nome: f.name.replace(/\.[^.]+$/, ''),
      descricao: '',
      progress: 0,
      status: 'pending', // pending | uploading | done | error
      error: null,
    }))
    setFiles(prev => [...prev, ...arr])
  }

  function onPick(e) {
    if (e.target.files?.length) addFiles(e.target.files)
    e.target.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  function updateAt(idx, patch) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  function removeAt(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function uploadAll() {
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.status !== 'pending') continue
      updateAt(i, { status: 'uploading', progress: 10, error: null })
      try {
        const ext = f.file.name.split('.').pop()
        const path = `${brandId}/${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, f.file, { contentType: f.file.type, upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

        // Se for SVG, armazenamos também o conteúdo de texto pra preview inline
        let valor = publicUrl
        if (f.file.type === 'image/svg+xml') {
          try { valor = await f.file.text() } catch { valor = publicUrl }
        }

        await onUploaded({
          tipo:       f.tipo,
          nome:       f.nome || f.file.name,
          descricao:  f.descricao || '',
          valor,
          file_path:  path,
          mime_type:  f.file.type,
          size_bytes: f.file.size,
        })
        updateAt(i, { status: 'done', progress: 100 })
      } catch (e) {
        updateAt(i, { status: 'error', error: e.message || 'Falha no upload' })
      }
    }
    // limpa concluídos depois de 1.5s
    setTimeout(() => {
      setFiles(prev => prev.filter(f => f.status !== 'done'))
    }, 1500)
  }

  const pending = files.filter(f => f.status === 'pending').length

  return (
    <Box sx={{ mb: 5 }}>
      <SectionLabel label="Upload de arquivos" color="#0D9E7A" count={files.length} />

      <Box
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        sx={{
          mt: 2, p: 4, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
          border: '2px dashed', borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'rgba(13,158,122,0.06)' : 'transparent',
          transition: 'all 0.15s',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(13,158,122,0.04)' },
        }}>
        <CloudUploadOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
          Arraste arquivos aqui ou clique para selecionar
        </Typography>
        <Typography variant="caption" color="text.disabled">
          SVG, PNG, JPG, WEBP, PDF — até 20MB cada
        </Typography>
        <input ref={fileRef} type="file" multiple
          accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,application/pdf"
          style={{ display: 'none' }} onChange={onPick} />
      </Box>

      {files.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {files.map((f, idx) => (
            <Box key={idx} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 180px 1fr 30px' }, gap: 1.5, alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.file.name}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {(f.file.size / 1024).toFixed(1)} KB · {f.file.type || '—'}
                  </Typography>
                </Box>
                <TextField select size="small" label="Tipo"
                  value={f.tipo} onChange={e => updateAt(idx, { tipo: e.target.value })}
                  disabled={f.status === 'uploading' || f.status === 'done'}>
                  {TIPO_OPCOES.map(t => <MenuItem key={t.value} value={t.value} sx={{ fontSize: 13 }}>{t.label}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Nome"
                  value={f.nome} onChange={e => updateAt(idx, { nome: e.target.value })}
                  disabled={f.status === 'uploading' || f.status === 'done'} />
                <IconButton size="small" onClick={() => removeAt(idx)}
                  disabled={f.status === 'uploading'}
                  sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              {(f.status === 'uploading' || f.status === 'done') && (
                <LinearProgress variant="determinate" value={f.progress}
                  sx={{ mt: 1.5, height: 4, borderRadius: 2 }}
                  color={f.status === 'done' ? 'success' : 'primary'} />
              )}
              {f.status === 'error' && (
                <Alert severity="error" sx={{ mt: 1.5, fontSize: 12 }}>{f.error}</Alert>
              )}
            </Box>
          ))}
          {pending > 0 && (
            <Button onClick={uploadAll} variant="contained" sx={{ alignSelf: 'flex-end', fontWeight: 800 }}
              startIcon={<UploadFileIcon />}>
              Enviar {pending} arquivo{pending !== 1 ? 's' : ''}
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}

/* ─── Section label ─────────────────────────────────────────────────── */

function SectionLabel({ label, color, count }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5,
      borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ width: 3, height: 18, bgcolor: color, borderRadius: 4 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '0.12em', color }}>
        {label}
      </Typography>
      {count > 0 && (
        <Chip label={count} size="small"
          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
            bgcolor: color + '18', color, ml: 0.5 }} />
      )}
    </Box>
  )
}

/* ─── Main export ───────────────────────────────────────────────────── */

export function BrandAssetsSection({ assets, brandId, onDelete, onSave }) {
  // Logo principal: o primeiro asset 'logo' que tenha SVG inline (não file_path)
  // Os demais 'logo' (versões adicionais via upload) caem na galeria abaixo
  const logoPrincipal = assets.find(a => a.tipo === 'logo' && a.valor?.includes('<svg'))
  const cores         = assets.filter(a => a.tipo === 'cor')
  const tipos         = assets.filter(a => a.tipo === 'tipografia' && !a.file_path)
  const galeria       = assets.filter(a =>
    a !== logoPrincipal &&
    !['cor'].includes(a.tipo) &&
    !(a.tipo === 'tipografia' && !a.file_path)
  )

  return (
    <Box>
      {/* Upload de arquivos */}
      <UploadPanel brandId={brandId} onUploaded={onSave} />

      {/* Logo principal (SVG via legacy flow) */}
      <LogoPanel
        asset={logoPrincipal || null}
        brandId={brandId}
        onSave={onSave}
        onDelete={onDelete}
      />

      {/* Cores */}
      {cores.length > 0 && <ColorPalette items={cores} onDelete={onDelete} />}

      {/* Tipografia */}
      {tipos.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <SectionLabel label="Tipografia" color="#EF9F27" count={tipos.length} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {tipos.map(a => <TypographyCard key={a.id} asset={a} onDelete={onDelete} />)}
          </Box>
        </Box>
      )}

      {/* Galeria (todos os arquivos uploadados, agrupados por tipo) */}
      {galeria.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <SectionLabel label="Galeria de assets" color="#8A9AB0" count={galeria.length} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2, mt: 2 }}>
            {galeria.map(a => <OtherCard key={a.id} asset={a} onDelete={onDelete} />)}
          </Box>
        </Box>
      )}

      {!assets.length && (
        <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography fontWeight={700} color="text.secondary" mb={0.5}>
            Nenhum asset cadastrado
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Use o upload acima ou importe um brand manual.
          </Typography>
        </Box>
      )}
    </Box>
  )
}
