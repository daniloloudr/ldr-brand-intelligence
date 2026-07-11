// Brand Assets — os ativos oficiais da marca, por tipo (árvore nova do Studio):
// Logos · Images · Icons · Templates (em construção) · Brand Kit (em construção).
// Fonte: brand_assets (mesma da Library — aqui a vitrine é por TIPO oficial).
import { useState, useEffect } from 'react'
import { Box, Paper, Typography, Stack, CircularProgress, Tabs, Tab, IconButton, Tooltip } from '@mui/material'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A'
const TABS = [
  { key: 'logos',     label: 'Logos',     tipos: ['logo'] },
  { key: 'images',    label: 'Imagens',   tipos: ['foto'] },
  { key: 'icons',     label: 'Ícones',    tipos: ['icone', 'padrao'] },
  { key: 'templates', label: 'Templates', vem: 'templates de peça reutilizáveis — a partir das suas peças aprovadas' },
  { key: 'kit',       label: 'Brand Kit', vem: 'pacote da identidade para compartilhar com parceiros e agências (download único)' },
]

const isUrl = v => /^https?:\/\//i.test(v || '')

function Preview({ a }) {
  if ((a.valor || '').includes('<svg')) return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      '& svg': { maxWidth: '100%', maxHeight: '100%' } }} dangerouslySetInnerHTML={{ __html: a.valor.slice(a.valor.indexOf('<svg')) }} />
  )
  if (isUrl(a.valor) && (a.mime_type || 'image/').startsWith('image/')) return (
    <Box component="img" src={a.valor} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', p: 1 }} />
  )
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
}

export function StudioAssets({ brandId }) {
  const [assets, setAssets] = useState(null)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!brandId) return
    let on = true
    supabase.from('brand_assets').select('*').eq('brand_id', brandId)
      .in('tipo', ['logo', 'foto', 'icone', 'padrao']).order('created_at', { ascending: false })
      .then(({ data }) => { if (on) setAssets(data || []) })
    return () => { on = false }
  }, [brandId])

  const cfg = TABS[tab]
  const list = cfg.tipos ? (assets || []).filter(a => cfg.tipos.includes(a.tipo)) : []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Ativos" subtitle="Os ativos oficiais da marca — organizados por tipo" />
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, minHeight: 38, '& .MuiTab-root': { minHeight: 38, fontWeight: 800, fontSize: 13 } }}>
          {TABS.map(t => <Tab key={t.key} label={t.label} />)}
        </Tabs>

        {cfg.vem ? (
          <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
            <ConstructionOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled', mb: 1 }} />
            <Typography fontWeight={900} fontSize={15} mb={0.5}>Em construção</Typography>
            <Typography fontSize={13} color="text.secondary">O que vem: {cfg.vem}.</Typography>
          </Paper>
        ) : assets === null ? (
          <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : list.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
            <Typography fontSize={13.5} color="text.secondary">
              Nenhum asset deste tipo ainda. Envie pelo Brand Book (Identidade Visual → Assets) ou salve peças do Studio.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
            {list.map(a => (
              <Paper key={a.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Preview a={a} />
                </Box>
                <Stack direction="row" alignItems="center" sx={{ px: 1.25, py: 0.75 }}>
                  <Typography fontSize={12} fontWeight={800} noWrap sx={{ flex: 1 }}>{a.nome}</Typography>
                  {isUrl(a.valor) && (
                    <Tooltip title="Baixar"><IconButton size="small" component="a" href={a.valor} target="_blank" rel="noopener">
                      <DownloadOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  )}
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
