import { useState, useEffect } from 'react'
import { navigate } from '../../lib/helpers'
import {
  Box, Typography, Button, TextField, CircularProgress, Paper, Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'
import { BrandManualImport } from './BrandManualImport'

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Criação de marca (decisão 2026-07-20): a parte MANUAL é só a identidade básica
// (nome + slug). Todo o resto — missão, valores, personalidade, design system —
// vem da EXTRAÇÃO do manual (PDF), não de digitação. Ao criar, abre o importador
// do manual (BrandManualImport), que popula o brand book automaticamente.
export function BrandOnboarding() {
  const { workspace }     = useWorkspace()
  const [nome, setNome]   = useState('')
  const [slug, setSlug]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [brandId, setBrandId] = useState(null)   // marca criada → abre o import do manual

  // Todo workspace já nasce com marca (auto-criada) — se já existe, não mostra o
  // wizard: redireciona pra ela. Evita o conflito de cair no "Nova marca" à toa.
  useEffect(() => {
    if (!workspace?.id) return
    supabase.from('brands').select('id').eq('workspace_id', workspace.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => { if (data?.id) navigate(`/app/brands/${data.id}`) })
  }, [workspace?.id])

  async function criar() {
    if (!workspace?.id || !nome.trim() || !slug.trim()) return
    setSaving(true); setError('')
    try {
      const { data: brand, error: be } = await supabase
        .from('brands')
        .insert({ workspace_id: workspace.id, nome: nome.trim(), slug: slug.trim(), status: 'draft' })
        .select().single()
      if (be) throw be
      // brand book vazio — a extração do manual faz UPDATE por cima (senão fica em branco)
      await supabase.from('brand_books').insert({
        brand_id: brand.id, identity: {}, positioning: {}, design_system: {}, references: {}, version: 1,
      })
      setBrandId(brand.id)   // → abre o dialog de importação do manual
    } catch (e) {
      setError(e.message || 'Erro ao criar a marca. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Nova marca"
        subtitle="Identidade básica + manual da marca"
        action={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/brands')}
            sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Marcas
          </Button>
        }
      />
      <Box sx={{ p: 4, maxWidth: 620, mx: 'auto' }}>
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Defina só a <strong>identidade básica</strong>. O resto da marca — missão, valores,
            personalidade, design — é extraído do <strong>manual (PDF)</strong> no próximo passo.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Nome da marca *"
              value={nome}
              onChange={e => { setNome(e.target.value); setSlug(slugify(e.target.value)) }}
              fullWidth
              autoFocus
            />
            <TextField
              label="Slug (identificador único)"
              value={slug}
              onChange={e => setSlug(slugify(e.target.value))}
              fullWidth
              helperText="Gerado a partir do nome — usado no endereço e em toda a plataforma"
            />
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={() => navigate('/app/brands')}
            sx={{ color: 'text.secondary', borderColor: 'divider' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={criar}
            disabled={saving || !nome.trim() || !slug.trim()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
          >
            {saving ? 'Criando…' : 'Criar marca e importar manual'}
          </Button>
        </Box>
      </Box>

      {/* Após criar a marca, importa o manual (PDF) → extração preenche o brand book */}
      {brandId && (
        <BrandManualImport
          brandId={brandId}
          open
          onClose={() => navigate(`/app/brands/${brandId}`)}
          onSuccess={() => { /* dialog mostra 'Ver brand book' → onClose navega */ }}
        />
      )}
    </Box>
  )
}
