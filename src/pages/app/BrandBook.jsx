import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, CircularProgress, Button, Chip, Alert, Paper, Stack, Tabs, Tab,
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
import { VerbalIdentitySection } from './VerbalIdentitySection'
import { EssenciaSection, NegocioSection, ExperienciaSection, PersonalidadeSection } from './StrategySections'
import { VisualIdentitySection } from './VisualIdentitySection'
import DownloadOutlinedIcon    from '@mui/icons-material/DownloadOutlined'
import { PageHeader }           from '../../components/shell/PageHeader'
import { useBrandManualJobs }   from '../../lib/useBrandManualJobs'
import { PALETTE } from '../../lib/theme'

const SECTIONS = [
  // Árvore Strategy (2026-07-10, fiel): Culture→Brand Essence · Business→Função+Experience · Communication→Personality+Expression
  { key: 'essencia',      label: 'Essência',      color: PALETTE.data.positivo },
  { key: 'negocio',       label: 'Função',        color: PALETTE.data.critico },
  { key: 'experiencia',   label: 'Experiência',   color: PALETTE.data.atencao },
  { key: 'personalidade', label: 'Personalidade', color: PALETTE.data.neutro },
  { key: 'expression',    label: 'Expressão',     color: PALETTE.data.positivo },
  { key: 'history',       label: 'Histórico',     color: PALETTE.neutral[400] },
]

