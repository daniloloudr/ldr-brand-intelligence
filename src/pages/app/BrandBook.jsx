import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, CircularProgress, Button, Chip, Alert,
  TextField, Paper, Divider, IconButton, Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import HistoryIcon from '@mui/icons-material/History'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { getBrandSection } from '../../lib/helpers'
import { fmtDate } from '../../lib/helpers'

const SECTIONS = [
  { key: 'identity',      label: 'Identidade',   color: '#0D9E7A' },
  { key: 'positioning',   label: 'Posicionamento', color: '#7F77DD' },
  { key: 'design_system', label: 'Design System', color: '#EF9F27' },
  { key: 'references',    label: 'Referências',   color: '#E8185A' },
  { key: 'history',       label: 'Histórico',     color: '#8A9AB0' },
]

/* ─── renderiza campos de cada seção ─────────────────────────── */

function IdentitySection({ data, onChange }) {
  const d = data || {}
  function up(field, val) { onChange({ ...d, [field]: val }) }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <TextField label="Missão" value={d.missao || ''} onChange={e => up('missao', e.target.value)} fullWidth multiline minRows={2} />
      <TextField label="Visão"  value={d.visao  || ''} onChange={e => up('visao',  e.target.value)} fullWidth multiline minRows={2} />
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1}>
          Valores
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {(d.valores || []).map(v => (
            <Chip key={v} label={v} size="small" onDelete={() => up('valores', d.valores.filter(x => x !== v))}
              sx={{ bgcolor: 'rgba(13,158,122,0.08)', color: 'primary.main', fontWeight: 700 }} />
          ))}
        </Box>
        <TextField
          size="small"
          placeholder="Adicionar valor e pressionar Enter…"
          onKeyDown={e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              up('valores', [...(d.valores || []), e.target.value.trim()])
              e.target.value = ''
            }
          }}
          sx={{ width: 280 }}
        />
      </Box>
      <TextField label="Arquétipo"       value={d.arquetipo    || ''} onChange={e => up('arquetipo',    e.target.value)} fullWidth />
      <TextField label="Tom de voz"      value={d.tom_voz      || ''} onChange={e => up('tom_voz',      e.target.value)} fullWidth multiline minRows={2} />
      <TextField label="Público-alvo"    value={d.publico_alvo || ''} onChange={e => up('publico_alvo', e.target.value)} fullWidth multiline minRows={2} />
      <TextField label="Vocabulário proibido (separado por vírgula)" value={(d.vocabulario_proibido || []).join(', ')}
        onChange={e => up('vocabulario_proibido', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} fullWidth />
    </Box>
  )
}

function PositioningSection({ data, onChange }) {
  const d = data || {}
  function up(field, val) { onChange({ ...d, [field]: val }) }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <TextField label="Posicionamento principal" value={d.posicionamento || ''} onChange={e => up('posicionamento', e.target.value)} fullWidth multiline minRows={3} />
      <TextField label="Proposta de valor única"  value={d.proposta_valor || ''} onChange={e => up('proposta_valor', e.target.value)} fullWidth multiline minRows={2} />
      <TextField label="Mensagem central"         value={d.mensagem_central || ''} onChange={e => up('mensagem_central', e.target.value)} fullWidth multiline minRows={2} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField label="Score diferenciação (0-10)" type="number" inputProps={{ min: 0, max: 10 }}
          value={d.differentiation_score ?? ''} onChange={e => up('differentiation_score', Number(e.target.value))} fullWidth />
      </Box>
    </Box>
  )
}

