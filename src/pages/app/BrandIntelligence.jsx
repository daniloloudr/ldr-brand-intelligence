import { useState, useEffect } from 'react'
import { Box, Paper, Typography, Stack, CircularProgress, Chip, LinearProgress, Divider, Tooltip } from '@mui/material'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A', CORAL = '#E8185A', PURPLE = '#7F77DD'
const pct = n => (n == null ? '—' : `${Math.round(n * 100)}%`)
const shortProvider = p => (p || '?').split('/').slice(-2).join('/')
const SIGNAL_LABEL = { image_vote: 'Avaliações de peças', campaign_verdict: 'Campanhas', diagnostic: 'Diagnósticos', listening_sentiment: 'Sentimento do público', brandbook_edit: 'Ajustes no brand book', assistant_correction: 'Ensinamentos no Assistant', competitive: 'Movimentos de mercado', content_used: 'Conteúdos adotados' }

// ── Diff entre versões (trilho D) — comparação semântica leve, client-side ──
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
const wordSet = s => new Set(norm(s).split(' ').filter(w => w.length > 3))
// Dois itens são "o mesmo" se o texto normalizado bate OU compartilham >50% das palavras
// significativas (o destilador reescreve — evita marcar reformulação como novidade).
function similar(a, b) {
  const wa = wordSet(a), wb = wordSet(b)
  if (!wa.size || !wb.size) return norm(a) === norm(b)
  let inter = 0; for (const w of wa) if (wb.has(w)) inter++
  return inter / (wa.size + wb.size - inter) >= 0.5
}
function diffList(curr, prev) {
  const c = (curr || []).filter(Boolean), p = (prev || []).filter(Boolean)
  return {
    added:   c.filter(x => !p.some(y => similar(x, y))),
    removed: p.filter(y => !c.some(x => similar(x, y))),
  }
}

// Título de seção com dica explicativa (?)
const SectionTitle = ({ children, help }) => (
  <Stack direction="row" spacing={0.75} alignItems="center" mb={1}>
    <Typography fontSize={13} fontWeight={800}>{children}</Typography>
    {help && <Tooltip title={help}><HelpOutlineIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></Tooltip>}
  </Stack>
)

