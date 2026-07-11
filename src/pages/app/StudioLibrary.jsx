import { useState, useEffect, useMemo } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A'

// Assets de MÍDIA/arquivo (cor e tipografia são valores de identidade — ficam no Brand Book)
const TIPOS_BIBLIOTECA = ['logo', 'foto', 'video', 'icone', 'padrao', 'documento', 'outro']

const isUrl   = v => /^https?:\/\//i.test(v || '')
const isVideo = a => a.tipo === 'video' || (a.mime_type || '').startsWith('video/')

function AssetPreview({ a }) {
  if (isUrl(a.valor)) {
    if (isVideo(a)) return <Box component="video" src={a.valor} muted loop playsInline
      onMouseOver={e => e.currentTarget.play().catch(() => {})} onMouseOut={e => e.currentTarget.pause()}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    if ((a.mime_type || 'image/').startsWith('image/')) return <Box component="img" src={a.valor} alt="" loading="lazy"
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  }
  // logo SVG inline (valor = markup, com ou sem prólogo <?xml) ou arquivo sem preview
  if ((a.valor || '').includes('<svg')) return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      '& svg': { maxWidth: '100%', maxHeight: '100%' } }} dangerouslySetInnerHTML={{ __html: a.valor.slice(a.valor.indexOf('<svg')) }} />
  )
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled' }} />
}