function DesignSystemSection({ data, onChange }) {
  const d = data || {}
  const colors = d.colors || {}
  const typography = d.typography || {}

  function upColor(role, field, val) {
    onChange({ ...d, colors: { ...colors, [role]: { ...(colors[role] || {}), [field]: val } } })
  }
  function upTypo(field, val) {
    onChange({ ...d, typography: { ...typography, [field]: val } })
  }
  function upRoot(field, val) {
    onChange({ ...d, [field]: val })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Preview de cores */}
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1.5}>
          Paleta de cores
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {[['primary', 'Primária'], ['secondary', 'Secundária'], ['background', 'Fundo'], ['surface', 'Superfície']].map(([role, label]) => (
            <Box key={role}>
              <Typography variant="caption" color="text.disabled" display="block" mb={0.75}>{label}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component="input"
                  type="color"
                  value={colors[role]?.main || '#000000'}
                  onChange={e => upColor(role, 'main', e.target.value)}
                  sx={{ width: 36, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', p: 0.5, bgcolor: 'background.paper' }}
                />
                <TextField size="small" value={colors[role]?.main || ''} onChange={e => upColor(role, 'main', e.target.value)} sx={{ flex: 1 }} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Tipografia */}
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1.5}>
          Tipografia
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Fonte primária"   value={typography.font_primary   || ''} onChange={e => upTypo('font_primary',   e.target.value)} fullWidth />
          <TextField label="Fonte secundária" value={typography.font_secondary || ''} onChange={e => upTypo('font_secondary', e.target.value)} fullWidth />
        </Box>
      </Box>

      {/* Border radius */}
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1.5}>
          Border radius
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {['sm', 'md', 'lg'].map(size => (
            <TextField key={size} label={size.toUpperCase()}
              value={d.border_radius?.[size] || ''} onChange={e => upRoot('border_radius', { ...(d.border_radius || {}), [size]: e.target.value })}
              placeholder="8px" fullWidth />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function ReferencesSection({ data, onChange }) {
  const d = data || {}
  function up(field, val) { onChange({ ...d, [field]: val }) }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <TextField label="Marcas de referência (uma por linha)" value={(d.brands || []).join('\n')}
        onChange={e => up('brands', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
        fullWidth multiline minRows={3} placeholder="Apple&#10;Airbnb&#10;Stripe" />
      <TextField label="Diferenciação vs. referências"
        value={d.differentiation || ''} onChange={e => up('differentiation', e.target.value)} fullWidth multiline minRows={3} />
      <TextField label="Moodboard (URLs separadas por linha)"
        value={(d.moodboard || []).join('\n')} onChange={e => up('moodboard', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
        fullWidth multiline minRows={3} placeholder="https://..." />
      <TextField label="Anti-referências (o que a marca NÃO é)"
        value={d.anti_referencias || ''} onChange={e => up('anti_referencias', e.target.value)} fullWidth multiline minRows={2} />
    </Box>
  )
}

function HistorySection({ history }) {
  if (!history?.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Nenhuma edição registrada ainda.</Typography>
      </Box>
    )
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {history.map(h => (
        <Paper key={h.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip label={h.section} size="small" sx={{ fontWeight: 700, height: 18, fontSize: '0.6rem' }} />
            <Typography variant="caption" color="text.disabled">{fmtDate(h.changed_at)}</Typography>
          </Box>
          {h.note && (
            <Typography variant="caption" color="text.secondary">{h.note}</Typography>
          )}
        </Paper>
      ))}
    </Box>
  )
}

/* ─── main ─────────────────────────────────────────────────────── */

export function BrandBook({ brandId }) {
  const { workspace, user } = useWorkspace()
  const [brand, setBrand]       = useState(null)
  const [book, setBook]         = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  const sectionFromHash = getBrandSection()
  const [activeSection, setActiveSection] = useState(
    sectionFromHash || 'identity'
  )

  useEffect(() => {
    if (!brandId) return
    load()
  }, [brandId])

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: bb }, { data: hist }] = await Promise.all([
      supabase.from('brands').select('*').eq('id', brandId).single(),
      supabase.from('brand_books').select('*').eq('brand_id', brandId).maybeSingle(),
      supabase.from('brand_book_history').select('*').eq('brand_book_id',
        (await supabase.from('brand_books').select('id').eq('brand_id', brandId).maybeSingle()).data?.id
      ).order('changed_at', { ascending: false }).limit(20),
    ])
    setBrand(b)
    setBook(bb)
    setHistory(hist || [])
    setLoading(false)
  }

  function updateSection(section, data) {
    setBook(prev => ({ ...prev, [section]: data }))
  }

  async function save() {
    if (!book) return
    setSaving(true)
    setError('')
    try {
      if (book.id) {
        await supabase.from('brand_books').update({
          identity:      book.identity,
          positioning:   book.positioning,
          design_system: book.design_system,
          references:    book.references,
          version:       (book.version || 1) + 1,
          updated_at:    new Date().toISOString(),
        }).eq('id', book.id)

        if (activeSection !== 'history') {
          await supabase.from('brand_book_history').insert({
            brand_book_id: book.id,
            section:       activeSection,
            snapshot:      book[activeSection],
            changed_by:    user?.id,
          })
        }
      } else {
        const { data: newBook } = await supabase.from('brand_books').insert({
          brand_id:      brandId,
          identity:      book.identity || {},
          positioning:   book.positioning || {},
          design_system: book.design_system || {},
          references:    book.references || {},
        }).select().single()
        setBook(newBook)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      load()
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  if (!brand) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Marca não encontrada.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar de seções ── */}
      <Box sx={{
        width: 200, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Marca header */}
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => { window.location.hash = '#/app/brands' }}
            sx={{ color: 'text.disabled', fontWeight: 700, fontSize: 11, px: 0, mb: 1.5, minWidth: 0 }}
          >
            Marcas
          </Button>
          <Typography fontWeight={900} fontSize={15} noWrap>{brand.nome}</Typography>
          <Chip
            label={brand.status === 'active' ? 'Ativo' : 'Rascunho'}
            size="small"
            sx={{
              mt: 0.75,
              bgcolor: (brand.status === 'active' ? '#0D9E7A' : '#EF9F27') + '18',
              color: brand.status === 'active' ? '#0D9E7A' : '#EF9F27',
              fontWeight: 700, fontSize: '0.6rem', height: 18,
            }}
          />
        </Box>

        {/* Assistant link */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button
            fullWidth
            startIcon={<AutoAwesomeIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => { window.location.hash = `#/app/brands/${brandId}/assistant` }}
            sx={{ bgcolor: 'rgba(127,119,221,0.08)', color: '#7F77DD', fontWeight: 700, fontSize: 11, py: 0.75, justifyContent: 'flex-start' }}
          >
            Brand Assistant
          </Button>
        </Box>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {SECTIONS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => {
                setActiveSection(key)
                window.location.hash = `#/app/brands/${brandId}/${key}`
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 16px', background: 'none', border: 'none',
                borderLeft: activeSection === key ? `3px solid ${color}` : '3px solid transparent',
                cursor: 'pointer', fontFamily: "'Cairo', sans-serif", fontSize: 13,
                fontWeight: activeSection === key ? 800 : 500,
                color: activeSection === key ? '#D8E4F0' : '#8A9AB0',
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              {key === 'history' ? <HistoryIcon sx={{ fontSize: 15, color }} /> : (
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: activeSection === key ? color : 'transparent', border: `1.5px solid ${color}` }} />
              )}
              {label}
            </button>
          ))}
        </nav>
      </Box>

      {/* ── Conteúdo da seção ── */}
      <Box sx={{ flex: 1, p: 4, overflowY: 'auto' }}>
        {activeSection !== 'history' && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={900}>
              {SECTIONS.find(s => s.key === activeSection)?.label}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : (saved ? null : <SaveIcon />)}
              onClick={save}
              disabled={saving}
              color={saved ? 'success' : 'primary'}
              sx={{ fontWeight: 800 }}
            >
              {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
            </Button>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {activeSection === 'identity' && (
          <IdentitySection data={book?.identity} onChange={d => updateSection('identity', d)} />
        )}
        {activeSection === 'positioning' && (
          <PositioningSection data={book?.positioning} onChange={d => updateSection('positioning', d)} />
        )}
        {activeSection === 'design_system' && (
          <DesignSystemSection data={book?.design_system} onChange={d => updateSection('design_system', d)} />
        )}
        {activeSection === 'references' && (
          <ReferencesSection data={book?.references} onChange={d => updateSection('references', d)} />
        )}
        {activeSection === 'history' && (
          <>
            <Typography variant="h6" fontWeight={900} mb={3}>Histórico de edições</Typography>
            <HistorySection history={history} />
          </>
        )}
      </Box>
    </Box>
  )
}
