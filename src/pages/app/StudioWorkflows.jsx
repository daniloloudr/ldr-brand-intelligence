import { useState, useEffect } from 'react'
import {
  Box, Button, Typography, Paper, Stack, IconButton, Menu, MenuItem, CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { StudioTabs } from './StudioTabs'

const TEAL = '#0D9E7A'

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h atrás`
  const d = Math.floor(h / 24)
  return `${d} d atrás`
}

export function StudioWorkflows({ brandId }) {
  const { workspace } = useWorkspace()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState(null)   // { anchor, wf }

  useEffect(() => { load() }, [brandId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('studio_workflows')
      .select('id, nome, updated_at, thumbnail_url')
      .eq('brand_id', brandId).order('updated_at', { ascending: false })
    setWorkflows(data || [])
    setLoading(false)
  }

  async function novo() {
    const { data, error } = await supabase.from('studio_workflows')
      .insert({ workspace_id: workspace?.id, brand_id: brandId, nome: 'Novo workflow', nodes: [], edges: [] })
      .select().single()
    if (!error && data) window.location.hash = `#/app/brands/${brandId}/studio/workflow/${data.id}`
  }

  function abrir(wf) { window.location.hash = `#/app/brands/${brandId}/studio/workflow/${wf.id}` }

  async function renomear(wf) {
    setMenu(null)
    const nome = window.prompt('Nome do workflow:', wf.nome)
    if (!nome) return
    await supabase.from('studio_workflows').update({ nome }).eq('id', wf.id)
    load()
  }

  async function duplicar(wf) {
    setMenu(null)
    const { data } = await supabase.from('studio_workflows').select('*').eq('id', wf.id).single()
    if (!data) return
    await supabase.from('studio_workflows').insert({
      workspace_id: workspace?.id, brand_id: brandId,
      nome: `${data.nome} (cópia)`, nodes: data.nodes, edges: data.edges,
    })
    load()
  }

  async function excluir(wf) {
    setMenu(null)
    if (!window.confirm(`Excluir "${wf.nome}"? Esta ação não pode ser desfeita.`)) return
    await supabase.from('studio_workflows').delete().eq('id', wf.id)
    load()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader
        title="Workflow"
        subtitle="Pipelines nodais de geração — construa em pedaços"
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <StudioTabs brandId={brandId} active="workflow" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={novo}
              sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}>
              Novo workflow
            </Button>
          </Stack>
        }
      />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : workflows.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <AccountTreeOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography variant="h6" fontWeight={900}>Nenhum workflow ainda</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
              Crie um workflow para montar pipelines de geração — Brand → Generate → Upscale → …
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={novo} sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800, mt: 1 }}>
              Novo workflow
            </Button>
          </Stack>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
            {workflows.map(wf => (
              <Paper key={wf.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', '&:hover': { borderColor: TEAL } }}>
                <Box onClick={() => abrir(wf)} sx={{
                  aspectRatio: '4 / 3', bgcolor: 'background.default', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundImage: wf.thumbnail_url ? `url(${wf.thumbnail_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  {!wf.thumbnail_url && <AccountTreeOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => abrir(wf)}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.nome}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{relativeTime(wf.updated_at)}</Typography>
                  </Box>
                  <IconButton size="small" onClick={e => setMenu({ anchor: e.currentTarget, wf })}>
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { abrir(menu.wf) }} sx={{ fontSize: 13 }}>Abrir</MenuItem>
        <MenuItem onClick={() => renomear(menu.wf)} sx={{ fontSize: 13 }}>Renomear</MenuItem>
        <MenuItem onClick={() => duplicar(menu.wf)} sx={{ fontSize: 13 }}>Duplicar</MenuItem>
        <MenuItem onClick={() => excluir(menu.wf)} sx={{ fontSize: 13, color: '#E8185A' }}>Excluir</MenuItem>
      </Menu>
    </Box>
  )
}
