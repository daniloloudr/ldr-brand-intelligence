import { Box, Typography, TextField, Chip, Divider } from '@mui/material'
import { PALETTE } from '../../lib/theme'

/* ─── helpers ──────────────────────────────────────────────────────── */

export function FieldLabel({ children }) {
  return (
    <Typography variant="caption" color="text.disabled" fontWeight={800}
      textTransform="uppercase" letterSpacing="0.1em" display="block" mb={0.75}>
      {children}
    </Typography>
  )
}

export function SectionDivider({ label, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 4 }}>
      <Box sx={{ width: 3, height: 18, bgcolor: color,  flexShrink: 0 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '0.14em', color }}>
        {label}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  )
}

/* ─── Arquétipo selector ────────────────────────────────────────────── */

const ARQUETIPOS = [
  'O Herói', 'O Sábio', 'O Explorador', 'O Inocente',
  'O Criador', 'O Governante', 'O Cuidador', 'O Amante',
  'O Bobo', 'O Rebelde', 'O Mágico', 'O Cara Comum',
]

export function ArquetipoSelector({ value, onChange }) {
  return (
    <Box>
      <FieldLabel>Arquétipo</FieldLabel>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {ARQUETIPOS.map(a => (
          <Chip key={a} label={a} size="small"
            onClick={() => onChange(value === a ? '' : a)}
            sx={{
              fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
              bgcolor: value === a ? 'primary.main' : 'rgba(255,255,255,0.05)',
              color:   value === a ? '#fff' : 'text.secondary',
              border: '1px solid',
              borderColor: value === a ? 'primary.main' : 'divider',
              '&:hover': { bgcolor: value === a ? 'primary.dark' : 'rgba(255,255,255,0.1)' },
            }}
          />
        ))}
      </Box>
    </Box>
  )
}

/* ─── ChipInput ─────────────────────────────────────────────────────── */

export function ChipInput({ label, values, onChange, placeholder, color = 'primary.main' }) {
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1, minHeight: 28 }}>
        {(values || []).map(v => (
          <Chip key={v} label={v} size="small"
            onDelete={() => onChange(values.filter(x => x !== v))}
            sx={{ fontWeight: 700, fontSize: '0.7rem',
              bgcolor: 'rgba(13,158,122,0.08)', color }} />
        ))}
      </Box>
      <TextField size="small" placeholder={placeholder || 'Adicionar e pressionar Enter…'}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            onChange([...(values || []), e.target.value.trim()])
            e.target.value = ''
          }
        }}
        sx={{ width: 300, '& .MuiInputBase-input': { fontSize: 13 } }} />
    </Box>
  )
}

/* ─── Main ──────────────────────────────────────────────────────────── */

export function BrandSection({ book, onUpdate }) {
  const id  = book?.identity      || {}
  const pos = book?.positioning   || {}
  const ref = book?.references    || {}

  function upId(field, val)  { onUpdate('identity',    { ...id,  [field]: val }) }
  function upPos(field, val) { onUpdate('positioning', { ...pos, [field]: val }) }
  function upRef(field, val) { onUpdate('references',  { ...ref, [field]: val }) }

  return (
    <Box sx={{ maxWidth: 860 }}>

      {/* ── Identidade ── */}
      <SectionDivider label="Identidade" color={PALETTE.data.positivo} />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Box>
          <FieldLabel>Missão</FieldLabel>
          <TextField value={id.missao || ''} onChange={e => upId('missao', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="Por que a marca existe?"
            sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
        </Box>
        <Box>
          <FieldLabel>Visão</FieldLabel>
          <TextField value={id.visao || ''} onChange={e => upId('visao', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="Onde a marca quer chegar?"
            sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
        </Box>
      </Box>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Valores" values={id.valores} onChange={v => upId('valores', v)}
          placeholder="Ex: Inovação — pressione Enter" />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ArquetipoSelector value={id.arquetipo || ''} onChange={v => upId('arquetipo', v)} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 3 }}>
        <Box>
          <FieldLabel>Tom de voz</FieldLabel>
          <TextField value={id.tom_voz || ''} onChange={e => upId('tom_voz', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="Como a marca fala? Direta, inspiradora, técnica…"
            sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
        </Box>
        <Box>
          <FieldLabel>Público-alvo</FieldLabel>
          <TextField value={id.publico_alvo || ''} onChange={e => upId('publico_alvo', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="Quem é o cliente ideal?"
            sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
        </Box>
      </Box>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Vocabulário proibido"
          values={id.vocabulario_proibido}
          onChange={v => upId('vocabulario_proibido', v)}
          placeholder="Palavra ou expressão proibida — Enter"
          color={PALETTE.data.critico} />
      </Box>

      {/* ── Posicionamento ── */}
      <SectionDivider label="Posicionamento" color={PALETTE.data.neutro} />

      <Box>
        <FieldLabel>Posicionamento principal</FieldLabel>
        <TextField value={pos.posicionamento || ''} onChange={e => upPos('posicionamento', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Como a marca se posiciona no mercado?"
          sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 3 }}>
        <Box>
          <FieldLabel>Proposta de valor única</FieldLabel>
          <TextField value={pos.proposta_valor || ''} onChange={e => upPos('proposta_valor', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="O que só esta marca entrega?"
            sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
        </Box>
        <Box>
          <FieldLabel>Mensagem central</FieldLabel>
          <TextField value={pos.mensagem_central || ''} onChange={e => upPos('mensagem_central', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="A frase que resume tudo"
            sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
        </Box>
      </Box>

      {/* ── Referências ── */}
      <SectionDivider label="Referências" color={PALETTE.data.critico} />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Box>
          <ChipInput label="Marcas de referência"
            values={ref.brands}
            onChange={v => upRef('brands', v)}
            placeholder="Ex: Apple — Enter"
            color="text.primary" />
        </Box>
        <Box>
          <FieldLabel>Anti-referências</FieldLabel>
          <TextField value={ref.anti_referencias || ''} onChange={e => upRef('anti_referencias', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="O que a marca definitivamente NÃO é"
            sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
        </Box>
      </Box>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Diferenciação vs. referências</FieldLabel>
        <TextField value={ref.differentiation || ''} onChange={e => upRef('differentiation', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="O que separa esta marca das referências acima?"
          sx={{ '& .MuiInputBase-input': { fontSize: 14 } }} />
      </Box>

    </Box>
  )
}
