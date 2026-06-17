import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, CircularProgress, Button, Chip, Alert, Paper,
} from '@mui/material'
import ArrowBackIcon    from '@mui/icons-material/ArrowBack'
import SaveIcon          from '@mui/icons-material/Save'
import HistoryIcon       from '@mui/icons-material/History'
import AutoAwesomeIcon   from '@mui/icons-material/AutoAwesome'
import FileUploadIcon    from '@mui/icons-material/FileUpload'
import PaletteIcon       from '@mui/icons-material/Palette'
import TokenIcon         from '@mui/icons-material/Token'
import { useWorkspace }  from '../../lib/WorkspaceContext'
import { supabase }      from '../../lib/supabase'
import { getBrandSection, fmtDate } from '../../lib/helpers'
import { BrandManualImport }    from './BrandManualImport'
import { BrandAssetsSection }   from './BrandAssetsSection'
import { DesignTokensSection }  from './DesignTokensSection'
import { BrandSection }         from './BrandSection'
import { DesignSystemSection }  from './DesignSystemSection'

const SECTIONS = [
  { key: 'brand',        label: 'Marca',         color: '#0D9E7A' },
  { key: 'design_system', label: 'Design System', color: '#EF9F27' },
  { key: 'assets',       label: 'Assets',         color: '#4A9ECC' },
  { key: 'tokens',       label: 'Design Tokens',  color: '#FF7043' },
  { key: 'history',      label: 'Histórico',      color: '#8A9AB0' },
]

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
  const [assets, setAssets]     = useState([])
  const [tokens, setTokens]     = useState([])
  const [importOpen, setImportOpen] = useState(false)

  const sectionFromHash = getBrandSection()
  const [activeSection, setActiveSection] = useState(
    // map legacy hash values to new keys
    (() => {
      const s = sectionFromHash
      if (s === 'identity' || s === 'positioning' || s === 'references') return 'brand'
      return s || 'brand'
    })()
  )

  useEffect(() => {
    if (!brandId) return
    load()
  }, [brandId])

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: bb }, { data: hist }, { data: ass }, { data: tok }] = await Promise.all([
      supabase.from('brands').select('*').eq('id', brandId).single(),
      supabase.from('brand_books').select('*').eq('brand_id', brandId).maybeSingle(),
      supabase.from('brand_book_history').select('*').eq('brand_book_id',
        (await supabase.from('brand_books').select('id').eq('brand_id', brandId).maybeSingle()).data?.id
      ).order('changed_at', { ascending: false }).limit(20),
      supabase.from('brand_assets').select('*').eq('brand_id', brandId).order('created_at'),
      supabase.from('design_tokens').select('*').eq('brand_id', brandId).order('categoria').order('nome'),
    ])
    setBrand(b)
    setBook(bb)
    setHistory(hist || [])
    setAssets(ass || [])
    setTokens(tok || [])
    setLoading(false)
  }

  function updateSection(section, data) {
    setBook(prev => ({ ...prev, [section]: data }))
  }

  function handleBrandUpdate(section, data) {
    setBook(prev => ({ ...prev, [section]: data }))
  }

  async function deleteAsset(id) {
    await supabase.from('brand_assets').delete().eq('id', id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  async function saveAsset(data) {
    const existing = assets.find(a => a.tipo === data.tipo && data.tipo === 'logo')
    if (existing) {
      await supabase.from('brand_assets').update(data).eq('id', existing.id)
      setAssets(prev => prev.map(a => a.id === existing.id ? { ...a, ...data } : a))
    } else {
      const { data: novo } = await supabase.from('brand_assets')
        .insert({ brand_id: brandId, ...data }).select().single()
      if (novo) setAssets(prev => [...prev, novo])
    }
  }

  async function deleteToken(id) {
    await supabase.from('design_tokens').delete().eq('id', id)
    setTokens(prev => prev.filter(t => t.id !== id))
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

        const histSection = activeSection === 'brand' ? 'identity' : activeSection
        if (activeSection !== 'history' && activeSection !== 'assets' && activeSection !== 'tokens') {
          await supabase.from('brand_book_history').insert({
            brand_book_id: book.id,
            section:       histSection,
            snapshot:      book[histSection],
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

      // Regenera embeddings em background (fire-and-forget)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return
        fetch('/.netlify/functions/brand-book-embed-background', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body:    JSON.stringify({ brand_id: brandId }),
        }).catch(() => {})
      })
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

        {/* Assistant + Campaigns links */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Button
            fullWidth
            startIcon={<AutoAwesomeIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => { window.location.hash = `#/app/brands/${brandId}/assistant` }}
            sx={{ bgcolor: 'rgba(127,119,221,0.08)', color: '#7F77DD', fontWeight: 700, fontSize: 11, py: 0.75, justifyContent: 'flex-start' }}
          >
            Brand Assistant
          </Button>
          <Button
            fullWidth
            onClick={() => { window.location.hash = `#/app/brands/${brandId}/campaigns` }}
            sx={{ bgcolor: 'rgba(232,24,90,0.06)', color: '#E8185A', fontWeight: 700, fontSize: 11, py: 0.75, justifyContent: 'flex-start' }}
          >
            Campanhas
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
        {(activeSection === 'brand' || activeSection === 'design_system') && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Typography variant="h6" fontWeight={900}>
              {SECTIONS.find(s => s.key === activeSection)?.label}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" color="inherit"
              startIcon={<FileUploadIcon />}
              onClick={() => setImportOpen(true)}
              sx={{ fontWeight: 700, fontSize: 11, mr: 1.5, borderColor: 'divider', color: 'text.secondary' }}>
              Importar Manual
            </Button>
            <Button variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : (saved ? null : <SaveIcon />)}
              onClick={save} disabled={saving}
              color={saved ? 'success' : 'primary'}
              sx={{ fontWeight: 800 }}>
              {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
            </Button>
          </Box>
        )}
        {(activeSection === 'assets' || activeSection === 'tokens') && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {activeSection === 'assets'
                ? <PaletteIcon sx={{ fontSize: 20, color: '#4A9ECC' }} />
                : <TokenIcon  sx={{ fontSize: 20, color: '#FF7043' }} />}
              <Typography variant="h6" fontWeight={900}>
                {SECTIONS.find(s => s.key === activeSection)?.label}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Button
              size="small" variant="outlined" color="inherit"
              startIcon={<FileUploadIcon />}
              onClick={() => setImportOpen(true)}
              sx={{ fontWeight: 700, fontSize: 11, borderColor: 'divider', color: 'text.secondary' }}
            >
              Importar Manual
            </Button>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {activeSection === 'brand' && (
          <BrandSection book={book} onUpdate={handleBrandUpdate} />
        )}
        {activeSection === 'design_system' && (
          <DesignSystemSection data={book?.design_system} onChange={d => updateSection('design_system', d)} />
        )}
        {activeSection === 'assets' && (
          <BrandAssetsSection assets={assets} brandId={brandId} onDelete={deleteAsset} onSave={saveAsset} />
        )}
        {activeSection === 'tokens' && (
          <DesignTokensSection tokens={tokens} onDelete={deleteToken} />
        )}
        {activeSection === 'history' && (
          <>
            <Typography variant="h6" fontWeight={900} mb={3}>Histórico de edições</Typography>
            <HistorySection history={history} />
          </>
        )}
      </Box>

      <BrandManualImport
        brandId={brandId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { setImportOpen(false); load() }}
      />
    </Box>
  )
}
