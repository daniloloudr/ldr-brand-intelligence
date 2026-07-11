// IntelligencePages — as páginas do grupo Intelligence da nova árvore.
// Onda 3 (2026-07-10): Consumer Insights e Trends viram REAIS — insights da
// escuta social + radar de tendências por setor (coleta semanal + on-demand).
import { useState, useEffect, useCallback } from 'react'
import { Box, Paper, Typography, Stack, CircularProgress, Chip, Link, Button } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RadarIcon from '@mui/icons-material/Radar'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A', CORAL = '#E8185A', AMBER = '#EF9F27'
const SENT = { positivo: TEAL, neutro: AMBER, negativo: CORAL }

function Shell({ title, subtitle, children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title={title} subtitle={subtitle} />
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, width: '100%', mx: 'auto' }}>{children}</Box>
    </Box>
  )
}

function EmConstrucao({ desc, vem }) {
  return (
    <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
      <ConstructionOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
      <Typography fontWeight={900} fontSize={16} mb={0.75}>Em construção</Typography>
      <Typography fontSize={13.5} color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', lineHeight: 1.6 }}>{desc}</Typography>
      {vem && <Typography fontSize={12} sx={{ mt: 1.5, color: TEAL, fontWeight: 700 }}>O que vem: {vem}</Typography>}
    </Paper>
  )
}

