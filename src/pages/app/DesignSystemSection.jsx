import { useRef } from 'react'
import { Box, Typography, TextField } from '@mui/material'

/* ─── helpers ──────────────────────────────────────────────────────── */

function isDark(hex) {
  if (!/^#[0-9A-Fa-f]{6}$/i.test(hex)) return false
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function SectionLabel({ children }) {
  return (
    <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
      letterSpacing: '0.14em', color: 'text.disabled', mb: 2 }}>
      {children}
    </Typography>
  )
}

/* ─── Color Swatch Card ─────────────────────────────────────────────── */

function ColorCard({ label, hex, onChange }) {
  const inputRef = useRef()
  const safeHex = /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex : '#000000'
  const dark = isDark(safeHex)

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Swatch — click to open color picker */}
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          height: 120, bgcolor: hex || '#1A2B3C', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-end', p: 1.5,
          transition: 'filter 0.15s', '&:hover': { filter: 'brightness(1.1)' },
          position: 'relative',
        }}
      >
        <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
          {label}
        </Typography>
        <input ref={inputRef} type="color" value={safeHex}
          onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
      </Box>

      {/* Hex input */}
      <Box sx={{ p: '10px 12px', bgcolor: 'background.default' }}>
        <TextField
          size="small"
          value={hex || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          inputProps={{ style: { fontFamily: 'monospace', fontSize: 13, fontWeight: 700 } }}
          sx={{ width: '100%',
            '& .MuiOutlinedInput-root': { borderRadius: 1 },
            '& .MuiInputBase-input': { py: '6px' },
          }}
        />
      </Box>
    </Box>
  )
}

/* ─── Typography Card ────────────────────────────────────────────────── */

const TYPE_SAMPLES = [
  { size: 36, weight: 900, text: 'Aa Bb Cc' },
  { size: 22, weight: 700, text: 'The quick brown fox' },
  { size: 14, weight: 400, text: 'jumps over the lazy dog — 0123456789' },
]

function FontCard({ label, value, onChange }) {
  const fontFamily = value ? `"${value}", sans-serif` : 'sans-serif'
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Preview */}
      <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', minHeight: 140,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
        {TYPE_SAMPLES.map(({ size, weight, text }) => (
          <Typography key={size} sx={{ fontFamily, fontSize: size, fontWeight: weight,
            lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text}
          </Typography>
        ))}
      </Box>
      {/* Input */}
      <Box sx={{ p: '10px 12px', borderTop: '1px solid', borderColor: 'divider',
        bgcolor: 'background.default', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#EF9F27', flexShrink: 0 }}>{label}</Typography>
        <TextField
          size="small"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Nome da fonte (ex: Cairo)"
          inputProps={{ style: { fontFamily: 'monospace', fontSize: 13, fontWeight: 700 } }}
          sx={{ flex: 1,
            '& .MuiOutlinedInput-root': { borderRadius: 1 },
            '& .MuiInputBase-input': { py: '6px' },
          }}
        />
      </Box>
    </Box>
  )
}

/* ─── Border Radius Card ─────────────────────────────────────────────── */

function RadiusCard({ label, value, onChange }) {
  const px = Math.min(parseFloat(value) || 0, 48)
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Preview */}
      <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', minHeight: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{
          width: 72, height: 72,
          border: '2px solid', borderColor: '#7F77DD',
          borderRadius: `${px}px`,
          bgcolor: 'rgba(127,119,221,0.08)',
          transition: 'border-radius 0.2s ease',
        }} />
      </Box>
      {/* Input */}
      <Box sx={{ p: '10px 12px', borderTop: '1px solid', borderColor: 'divider',
        bgcolor: 'background.default', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#7F77DD', flexShrink: 0 }}>{label}</Typography>
        <TextField
          size="small"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="8px"
          inputProps={{ style: { fontFamily: 'monospace', fontSize: 13, fontWeight: 700 } }}
          sx={{ flex: 1,
            '& .MuiOutlinedInput-root': { borderRadius: 1 },
            '& .MuiInputBase-input': { py: '6px' },
          }}
        />
      </Box>
    </Box>
  )
}

/* ─── Main export ─────────────────────────────────────────────────────── */

export function DesignSystemSection({ data, onChange }) {
  const d          = data        || {}
  const colors     = d.colors    || {}
  const typography = d.typography || {}
  const radius     = d.border_radius || {}

  function upColor(role, val) {
    onChange({ ...d, colors: { ...colors, [role]: { ...(colors[role] || {}), main: val } } })
  }
  function upTypo(field, val) {
    onChange({ ...d, typography: { ...typography, [field]: val } })
  }
  function upRadius(size, val) {
    onChange({ ...d, border_radius: { ...radius, [size]: val } })
  }

  return (
    <Box sx={{ maxWidth: 860 }}>

      {/* Colors */}
      <Box sx={{ mb: 5 }}>
        <SectionLabel>Paleta de cores</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {[
            ['primary',    'Primária'],
            ['secondary',  'Secundária'],
            ['background', 'Fundo'],
            ['surface',    'Superfície'],
          ].map(([role, label]) => (
            <ColorCard key={role} label={label}
              hex={colors[role]?.main || ''}
              onChange={val => upColor(role, val)} />
          ))}
        </Box>

        {/* Color scale preview */}
        {Object.values(colors).some(c => c?.main) && (
          <Box sx={{ mt: 2, display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden' }}>
            {[colors.primary, colors.secondary, colors.background, colors.surface]
              .filter(c => c?.main)
              .map((c, i) => (
                <Box key={i} sx={{ flex: 1, bgcolor: c.main }} />
              ))}
          </Box>
        )}
      </Box>

      {/* Typography */}
      <Box sx={{ mb: 5 }}>
        <SectionLabel>Tipografia</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <FontCard label="Primária"   value={typography.font_primary}   onChange={v => upTypo('font_primary',   v)} />
          <FontCard label="Secundária" value={typography.font_secondary} onChange={v => upTypo('font_secondary', v)} />
        </Box>
      </Box>

      {/* Border Radius */}
      <Box>
        <SectionLabel>Border Radius</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          <RadiusCard label="SM" value={radius.sm} onChange={v => upRadius('sm', v)} />
          <RadiusCard label="MD" value={radius.md} onChange={v => upRadius('md', v)} />
          <RadiusCard label="LG" value={radius.lg} onChange={v => upRadius('lg', v)} />
        </Box>
      </Box>
    </Box>
  )
}
