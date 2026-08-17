import { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, CircularProgress, Button,
  Chip, LinearProgress, Paper, Divider, Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { supabase } from '../../lib/supabase'
import { fmtDate, navigate, currentPath } from '../../lib/helpers'
import { PageHeader } from '../../components/shell/PageHeader'
import { PALETTE } from '../../lib/theme'

const DIMENSOES = [
  { key: 'tom_voz',        label: 'Tom de voz'         },
  { key: 'valores',        label: 'Consistência de valores' },
  { key: 'vocabulario',    label: 'Vocabulário'         },
  { key: 'posicionamento', label: 'Posicionamento'      },
]

function scoreColor(score) {
  if (score >= 7) return PALETTE.data.positivo
  if (score >= 5) return PALETTE.data.atencao
  return PALETTE.data.critico
}

function DimensaoRow({ label, dim }) {
  if (!dim) return null
  const color = scoreColor(dim.score)
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        {dim.ok
          ? <CheckCircleIcon sx={{ fontSize: 16, color: PALETTE.data.positivo }} />
          : <CancelIcon      sx={{ fontSize: 16, color: PALETTE.data.critico }} />}
        <Typography variant="caption" fontWeight={800} textTransform="uppercase" letterSpacing="0.08em">
          {label}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography fontWeight={900} sx={{ color, fontSize: 16 }}>{dim.score}/10</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={(dim.score / 10) * 100}
        sx={{ height: 4, mb: 0.75, borderRadius: 1, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: color } }}
      />
      {dim.nota && (
        <Typography variant="caption" color="text.secondary">{dim.nota}</Typography>
      )}
    </Box>
  )
}

export function CampaignDetail({ brandId, campaignId }) {
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!campaignId) return
    load()
  }, [campaignId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    setCampaign(data)
    setLoading(false)
  }

  function goBack() {
    navigate(currentPath().replace(`/${campaignId}`, ''))
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  if (!campaign) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Campanha não encontrada.</Alert>
      </Box>
    )
  }

  const verdict = campaign.verdict
  const approved = verdict?.aprovado === true || campaign.status === 'approved'
  const score = verdict?.score_geral
  const scoreColor_ = score != null ? scoreColor(score) : PALETTE.neutral[400]
  const content = campaign.content || {}

  return (
    <Box>
      <PageHeader
        title={campaign.title}
        subtitle={`Submetida em ${fmtDate(campaign.created_at)}`}
        action={
          <Button startIcon={<ArrowBackIcon />} onClick={goBack} sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Campanhas
          </Button>
        }
      />
    <Box sx={{ display: 'flex', gap: 3, p: 4, alignItems: 'flex-start' }}>

      {/* ── Esquerda: conteúdo ── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>

        <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <CardContent>
            <Typography variant="overline" color="text.disabled" display="block" mb={1.5}>
              Conteúdo submetido
            </Typography>
            {content.canal && (
              <Chip label={content.canal} size="small" sx={{ mb: 1.5, fontWeight: 700 }} />
            )}
            {content.objetivo && (
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                <strong>Objetivo:</strong> {content.objetivo}
              </Typography>
            )}
            <Paper sx={{ p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {content.copy || '(sem conteúdo)'}
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1.5, display: 'block' }}>
              Submetida em {fmtDate(campaign.created_at)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ── Direita: veredicto ── */}
      <Box sx={{ width: 360, flexShrink: 0 }}>
        {!verdict ? (
          <Card sx={{ border: '1px solid', borderColor: 'divider', p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Sem veredicto registrado.</Typography>
          </Card>
        ) : (
          <Card sx={{
            border: '1px solid',
            borderColor: approved ? PALETTE.data.positivo : PALETTE.data.critico,
            borderTop: `3px solid ${approved ? PALETTE.data.positivo : PALETTE.data.critico}`,
          }}>
            <CardContent>
              {/* Score geral */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                {approved
                  ? <CheckCircleIcon sx={{ fontSize: 40, color: PALETTE.data.positivo, mb: 1 }} />
                  : <CancelIcon      sx={{ fontSize: 40, color: PALETTE.data.critico, mb: 1 }} />}
                <Typography variant="overline" color="text.disabled" display="block">
                  Veredicto IA
                </Typography>
                <Typography variant="h4" sx={{ color: scoreColor_, lineHeight: 1.1 }}>
                  {score != null ? `${score}/10` : '—'}
                </Typography>
                <Chip
                  label={approved ? 'Campanha aprovada' : 'Campanha reprovada'}
                  sx={{
                    mt: 1,
                    bgcolor: (approved ? PALETTE.data.positivo : PALETTE.data.critico) + '18',
                    color: approved ? PALETTE.data.positivo : PALETTE.data.critico,
                    fontWeight: 800,
                  }}
                />
              </Box>

              {/* Resumo */}
              {verdict.resumo && (
                <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {verdict.resumo}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Dimensões */}
              <Typography variant="overline" color="text.disabled" display="block" mb={2}>
                Análise por dimensão
              </Typography>
              {DIMENSOES.map(({ key, label }) => (
                <DimensaoRow key={key} label={label} dim={verdict.dimensoes?.[key]} />
              ))}

              {/* Palavras problemáticas */}
              {verdict.palavras_problematicas?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" color="text.disabled" display="block" mb={1.5}>
                    Termos problemáticos
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.75px' }}>
                    {verdict.palavras_problematicas.map(p => (
                      <Chip key={p} label={p} size="small"
                        sx={{ bgcolor: 'rgba(232,24,90,0.08)', color: PALETTE.data.critico, fontWeight: 700, fontSize: '0.65rem' }} />
                    ))}
                  </Box>
                </>
              )}

              {/* Sugestões */}
              {verdict.sugestoes?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" color="text.disabled" display="block" mb={1.5}>
                    Sugestões de melhoria
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {verdict.sugestoes.map((s, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(127,119,221,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 900, color: PALETTE.data.neutro }}>{i + 1}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{s}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              {campaign.reviewed_at && (
                <Typography variant="caption" color="text.disabled" display="block">
                  Analisada em {fmtDate(campaign.reviewed_at)}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
    </Box>
  )
}
