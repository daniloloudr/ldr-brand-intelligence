import { useState, useEffect } from 'react'
import { Box, Paper, Typography, Stack, CircularProgress, Chip, LinearProgress, Divider } from '@mui/material'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A', CORAL = '#E8185A', PURPLE = '#7F77DD'
const pct = n => (n == null ? '—' : `${Math.round(n * 100)}%`)
const shortProvider = p => (p || '?').split('/').slice(-2).join('/')
const SIGNAL_LABEL = { image_vote: 'Votos em peças', campaign_verdict: 'Veredictos de campanha', diagnostic: 'Diagnósticos', listening_sentiment: 'Sentimento', brandbook_edit: 'Edições do brand book' }

export function BrandIntelligence({ brandId }) {
  const [loading, setLoading]     = useState(true)
  const [versions, setVersions]   = useState([])
  const [votes, setVotes]         = useState([])
  const [signalStats, setStats]   = useState({})

  useEffect(() => { load() }, [brandId])

  async function load() {
    setLoading(true)
    const [{ data: bi }, { data: gens }, { data: sigs }] = await Promise.all([
      supabase.from('brand_intelligence').select('versao, confianca_media, gerado_de, modelo, created_at')
        .eq('brand_id', brandId).order('versao', { ascending: true }),
      supabase.from('studio_generations').select('provider, feedback').eq('brand_id', brandId).not('feedback', 'is', null),
      supabase.from('brand_signals').select('tipo').eq('brand_id', brandId),
    ])
    setVersions(bi || [])
    setVotes(gens || [])
    const st = {}; for (const s of sigs || []) st[s.tipo] = (st[s.tipo] || 0) + 1
    setStats(st)
    setLoading(false)
  }

  const current = versions[versions.length - 1]
  const model   = current?.modelo
  const ups     = votes.filter(v => v.feedback === 'up').length
  const downs   = votes.filter(v => v.feedback === 'down').length
  const approval = (ups + downs) ? ups / (ups + downs) : null
  const totalSignals = Object.values(signalStats).reduce((a, b) => a + b, 0)

  const byProvider = {}
  for (const v of votes) { const p = v.provider || '?'; (byProvider[p] ??= { up: 0, total: 0 }).total++; if (v.feedback === 'up') byProvider[p].up++ }
  const providerRates = Object.entries(byProvider)
    .map(([p, x]) => ({ provider: p, rate: x.up / x.total, total: x.total }))
    .sort((a, b) => b.rate - a.rate)

  const trend = versions.map(v => ({ v: `v${v.versao}`, confianca: v.confianca_media != null ? Math.round(v.confianca_media * 100) : null }))

  const Card = ({ children, sx }) => <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, ...sx }}>{children}</Paper>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Inteligência da Marca" subtitle="O modelo vivo que aprende com o uso" />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : !current ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <PsychologyOutlinedIcon sx={{ fontSize: 46, color: 'text.disabled' }} />
            <Typography variant="h6" fontWeight={900}>A marca ainda não começou a aprender</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
              Gere peças no Studio e avalie com 👍/👎. Quando houver sinais suficientes, o destilador cria a primeira versão do modelo vivo — e a assertividade aparece aqui.
            </Typography>
            {totalSignals > 0 && <Chip label={`${totalSignals} sinais capturados, aguardando destilação`} size="small" />}
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            {/* Hero — métricas de topo */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <Card><Typography fontSize={11} fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">Versão atual</Typography><Typography fontWeight={900} fontSize={28} sx={{ color: PURPLE }}>v{current.versao}</Typography></Card>
              <Card><Typography fontSize={11} fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">Confiança média</Typography><Typography fontWeight={900} fontSize={28} sx={{ color: TEAL }}>{pct(current.confianca_media)}</Typography></Card>
              <Card><Typography fontSize={11} fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">Aprovação (👍)</Typography><Typography fontWeight={900} fontSize={28}>{pct(approval)}</Typography><Typography fontSize={11} color="text.secondary">{ups}👍 · {downs}👎</Typography></Card>
              <Card><Typography fontSize={11} fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">Sinais capturados</Typography><Typography fontWeight={900} fontSize={28}>{totalSignals}</Typography></Card>
            </Box>

            {/* Evolução da confiança */}
            {trend.length > 1 && (
              <Card>
                <Typography fontSize={13} fontWeight={800} mb={1}>Evolução da assertividade</Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="v" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <RTooltip formatter={v => `${v}%`} />
                      <Line type="monotone" dataKey="confianca" stroke={TEAL} strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            )}

            {/* Win-rate por provider */}
            {providerRates.length > 0 && (
              <Card>
                <Typography fontSize={13} fontWeight={800} mb={1.5}>Win-rate por modelo de geração</Typography>
                <Stack spacing={1.25}>
                  {providerRates.map(p => (
                    <Box key={p.provider}>
                      <Stack direction="row" justifyContent="space-between" mb={0.25}>
                        <Typography fontSize={12} fontWeight={600}>{shortProvider(p.provider)}</Typography>
                        <Typography fontSize={12} fontWeight={800} sx={{ color: p.rate >= 0.5 ? TEAL : CORAL }}>{pct(p.rate)} <Typography component="span" fontSize={10} color="text.secondary">({p.total})</Typography></Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={p.rate * 100} sx={{ height: 6, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: p.rate >= 0.5 ? TEAL : CORAL } }} />
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}

            {/* Modelo vivo atual */}
            <Card>
              <Typography fontSize={13} fontWeight={800} mb={1.5}>O que a marca aprendeu (v{current.versao})</Typography>
              <Stack spacing={2}>
                <ModelList title="✅ Visual aprovado" items={(model?.preferencias_visuais?.aprovado || []).map(a => a?.padrao)} color={TEAL} />
                <ModelList title="❌ Visual reprovado" items={(model?.preferencias_visuais?.reprovado || []).map(a => a?.padrao)} color={CORAL} />
                <ModelList title="Faça" items={model?.do_dont?.do} color={TEAL} />
                <ModelList title="Não faça" items={model?.do_dont?.dont} color={CORAL} />
                <ModelList title="Fatos consolidados" items={(model?.fatos || []).map(f => f?.fato)} />
              </Stack>
            </Card>

            {/* Proveniência */}
            <Card>
              <Typography fontSize={13} fontWeight={800} mb={1}>De onde vem o aprendizado</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(signalStats).sort((a, b) => b[1] - a[1]).map(([tipo, n]) => (
                  <Chip key={tipo} label={`${SIGNAL_LABEL[tipo] || tipo}: ${n}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                ))}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Typography fontSize={11} color="text.secondary">
                {versions.length} versão(ões) destilada(s). Última: {new Date(current.created_at).toLocaleString('pt-BR')} · {current.gerado_de?.count || 0} sinais incorporados.
              </Typography>
            </Card>
          </Stack>
        )}
      </Box>
    </Box>
  )
}

function ModelList({ title, items, color }) {
  const list = (items || []).filter(Boolean)
  if (!list.length) return null
  return (
    <Box>
      <Typography fontSize={11} fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.06em" mb={0.5}>{title}</Typography>
      <Stack spacing={0.5}>
        {list.map((t, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color || 'text.disabled', mt: '7px', flexShrink: 0 }} />
            <Typography fontSize={13} color="text.primary">{t}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}