export function BrandIntelligence({ brandId: brandIdProp }) {
  const { workspace } = useWorkspace()
  const [brandId, setBrandId]     = useState(brandIdProp || null)
  const [loading, setLoading]     = useState(true)
  const [versions, setVersions]   = useState([])
  const [votes, setVotes]         = useState([])
  const [signalStats, setStats]   = useState({})

  // Resolve a marca do workspace (um acesso = uma marca) quando não vem por prop
  useEffect(() => {
    let on = true
    if (brandIdProp) { setBrandId(brandIdProp); return }
    if (!workspace?.id) return
    supabase.from('brands').select('id').eq('workspace_id', workspace.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => { if (on) setBrandId(data?.id || null); if (on && !data) setLoading(false) })
    return () => { on = false }
  }, [brandIdProp, workspace?.id])

  useEffect(() => { if (brandId) load() }, [brandId])

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

  // ── Diff da última versão vs a anterior (trilho D) ──
  const prev = versions.length > 1 ? versions[versions.length - 2] : null
  const pm = prev?.modelo
  const facetDiffs = pm ? [
    { label: '✅ Visual que funciona', color: TEAL,  ...diffList((model?.preferencias_visuais?.aprovado  || []).map(a => a?.padrao), (pm?.preferencias_visuais?.aprovado  || []).map(a => a?.padrao)) },
    { label: '❌ Visual a evitar',     color: CORAL, ...diffList((model?.preferencias_visuais?.reprovado || []).map(a => a?.padrao), (pm?.preferencias_visuais?.reprovado || []).map(a => a?.padrao)) },
    { label: 'Faça',                   color: TEAL,  ...diffList(model?.do_dont?.do,   pm?.do_dont?.do) },
    { label: 'Não faça',               color: CORAL, ...diffList(model?.do_dont?.dont, pm?.do_dont?.dont) },
    { label: 'Fatos consolidados',     color: null,  ...diffList((model?.fatos || []).map(f => f?.fato), (pm?.fatos || []).map(f => f?.fato)) },
  ].filter(f => f.added.length || f.removed.length) : []
  const confDelta = pm && current?.confianca_media != null && prev.confianca_media != null
    ? Math.round((current.confianca_media - prev.confianca_media) * 100) : null
  const vozChanged = pm && model?.voz?.valor && pm?.voz?.valor && !similar(model.voz.valor, pm.voz.valor)
  const posChanged = pm && model?.posicionamento?.valor && pm?.posicionamento?.valor && !similar(model.posicionamento.valor, pm.posicionamento.valor)
  const hasDiff = facetDiffs.length || vozChanged || posChanged || (confDelta != null && confDelta !== 0)

  const Card = ({ children, sx }) => <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, ...sx }}>{children}</Paper>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="IA LOUDR — Inteligência da Marca" subtitle="O cérebro que aprende a sua marca com o uso" />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>
        {/* ── Explicação (sempre visível) ── */}
        <Paper sx={{ p: 3, mb: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <PsychologyOutlinedIcon sx={{ fontSize: 26, color: PURPLE, mt: 0.25 }} />
            <Box>
              <Typography fontWeight={900} fontSize={16} mb={0.5}>O que é a Inteligência da Marca</Typography>
              <Typography fontSize={13.5} color="text.secondary" sx={{ lineHeight: 1.6 }}>
                É o núcleo do LOUDR. A cada peça que você gera e avalia, campanha que aprova e diagnóstico que roda,
                o LOUDR entende mais profundamente <strong>o que é a sua marca</strong> — e aplica esse aprendizado
                <strong> automaticamente</strong> em tudo que cria: imagens, vídeos e no Brand Assistant.
                Quanto mais você usa e avalia, mais assertivo o LOUDR fica com a sua marca.
              </Typography>
              <Typography fontSize={12.5} sx={{ mt: 1.25, color: TEAL, fontWeight: 700 }}>
                💡 Como deixar mais inteligente: avalie suas peças no Studio com 👍 / 👎 — cada avaliação ensina a marca.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : !current ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 6, textAlign: 'center' }}>
            <PsychologyOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography variant="h6" fontWeight={900}>A sua marca ainda está se formando</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
              A Inteligência começa a se formar assim que você gera e avalia peças. Vá ao Studio, gere e dê 👍/👎 —
              quando houver evidência suficiente, o LOUDR forma a primeira leitura da sua marca e ela aparece aqui,
              ficando mais assertiva com o tempo.
            </Typography>
            {totalSignals > 0 && <Chip label={`${totalSignals} avaliações já registradas — em breve viram aprendizado`} size="small" />}
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            {/* Métricas de topo */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <Card>
                <SectionTitle help="Cada avanço no aprendizado da sua marca gera uma versão nova.">Versão</SectionTitle>
                <Typography fontWeight={900} fontSize={28} sx={{ color: PURPLE }}>v{current.versao}</Typography>
              </Card>
              <Card>
                <SectionTitle help="O quanto a inteligência está segura do que aprendeu sobre a sua marca. Sobe conforme as evidências se confirmam.">Confiança</SectionTitle>
                <Typography fontWeight={900} fontSize={28} sx={{ color: TEAL }}>{pct(current.confianca_media)}</Typography>
              </Card>
              <Card>
                <SectionTitle help="A fração das peças que você aprovou — reflete o quanto o LOUDR já acerta o tom da sua marca.">Aprovação</SectionTitle>
                <Typography fontWeight={900} fontSize={28}>{pct(approval)}</Typography>
                <Typography fontSize={11} color="text.secondary">{ups} 👍 · {downs} 👎</Typography>
              </Card>
              <Card>
                <SectionTitle help="Cada avaliação, campanha e diagnóstico é uma evidência que alimenta o aprendizado.">Evidências</SectionTitle>
                <Typography fontWeight={900} fontSize={28}>{totalSignals}</Typography>
              </Card>
            </Box>

            {/* Evolução */}
            {trend.length > 1 ? (
              <Card>
                <SectionTitle help="A prova de que a sua marca fica mais assertiva a cada versão — não é promessa, é medida.">Evolução da assertividade</SectionTitle>
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
            ) : (
              <Card sx={{ bgcolor: 'action.hover' }}>
                <Typography fontSize={12.5} color="text.secondary">
                  📈 <strong>Evolução da assertividade</strong> — o gráfico da confiança ao longo do tempo aparece a partir da segunda versão. Continue gerando e avaliando para acompanhar a marca ficar mais assertiva.
                </Typography>
              </Card>
            )}

            {/* Win-rate por modelo */}
            {providerRates.length > 0 && (
              <Card>
                <SectionTitle help="Quais motores de geração entregam os melhores resultados para a SUA marca. O LOUDR usa isso para priorizar o que mais funciona.">Desempenho por modelo de geração</SectionTitle>
                <Stack spacing={1.25}>
                  {providerRates.map(p => (
                    <Box key={p.provider}>
                      <Stack direction="row" justifyContent="space-between" mb={0.25}>
                        <Typography fontSize={12} fontWeight={600}>{shortProvider(p.provider)}</Typography>
                        <Typography fontSize={12} fontWeight={800} sx={{ color: p.rate >= 0.5 ? TEAL : CORAL }}>{pct(p.rate)} <Typography component="span" fontSize={10} color="text.secondary">({p.total} aval.)</Typography></Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={p.rate * 100} sx={{ height: 6, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: p.rate >= 0.5 ? TEAL : CORAL } }} />
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}

            {/* O que a marca aprendeu */}
            <Card>
              <SectionTitle help="Os padrões que o LOUDR já reconhece como 'a cara da sua marca' — aplicados automaticamente em cada nova peça que você gera.">O que a marca já aprendeu (v{current.versao})</SectionTitle>
              <Stack spacing={2}>
                <ModelList title="✅ Visual que funciona" items={(model?.preferencias_visuais?.aprovado || []).map(a => a?.padrao)} color={TEAL} />
                <ModelList title="❌ Visual a evitar" items={(model?.preferencias_visuais?.reprovado || []).map(a => a?.padrao)} color={CORAL} />
                <ModelList title="Faça" items={model?.do_dont?.do} color={TEAL} />
                <ModelList title="Não faça" items={model?.do_dont?.dont} color={CORAL} />
                <ModelList title="Fatos consolidados" items={(model?.fatos || []).map(f => f?.fato)} />
              </Stack>
            </Card>

            {/* O que mudou (diff entre versões) */}
            {prev && hasDiff && (
              <Card>
                <SectionTitle help="O que a inteligência da sua marca passou a entender nesta última versão, em relação à anterior. É a evolução, item a item.">
                  O que mudou na v{current.versao}
                </SectionTitle>
                <Stack spacing={2}>
                  {confDelta != null && confDelta !== 0 && (
                    <Chip
                      size="small"
                      label={`Confiança ${confDelta > 0 ? '+' : ''}${confDelta} pts vs v${prev.versao}`}
                      sx={{ alignSelf: 'flex-start', fontWeight: 800, bgcolor: confDelta > 0 ? 'rgba(13,158,122,0.12)' : 'rgba(232,24,90,0.10)', color: confDelta > 0 ? TEAL : CORAL }}
                    />
                  )}
                  {(vozChanged || posChanged) && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {posChanged && <Chip size="small" variant="outlined" label="Posicionamento recalibrado" sx={{ fontWeight: 700 }} />}
                      {vozChanged && <Chip size="small" variant="outlined" label="Voz recalibrada" sx={{ fontWeight: 700 }} />}
                    </Stack>
                  )}
                  {facetDiffs.map(f => <DiffBlock key={f.label} {...f} />)}
                </Stack>
              </Card>
            )}

            {/* Proveniência */}
            <Card>
              <SectionTitle help="As fontes de evidência que formam o aprendizado da sua marca.">De onde vem esse aprendizado</SectionTitle>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(signalStats).sort((a, b) => b[1] - a[1]).map(([tipo, n]) => (
                  <Chip key={tipo} label={`${SIGNAL_LABEL[tipo] || tipo}: ${n}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                ))}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Typography fontSize={11} color="text.secondary">
                {versions.length} versão(ões) do aprendizado · última atualização em {new Date(current.created_at).toLocaleString('pt-BR')}.
              </Typography>
            </Card>
          </Stack>
        )}
      </Box>
    </Box>
  )
}

function DiffBlock({ label, color, added, removed }) {
  if (!added.length && !removed.length) return null
  return (
    <Box>
      <Typography fontSize={11} fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.06em" mb={0.5}>{label}</Typography>
      <Stack spacing={0.5}>
        {added.map((t, i) => (
          <Stack key={'a' + i} direction="row" spacing={1} alignItems="flex-start">
            <Typography component="span" fontSize={11} fontWeight={900} sx={{ color: color || '#0D9E7A', mt: '2px', flexShrink: 0 }}>NOVO</Typography>
            <Typography fontSize={13} color="text.primary">{t}</Typography>
          </Stack>
        ))}
        {removed.map((t, i) => (
          <Stack key={'r' + i} direction="row" spacing={1} alignItems="flex-start">
            <Typography component="span" fontSize={11} fontWeight={900} sx={{ color: 'text.disabled', mt: '2px', flexShrink: 0 }}>revisto</Typography>
            <Typography fontSize={13} color="text.disabled" sx={{ textDecoration: 'line-through' }}>{t}</Typography>
          </Stack>
        ))}
      </Stack>
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
