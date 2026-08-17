// Home v2 (2026-07-10): espinha fixa + conteúdo dinâmico.
// Responde 3 perguntas em 10 segundos:
//   1. Como está a minha marca?      → PULSO (scores · inteligência · sentimento · evidências)
//   2. O que aconteceu desde então?  → FEED (aprendizados novos, mercado, julgamentos pendentes)
//   3. O que eu faço agora?          → CONTINUAR + atalhos por frequência + 1 recomendação
// v2: a recomendação vem do CÉREBRO (home-recommendation, cache 12h) — as regras
// ficam como fallback instantâneo e trocam quando o cérebro responde.
// v3 (backlog): blocos se reordenando pelo perfil de uso.
import { useState, useEffect } from 'react'
import { navigate } from '../../lib/helpers';
import { Box, Typography, Stack, CircularProgress, Chip, Button, Card, CardActionArea,
         CardContent, List, ListItem, ListItemButton, ListItemText, Alert, AlertTitle } from '@mui/material'
import Grid from '@mui/material/Grid2'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { PALETTE } from '../../lib/theme'

const TEAL = PALETTE.data.positivo, CORAL = PALETTE.data.critico, AMBER = PALETTE.data.atencao, PURPLE = PALETTE.data.neutro
const pct = n => (n == null ? '—' : `${Math.round(n * 100)}%`)
const scoreCor = s => (s >= 7 ? TEAL : s >= 4 ? AMBER : s != null ? CORAL : 'text.disabled')
const rel = iso => {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}

// Recomendação do cérebro com cache de 12h por marca (localStorage). Retorna
// null enquanto não há resposta — o caller usa as regras como fallback.
const RECO_TTL = 12 * 3600000
async function fetchRecoCerebro(workspaceId, brandId) {
  const key = `brandcode-home-reco-${brandId}`
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null')
    if (c && Date.now() - c.at < RECO_TTL) return c.reco
  } catch { /* cache inválido */ }
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/.netlify/functions/home-recommendation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ workspace_id: workspaceId }),
  })
  if (!res.ok) return null
  const { reco } = await res.json()
  if (reco) try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), reco })) } catch { /* cheio */ }
  return reco
}

