// Approvals — fila de aprovação do Studio (decisão Q5: TUDO).
// v1: peças geradas sem julgamento (👍/👎) + campanhas concluídas aguardando
// aprovação. Cada decisão aqui vira SINAL para o cérebro (triggers 025).
import { useState, useEffect } from 'react'
import { Box, Paper, Typography, Stack, CircularProgress, Chip, IconButton, Tooltip, Button } from '@mui/material'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'
import { PALETTE } from '../../lib/theme'

const TEAL = PALETTE.data.positivo, CORAL = PALETTE.data.critico

export function StudioApprovals({ brandId }) {
  const [pecas, setPecas] = useState(null)
  const [camps, setCamps] = useState([])
  const [acting, setActing] = useState({})

  useEffect(() => {
    if (!brandId) return
    let on = true
    ;(async () => {
      const [{ data: gens }, { data: cs }] = await Promise.all([
        supabase.from('studio_generations')
          .select('id, image_url, thumbnail_url, formato, media_type, provider, created_at')
          .eq('brand_id', brandId).eq('status', 'done').is('feedback', null)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false }).limit(40),
        supabase.from('studio_campaigns').select('id, nome, conceito, status, created_at')
          .eq('brand_id', brandId).eq('status', 'concluida').order('created_at', { ascending: false }),
      ])
      if (!on) return
      setPecas(gens || [])
      setCamps(cs || [])
    })()
    return () => { on = false }
  }, [brandId])

  async function votar(p, voto) {
    setActing(a => ({ ...a, [p.id]: true }))
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('studio_generations')
      .update({ feedback: voto, feedback_at: new Date().toISOString(), feedback_by: user?.id })
      .eq('id', p.id)
    setActing(a => ({ ...a, [p.id]: false }))
    if (!error) setPecas(prev => prev.filter(x => x.id !== p.id))
  }

  async function aprovarCampanha(c) {
    setActing(a => ({ ...a, [c.id]: true }))
    const { error } = await supabase.from('studio_campaigns').update({ status: 'aprovada' }).eq('id', c.id)
    setActing(a => ({ ...a, [c.id]: false }))
    if (!error) setCamps(prev => prev.filter(x => x.id !== c.id))
  }

  const vazio = pecas !== null && pecas.length === 0 && camps.length === 0

  return (
    <Box>
      <PageHeader title="Aprovações" subtitle="Tudo que espera o seu julgamento — cada aprovação ensina a marca" />
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>
        {pecas === null ? (
          <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: 'primary.main' }} /></Stack>
        ) : vazio ? (
          <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 36, color: TEAL, mb: 1 }} />
            <Typography variant="h6">Fila zerada</Typography>
            <Typography variant="body2" color="text.secondary">Nenhuma peça ou campanha aguardando aprovação. Cada julgamento feito aqui vira aprendizado da marca.</Typography>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {camps.length > 0 && (
              <Box>
                <Typography variant="subtitle2" mb={1.5}>Campanhas concluídas — aguardando aprovação ({camps.length})</Typography>
                <Stack spacing={1.5}>
                  {camps.map(c => (
                    <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">{c.nome}</Typography>
                        {c.conceito && <Typography variant="body2" color="text.secondary" noWrap>{c.conceito}</Typography>}
                      </Box>
                      <Button size="small" variant="contained" disabled={acting[c.id]} onClick={() => aprovarCampanha(c)}
                        sx={{ fontWeight: 800, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}>
                        {acting[c.id] ? 'Aprovando…' : 'Aprovar campanha'}
                      </Button>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {pecas.length > 0 && (
              <Box>
                <Typography variant="subtitle2" mb={1.5}>Peças sem julgamento ({pecas.length})</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5px' }}>
                  {pecas.map(p => (
                    <Paper key={p.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default' }}>
                        {p.media_type === 'video'
                          ? <Box component="video" src={p.image_url} muted loop playsInline
                              onMouseOver={e => e.currentTarget.play().catch(() => {})} onMouseOut={e => e.currentTarget.pause()}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <Box component="img" src={p.thumbnail_url || p.image_url} alt="" loading="lazy"
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </Box>
                      <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5 }}>
                        <Chip label={p.formato || p.media_type} size="small" sx={{ fontSize: 10, fontWeight: 700, height: 18 }} />
                        <Box flex={1} />
                        <Tooltip title="Aprovar — ensina o que funciona">
                          <Typography component="span"><IconButton size="small" disabled={acting[p.id]} onClick={() => votar(p, 'up')}>
                            <ThumbUpOutlinedIcon sx={{ fontSize: 17, color: TEAL }} /></IconButton></Typography>
                        </Tooltip>
                        <Tooltip title="Reprovar — ensina o que evitar">
                          <Typography component="span"><IconButton size="small" disabled={acting[p.id]} onClick={() => votar(p, 'down')}>
                            <ThumbDownOutlinedIcon sx={{ fontSize: 17, color: CORAL }} /></IconButton></Typography>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  )
}