// ── Market Intelligence — o clipping do mercado (dados reais) ─────────
export function MarketIntelligence() {
  const { workspace } = useWorkspace()
  const [items, setItems] = useState(null)
  const [concs, setConcs] = useState({})

  useEffect(() => {
    if (!workspace?.id) return
    let on = true
    ;(async () => {
      const [{ data: cs }, { data: clips }] = await Promise.all([
        supabase.from('concorrentes').select('id, nome').eq('workspace_id', workspace.id),
        supabase.from('concorrente_clipping').select('*').eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false }).limit(60),
      ])
      if (!on) return
      setConcs(Object.fromEntries((cs || []).map(c => [c.id, c.nome])))
      setItems(clips || [])
    })()
    return () => { on = false }
  }, [workspace?.id])

  return (
    <Shell title="Inteligência de Mercado" subtitle="Movimentos recentes do mercado e dos concorrentes — coletados toda semana">
      {items === null ? (
        <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
      ) : items.length === 0 ? (
        <EmConstrucao desc="Ainda não há movimentos coletados. O clipping roda toda segunda para os concorrentes ativos — cadastre concorrentes no Brand Positioning para alimentar esta página."
          vem="alertas de movimento de alto impacto e resumo semanal do mercado" />
      ) : (
        <Stack spacing={1.5}>
          {items.map(it => (
            <Paper key={it.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
                <Chip label={concs[it.concorrente_id] || 'Concorrente'} size="small" sx={{ fontWeight: 800, fontSize: 11 }} />
                {it.fonte && <Typography fontSize={11} color="text.disabled">{it.fonte}</Typography>}
                {it.sentiment && <Chip label={it.sentiment} size="small" variant="outlined"
                  sx={{ fontSize: 10, fontWeight: 700, color: SENT[it.sentiment], borderColor: SENT[it.sentiment] }} />}
                {it.score_impacto != null && <Typography fontSize={11} sx={{ color: it.score_impacto >= 6 ? CORAL : 'text.disabled', fontWeight: 700 }}>impacto {it.score_impacto}/10</Typography>}
                <Box flex={1} />
                <Typography fontSize={11} color="text.disabled">{new Date(it.created_at).toLocaleDateString('pt-BR')}</Typography>
              </Stack>
              <Typography fontSize={14} fontWeight={800}>{it.titulo}</Typography>
              {it.conteudo && <Typography fontSize={13} color="text.secondary" sx={{ lineHeight: 1.55, mt: 0.25 }}>{it.conteudo}</Typography>}
              {it.url && <Link href={it.url} target="_blank" rel="noopener" sx={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                fonte <OpenInNewIcon sx={{ fontSize: 13 }} /></Link>}
            </Paper>
          ))}
        </Stack>
      )}
    </Shell>
  )
}

// ── Competitors — visão rápida (dados reais; análise completa no Positioning) ──
export function CompetitorsPage() {
  const { workspace } = useWorkspace()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!workspace?.id) return
    let on = true
    ;(async () => {
      const [{ data: cs }, { data: diags }] = await Promise.all([
        supabase.from('concorrentes').select('id, nome, dominio, ativo').eq('workspace_id', workspace.id).order('created_at'),
        supabase.from('diagnosticos_concorrentes').select('concorrente_id, scores, created_at')
          .eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
      ])
      if (!on) return
      const lastDiag = {}
      for (const d of diags || []) if (!lastDiag[d.concorrente_id]) lastDiag[d.concorrente_id] = d
      setRows((cs || []).filter(c => c.ativo).map(c => ({ ...c, diag: lastDiag[c.id] })))
    })()
    return () => { on = false }
  }, [workspace?.id])

  const Score = ({ label, v }) => (
    <Chip size="small" label={`${label} ${v ?? '—'}`} variant="outlined"
      sx={{ fontSize: 10.5, fontWeight: 700, color: v >= 7 ? TEAL : v >= 4 ? AMBER : v != null ? CORAL : 'text.disabled' }} />
  )

  return (
    <Shell title="Concorrentes" subtitle="Quem disputa o seu território — scores do último diagnóstico de cada concorrente">
      {rows === null ? (
        <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
      ) : rows.length === 0 ? (
        <EmConstrucao desc="Nenhum concorrente ativo. Cadastre no Brand Positioning — cada concorrente ganha diagnóstico, clipping semanal e entra no mapa de território." />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1.5 }}>
          {rows.map(c => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={900} fontSize={15}>{c.nome}</Typography>
              {c.dominio && <Typography fontSize={12} color="text.secondary">{c.dominio}</Typography>}
              <Stack direction="row" spacing={0.75} mt={1.25} flexWrap="wrap" useFlexGap>
                <Score label="Singularidade" v={c.diag?.scores?.singularidade} />
                <Score label="Consistência" v={c.diag?.scores?.consistencia} />
                <Score label="Posicionamento" v={c.diag?.scores?.posicionamento} />
              </Stack>
              <Typography fontSize={11} color="text.disabled" mt={1}>
                {c.diag ? `analisado em ${new Date(c.diag.created_at).toLocaleDateString('pt-BR')}` : 'aguardando diagnóstico (fila automática)'}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
      <Typography fontSize={12} color="text.secondary" mt={2.5}>
        Mapa de território, movimentos por ciclo e gestão dos concorrentes: <Link href="#/app/posicionamento" sx={{ fontWeight: 700 }}>Brand Positioning</Link>.
      </Typography>
    </Shell>
  )
}

// ── Insights do Consumidor — a escuta social virando leitura (dados reais) ──
export function ConsumerInsights() {
  const { workspace } = useWorkspace()
  const [d, setD] = useState(null)
  const [filtro, setFiltro] = useState(null)   // positivo | neutro | negativo | null

  useEffect(() => {
    if (!workspace?.id) return
    let on = true
    ;(async () => {
      const { data: brand } = await supabase.from('brands').select('id').eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      const [{ data: snaps }, { data: eventos }, { data: intel }, { data: book }] = await Promise.all([
        supabase.from('sentiment_snapshots').select('data, positivo_pct, neutro_pct, negativo_pct, avg_positivo, avg_neutro, avg_negativo, total_mencoes')
          .eq('workspace_id', workspace.id).order('created_at', { ascending: true }).limit(60),
        supabase.from('listening_events').select('id, fonte, conteudo, sentimento, score, url, created_at')
          .eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(40),
        brand ? supabase.from('brand_intelligence').select('modelo').eq('brand_id', brand.id)
          .order('versao', { ascending: false }).limit(1) : { data: [] },
        brand ? supabase.from('brand_books').select('strategy').eq('brand_id', brand.id)
          .order('updated_at', { ascending: false }).limit(1) : { data: [] },
      ])
      if (!on) return
      // Snapshots antigos não têm *_pct (colunas posteriores) — cai para avg_*.
      const norm = (snaps || []).map(s => ({
        data: s.data,
        positivo_pct: s.positivo_pct ?? s.avg_positivo ?? 0,
        neutro_pct:   s.neutro_pct   ?? s.avg_neutro   ?? 0,
        negativo_pct: s.negativo_pct ?? s.avg_negativo ?? 0,
        total_mencoes: s.total_mencoes,
      }))
      setD({
        brandId: brand?.id,
        snaps: norm, eventos: eventos || [],
        temas: intel?.[0]?.modelo?.conteudo?.temas || [],
        angulos: intel?.[0]?.modelo?.conteudo?.angulos || [],
        personas: (book?.[0]?.strategy?.personas || []).filter(p => p?.nome),
      })
    })()
    return () => { on = false }
  }, [workspace?.id])

  if (!d) return (
    <Shell title="Insights do Consumidor" subtitle="O que o público sente e diz — direto da escuta social">
      <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
    </Shell>
  )

  const ultimo = d.snaps[d.snaps.length - 1]
  const fontes = [...new Set(d.eventos.map(e => e.fonte).filter(Boolean))]
  const eventos = filtro ? d.eventos.filter(e => e.sentimento === filtro) : d.eventos

  return (
    <Shell title="Insights do Consumidor" subtitle="O que o público sente e diz — direto da escuta social, lido pela inteligência da marca">
      {d.eventos.length === 0 && d.snaps.length === 0 ? (
        <EmConstrucao desc="Ainda não há escuta coletada. Rode o Social Listening — cada ciclo alimenta esta página e vira aprendizado para a marca."
          vem="menções por fonte, evolução do sentimento e temas que o público puxa" />
      ) : (
        <Stack spacing={3}>
          {/* evolução do sentimento */}
          {d.snaps.length >= 2 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontSize={11} fontWeight={800} color="text.secondary" mb={1}>EVOLUÇÃO DO SENTIMENTO</Typography>
              <Box sx={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.snaps} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <RTooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="positivo_pct" name="positivo" stroke={TEAL} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="neutro_pct" name="neutro" stroke={AMBER} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="negativo_pct" name="negativo" stroke={CORAL} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
              {ultimo && <Typography fontSize={11.5} color="text.secondary" mt={0.5}>
                Última leitura ({ultimo.data}): {ultimo.positivo_pct}% positivo · {ultimo.neutro_pct}% neutro · {ultimo.negativo_pct}% negativo — {ultimo.total_mencoes} menções</Typography>}
            </Paper>
          )}

          {/* o que a marca aprendeu do público */}
          {(d.temas.length > 0 || d.personas.length > 0) && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontSize={11} fontWeight={800} color="text.secondary" mb={1}>O QUE A MARCA JÁ SABE DO PÚBLICO</Typography>
              {d.personas.length > 0 && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mb={d.temas.length ? 1.25 : 0}>
                  <Typography fontSize={12.5} color="text.secondary" sx={{ mr: 0.5, alignSelf: 'center' }}>Personas:</Typography>
                  {d.personas.slice(0, 4).map((p, i) => (
                    <Chip key={i} label={p.nome} size="small" onClick={() => { if (d.brandId) window.location.hash = `#/app/brands/${d.brandId}/negocio` }}
                      sx={{ fontWeight: 700, fontSize: 11 }} />
                  ))}
                </Stack>
              )}
              {d.temas.length > 0 && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Typography fontSize={12.5} color="text.secondary" sx={{ mr: 0.5, alignSelf: 'center' }}>Temas que funcionam:</Typography>
                  {d.temas.slice(0, 8).map((t, i) => <Chip key={i} label={t} size="small" variant="outlined" sx={{ fontSize: 11 }} />)}
                </Stack>
              )}
            </Paper>
          )}

          {/* menções recentes */}
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center" mb={1.25} flexWrap="wrap" useFlexGap>
              <Typography fontSize={11} fontWeight={800} color="text.secondary" sx={{ mr: 1 }}>MENÇÕES RECENTES</Typography>
              {['positivo', 'neutro', 'negativo'].map(s => (
                <Chip key={s} label={s} size="small" variant={filtro === s ? 'filled' : 'outlined'}
                  onClick={() => setFiltro(filtro === s ? null : s)}
                  sx={{ fontSize: 10.5, fontWeight: 700, color: SENT[s], borderColor: SENT[s], ...(filtro === s ? { bgcolor: `${SENT[s]}22` } : {}) }} />
              ))}
              {fontes.length > 0 && <Typography fontSize={11} color="text.disabled" sx={{ ml: 'auto' }}>{fontes.join(' · ')}</Typography>}
            </Stack>
            <Stack spacing={1}>
              {eventos.slice(0, 20).map(e => (
                <Paper key={e.id} variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    {e.fonte && <Chip label={e.fonte} size="small" sx={{ fontWeight: 800, fontSize: 10.5 }} />}
                    {e.sentimento && <Chip label={e.sentimento} size="small" variant="outlined"
                      sx={{ fontSize: 10, fontWeight: 700, color: SENT[e.sentimento], borderColor: SENT[e.sentimento] }} />}
                    <Box flex={1} />
                    <Typography fontSize={11} color="text.disabled">{new Date(e.created_at).toLocaleDateString('pt-BR')}</Typography>
                  </Stack>
                  <Typography fontSize={13} sx={{ lineHeight: 1.55 }}>{e.conteudo}</Typography>
                  {e.url && <Link href={e.url} target="_blank" rel="noopener" sx={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    fonte <OpenInNewIcon sx={{ fontSize: 13 }} /></Link>}
                </Paper>
              ))}
              {eventos.length === 0 && <Typography fontSize={13} color="text.disabled" py={2}>Nenhuma menção {filtro} no período.</Typography>}
            </Stack>
          </Box>
        </Stack>
      )}
    </Shell>
  )
}

