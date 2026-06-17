import { useState, useRef } from 'react'
import { Box, Typography, Chip, IconButton, Tooltip, Button } from '@mui/material'
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon    from '@mui/icons-material/ContentCopy'
import CheckIcon          from '@mui/icons-material/Check'
import UploadFileIcon     from '@mui/icons-material/UploadFile'
import { supabase }       from '../../lib/supabase'

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
  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5,
      borderTop: `3px solid ${cor}`, '&:hover .del': { opacity: 1 },
      display: 'flex', flexDirection: 'column', gap: 1,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Chip label={asset.tipo} size="small"
          sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800,
            bgcolor: cor + '18', color: cor }} />
        <IconButton className="del" size="small" onClick={() => onDelete(asset.id)}
          sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
            '&:hover': { color: '#E8185A' } }}>
          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{asset.nome}</Typography>
      {asset.descricao && (
        <Typography variant="caption" color="text.disabled">{asset.descricao}</Typography>
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
  const logos   = assets.filter(a => a.tipo === 'logo')
  const cores   = assets.filter(a => a.tipo === 'cor')
  const tipos   = assets.filter(a => a.tipo === 'tipografia')
  const outros  = assets.filter(a => !['logo','cor','tipografia'].includes(a.tipo))

  return (
    <Box>
      {/* Logo */}
      <LogoPanel
        asset={logos[0] || null}
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

      {/* Outros */}
      {outros.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <SectionLabel label="Outros assets" color="#8A9AB0" count={outros.length} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2, mt: 2 }}>
            {outros.map(a => <OtherCard key={a.id} asset={a} onDelete={onDelete} />)}
          </Box>
        </Box>
      )}

      {!assets.length && (
        <Box sx={{ py: 8, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography fontWeight={700} color="text.secondary" mb={0.5}>
            Nenhum asset cadastrado
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Importe um brand manual ou faça upload do SVG da marca acima.
          </Typography>
        </Box>
      )}
    </Box>
  )
}
