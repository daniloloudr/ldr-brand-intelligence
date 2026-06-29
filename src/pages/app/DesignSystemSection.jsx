import { useRef } from 'react'
import { Box, Typography, TextField, IconButton, Button, Paper, Stack, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { FieldLabel, SectionDivider, ChipInput } from './BrandSection'

const tf = { '& .MuiInputBase-input': { fontSize: 14 } }
const tfMono = { '& .MuiInputBase-input': { fontSize: 14, fontFamily: 'monospace' } }

function isDark(hex) {
  if (!/^#[0-9A-Fa-f]{6}$/i.test(hex)) return false
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function Grid({ children, cols = 2 }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `repeat(${cols}, 1fr)` }, gap: 2 }}>
      {children}
    </Box>
  )
}

/* ─── Color token (semântico) ──────────────────────────────────────── */

function ColorCard({ label, hex, onChange }) {
  const inputRef = useRef()
  const safeHex = /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex : '#000000'
  const dark = isDark(safeHex)
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          height: 88, bgcolor: hex || 'background.default', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-end', p: 1.25,
          transition: 'filter 0.15s', '&:hover': { filter: 'brightness(1.1)' },
          position: 'relative',
        }}
      >
        <Typography sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)' }}>
          {label}
        </Typography>
        <input ref={inputRef} type="color" value={safeHex} onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
      </Box>
      <Box sx={{ p: '8px 10px', bgcolor: 'background.default' }}>
        <TextField size="small" value={hex || ''} onChange={e => onChange(e.target.value)}
          placeholder="#000000" fullWidth
          inputProps={{ style: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700 } }} />
      </Box>
    </Box>
  )
}

/* ─── Token simples (label + valor texto) ──────────────────────────── */

function TokenInput({ label, value, onChange, placeholder, mono }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'text.disabled', mb: 0.5 }}>{label}</Typography>
      <TextField size="small" fullWidth value={value || ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        InputProps={{ sx: mono ? { fontFamily: 'monospace', fontSize: 13 } : { fontSize: 13 } }} />
    </Box>
  )
}

/* ─── Lista genérica de itens ──────────────────────────────────────── */

function ItemList({ label, items, onChange, fields, addLabel = 'Adicionar', emptyMsg, columns = 1 }) {
  function add() {
    const blank = Object.fromEntries(fields.map(f => [f.key, '']))
    onChange([...(items || []), blank])
  }
  function update(idx, key, val) {
    onChange((items || []).map((it, i) => i === idx ? { ...it, [key]: val } : it))
  }
  function remove(idx) {
    onChange((items || []).filter((_, i) => i !== idx))
  }
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <Stack spacing={1.5}>
        {(items || []).length === 0 && emptyMsg && (
          <Typography variant="caption" color="text.disabled">{emptyMsg}</Typography>
        )}
        {(items || []).map((it, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2, position: 'relative', borderRadius: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: columns === 2 ? { xs: '1fr', md: '1fr 1fr' } : '1fr', gap: 1.25 }}>
              {fields.map(f => (
                <TextField
                  key={f.key}
                  label={f.label}
                  value={it[f.key] || ''}
                  onChange={e => update(idx, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  fullWidth
                  multiline={f.multiline}
                  rows={f.rows || (f.multiline ? 2 : undefined)}
                  size="medium"
                  InputProps={{ sx: { fontSize: 14, ...(f.mono ? { fontFamily: 'monospace' } : {}) } }}
                  InputLabelProps={{ sx: { fontSize: 14 } }}
                  sx={f.span === 'full' ? { gridColumn: '1 / -1' } : {}}
                />
              ))}
            </Box>
            <IconButton size="small" onClick={() => remove(idx)}
              sx={{ position: 'absolute', top: 8, right: 8, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Paper>
        ))}
      </Stack>
      <Button startIcon={<AddIcon />} onClick={add} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}>
        {addLabel}
      </Button>
    </Box>
  )
}

/* ─── Main ─────────────────────────────────────────────────────────── */