// ── Tendências — radar do setor com "como a sua marca surfa" (dados reais) ──
const CAT_LABEL = { comportamento: 'Comportamento', tecnologia: 'Tecnologia', estetica: 'Estética', mercado: 'Mercado', conteudo: 'Conteúdo' }
const HOR_LABEL = { agora: 'agora', '6m': 'próximos 6 meses', '1a+': '1 ano ou mais' }

export function TrendsPage() {
  const { workspace } = useWorkspace()
  const [items, setItems] = useState(null)
  const [buscando, setBuscando] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('tendencias').select('*')
      .eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(60)
    setItems(data || [])
    return data || []
  }, [workspace?.id])

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id, load])

  // Dispara a coleta (background) e faz polling da tabela até chegarem itens novos.
  const buscar = async () => {
    setBuscando(true)
    const antes = items?.length || 0
    const { data: { session } } = await supabase.auth.getSession()
    fetch('/.netlify/functions/trends-coletar-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ workspace_id: workspace.id }),
    }).catch(() => {})
    for (let i = 0; i < 24; i++) {                    // até ~2 min
      await new Promise(r => setTimeout(r, 5000))
      const rows = await load()
      if (rows.length > antes) break
    }
    setBuscando(false)
  }

  const semSetor = !workspace?.setor

  return (
    <Shell title="Tendências" subtitle="Tendências do setor antes de virarem lugar-comum — com o 'como surfar' no tom da sua marca">
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button variant="outlined" size="small" startIcon={buscando ? <CircularProgress size={14} /> : <RadarIcon />}
          disabled={buscando || semSetor} onClick={buscar} sx={{ fontWeight: 700 }}>
          {buscando ? 'Buscando tendências…' : 'Buscar tendências agora'}
        </Button>
      </Stack>
      {semSetor && (
        <Typography fontSize={12.5} color="text.secondary" mb={2}>
          Defina o <b>setor</b> do workspace para ativar o radar — é ele que direciona a pesquisa.
        </Typography>
      )}
      {items === null ? (
        <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
      ) : items.length === 0 ? (
        <EmConstrucao desc="Nenhuma tendência coletada ainda. O radar roda toda segunda para workspaces com setor definido — ou busque agora no botão acima."
          vem="cada tendência chega com 'como a sua marca surfa isso', escrito no tom aprendido" />
      ) : (
        <Stack spacing={1.5}>
          {items.map(t => (
            <Paper key={t.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
                {t.categoria && <Chip label={CAT_LABEL[t.categoria] || t.categoria} size="small" sx={{ fontWeight: 800, fontSize: 11 }} />}
                {t.horizonte && <Chip label={HOR_LABEL[t.horizonte] || t.horizonte} size="small" variant="outlined" sx={{ fontSize: 10.5 }} />}
                {t.relevancia != null && <Typography fontSize={11} sx={{ color: t.relevancia >= 7 ? CORAL : 'text.disabled', fontWeight: 700 }}>relevância {t.relevancia}/10</Typography>}
                <Box flex={1} />
                <Typography fontSize={11} color="text.disabled">{new Date(t.created_at).toLocaleDateString('pt-BR')}</Typography>
              </Stack>
              <Typography fontSize={14} fontWeight={800}>{t.titulo}</Typography>
              {t.conteudo && <Typography fontSize={13} color="text.secondary" sx={{ lineHeight: 1.55, mt: 0.25 }}>{t.conteudo}</Typography>}
              {t.como_surfar && (
                <Box sx={{ mt: 1.25, p: 1.5, borderRadius: 1.5, border: '1px solid rgba(127,119,221,0.3)', bgcolor: 'rgba(127,119,221,0.06)' }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <AutoAwesomeIcon sx={{ color: '#7F77DD', fontSize: 16, mt: 0.25 }} />
                    <Box>
                      <Typography fontSize={10.5} fontWeight={800} sx={{ color: '#7F77DD', letterSpacing: '0.06em' }}>COMO A SUA MARCA SURFA ISSO</Typography>
                      <Typography fontSize={13} sx={{ lineHeight: 1.55, mt: 0.25 }}>{t.como_surfar}</Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
              <Stack direction="row" spacing={1.5} mt={0.75}>
                {t.fonte && <Typography fontSize={11} color="text.disabled">{t.fonte}</Typography>}
                {t.url && <Link href={t.url} target="_blank" rel="noopener" sx={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  fonte <OpenInNewIcon sx={{ fontSize: 13 }} /></Link>}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Shell>
  )
}

export function ReportsPage() {
  return (
    <Shell title="Relatórios" subtitle="A evolução da marca, medida e apresentável">
      <EmConstrucao desc="Relatórios periódicos consolidando scores do diagnóstico, evolução do aprendizado da marca, aprovação de peças e movimentos do mercado — prontos para levar ao board."
        vem="relatório mensal automático + comparativo entre ciclos. Hoje: os scores vivem no Brand Positioning e a evolução do aprendizado em IA LOUDR" />
    </Shell>
  )
}