export function Home() {
  const { workspace } = useWorkspace()
  const [d, setD] = useState(null)   // todos os dados da home
  const [recoIA, setRecoIA] = useState(null)

  useEffect(() => {
    if (!workspace?.id) return
    let on = true
    ;(async () => {
      const { data: brand } = await supabase.from('brands').select('id, nome').eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      const brandId = brand?.id
      const semana = new Date(Date.now() - 7 * 86400000).toISOString()
      const [diag, sent, intel, sigSemana, sigPend, clips, concs, pendJulg, wf, conv, book, ultimaPeca, trends] = await Promise.all([
        supabase.from('diagnosticos').select('score_singularidade, score_consistencia, score_posicionamento, created_at')
          .eq('workspace_id', workspace.id).eq('status', 'done').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('sentiment_snapshots').select('avg_positivo, avg_neutro, avg_negativo')
          .eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        brandId ? supabase.from('brand_intelligence').select('versao, confianca_media, metricas, gerado_de, created_at')
          .eq('brand_id', brandId).order('versao', { ascending: false }).limit(2) : { data: [] },
        brandId ? supabase.from('brand_signals').select('id', { count: 'exact', head: true })
          .eq('brand_id', brandId).gte('created_at', semana) : { count: 0 },
        brandId ? supabase.from('brand_signals').select('id', { count: 'exact', head: true })
          .eq('brand_id', brandId).is('consumido_em', null) : { count: 0 },
        supabase.from('concorrente_clipping').select('titulo, score_impacto, concorrente_id, created_at')
          .eq('workspace_id', workspace.id).gte('created_at', semana).order('score_impacto', { ascending: false }).limit(3),
        supabase.from('concorrentes').select('id, nome, ativo').eq('workspace_id', workspace.id),
        brandId ? supabase.from('studio_generations').select('id', { count: 'exact', head: true })
          .eq('brand_id', brandId).eq('status', 'done').is('feedback', null).not('image_url', 'is', null) : { count: 0 },
        supabase.from('studio_workflows').select('id, nome, updated_at, brand_id').eq('workspace_id', workspace.id)
          .eq('is_template', false).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        brandId ? supabase.from('conversations').select('id, titulo, created_at').eq('brand_id', brandId)
          .order('created_at', { ascending: false }).limit(1).maybeSingle() : { data: null },
        brandId ? supabase.from('brand_books').select('verbal_identity, strategy').eq('brand_id', brandId)
          .order('updated_at', { ascending: false }).limit(1).maybeSingle() : { data: null },
        brandId ? supabase.from('studio_generations').select('id, media_type, created_at').eq('brand_id', brandId)
          .eq('status', 'done').not('image_url', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle() : { data: null },
        supabase.from('tendencias').select('titulo, relevancia, created_at').eq('workspace_id', workspace.id)
          .gte('created_at', semana).order('relevancia', { ascending: false }).limit(2),
      ])
      if (!on) return
      setD({
        brand, brandId,
        diag: diag.data, sent: sent.data,
        intel: intel.data?.[0] || null, intelPrev: intel.data?.[1] || null,
        evidSemana: sigSemana.count || 0, sigPendentes: sigPend.count || 0,
        clips: clips.data || [], concs: concs.data || [],
        pendJulg: pendJulg.count || 0, wf: wf.data, conv: conv.data, book: book.data,
        ultimaPeca: ultimaPeca.data, trends: trends.data || [],
      })
    })()
    return () => { on = false }
  }, [workspace?.id])

  // v2: recomendação do cérebro (assíncrona — as regras seguram a tela até chegar)
  useEffect(() => {
    if (!workspace?.id || !d?.brandId) return
    let on = true
    fetchRecoCerebro(workspace.id, d.brandId).then(r => { if (on && r) setRecoIA(r) }).catch(() => {})
    return () => { on = false }
  }, [workspace?.id, d?.brandId])

  if (!d) return <Stack alignItems="center" py={10}><CircularProgress size={24} sx={{ color: 'primary.main' }} /></Stack>

  const brandPath = d.brandId ? `#/app/brands/${d.brandId}` : null
  const concNome = Object.fromEntries(d.concs.map(c => [c.id, c.nome]))
  const intelDelta = d.intel && d.intelPrev && d.intel.confianca_media != null && d.intelPrev.confianca_media != null
    ? Math.round((d.intel.confianca_media - d.intelPrev.confianca_media) * 100) : null

  // Sentimento dominante
  const s = d.sent || {}
  const sentDom = [['positivo', s.avg_positivo, TEAL], ['neutro', s.avg_neutro, AMBER], ['negativo', s.avg_negativo, CORAL]]
    .filter(x => x[1] != null).sort((a, b) => b[1] - a[1])[0]

  // ── FEED: o que aconteceu ──
  const feed = []
  if (d.intel && (Date.now() - new Date(d.intel.created_at)) < 14 * 86400000)
    feed.push({ e: '🧠', t: `A inteligência evoluiu para a v${d.intel.versao} — ${d.intel.gerado_de?.count || '?'} evidências viraram aprendizado`, q: d.intel.created_at, hash: '#/app/inteligencia' })
  const ap = d.intel?.metricas?.approval_sob_versao_anterior
  if (ap != null && d.intel?.metricas?.votos_janela > 0)
    feed.push({ e: '📈', t: `Aprovação das peças criadas sob a v${d.intel.versao - 1}: ${pct(ap)} (${d.intel.metricas.votos_janela} avaliações)`, q: d.intel.created_at, hash: '#/app/inteligencia' })
  for (const c of d.clips)
    feed.push({ e: '⚔️', t: `${concNome[c.concorrente_id] || 'Concorrente'}: ${c.titulo}${c.score_impacto ? ` (impacto ${c.score_impacto}/10)` : ''}`, q: c.created_at, hash: '#/app/market-intel' })
  for (const t of d.trends)
    feed.push({ e: '📡', t: `Tendência do setor: ${t.titulo}${t.relevancia ? ` (relevância ${t.relevancia}/10)` : ''}`, q: t.created_at, hash: '#/app/trends' })
  if (d.pendJulg > 0 && brandPath)
    feed.push({ e: '👍', t: `${d.pendJulg} peça${d.pendJulg > 1 ? 's' : ''} esperando seu julgamento — cada avaliação ensina a marca`, q: null, hash: `${brandPath}/studio/approvals` })
  feed.sort((a, b) => new Date(b.q || 0) - new Date(a.q || 0))

  // ── RECOMENDAÇÃO: o cérebro decide (v2); as regras são o fallback instantâneo ──
  const st = d.book?.strategy || {}, v = d.book?.verbal_identity || {}
  let reco = null
  if (brandPath && !(st.personas?.length)) reco = { t: 'Preencha as Personas da marca — toda geração de copy e imagem fica mais precisa quando a inteligência sabe PARA QUEM cria.', cta: 'Ir para Função', hash: `${brandPath}/negocio` }
  else if (brandPath && !v.tom_voz) reco = { t: 'Defina o tom de voz em Expressão — é a base de tudo que a marca escreve.', cta: 'Ir para Expressão', hash: `${brandPath}/expression` }
  else if (d.pendJulg > 3 && brandPath) reco = { t: `${d.pendJulg} peças aguardam julgamento — julgar acelera o aprendizado da marca.`, cta: 'Julgar agora', hash: `${brandPath}/studio/approvals` }
  else if (!d.concs.some(c => c.ativo)) reco = { t: 'Cadastre concorrentes — a marca aprende o território do mercado e afia a diferenciação.', cta: 'Ir para Relatórios', hash: '#/app/reports' }
  else if (d.sigPendentes >= 5) reco = { t: `${d.sigPendentes} evidências novas acumuladas — a próxima versão da inteligência nasce em breve.`, cta: 'Ver inteligência', hash: '#/app/inteligencia' }
  else if (brandPath) reco = { t: 'Crie uma peça na Redação — a marca escreve com a voz que aprendeu com você.', cta: 'Abrir Redação', hash: `${brandPath}/studio/writing` }
  if (recoIA) reco = recoIA   // o cérebro fala mais alto que as regras

  // ── ATALHOS por frequência de uso (adaptativo, client-side) ──
  let freq = {}
  try { freq = JSON.parse(localStorage.getItem('brandcode-nav-freq') || '{}') } catch { /* ok */ }
  const atalhos = !brandPath ? [] : [
    { label: 'Redação', hash: `${brandPath}/studio/writing`, k: '#brand/studio/writing' },
    { label: 'Imagem', hash: `${brandPath}/studio`, k: '#brand/studio' },
    { label: 'Vídeo', hash: `${brandPath}/studio/video`, k: '#brand/studio/video' },
    { label: 'Fluxos', hash: `${brandPath}/studio/workflow`, k: '#brand/studio/workflow' },
    { label: 'Copiloto', hash: `${brandPath}/assistant`, k: '#brand/assistant' },
    { label: 'Relatórios', hash: '#/app/reports', k: '#/app/reports' },
    { label: 'Concorrentes', hash: '#/app/competitors', k: '#/app/competitors' },
    { label: 'Biblioteca', hash: `${brandPath}/studio/biblioteca`, k: '#brand/studio/biblioteca' },
  ].sort((a, b) => (freq[b.k] || 0) - (freq[a.k] || 0)).slice(0, 6)

  // Bloco de seção — Typography variant, sem tamanho na mão
  const Secao = ({ titulo, children }) => (
    <Box>
      <Typography variant="overline" color="text.secondary" component="div" sx={{ mb: 1 }}>
        {titulo}
      </Typography>
      {children}
    </Box>
  )

  // Card do pulso: CardActionArea quando é clicável (ripple e foco do MUI de graça)
  const Metrica = ({ titulo, hash, children }) => {
    const corpo = <CardContent>{children}</CardContent>
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        {hash ? <CardActionArea onClick={() => navigate(hash)} sx={{ height: '100%' }}>{corpo}</CardActionArea> : corpo}
      </Card>
    )
  }

  return (
    <Box>
      <PageHeader title={d.brand?.nome || workspace?.nome || 'Início'}
        subtitle={d.diag ? `Último diagnóstico ${rel(d.diag.created_at)}` : ''} />

      <Stack spacing={4} sx={{ maxWidth: 1100, width: '100%', mx: 'auto', mt: 3 }}>

        {/* ── 1. PULSO ── */}
        <Secao titulo="O pulso da marca">
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Metrica titulo="Diagnóstico" hash="#/app/reports">
                <Typography variant="body2" color="text.secondary" gutterBottom>Diagnóstico</Typography>
                {d.diag ? (
                  <Stack direction="row" spacing={2}>
                    {[['Sing', d.diag.score_singularidade], ['Cons', d.diag.score_consistencia], ['Pos', d.diag.score_posicionamento]].map(([l, sc]) => (
                      <Box key={l}>
                        <Typography variant="h5" sx={{ color: scoreCor(sc), lineHeight: 1.2 }}>{sc ?? '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{l}</Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : <Typography variant="body2" color="text.disabled">sem diagnóstico ainda</Typography>}
              </Metrica>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Metrica titulo="Inteligência" hash="#/app/inteligencia">
                <Typography variant="body2" color="text.secondary" gutterBottom>Inteligência</Typography>
                {d.intel ? (
                  <>
                    <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                      v{d.intel.versao} · {pct(d.intel.confianca_media)}
                      {intelDelta != null && intelDelta !== 0 && (
                        <Typography component="span" variant="body2" sx={{ ml: 0.5, color: intelDelta > 0 ? TEAL : CORAL }}>
                          {intelDelta > 0 ? '▲' : '▼'}{Math.abs(intelDelta)}
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">confiança do aprendizado</Typography>
                  </>
                ) : <Typography variant="body2" color="text.disabled">ainda formando</Typography>}
              </Metrica>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Metrica titulo="Sentimento" hash="#/app/listening">
                <Typography variant="body2" color="text.secondary" gutterBottom>Sentimento</Typography>
                {sentDom ? (
                  <>
                    <Typography variant="h5" sx={{ color: sentDom[2], lineHeight: 1.2 }}>{Math.round(sentDom[1])}%</Typography>
                    <Typography variant="caption" color="text.secondary">{sentDom[0]} domina</Typography>
                  </>
                ) : <Typography variant="body2" color="text.disabled">sem escuta ainda</Typography>}
              </Metrica>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Metrica titulo="Evidências" hash="#/app/inteligencia">
                <Typography variant="body2" color="text.secondary" gutterBottom>Evidências · 7 dias</Typography>
                <Typography variant="h5" sx={{ lineHeight: 1.2 }}>{d.evidSemana}</Typography>
                <Typography variant="caption" color="text.secondary">tudo que a marca vive vira aprendizado</Typography>
              </Metrica>
            </Grid>
          </Grid>
        </Secao>

        {/* ── 2. FEED ── */}
        {feed.length > 0 && (
          <Secao titulo="O que aconteceu">
            <Card variant="outlined">
              <List disablePadding>
                {feed.slice(0, 6).map((f, i) => (
                  <ListItemButton key={i} onClick={() => navigate(f.hash)} divider={i < Math.min(feed.length, 6) - 1}>
                    <Typography component="span" sx={{ mr: 1.5 }}>{f.e}</Typography>
                    <ListItemText primary={f.t} />
                    {f.q && <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 2 }}>{rel(f.q)}</Typography>}
                  </ListItemButton>
                ))}
              </List>
            </Card>
          </Secao>
        )}

        {/* ── 3. AGORA ── */}
        <Secao titulo="E agora?">
          <Stack spacing={2}>
            {reco && (
              <Alert
                severity="info"
                icon={reco.origem === 'cerebro' ? <AutoAwesomeIcon /> : <TrendingUpIcon />}
                action={
                  <Button color="inherit" size="small" endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate(reco.hash)}>
                    {reco.cta}
                  </Button>
                }
              >
                {reco.t}
              </Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {d.wf && (
                <Chip color="primary" variant="outlined"
                  label={`Continuar no fluxo "${(d.wf.nome || '').slice(0, 32)}"`}
                  onClick={() => navigate(`#/app/brands/${d.wf.brand_id}/studio/workflow/${d.wf.id}`)} />
              )}
              {d.conv && brandPath && (
                <Chip color="primary" variant="outlined" label="Continuar conversa no Copiloto"
                  onClick={() => navigate(`${brandPath}/assistant`)} />
              )}
              {d.ultimaPeca && brandPath && (
                <Chip color="primary" variant="outlined"
                  label={`Ver última peça criada (${rel(d.ultimaPeca.created_at)})`}
                  onClick={() => navigate(`${brandPath}/studio/biblioteca`)} />
              )}
              {atalhos.map(a => (
                <Chip key={a.label} label={a.label} variant="outlined" onClick={() => navigate(a.hash)} />
              ))}
            </Stack>
          </Stack>
        </Secao>

      </Stack>
    </Box>
  )
}
