import { useState } from 'react'
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon   from '@mui/icons-material/ContentCopy'
import CheckIcon         from '@mui/icons-material/Check'

/* ─── helpers ──────────────────────────────────────────────────────── */

function isHex(v) { return /^#[0-9A-Fa-f]{6}$/i.test(v?.trim()) }
function isDark(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

/* ─── Shared ────────────────────────────────────────────────────────── */

function SectionLabel({ label, color, count }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, mb: 2,
      borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ width: 3, height: 18, bgcolor: color, borderRadius: 4 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '0.12em', color }}>
        {label}
      </Typography>
      <Chip label={count} size="small"
        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
          bgcolor: color + '18', color, ml: 0.5 }} />
    </Box>
  )
}

/* ─── Color tokens ──────────────────────────────────────────────────── */

function ColorTokenGrid({ tokens, onDelete }) {
  const [copiedId, setCopiedId] = useState(null)

  function copy(id, val) {
    navigator.clipboard.writeText(val).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Group by name prefix (e.g. color-primary-*, color-neutral-*)
  const groups = {}
  tokens.forEach(t => {
    const parts = t.nome.split('-')
    const group = parts.length > 2 ? parts.slice(0, 2).join('-') : parts[0]
    if (!groups[group]) groups[group] = []
    groups[group].push(t)
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Object.entries(groups).map(([group, items]) => (
        <Box key={group}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled',
            textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, fontFamily: 'monospace' }}>
            {group}
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {items.map((t, i) => {
              const hex   = isHex(t.valor) ? t.valor.trim() : null
              const dark2 = hex ? isDark(hex) : false
              return (
                <Box key={t.id} sx={{
                  display: 'grid', gridTemplateColumns: '56px 1fr 140px 32px',
                  alignItems: 'center',
                  borderBottom: i < items.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.02)', '& .row-actions': { opacity: 1 } },
                }}>
                  {/* Swatch */}
                  <Box sx={{ height: 48, bgcolor: hex || 'divider', flexShrink: 0 }} />

                  {/* Name + desc */}
                  <Box sx={{ px: 2.5, py: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                      {t.nome}
                    </Typography>
                    {t.descricao && (
                      <Typography variant="caption" color="text.disabled">{t.descricao}</Typography>
                    )}
                  </Box>

                  {/* Value */}
                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                    color: '#0D9E7A', px: 1 }}>
                    {hex ? hex.toUpperCase() : t.valor}
                  </Typography>

                  {/* Actions */}
                  <Box className="row-actions" sx={{ display: 'flex', gap: 0.25,
                    opacity: 0, transition: 'opacity 0.15s', pr: 1 }}>
                    <Tooltip title={copiedId === t.id ? 'Copiado!' : 'Copiar'}>
                      <IconButton size="small" onClick={() => copy(t.id, t.valor)}
                        sx={{ color: 'text.disabled', '&:hover': { color: '#0D9E7A' } }}>
                        {copiedId === t.id
                          ? <CheckIcon sx={{ fontSize: 14 }} />
                          : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton size="small" onClick={() => onDelete(t.id)}
                        sx={{ color: 'text.disabled', '&:hover': { color: '#E8185A' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

/* ─── Typography tokens ─────────────────────────────────────────────── */

function TypographyTokenTable({ tokens, onDelete }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {tokens.map((t, i) => (
        <Box key={t.id} sx={{
          display: 'grid', gridTemplateColumns: '1fr 2fr 140px 32px',
          alignItems: 'center', px: 3, py: 2,
          borderBottom: i < tokens.length - 1 ? '1px solid' : 'none',
          borderColor: 'divider',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.02)', '& .del': { opacity: 1 } },
        }}>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'text.primary' }}>
              {t.nome}
            </Typography>
            {t.descricao && (
              <Typography variant="caption" color="text.disabled">{t.descricao}</Typography>
            )}
          </Box>
          <Typography sx={{ fontSize: 22, fontFamily: `"${t.valor}", sans-serif`,
            fontWeight: 600, color: 'text.primary', px: 2 }}>
            Aa Bb — The quick brown fox
          </Typography>
          <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
            color: '#EF9F27' }}>
            {t.valor}
          </Typography>
          <IconButton className="del" size="small" onClick={() => onDelete(t.id)}
            sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
              '&:hover': { color: '#E8185A' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ))}
    </Box>
  )
}

/* ─── Spacing tokens ────────────────────────────────────────────────── */

function parseSpacing(val) {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : Math.min(n, 64)
}

function SpacingRow({ token, onDelete }) {
  const px = parseSpacing(token.valor)
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '160px 1fr 80px 32px',
      alignItems: 'center', px: 3, py: '12px',
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)', '& .del': { opacity: 1 } },
    }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
        {token.nome}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ height: 8, width: px || 4, bgcolor: '#4A9ECC', borderRadius: 1,
          transition: 'width 0.3s ease', minWidth: 4 }} />
        <Box sx={{ width: px || 4, height: px || 4, border: '1px dashed rgba(74,158,204,0.4)',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
        color: '#4A9ECC', textAlign: 'right' }}>
        {token.valor}
      </Typography>
      <IconButton className="del" size="small" onClick={() => onDelete(token.id)}
        sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
          '&:hover': { color: '#E8185A' } }}>
        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  )
}

