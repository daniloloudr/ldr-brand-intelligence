import { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, CardActionArea, Button,
  CircularProgress, Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CampaignIcon from '@mui/icons-material/Campaign'
import { supabase } from '../../lib/supabase'
import { fmtDate } from '../../lib/helpers'

function verdictColor(status, verdict) {
  if (status === 'approved' || verdict?.aprovado === true)  return '#0D9E7A'
  if (status === 'rejected' || verdict?.aprovado === false) return '#E8185A'
  if (status === 'pending') return '#EF9F27'
  return '#8A9AB0'
}

function verdictLabel(status, verdict) {
  if (status === 'approved' || verdict?.aprovado === true)  return 'Aprovada'
  if (status === 'rejected' || verdict?.aprovado === false) return 'Reprovada'
  if (status === 'pending') return 'Aguardando análise'
  return status
}

function CampaignCard({ campaign, onClick }) {
  const verdict = campaign.verdict
  const color = verdictColor(campaign.status, verdict)
  const label = verdictLabel(campaign.status, verdict)
  const score = verdict?.score_geral

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', borderLeft: `3px solid ${color}` }}>
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography fontWeight={800} fontSize={14}>{campaign.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {score != null && (
                <Typography fontWeight={900} fontSize={16} sx={{ color }}>{score}/10</Typography>
              )}
              <Chip label={label} size="small"
                sx={{ bgcolor: color + '18', color, fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
            </Box>
          </Box>
          <Typography variant="caption" color="text.disabled">
            Submetida em {fmtDate(campaign.created_at)}
            {campaign.reviewed_at ? ` · Analisada em ${fmtDate(campaign.reviewed_at)}` : ''}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export function Campaigns({ brandId }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!brandId) return
    load()
  }, [brandId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
    setCampaigns(data || [])
    setLoading(false)
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">Aprovação de campanhas</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Avalie se suas peças estão alinhadas com o brand book antes de publicar.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => { window.location.hash = `${window.location.hash.split('/campaigns')[0]}/campaigns/new` }}
          sx={{ fontWeight: 800, flexShrink: 0 }}
        >
          Nova campanha
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : campaigns.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
          <CampaignIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
          <Typography fontWeight={800} mb={1}>Nenhuma campanha submetida</Typography>
          <Typography variant="body2" color="text.secondary" mb={3} maxWidth={360} mx="auto">
            Submeta peças de comunicação para que a IA avalie a aderência ao brand book.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { window.location.hash = `${window.location.hash.split('/campaigns')[0]}/campaigns/new` }}
          >
            Submeter primeira campanha
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {campaigns.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onClick={() => {
                const base = window.location.hash.split('/campaigns')[0]
                window.location.hash = `${base}/campaigns/${c.id}`
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