export function StudioLibrary({ brandId }) {
  const [assets, setAssets]   = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca]     = useState('')
  const [pasta, setPasta]     = useState('__all')     // __all | __none | nome da pasta
  const [tag, setTag]         = useState(null)
  const [org, setOrg]         = useState(null)        // asset em organização (dialog)
  const [orgPasta, setOrgPasta] = useState('')
  const [orgTags, setOrgTags]   = useState([])
  const [savingOrg, setSavingOrg] = useState(false)

  useEffect(() => { if (brandId) load() }, [brandId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('brand_assets').select('*')
      .eq('brand_id', brandId).in('tipo', TIPOS_BIBLIOTECA)
      .order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  const pastas = useMemo(() => [...new Set(assets.map(a => a.pasta).filter(Boolean))].sort(), [assets])
  const tags   = useMemo(() => [...new Set(assets.flatMap(a => a.tags || []))].sort(), [assets])

  const filtered = assets.filter(a => {
    if (pasta === '__none' && a.pasta) return false
    if (pasta !== '__all' && pasta !== '__none' && a.pasta !== pasta) return false
    if (tag && !(a.tags || []).includes(tag)) return false
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      const alvo = `${a.nome || ''} ${a.descricao || ''} ${(a.tags || []).join(' ')} ${a.pasta || ''}`.toLowerCase()
      if (!alvo.includes(q)) return false
    }
    return true
  })

  function abrirOrg(a) { setOrg(a); setOrgPasta(a.pasta || ''); setOrgTags(a.tags || []) }

  async function salvarOrg() {
    if (!org) return
    setSavingOrg(true)
    const pastaFinal = (orgPasta || '').trim() || null
    const tagsFinal  = [...new Set(orgTags.map(t => (t || '').trim()).filter(Boolean))]
    const { error } = await supabase.from('brand_assets')
      .update({ pasta: pastaFinal, tags: tagsFinal }).eq('id', org.id)
    setSavingOrg(false)
    if (!error) {
      setAssets(prev => prev.map(a => a.id === org.id ? { ...a, pasta: pastaFinal, tags: tagsFinal } : a))
      setOrg(null)
    }
  }

  async function excluir(a) {
    if (!window.confirm(`Excluir "${a.nome}" da biblioteca?`)) return
    const { error } = await supabase.from('brand_assets').delete().eq('id', a.id)
    if (!error) setAssets(prev => prev.filter(x => x.id !== a.id))
  }

  function baixar(a) {
    if (!isUrl(a.valor)) return
    const link = document.createElement('a')
    link.href = a.valor
    link.download = a.nome || 'asset'
    link.target = '_blank'
    link.click()
  }

  const chipSx = on => ({ fontWeight: 700, fontSize: 12, bgcolor: on ? TEAL : 'transparent',
    color: on ? '#fff' : 'text.secondary', border: '1px solid', borderColor: on ? TEAL : 'divider',
    '&:hover': { bgcolor: on ? '#0B8567' : 'action.hover' } })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Estúdio" subtitle="Biblioteca — as peças e arquivos da marca, organizados" />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        {/* Busca + pastas + tags */}
        <Stack spacing={1.5} mb={2.5}>
          <TextField size="small" fullWidth placeholder="Buscar por nome, descrição, tag ou pasta…"
            value={busca} onChange={e => setBusca(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} /> }} />
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            <FolderOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Chip label={`Todas (${assets.length})`} size="small" onClick={() => setPasta('__all')} sx={chipSx(pasta === '__all')} />
            <Chip label={`Sem pasta (${assets.filter(a => !a.pasta).length})`} size="small" onClick={() => setPasta('__none')} sx={chipSx(pasta === '__none')} />
            {pastas.map(p => (
              <Chip key={p} label={`${p} (${assets.filter(a => a.pasta === p).length})`} size="small"
                onClick={() => setPasta(pasta === p ? '__all' : p)} sx={chipSx(pasta === p)} />
            ))}
          </Stack>
          {tags.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {tags.map(t => (
                <Chip key={t} label={`#${t}`} size="small" variant={tag === t ? 'filled' : 'outlined'}
                  onClick={() => setTag(tag === t ? null : t)}
                  sx={{ fontSize: 11, fontWeight: 700, ...(tag === t ? { bgcolor: TEAL, color: '#fff' } : {}) }} />
              ))}
            </Stack>
          )}
        </Stack>

        {loading ? (
          <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : filtered.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
            <Typography fontSize={13.5} fontWeight={800} mb={0.5}>
              {assets.length === 0 ? 'A biblioteca ainda está vazia' : 'Nada encontrado com esses filtros'}
            </Typography>
            <Typography fontSize={12} color="text.secondary">
              {assets.length === 0
                ? 'Salve peças do Studio (ícone de bookmark) ou envie arquivos pelo Brand Book → Identidade Visual → Assets.'
                : 'Ajuste a busca, a pasta ou a tag.'}
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
            {filtered.map(a => (
              <Paper key={a.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AssetPreview a={a} />
                </Box>
                <Box sx={{ px: 1.25, pt: 0.75 }}>
                  <Typography fontSize={12} fontWeight={800} noWrap>{a.nome}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minHeight: 20, flexWrap: 'wrap' }}>
                    {a.pasta && <Typography fontSize={10} color="text.secondary" noWrap>📁 {a.pasta}</Typography>}
                    {(a.tags || []).slice(0, 3).map(t => (
                      <Typography key={t} fontSize={10} sx={{ color: TEAL, fontWeight: 700 }}>#{t}</Typography>
                    ))}
                  </Stack>
                </Box>
                <Box sx={{ px: 0.5, pb: 0.5, display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Organizar (pasta e tags)">
                    <IconButton size="small" onClick={() => abrirOrg(a)}><TuneOutlinedIcon sx={{ fontSize: 16 }} /></IconButton>
                  </Tooltip>
                  <Box sx={{ flex: 1 }} />
                  {isUrl(a.valor) && (
                    <Tooltip title="Baixar"><IconButton size="small" onClick={() => baixar(a)}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                  )}
                  <Tooltip title="Excluir"><IconButton size="small" onClick={() => excluir(a)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Dialog Organizar: pasta (free-solo) + tags (free-solo múltiplas) */}
      <Dialog open={!!org} onClose={() => setOrg(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900 }}>Organizar "{org?.nome}"</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <Autocomplete freeSolo options={pastas} value={orgPasta}
              onInputChange={(_, v) => setOrgPasta(v)}
              renderInput={params => <TextField {...params} size="small" label="Pasta" placeholder="Escolha ou crie uma pasta…" />} />
            <Autocomplete freeSolo multiple options={tags} value={orgTags}
              onChange={(_, v) => setOrgTags(v)}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip label={`#${option}`} size="small" {...getTagProps({ index })} key={option} />
              ))}
              renderInput={params => <TextField {...params} size="small" label="Tags" placeholder="Digite e Enter para adicionar…" />} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setOrg(null)} sx={{ color: 'text.secondary', fontWeight: 700 }}>Cancelar</Button>
          <Button size="small" variant="contained" disabled={savingOrg} onClick={salvarOrg}
            sx={{ fontWeight: 800, bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' } }}>
            {savingOrg ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
