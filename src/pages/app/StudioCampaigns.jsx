import { useState, useRef, useEffect } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A', CORAL = '#E8185A'
const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1',   ar: '1 / 1' },
  { v: '9:16', label: 'Story 9:16', ar: '9 / 16' },
  { v: '16:9', label: 'Banner 16:9', ar: '16 / 9' },
  { v: '4:5',  label: 'Retrato 4:5', ar: '4 / 5' },
]
const ar = f => (FORMATOS.find(x => x.v === f)?.ar) || '1 / 1'

export function StudioCampaigns({ brandId }) {
  const [conceito, setConceito] = useState('')
  const [selected, setSelected] = useState(['1:1', '9:16', '16:9'])
  const [generating, setGenerating] = useState(false)
  const [pieces, setPieces] = useState([])   // { id, formato, status, image_url, error }
  const [msg, setMsg] = useState('')
  const pollRef = useRef(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function toggle(v) {
    setSelected(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
  }

  async function gerar() {
    if (!conceito.trim()) return setMsg('Descreva o conceito da campanha.')
    if (!selected.length) return setMsg('Selecione ao menos um formato.')
    setMsg(''); setGenerating(true); setPieces([])

    const { data: { session } } = await supabase.auth.getSession()
    let json
    try {
      const res = await fetch('/.netlify/functions/studio-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brand_id: brandId, conceito: conceito.trim(), formatos: selected }),
      })
      json = await res.json()
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
    } catch (e) {
      setMsg(e.message); setGenerating(false); return
    }

    setPieces(json.generations.map(g => ({ ...g, status: 'processing', image_url: null })))
    pollCampaign(json.campaign_id)
  }

  function pollCampaign(campaignId) {
    if (pollRef.current) clearInterval(pollRef.current)
    const start = Date.now()
    pollRef.current = setInterval(async () => {
      if (Date.now() - start > 240_000) { clearInterval(pollRef.current); setGenerating(false); return }
      const { data } = await supabase.from('studio_generations')
        .select('id, formato, status, image_url, error').eq('campaign_id', campaignId)
      if (!data) return
      setPieces(data.map(d => ({ id: d.id, formato: d.formato, status: d.status, image_url: d.image_url, error: d.error })))
      if (data.length && data.every(d => d.status !== 'processing')) {
        clearInterval(pollRef.current); setGenerating(false)
      }
    }, 3000)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader
        title="Studio · Campanhas"
        subtitle="Um conceito, várias peças coerentes"
        action={
          <Button size="small" startIcon={<AccountTreeOutlinedIcon />}
            onClick={() => { window.location.hash = `#/app/brands/${brandId}/studio` }}
            sx={{ color: 'text.secondary' }}>Canvas</Button>
        }
      />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        {/* Brief */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
            Conceito da campanha
          </Typography>
          <TextField
            value={conceito} onChange={e => setConceito(e.target.value)}
            placeholder="Ex: campanha de lançamento da nova fase da marca — tom acolhedor, foco em conexão e movimento"
            multiline minRows={2} maxRows={5} fullWidth disabled={generating}
            sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 14 } }}
          />
          <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
            Formatos
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
            {FORMATOS.map(f => (
              <Chip key={f.v} label={f.label} clickable disabled={generating}
                onClick={() => toggle(f.v)}
                variant={selected.includes(f.v) ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, ...(selected.includes(f.v) && { bgcolor: TEAL, color: '#fff', '&:hover': { bgcolor: '#0B8567' } }) }}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button variant="contained" startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
              onClick={gerar} disabled={generating}
              sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}>
              {generating ? 'Gerando campanha…' : `Gerar campanha (${selected.length})`}
            </Button>
            {msg && <Typography sx={{ fontSize: 13, color: CORAL }}>{msg}</Typography>}
          </Stack>
        </Paper>

        {/* Galeria */}
        {pieces.length > 0 && (
          <>
            <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
              Peças da campanha
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
              {pieces.map(p => (
                <Paper key={p.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ aspectRatio: ar(p.formato), bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {p.status === 'done' && p.image_url
                      ? <Box component="img" src={p.image_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : p.status === 'error'
                      ? <Typography sx={{ fontSize: 11, color: CORAL, px: 2, textAlign: 'center' }}>{p.error || 'erro'}</Typography>
                      : <Stack alignItems="center" spacing={1}><CircularProgress size={18} sx={{ color: TEAL }} /><Typography sx={{ fontSize: 10, color: 'text.disabled' }}>gerando…</Typography></Stack>}
                  </Box>
                  <Box sx={{ px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{FORMATOS.find(f => f.v === p.formato)?.label || p.formato}</Typography>
                    {p.status === 'done' && <Typography sx={{ fontSize: 10, color: TEAL, fontWeight: 700 }}>✓</Typography>}
                  </Box>
                </Paper>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}