/* ─── Border radius tokens ──────────────────────────────────────────── */

function BorderRadiusRow({ token, onDelete }) {
  const px = Math.min(parseFloat(token.valor) || 0, 40)
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '160px 1fr 80px 32px',
      alignItems: 'center', px: 3, py: '14px',
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)', '& .del': { opacity: 1 } },
    }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
        {token.nome}
      </Typography>
      <Box>
        <Box sx={{ width: 48, height: 32, border: '2px solid #7F77DD',
          borderRadius: `${px}px`, opacity: 0.8 }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
        color: '#7F77DD', textAlign: 'right' }}>
        {token.valor}
      </Typography>
      <IconButton className="del" size="small" onClick={() => onDelete(token.id)}
        sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
          '&:hover': { color: '#E8185A' } }}>
        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  )
}

/* ─── Shadow tokens ─────────────────────────────────────────────────── */

function ShadowRow({ token, onDelete }) {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '160px 1fr 1fr 32px',
      alignItems: 'center', px: 3, py: '16px',
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)', '& .del': { opacity: 1 } },
    }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
        {token.nome}
      </Typography>
      <Box>
        <Box sx={{ width: 56, height: 40, bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
          boxShadow: token.valor, borderRadius: 1.5 }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'text.secondary',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {token.valor}
      </Typography>
      <IconButton className="del" size="small" onClick={() => onDelete(token.id)}
        sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
          '&:hover': { color: '#E8185A' } }}>
        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  )
}

/* ─── Generic token table ───────────────────────────────────────────── */

function GenericRow({ token, onDelete }) {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '1fr 200px 32px',
      alignItems: 'center', px: 3, py: '11px',
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)', '& .del': { opacity: 1 } },
    }}>
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
          {token.nome}
        </Typography>
        {token.descricao && (
          <Typography variant="caption" color="text.disabled">{token.descricao}</Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
        color: 'text.secondary' }}>
        {token.valor}
      </Typography>
      <IconButton className="del" size="small" onClick={() => onDelete(token.id)}
        sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled',
          '&:hover': { color: '#E8185A' } }}>
        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  )
}

/* ─── Main export ───────────────────────────────────────────────────── */

const CAT_CONFIG = {
  color:           { label: 'Color',         color: '#0D9E7A' },
  typography:      { label: 'Typography',    color: '#EF9F27' },
  spacing:         { label: 'Spacing',       color: '#4A9ECC' },
  'border-radius': { label: 'Border Radius', color: '#7F77DD' },
  shadow:          { label: 'Shadow',        color: '#8A9AB0' },
  outro:           { label: 'Outros',        color: '#8A9AB0' },
}
const CAT_ORDER = ['color', 'typography', 'spacing', 'border-radius', 'shadow', 'outro']

export function DesignTokensSection({ tokens, onDelete }) {
  if (!tokens?.length) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
        <Typography fontWeight={700} color="text.secondary" mb={0.5}>
          Nenhum token de design cadastrado
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Importe um brand manual para extrair tokens automaticamente.
        </Typography>
      </Box>
    )
  }

  const groups = tokens.reduce((acc, t) => {
    const g = t.categoria || 'outro'
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {})

  const sorted = CAT_ORDER.filter(c => groups[c]?.length)
    .concat(Object.keys(groups).filter(c => !CAT_ORDER.includes(c) && groups[c]?.length))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sorted.map(cat => {
        const items = groups[cat]
        const cfg   = CAT_CONFIG[cat] || { label: cat, color: '#8A9AB0' }
        return (
          <Box key={cat}>
            <SectionLabel label={cfg.label} color={cfg.color} count={items.length} />
            {cat === 'color' && <ColorTokenGrid tokens={items} onDelete={onDelete} />}
            {cat === 'typography' && <TypographyTokenTable tokens={items} onDelete={onDelete} />}
            {cat === 'spacing' && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                {items.map(t => <SpacingRow key={t.id} token={t} onDelete={onDelete} />)}
              </Box>
            )}
            {cat === 'border-radius' && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                {items.map(t => <BorderRadiusRow key={t.id} token={t} onDelete={onDelete} />)}
              </Box>
            )}
            {cat === 'shadow' && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                {items.map(t => <ShadowRow key={t.id} token={t} onDelete={onDelete} />)}
              </Box>
            )}
            {!['color','typography','spacing','border-radius','shadow'].includes(cat) && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                {items.map(t => <GenericRow key={t.id} token={t} onDelete={onDelete} />)}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