// Map legacy section keys → estrutura nova (rotas antigas continuam funcionando)
function mapLegacySection(s) {
  if (!s) return 'essencia'
  if (['identity', 'positioning', 'brand', 'verbal', 'visual', 'references', 'assets'].includes(s)) return 'expression'
  if (['tokens', 'design_system'].includes(s)) return 'experiencia'
  return s
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.5px' }}>
      {history.map(h => (
        <Paper key={h.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip label={h.section} size="small" sx={{ fontWeight: 700, height: 18, fontSize: '0.6rem' }} />
            <Typography variant="caption" color="text.disabled">{fmtDate(h.created_at)}</Typography>
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
  // O brand book em markdown, para IA. Fica aqui e não na biblioteca: lá ele
  // seria um card gerado no meio de logos e fotos, e a biblioteca é dos
  // arquivos da marca. O download se monta a partir da coluna, então é sempre
  // a versão atual — não há cópia para envelhecer.
  const [smartbrand, setSmartbrand] = useState('')
  async function baixarSmartbrand() {
    const url = URL.createObjectURL(new Blob([smartbrand], { type: 'text/markdown' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'smartbrand.md'; link.click()
    URL.revokeObjectURL(url)
  }

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
  const [activeSection, setActiveSection] = useState(mapLegacySection(sectionFromHash))
  const [expressionTab, setExpressionTab] = useState(sectionFromHash === 'visual' ? 1 : 0)

  // Reage à navegação da sidebar global (mesma rota, hash muda)
  useEffect(() => {
    const onHash = () => setActiveSection(mapLegacySection(getBrandSection()))
    window.addEventListener('popstate', onHash)
    return () => window.removeEventListener('popstate', onHash)
  }, [])

  useEffect(() => {
    if (!brandId) return
    load()
  }, [brandId])

  // Auto-reload quando um job de manual terminar (done) pra essa marca
  const { jobs: manualJobs } = useBrandManualJobs(workspace?.id)
  const lastDoneJobRef = useRef(null)
  useEffect(() => {
    if (!brandId) return
    const doneForThis = manualJobs.find(j => j.brand_id === brandId && j.status === 'done')
    if (doneForThis && lastDoneJobRef.current !== doneForThis.id) {
      lastDoneJobRef.current = doneForThis.id
      load()
    }
  }, [manualJobs, brandId])

  async function load() {
    setLoading(true)
    // Busca a row mais recente de brand_books (em vez de maybeSingle, que falha se houver duplicatas)
    const { data: books, error: booksErr } = await supabase
      .from('brand_books').select('*').eq('brand_id', brandId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
    const bb = books?.[0] || null
    setSmartbrand(bb?.smartbrand || '')
    console.log('[BrandBook.load] brand_books rows encontradas:', books?.length, 'erro:', booksErr?.message)

    const [{ data: b }, { data: hist }, { data: ass }, { data: tok }] = await Promise.all([
      supabase.from('brands').select('*').eq('id', brandId).single(),
      bb?.id
        ? supabase.from('brand_book_history').select('*').eq('brand_book_id', bb.id).order('created_at', { ascending: false }).limit(20)
        : Promise.resolve({ data: [] }),
      supabase.from('brand_assets').select('*').eq('brand_id', brandId).order('created_at'),
      supabase.from('design_tokens').select('*').eq('brand_id', brandId).order('categoria').order('nome'),
    ])
    console.log('[BrandBook.load] brand:', b?.id, b?.nome)
    console.log('[BrandBook.load] book:', bb?.id, 'version:', bb?.version)
    console.log('[BrandBook.load] verbal_identity keys:', Object.keys(bb?.verbal_identity || {}))
    console.log('[BrandBook.load] visual_identity keys:', Object.keys(bb?.visual_identity || {}))
    console.log('[BrandBook.load] design_system keys:', Object.keys(bb?.design_system || {}))
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
    // Todo asset cria uma nova entrada — inclusive brand marks SVG inline:
    // a marca pode ter VÁRIAS variações (logo principal, símbolo, versões alternativas).
    const { data: novo } = await supabase.from('brand_assets')
      .insert({ brand_id: brandId, ...data }).select().single()
    if (novo) setAssets(prev => [...prev, novo])
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
      // Upsert por brand_id — 1 linha por marca (constraint unique brand_id),
      // nunca cria duplicata mesmo se book.id vier nulo.
      const { data: saved, error: upErr } = await supabase.from('brand_books').upsert({
        brand_id:        brandId,
        verbal_identity: book.verbal_identity || {},
        visual_identity: book.visual_identity || {},
        design_system:   book.design_system || {},
        strategy:        book.strategy || {},
        // legacy mirrors (manter por compat até deprecar)
        identity:        book.identity,
        positioning:     book.positioning,
        references:      book.references,
        version:         (book.version || 1) + 1,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'brand_id' }).select().single()
      if (upErr) throw upErr
      setBook(saved)

      const histSectionMap = { expression: 'verbal_identity',
        essencia: 'strategy', negocio: 'strategy', experiencia: 'strategy', personalidade: 'strategy' }
      const histSection = histSectionMap[activeSection]
      if (histSection && saved?.id) {
        await supabase.from('brand_book_history').insert({
          brand_book_id: saved.id,
          section:       histSection,
          snapshot:      book[histSection],
          changed_by:    user?.id,
        })
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

  const sectionLabel = SECTIONS.find(s => s.key === activeSection)?.label || 'Brand Book'

  return (
    <Box>
      <PageHeader
        title={sectionLabel}
        subtitle={`Brand Book · ${brand.nome}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {smartbrand && (
              <Button size="small" variant="outlined" color="inherit" startIcon={<DownloadOutlinedIcon />}
                onClick={baixarSmartbrand}
                sx={{ fontWeight: 700, fontSize: 11, borderColor: 'divider', color: 'text.secondary' }}>
                smartbrand.md
              </Button>
            )}
            <Button size="small" variant="outlined" color="inherit" startIcon={<FileUploadIcon />}
              onClick={() => setImportOpen(true)}
              sx={{ fontWeight: 700, fontSize: 11, borderColor: 'divider', color: 'text.secondary' }}>
              Importar Manual
            </Button>
            <Button size="small" variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : (saved ? null : <SaveIcon />)}
              onClick={save} disabled={saving} color={saved ? 'success' : 'primary'}
              sx={{ fontWeight: 800 }}>
              {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
            </Button>
          </Stack>
        }
      />

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {activeSection === 'essencia' && (
          <EssenciaSection verbal={book?.verbal_identity} strategy={book?.strategy}
            onVerbal={d => updateSection('verbal_identity', d)} onStrategy={d => updateSection('strategy', d)} />
        )}
        {activeSection === 'negocio' && (
          <NegocioSection verbal={book?.verbal_identity} strategy={book?.strategy}
            onVerbal={d => updateSection('verbal_identity', d)} onStrategy={d => updateSection('strategy', d)} />
        )}
        {activeSection === 'experiencia' && (
          <ExperienciaSection strategy={book?.strategy} onStrategy={d => updateSection('strategy', d)}
            brandNome={brand?.nome} visual={book?.visual_identity} tokens={tokens} assets={assets} />
        )}
        {activeSection === 'personalidade' && (
          <PersonalidadeSection verbal={book?.verbal_identity} strategy={book?.strategy} brandId={brandId}
            onVerbal={d => updateSection('verbal_identity', d)} onStrategy={d => updateSection('strategy', d)} />
        )}
        {activeSection === 'expression' && (
          <>
            {/* Expression = Verbal + Visual Identity (abas internas — árvore nova) */}
            <Tabs value={expressionTab} onChange={(_, v) => setExpressionTab(v)}
              sx={{ mb: 3, minHeight: 38, '& .MuiTab-root': { minHeight: 38, fontWeight: 800, fontSize: 13 } }}>
              <Tab label="Identidade Verbal" />
              <Tab label="Identidade Visual" />
            </Tabs>
            {expressionTab === 0 && (
              <VerbalIdentitySection data={book?.verbal_identity} onChange={d => updateSection('verbal_identity', d)} />
            )}
            {expressionTab === 1 && (
              <VisualIdentitySection data={book?.visual_identity} onChange={d => updateSection('visual_identity', d)}
                assets={assets} brandId={brandId} onAssetSave={saveAsset} onAssetDelete={deleteAsset} />
            )}
          </>
        )}
        {activeSection === 'history' && (
          <>
            <Typography variant="h6" fontWeight={900} mb={3}>Histórico de edições</Typography>
            <HistorySection history={history} />
          </>
        )}
      </Box>

      <BrandManualImport brandId={brandId} open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); load() }} />
    </Box>
  )
}