export function DesignSystemSection({ data, onChange }) {
  const d        = data || {}
  const colors   = d.colors         || {}
  const neutral  = d.neutral_colors || {}
  const spacing  = d.spacing        || {}
  const fontSize = d.font_sizes     || {}
  const radius   = d.border_radius  || {}
  const shadow   = d.shadows        || {}
  const bp       = d.breakpoints    || {}
  const motion   = d.motion         || {}
  const access   = d.accessibility  || {}
  const density  = d.density        || {}
  const grid     = d.grid           || {}

  function up(field, val) { onChange({ ...d, [field]: val }) }
  function upColor(role, val)   { up('colors',         { ...colors,  [role]: val }) }
  function upNeutral(role, val) { up('neutral_colors', { ...neutral, [role]: val }) }
  function upSpacing(k, val)    { up('spacing',        { ...spacing, [k]: val }) }
  function upFont(k, val)       { up('font_sizes',     { ...fontSize, [k]: val }) }
  function upRadius(k, val)     { up('border_radius',  { ...radius, [k]: val }) }
  function upShadow(k, val)     { up('shadows',        { ...shadow, [k]: val }) }
  function upBp(k, val)         { up('breakpoints',    { ...bp, [k]: val }) }
  function upMotion(k, val)     { up('motion',         { ...motion, [k]: val }) }
  function upAccess(k, val)     { up('accessibility',  { ...access, [k]: val }) }
  function upDensity(k, val)    { up('density',        { ...density, [k]: val }) }
  function upGrid(k, val)       { up('grid',           { ...grid, [k]: val }) }

  return (
    <Box sx={{ maxWidth: 920 }}>

      {/* ── Tokens: cores semânticas ── */}
      <SectionDivider label="Cores semânticas" color="#EF9F27" />
      <Grid cols={4}>
        <ColorCard label="Primária"   hex={colors.primary}    onChange={v => upColor('primary',   v)} />
        <ColorCard label="Secundária" hex={colors.secondary}  onChange={v => upColor('secondary', v)} />
        <ColorCard label="Sucesso"    hex={colors.success}    onChange={v => upColor('success',   v)} />
        <ColorCard label="Aviso"      hex={colors.warning}    onChange={v => upColor('warning',   v)} />
        <ColorCard label="Erro"       hex={colors.error}      onChange={v => upColor('error',     v)} />
        <ColorCard label="Info"       hex={colors.info}       onChange={v => upColor('info',      v)} />
        <ColorCard label="Fundo"      hex={colors.background} onChange={v => upColor('background', v)} />
        <ColorCard label="Superfície" hex={colors.surface}    onChange={v => upColor('surface',   v)} />
      </Grid>

      <Box sx={{ mt: 4 }}>
        <FieldLabel>Escala de neutros</FieldLabel>
        <Grid cols={5}>
          {['gray_50', 'gray_100', 'gray_300', 'gray_500', 'gray_700', 'gray_900', 'white', 'black'].map(k => (
            <ColorCard key={k} label={k.replace('_', ' ')} hex={neutral[k]} onChange={v => upNeutral(k, v)} />
          ))}
        </Grid>
      </Box>

      {/* ── Tokens: espaçamento ── */}
      <SectionDivider label="Espaçamento" color="#EF9F27" />
      <Grid cols={6}>
        {['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map(k => (
          <TokenInput key={k} label={k} value={spacing[k]} onChange={v => upSpacing(k, v)}
            placeholder="Ex: 4px" mono />
        ))}
      </Grid>

      {/* ── Tokens: tipografia ── */}
      <SectionDivider label="Tamanhos de tipografia" color="#EF9F27" />
      <Grid cols={4}>
        {['caption', 'body', 'h6', 'h5', 'h4', 'h3', 'h2', 'h1'].map(k => (
          <TokenInput key={k} label={k} value={fontSize[k]} onChange={v => upFont(k, v)}
            placeholder="Ex: 16px" mono />
        ))}
      </Grid>

      {/* ── Tokens: raios ── */}
      <SectionDivider label="Border radius" color="#EF9F27" />
      <Grid cols={5}>
        {['none', 'sm', 'md', 'lg', 'full'].map(k => (
          <TokenInput key={k} label={k} value={radius[k]} onChange={v => upRadius(k, v)}
            placeholder="Ex: 4px" mono />
        ))}
      </Grid>

      {/* ── Tokens: sombras ── */}
      <SectionDivider label="Sombras" color="#EF9F27" />
      <Grid cols={4}>
        {['none', 'sm', 'md', 'lg'].map(k => (
          <TokenInput key={k} label={k} value={shadow[k]} onChange={v => upShadow(k, v)}
            placeholder="Ex: 0 1px 3px rgba(0,0,0,0.12)" mono />
        ))}
      </Grid>

      {/* ── Tokens: breakpoints ── */}
      <SectionDivider label="Breakpoints" color="#EF9F27" />
      <Grid cols={5}>
        {['xs', 'sm', 'md', 'lg', 'xl'].map(k => (
          <TokenInput key={k} label={k} value={bp[k]} onChange={v => upBp(k, v)}
            placeholder="Ex: 768px" mono />
        ))}
      </Grid>

      {/* ── Componentes ── */}
      <SectionDivider label="Componentes" color="#0D9E7A" />
      <ItemList
        label="Componentes do sistema"
        items={d.components}
        onChange={v => up('components', v)}
        addLabel="Adicionar componente"
        emptyMsg="Adicione componentes (botão, input, card, modal, navegação…)."
        fields={[
          { key: 'nome',       label: 'Nome',       placeholder: 'Ex: Button' },
          { key: 'variantes',  label: 'Variantes',  placeholder: 'Ex: primary, secondary, ghost' },
          { key: 'tamanhos',   label: 'Tamanhos',   placeholder: 'Ex: sm, md, lg' },
          { key: 'estados',    label: 'Estados',    placeholder: 'Ex: default, hover, focus, disabled, loading' },
          { key: 'regras_uso', label: 'Regras de uso', placeholder: 'Quando usar / quando não usar', multiline: true, rows: 2, span: 'full' },
        ]}
        columns={2}
      />

      {/* ── Estados ── */}
      <SectionDivider label="Estados interativos" color="#0D9E7A" />
      <Grid cols={2}>
        <Box>
          <FieldLabel>Hover</FieldLabel>
          <TextField value={d.state_hover || ''} onChange={e => up('state_hover', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Ex: brightness 95%, transição 150ms" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Focus</FieldLabel>
          <TextField value={d.state_focus || ''} onChange={e => up('state_focus', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Ex: outline 2px primária, offset 2px" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Disabled</FieldLabel>
          <TextField value={d.state_disabled || ''} onChange={e => up('state_disabled', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Ex: opacity 0.5, cursor not-allowed" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Error</FieldLabel>
          <TextField value={d.state_error || ''} onChange={e => up('state_error', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Ex: borda erro, ícone alerta" sx={tf} />
        </Box>
      </Grid>

      {/* ── Motion ── */}
      <SectionDivider label="Motion" color="#0D9E7A" />
      <Grid cols={2}>
        <Box>
          <FieldLabel>Durações</FieldLabel>
          <TextField value={motion.durations || ''} onChange={e => upMotion('durations', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Ex: fast 100ms / base 200ms / slow 400ms" sx={tfMono} />
        </Box>
        <Box>
          <FieldLabel>Easings</FieldLabel>
          <TextField value={motion.easings || ''} onChange={e => upMotion('easings', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Ex: ease-out, cubic-bezier(0.4, 0, 0.2, 1)" sx={tfMono} />
        </Box>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Padrões de animação</FieldLabel>
        <TextField value={motion.padroes || ''} onChange={e => upMotion('padroes', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Ex: entrada slide-up + fade, saída fade, modal scale-in, skeleton pulse"
          sx={tf} />
      </Box>

      {/* ── Acessibilidade ── */}
      <SectionDivider label="Acessibilidade" color="#0D9E7A" />
      <Grid cols={2}>
        <Box>
          <FieldLabel>Contraste mínimo</FieldLabel>
          <TextField value={access.contraste || ''} onChange={e => upAccess('contraste', e.target.value)}
            fullWidth placeholder="Ex: WCAG AA — 4.5:1 para texto normal, 3:1 para texto grande" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Foco visível</FieldLabel>
          <TextField value={access.foco || ''} onChange={e => upAccess('foco', e.target.value)}
            fullWidth placeholder="Ex: outline 2px sempre presente, never outline:none" sx={tf} />
        </Box>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Notas ARIA / semântica</FieldLabel>
        <TextField value={access.aria || ''} onChange={e => upAccess('aria', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Regras de labels, landmarks, aria-live, alternativas para conteúdo visual"
          sx={tf} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Outras regras de acessibilidade" values={access.regras_extras}
          onChange={v => upAccess('regras_extras', v)}
          placeholder="Ex: navegação por teclado obrigatória — Enter" />
      </Box>

      {/* ── Densidade ── */}
      <SectionDivider label="Densidade" color="#0D9E7A" />
      <Grid cols={2}>
        <Box>
          <FieldLabel>Mobile</FieldLabel>
          <TextField value={density.mobile || ''} onChange={e => upDensity('mobile', e.target.value)}
            fullWidth multiline minRows={3} placeholder="Alturas de toque mínimas (44px), espaçamento entre elementos" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Desktop</FieldLabel>
          <TextField value={density.desktop || ''} onChange={e => upDensity('desktop', e.target.value)}
            fullWidth multiline minRows={3} placeholder="Densidade de informação, padding padrão de containers" sx={tf} />
        </Box>
      </Grid>

      {/* ── Grid ── */}
      <SectionDivider label="Grid & Layout" color="#0D9E7A" />
      <Grid cols={3}>
        <TokenInput label="Colunas" value={grid.colunas} onChange={v => upGrid('colunas', v)}
          placeholder="Ex: 12" mono />
        <TokenInput label="Gutter" value={grid.gutter} onChange={v => upGrid('gutter', v)}
          placeholder="Ex: 24px" mono />
        <TokenInput label="Container max" value={grid.container} onChange={v => upGrid('container', v)}
          placeholder="Ex: 1280px" mono />
      </Grid>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Regras de layout</FieldLabel>
        <TextField value={grid.regras || ''} onChange={e => upGrid('regras', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Como organizar conteúdo, hierarquia, espaços vazios, responsividade"
          sx={tf} />
      </Box>

      {/* ── Padrões UX ── */}
      <SectionDivider label="Padrões UX" color="#0D9E7A" />
      <ItemList
        label="Padrões reutilizáveis"
        items={d.ux_patterns}
        onChange={v => up('ux_patterns', v)}
        addLabel="Adicionar padrão"
        emptyMsg="Ex: formulário em wizard, tabela com filtros, empty state, loading skeleton."
        fields={[
          { key: 'nome',      label: 'Nome',      placeholder: 'Ex: Form wizard' },
          { key: 'descricao', label: 'Descrição / quando usar', placeholder: '', multiline: true, rows: 3 },
        ]}
        columns={2}
      />

      <Divider sx={{ mt: 5 }} />
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
        Tokens e padrões alimentam o RAG e ficam disponíveis pros agentes ao gerar campanhas, componentes e copy.
      </Typography>
    </Box>
  )
}
