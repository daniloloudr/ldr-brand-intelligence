import { useState, useEffect } from 'react'
import { navigate } from '../../lib/helpers';
import {
  Box, Button, Typography, Paper, Stack, IconButton, Menu, MenuItem, CircularProgress, Chip, TextField, Tabs, Tab,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { WORKFLOW_TEMPLATES, TEMPLATE_CAT_COLOR } from '../../lib/studioWorkflowTemplates'

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
  const [iaPrompt, setIaPrompt] = useState('')
  const [building, setBuilding] = useState(false)
  const [iaMsg, setIaMsg] = useState('')
  const [aba, setAba] = useState(0)   // 0 = Meus fluxos · 1 = Templates (área própria — cresce com o usuário)

  useEffect(() => { load() }, [brandId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('studio_workflows')
      .select('id, nome, updated_at, thumbnail_url, is_template')
      .eq('brand_id', brandId).order('updated_at', { ascending: false })
    setWorkflows(data || [])
    setLoading(false)
  }

  async function novo() {
    await criarComGrafo('Novo workflow', [], [])
  }

  // Cria um workflow a partir de um grafo (nodes/edges) e abre o canvas
  async function criarComGrafo(nome, nodes, edges) {
    const { data, error } = await supabase.from('studio_workflows')
      .insert({ workspace_id: workspace?.id, brand_id: brandId, nome, nodes, edges })
      .select().single()
    if (!error && data) navigate(`#/app/brands/${brandId}/studio/workflow/${data.id}`)
    return { data, error }
  }

  // Template embutido (catálogo) → novo workflow clonando o grafo
  function usarBuiltin(t) {
    criarComGrafo(t.nome, t.nodes, t.edges)
  }

  // Cria workflow a partir de um prompt (Sonnet 4.6 monta o grafo)
  async function criarPorPrompt() {
    if (!iaPrompt.trim() || building) return
    setBuilding(true); setIaMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/studio-workflow-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brand_id: brandId, prompt: iaPrompt.trim() }),
      })
      const j = await res.json()
      if (!res.ok) { setIaMsg(j.error || `Erro ${res.status}`); setBuilding(false); return }
      await criarComGrafo(j.nome || 'Workflow', j.nodes || [], j.edges || [])
    } catch (e) { setIaMsg(e.message) }
    setBuilding(false)
  }

  function abrir(wf) { navigate(`#/app/brands/${brandId}/studio/workflow/${wf.id}`) }

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

  async function toggleTemplate(wf) {
    setMenu(null)
    await supabase.from('studio_workflows').update({ is_template: !wf.is_template }).eq('id', wf.id)
    load()
  }

  // Cria um novo workflow clonando o template (e abre)
  async function usarTemplate(wf) {
    setMenu(null)
    const { data } = await supabase.from('studio_workflows').select('nome, nodes, edges').eq('id', wf.id).single()
    if (!data) return
    const { data: novoWf, error } = await supabase.from('studio_workflows').insert({
      workspace_id: workspace?.id, brand_id: brandId, is_template: false,
      nome: data.nome.replace(/\s*\(template\)\s*$/i, '').trim() || 'Novo workflow',
      nodes: data.nodes || [], edges: data.edges || [],
    }).select().single()
    if (!error && novoWf) navigate(`#/app/brands/${brandId}/studio/workflow/${novoWf.id}`)
  }

  const templates = workflows.filter(w => w.is_template)
  const regulares = workflows.filter(w => !w.is_template)

  function card(wf) {
    const tpl = wf.is_template
    const onCard = () => tpl ? usarTemplate(wf) : abrir(wf)
    return (
      <Paper key={wf.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', '&:hover': { borderColor: TEAL } }}>
        <Box onClick={onCard} sx={{
          position: 'relative', aspectRatio: '4 / 3', bgcolor: 'background.default', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundImage: wf.thumbnail_url ? `url(${wf.thumbnail_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          {tpl && <Chip label="Template" size="small" sx={{ position: 'absolute', top: 6, left: 6, height: 18, fontSize: 9, fontWeight: 800, bgcolor: TEAL, color: '#fff' }} />}
          {!wf.thumbnail_url && <AccountTreeOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
        </Box>
        <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onCard}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.nome}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{tpl ? 'Clique para usar' : relativeTime(wf.updated_at)}</Typography>
          </Box>
          <IconButton size="small" onClick={e => setMenu({ anchor: e.currentTarget, wf })}>
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Paper>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader
        title="Fluxos"
        subtitle="Pipelines nodais de geração — construa em pedaços"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={novo}
            sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}>
            Novo workflow
          </Button>
        }
      />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        {/* Duas áreas: os fluxos de trabalho e a coleção de templates (que cresce
            com o usuário — qualquer fluxo vira template pelo menu ⋮) */}
        <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ mb: 3, minHeight: 38, '& .MuiTab-root': { minHeight: 38, fontWeight: 800, fontSize: 13, textTransform: 'none' } }}>
          <Tab label="Meus fluxos" />
          <Tab label={`Templates${templates.length ? ` · ${templates.length + WORKFLOW_TEMPLATES.length}` : ''}`} />
        </Tabs>

        {aba === 0 && (
          <>
            {/* Criar por prompt (IA monta o grafo) */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, borderColor: TEAL, bgcolor: 'rgba(13,158,122,0.04)' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <AutoAwesomeIcon sx={{ fontSize: 18, color: TEAL }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Criar workflow por prompt</Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
                <TextField
                  value={iaPrompt} onChange={e => setIaPrompt(e.target.value)} disabled={building}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); criarPorPrompt() } }}
                  placeholder="Ex.: gerar 3 formatos de um post de produto on-brand a partir de uma foto…"
                  fullWidth size="small" multiline maxRows={3} sx={{ '& .MuiInputBase-input': { fontSize: 13 } }} />
                <Button variant="contained" onClick={criarPorPrompt} disabled={building || !iaPrompt.trim()}
                  startIcon={building ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
                  sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {building ? 'Montando…' : 'Criar com IA'}
                </Button>
              </Stack>
              {iaMsg && <Typography sx={{ fontSize: 12, color: '#E8185A', mt: 1 }}>{iaMsg}</Typography>}
            </Paper>

            {loading ? (
              <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
            ) : regulares.length === 0 ? (
              <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
                <AccountTreeOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                <Typography variant="h6" fontWeight={900}>Nenhum fluxo ainda</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
                  Crie um fluxo do zero, por prompt, ou comece de um template na aba ao lado.
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={novo} sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800, mt: 1 }}>
                  Novo workflow
                </Button>
              </Stack>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
                {regulares.map(card)}
              </Box>
            )}
          </>
        )}

        {aba === 1 && (
          <Stack spacing={4}>
            {/* Templates pessoais — a coleção que o usuário constrói e evolui */}
            <Box>
              <Stack direction="row" alignItems="baseline" spacing={1.5} mb={1}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>Seus templates</Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>qualquer fluxo vira template pelo menu ⋮ → "Salvar como template"</Typography>
              </Stack>
              {loading ? (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} sx={{ color: TEAL }} /></Stack>
              ) : templates.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                  <Typography fontSize={13} color="text.secondary">
                    Você ainda não salvou templates. Monte um fluxo que funcionou e salve — sua coleção evolui com o uso.
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
                  {templates.map(card)}
                </Box>
              )}
            </Box>

            {/* Galeria brandcode (catálogo embutido — ponto de partida) */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>Galeria brandcode</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                {WORKFLOW_TEMPLATES.map(t => {
                  const cor = TEMPLATE_CAT_COLOR[t.categoria] || TEAL
                  return (
                    <Paper key={t.id} variant="outlined" onClick={() => usarBuiltin(t)}
                      sx={{ borderRadius: 2, overflow: 'hidden', cursor: 'pointer', '&:hover': { borderColor: cor } }}>
                      <Box sx={{ position: 'relative', aspectRatio: '16 / 10', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${cor}26 0%, ${cor}0D 100%)` }}>
                        <Chip label={t.categoria} size="small" sx={{ position: 'absolute', top: 6, left: 6, height: 18, fontSize: 9, fontWeight: 800, bgcolor: cor, color: '#fff' }} />
                        <AccountTreeOutlinedIcon sx={{ fontSize: 30, color: cor }} />
                      </Box>
                      <Box sx={{ px: 1.5, py: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nome}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descricao}</Typography>
                      </Box>
                    </Paper>
                  )
                })}
              </Box>
            </Box>
          </Stack>
        )}
      </Box>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu?.wf?.is_template && <MenuItem onClick={() => usarTemplate(menu.wf)} sx={{ fontSize: 13, fontWeight: 700, color: TEAL }}>Usar template</MenuItem>}
        <MenuItem onClick={() => { setMenu(null); abrir(menu.wf) }} sx={{ fontSize: 13 }}>Abrir</MenuItem>
        <MenuItem onClick={() => renomear(menu.wf)} sx={{ fontSize: 13 }}>Renomear</MenuItem>
        <MenuItem onClick={() => duplicar(menu.wf)} sx={{ fontSize: 13 }}>Duplicar</MenuItem>
        <MenuItem onClick={() => toggleTemplate(menu.wf)} sx={{ fontSize: 13 }}>{menu?.wf?.is_template ? 'Remover dos templates' : 'Salvar como template'}</MenuItem>
        <MenuItem onClick={() => excluir(menu.wf)} sx={{ fontSize: 13, color: '#E8185A' }}>Excluir</MenuItem>
      </Menu>
    </Box>
  )
}
