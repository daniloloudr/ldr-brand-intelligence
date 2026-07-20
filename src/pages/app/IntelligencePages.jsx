// IntelligencePages — as páginas do grupo Intelligence da nova árvore.
// Onda 3 (2026-07-10): Consumer Insights e Trends viram REAIS — insights da
// escuta social + radar de tendências por setor (coleta semanal + on-demand).
import { useState, useEffect, useCallback } from 'react'
import { navigate } from '../../lib/helpers';
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

// ── Inteligência de Mercado — o briefing do campo de jogo (fase 1) ────
// Pulso (7 dias) + síntese do ciclo pelo cérebro + share of voice + feed filtrável.
export function MarketIntelligence() {
  const { workspace } = useWorkspace()
  const [d, setD] = useState(null)
  const [gerando, setGerando] = useState(false)
  const [fConc, setFConc] = useState(null)       // filtro: concorrente
  const [fAlto, setFAlto] = useState(false)      // filtro: impacto >= 6
  const [fSent, setFSent] = useState(null)       // filtro: sentimento
  const [fPeriodo, setFPeriodo] = useState(30)   // filtro: 7 | 30 | 0 (tudo)
  const [pagina, setPagina] = useState(0)        // paginação do feed (10/pág)

  const load = useCallback(async () => {
    const [{ data: cs }, { data: clips }, { data: sint }] = await Promise.all([
      supabase.from('concorrentes').select('id, nome').eq('workspace_id', workspace.id),
      supabase.from('concorrente_clipping').select('*').eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('market_sinteses').select('*').eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false }).limit(1),
    ])
    const next = {
      concs: Object.fromEntries((cs || []).map(c => [c.id, c.nome])),
      items: clips || [], sintese: sint?.[0] || null,
    }
    setD(next)
    return next
  }, [workspace?.id])

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id, load])

  const gerarSintese = async () => {
    setGerando(true)
    const antes = d?.sintese?.id || null
    const { data: { session } } = await supabase.auth.getSession()
    fetch('/.netlify/functions/market-sintese-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ workspace_id: workspace.id }),
    }).catch(() => {})
    for (let i = 0; i < 12; i++) {                    // até ~60s
      await new Promise(r => setTimeout(r, 5000))
      const next = await load()
      if (next.sintese && next.sintese.id !== antes) break
    }
    setGerando(false)
  }

  if (!d) return (
    <Shell title="Inteligência de Mercado" subtitle="O campo de jogo: movimentos do mercado e dos concorrentes, lidos pela inteligência da marca">
      <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
    </Shell>
  )

  // Pulso: janela fixa de 7 dias (independe dos filtros do feed)
  const semana = Date.now() - 7 * 86400000
  const daSemana = d.items.filter(i => new Date(i.created_at) >= semana)
  const altoImpacto = daSemana.filter(i => (i.score_impacto ?? 0) >= 8)
  const negativos = daSemana.filter(i => i.sentiment === 'negativo')
  const porConc = {}
  for (const i of daSemana) porConc[i.concorrente_id] = (porConc[i.concorrente_id] || 0) + 1
  const maisAtivo = Object.entries(porConc).sort((a, b) => b[1] - a[1])[0]

  // Share of voice: 30 dias, por concorrente (contagem + impacto médio)
  const mes = Date.now() - 30 * 86400000
  const sov = {}
  for (const i of d.items.filter(x => new Date(x.created_at) >= mes)) {
    const k = i.concorrente_id
    sov[k] = sov[k] || { n: 0, imp: 0 }
    sov[k].n++; sov[k].imp += i.score_impacto ?? 0
  }
  const sovList = Object.entries(sov).map(([id, v]) => ({ id, nome: d.concs[id] || 'Concorrente', n: v.n, imp: v.n ? v.imp / v.n : 0 }))
    .sort((a, b) => b.n - a.n)
  const sovMax = sovList[0]?.n || 1

  // Feed filtrado + paginado (10/pág; qualquer filtro volta à página 0)
  const corte = fPeriodo ? Date.now() - fPeriodo * 86400000 : 0
  const feed = d.items.filter(i =>
    (!fConc || i.concorrente_id === fConc) &&
    (!fAlto || (i.score_impacto ?? 0) >= 6) &&
    (!fSent || i.sentiment === fSent) &&
    (!corte || new Date(i.created_at) >= corte))
  const POR_PAG = 10
  const maxPag = Math.max(0, Math.ceil(feed.length / POR_PAG) - 1)
  const pagSafe = Math.min(pagina, maxPag)
  const feedPag = feed.slice(pagSafe * POR_PAG, pagSafe * POR_PAG + POR_PAG)
  const filtra = fn => { fn(); setPagina(0) }

  const PulsoCard = ({ label, valor, sub, cor }) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography fontSize={11} fontWeight={800} color="text.secondary">{label}</Typography>
      <Typography fontSize={22} fontWeight={900} sx={{ lineHeight: 1.2, color: cor || 'text.primary' }}>{valor}</Typography>
      <Typography fontSize={9.5} color="text.disabled">{sub}</Typography>
    </Paper>
  )

  return (
    <Shell title="Inteligência de Mercado" subtitle="O campo de jogo: movimentos do mercado e dos concorrentes, lidos pela inteligência da marca">
      {d.items.length === 0 ? (
        <EmConstrucao desc="Ainda não há movimentos coletados. O clipping roda toda segunda para os concorrentes ativos — cadastre concorrentes em Relatórios para alimentar esta página."
          vem="pulso do mercado, síntese do ciclo pelo cérebro e share of voice" />
      ) : (
        <Stack spacing={3}>
          {/* pulso da semana */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            <PulsoCard label="Movimentos · 7 dias" valor={daSemana.length} sub="itens novos no radar" />
            <PulsoCard label="Alto impacto" valor={altoImpacto.length} sub="impacto 8+ na semana" cor={altoImpacto.length ? CORAL : undefined} />
            <PulsoCard label="Mais ativo" valor={maisAtivo ? (d.concs[maisAtivo[0]] || '—') : '—'} sub={maisAtivo ? `${maisAtivo[1]} movimentos na semana` : 'semana quieta'} />
            <PulsoCard label="Sinais negativos" valor={negativos.length} sub="menções negativas de concorrentes" cor={negativos.length ? TEAL : undefined} />
          </Box>

          {/* síntese do ciclo pelo cérebro */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'rgba(127,119,221,0.35)' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <AutoAwesomeIcon sx={{ color: '#7F77DD', fontSize: 18 }} />
              <Typography fontSize={11} fontWeight={800} color="text.secondary" sx={{ flex: 1 }}>
                SÍNTESE DO CICLO{d.sintese ? ` — ${new Date(d.sintese.created_at).toLocaleDateString('pt-BR')} · ${d.sintese.mencoes} itens lidos` : ''}
              </Typography>
              <Button size="small" variant="text" disabled={gerando} onClick={gerarSintese}
                startIcon={gerando ? <CircularProgress size={13} /> : null} sx={{ fontWeight: 700 }}>
                {gerando ? 'Lendo o ciclo…' : d.sintese ? 'Gerar de novo' : 'Gerar síntese'}
              </Button>
            </Stack>
            {d.sintese ? (
              <>
                <Stack spacing={0.75}>
                  {(d.sintese.bullets || []).map((b, i) => (
                    <Typography key={i} fontSize={13.5} sx={{ lineHeight: 1.55 }}>• {b}</Typography>
                  ))}
                </Stack>
                {d.sintese.para_marca && (
                  <Typography fontSize={13} sx={{ mt: 1.25, fontWeight: 700, color: '#7F77DD', lineHeight: 1.55 }}>
                    → {d.sintese.para_marca}
                  </Typography>
                )}
              </>
            ) : (
              <Typography fontSize={13} color="text.secondary">
                A inteligência da marca lê os movimentos do ciclo e escreve o briefing: o que importa e o que fazer. Toda segunda sai um automático — ou gere agora.
              </Typography>
            )}
          </Paper>

          {/* share of voice */}
          {sovList.length > 1 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontSize={11} fontWeight={800} color="text.secondary" mb={1.25}>QUEM MAIS SE MOVEU · 30 DIAS</Typography>
              <Stack spacing={1}>
                {sovList.map(s => (
                  <Stack key={s.id} direction="row" alignItems="center" spacing={1.25}>
                    <Typography fontSize={12.5} fontWeight={700} sx={{ width: 140, flexShrink: 0 }} noWrap>{s.nome}</Typography>
                    <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{ width: `${(s.n / sovMax) * 100}%`, height: '100%', borderRadius: 4, bgcolor: s.imp >= 6 ? CORAL : TEAL, opacity: 0.75 }} />
                    </Box>
                    <Typography fontSize={11.5} color="text.secondary" sx={{ width: 130, flexShrink: 0, textAlign: 'right' }}>
                      {s.n} mov · impacto {s.imp.toFixed(1)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {/* feed com filtros */}
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center" mb={1.25} flexWrap="wrap" useFlexGap>
              <Typography fontSize={11} fontWeight={800} color="text.secondary" sx={{ mr: 1 }}>MOVIMENTOS · {feed.length}</Typography>
              {[...new Set(d.items.map(i => i.concorrente_id))].filter(id => d.concs[id]).map(id => (
                <Chip key={id} label={d.concs[id]} size="small" variant={fConc === id ? 'filled' : 'outlined'}
                  onClick={() => filtra(() => setFConc(fConc === id ? null : id))} sx={{ fontSize: 10.5, fontWeight: 700 }} />
              ))}
              <Chip label="impacto 6+" size="small" variant={fAlto ? 'filled' : 'outlined'}
                onClick={() => filtra(() => setFAlto(!fAlto))} sx={{ fontSize: 10.5, fontWeight: 700, color: fAlto ? undefined : CORAL, borderColor: CORAL }} />
              {['positivo', 'neutro', 'negativo'].map(sn => (
                <Chip key={sn} label={sn} size="small" variant={fSent === sn ? 'filled' : 'outlined'}
                  onClick={() => filtra(() => setFSent(fSent === sn ? null : sn))}
                  sx={{ fontSize: 10.5, fontWeight: 700, color: fSent === sn ? undefined : SENT[sn], borderColor: SENT[sn] }} />
              ))}
              <Box flex={1} />
              {[[7, '7d'], [30, '30d'], [0, 'tudo']].map(([v, l]) => (
                <Chip key={l} label={l} size="small" variant={fPeriodo === v ? 'filled' : 'outlined'}
                  onClick={() => filtra(() => setFPeriodo(v))} sx={{ fontSize: 10.5, fontWeight: 700 }} />
              ))}
            </Stack>
            <Stack spacing={1.5}>
              {feedPag.map(it => (
                <Paper key={it.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
                    <Chip label={d.concs[it.concorrente_id] || 'Concorrente'} size="small" sx={{ fontWeight: 800, fontSize: 11 }} />
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
              {feed.length === 0 && <Typography fontSize={13} color="text.disabled" py={2}>Nenhum movimento com esses filtros.</Typography>}
            </Stack>
            {feed.length > POR_PAG && (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mt={2}>
                <Button size="small" variant="text" color="inherit" disabled={pagSafe === 0}
                  onClick={() => setPagina(pagSafe - 1)} sx={{ fontWeight: 700 }}>← anterior</Button>
                <Typography fontSize={12} color="text.secondary">
                  {pagSafe * POR_PAG + 1}–{Math.min(feed.length, pagSafe * POR_PAG + POR_PAG)} de {feed.length}
                </Typography>
                <Button size="small" variant="text" color="inherit" disabled={pagSafe >= maxPag}
                  onClick={() => setPagina(pagSafe + 1)} sx={{ fontWeight: 700 }}>próxima →</Button>
              </Stack>
            )}
          </Box>
        </Stack>
      )}
    </Shell>
  )
}

// ── Concorrentes — o dossiê de cada adversário (fase 1) ──────────────
// Comparativo lado a lado + dossiê expandível (frase, territórios, forças/
// fraquezas, evolução por ciclo, movimentos) + colisão de território.

// Heurística de colisão: interseção de palavras significativas (sem acento,
// >3 letras) entre o território aprendido da marca e o reivindicado pelo rival.
// Compara só o NÚCLEO da reivindicação — o território aprendido costuma citar
// os territórios rivais nas cláusulas "Diferenciação/Evitar", o que marcaria
// colisão com todo mundo (alerta em tudo = alerta em nada).
const STOPWORDS = new Set(['para', 'como', 'mais', 'marca', 'marcas', 'brand', 'branding', 'brands', 'empresa', 'empresas', 'mercado'])
const tokens = s => new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOPWORDS.has(w)))
const nucleoTerritorio = s => String(s || '').split(/Diferencia|Evitar/i)[0]
const colide = (meuNucleo, dele) => {
  const a = tokens(meuNucleo), b = tokens(dele)
  let n = 0
  for (const t of a) if (b.has(t)) n++
  return n >= 2
}

export function CompetitorsPage() {
  const { workspace } = useWorkspace()
  const [d, setD] = useState(null)
  const [aberto, setAberto] = useState(null)   // concorrente_id expandido

  useEffect(() => {
    if (!workspace?.id) return
    let on = true
    ;(async () => {
      const { data: brand } = await supabase.from('brands').select('id, nome').eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      const [{ data: cs }, { data: diags }, { data: meuDiag }, { data: intel }, { data: clips }] = await Promise.all([
        supabase.from('concorrentes').select('id, nome, dominio, ativo').eq('workspace_id', workspace.id).order('created_at'),
        supabase.from('diagnosticos_concorrentes').select('concorrente_id, scores, dados, created_at')
          .eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
        supabase.from('diagnosticos').select('score_singularidade, score_consistencia, score_posicionamento, created_at')
          .eq('workspace_id', workspace.id).eq('status', 'done').order('created_at', { ascending: false }).limit(1),
        brand ? supabase.from('brand_intelligence').select('modelo, versao').eq('brand_id', brand.id)
          .order('versao', { ascending: false }).limit(1) : { data: [] },
        supabase.from('concorrente_clipping').select('concorrente_id, titulo, sentiment, score_impacto, url, created_at')
          .eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(100),
      ])
      if (!on) return
      // histórico por concorrente: [0] = último ciclo, [1] = anterior (para os deltas)
      const hist = {}
      for (const dg of diags || []) (hist[dg.concorrente_id] = hist[dg.concorrente_id] || []).push(dg)
      const modelo = intel?.[0]?.modelo || {}
      setD({
        brandNome: brand?.nome || 'Sua marca',
        rows: (cs || []).filter(c => c.ativo).map(c => ({ ...c, hist: hist[c.id] || [] })),
        meu: meuDiag?.[0] || null,
        meuTerritorio: modelo?.territorio?.valor || null,
        fatos: (modelo?.fatos || []).map(f => f?.fato).filter(Boolean),
        clips: clips || [],
      })
    })()
    return () => { on = false }
  }, [workspace?.id])

  if (!d) return (
    <Shell title="Concorrentes" subtitle="O dossiê de cada adversário — quem disputa o seu território e como se move">
      <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
    </Shell>
  )

  const scoreCor = v => (v >= 7 ? TEAL : v >= 4 ? AMBER : v != null ? CORAL : 'text.disabled')
  const Delta = ({ atual, prev }) => {
    if (atual == null || prev == null || atual === prev) return null
    const up = atual > prev
    return <Typography component="span" fontSize={10.5} fontWeight={800} sx={{ ml: 0.25, color: up ? TEAL : CORAL }}>{up ? '▲' : '▼'}{Math.abs(atual - prev)}</Typography>
  }

  const METRICAS = [['singularidade', 'Singularidade'], ['consistencia', 'Consistência'], ['posicionamento', 'Posicionamento']]
  const meuScore = { singularidade: d.meu?.score_singularidade, consistencia: d.meu?.score_consistencia, posicionamento: d.meu?.score_posicionamento }

  return (
    <Shell title="Concorrentes" subtitle="O dossiê de cada adversário — quem disputa o seu território e como se move">
      {d.rows.length === 0 ? (
        <EmConstrucao desc="Nenhum concorrente ativo. Cadastre em Relatórios — cada concorrente ganha diagnóstico automático, clipping semanal e dossiê aqui." />
      ) : (
        <Stack spacing={3}>
          {/* seu território aprendido — a régua da colisão */}
          {d.meuTerritorio && (
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, borderColor: 'rgba(127,119,221,0.35)' }}>
              <Typography fontSize={10.5} fontWeight={800} sx={{ color: '#7F77DD', letterSpacing: '0.06em' }}>O SEU TERRITÓRIO (APRENDIDO PELA INTELIGÊNCIA)</Typography>
              <Typography fontSize={13.5} sx={{ mt: 0.25, lineHeight: 1.55 }}>{d.meuTerritorio}</Typography>
            </Paper>
          )}

          {/* comparativo lado a lado */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, overflowX: 'auto' }}>
            <Typography fontSize={11} fontWeight={800} color="text.secondary" mb={1.25}>ONDE VOCÊ GANHA, ONDE PERDE</Typography>
            <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
              <Box component="thead">
                <Box component="tr">
                  <Box component="th" sx={{ textAlign: 'left', fontSize: 11, color: 'text.disabled', fontWeight: 700, pb: 1, pr: 2 }} />
                  <Box component="th" sx={{ textAlign: 'center', fontSize: 12, fontWeight: 900, pb: 1, px: 1.5, color: '#7F77DD' }}>{d.brandNome}</Box>
                  {d.rows.map(c => (
                    <Box key={c.id} component="th" sx={{ textAlign: 'center', fontSize: 12, fontWeight: 800, pb: 1, px: 1.5 }}>{c.nome}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {METRICAS.map(([k, label]) => (
                  <Box component="tr" key={k}>
                    <Box component="td" sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700, py: 0.75, pr: 2 }}>{label}</Box>
                    <Box component="td" sx={{ textAlign: 'center', fontSize: 15, fontWeight: 900, color: scoreCor(meuScore[k]) }}>{meuScore[k] ?? '—'}</Box>
                    {d.rows.map(c => {
                      const v = c.hist[0]?.scores?.[k]
                      const ganha = meuScore[k] != null && v != null && meuScore[k] !== v
                      return (
                        <Box key={c.id} component="td" sx={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: scoreCor(v),
                          bgcolor: ganha ? (meuScore[k] > v ? 'rgba(13,158,122,0.07)' : 'rgba(232,24,90,0.07)') : undefined }}>
                          {v ?? '—'}<Delta atual={v} prev={c.hist[1]?.scores?.[k]} />
                        </Box>
                      )
                    })}
                  </Box>
                ))}
              </Box>
            </Box>
            <Typography fontSize={10.5} color="text.disabled" mt={1}>fundo verde = você ganha · vermelho = você perde · ▲▼ = evolução do concorrente vs ciclo anterior</Typography>
          </Paper>

          {/* dossiês */}
          <Stack spacing={1.5}>
            {d.rows.map(c => {
              const ult = c.hist[0], dados = ult?.dados || {}
              const terrs = Array.isArray(dados.territorios_possiveis) ? dados.territorios_possiveis : []
              const meuNucleo = nucleoTerritorio(d.meuTerritorio)
              const colisoes = meuNucleo ? terrs.filter(t => colide(meuNucleo, `${t?.nome || ''} ${t?.tese || ''}`)) : []
              const fatosDele = d.fatos.filter(f => f.toLowerCase().includes(c.nome.toLowerCase())).slice(0, 3)
              const movs = d.clips.filter(x => x.concorrente_id === c.id).slice(0, 3)
              const exp = aberto === c.id
              return (
                <Paper key={c.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden',
                  borderColor: colisoes.length ? 'rgba(232,24,90,0.4)' : undefined }}>
                  {/* cabeçalho clicável */}
                  <Box onClick={() => setAberto(exp ? null : c.id)}
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Box sx={{ minWidth: 160 }}>
                        <Typography fontWeight={900} fontSize={15}>{c.nome}</Typography>
                        <Typography fontSize={11.5} color="text.secondary">{dados.porte ? `${dados.porte} · ` : ''}{c.dominio || dados.setor || ''}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
                        {METRICAS.map(([k, label]) => (
                          <Chip key={k} size="small" variant="outlined"
                            label={<>{label.slice(0, 4)} {ult?.scores?.[k] ?? '—'}<Delta atual={ult?.scores?.[k]} prev={c.hist[1]?.scores?.[k]} /></>}
                            sx={{ fontSize: 10.5, fontWeight: 700, color: scoreCor(ult?.scores?.[k]) }} />
                        ))}
                        {colisoes.length > 0 && <Chip size="small" label="⚠ encosta no seu território"
                          sx={{ fontSize: 10.5, fontWeight: 800, bgcolor: 'rgba(232,24,90,0.12)', color: CORAL }} />}
                      </Stack>
                      <Typography fontSize={11} color="text.disabled" sx={{ flexShrink: 0 }}>
                        {ult ? new Date(ult.created_at).toLocaleDateString('pt-BR') : 'na fila'} {exp ? '▴' : '▾'}
                      </Typography>
                    </Stack>
                    {dados.frase_diagnostico && (
                      <Typography fontSize={12.5} color="text.secondary" sx={{ mt: 1, fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{dados.frase_diagnostico}"
                      </Typography>
                    )}
                  </Box>

                  {/* dossiê expandido */}
                  {exp && ult && (
                    <Box sx={{ px: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.75 }}>
                      <Stack spacing={2}>
                        {terrs.length > 0 && (
                          <Box>
                            <Typography fontSize={10.5} fontWeight={800} color="text.disabled" mb={0.75}>TERRITÓRIOS QUE ELE REIVINDICA</Typography>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              {terrs.map((t, i) => {
                                const briga = colisoes.includes(t)
                                return <Chip key={i} size="small" label={t?.nome || t}
                                  title={t?.tese || ''}
                                  sx={{ fontSize: 11, fontWeight: 700, ...(briga ? { bgcolor: 'rgba(232,24,90,0.12)', color: CORAL } : {}) }} />
                              })}
                            </Stack>
                            {colisoes.length > 0 && (
                              <Typography fontSize={12} sx={{ mt: 0.75, color: CORAL, fontWeight: 700 }}>
                                ⚠ {colisoes.map(t => `"${t?.nome}"`).join(', ')} disputa espaço com o seu território — diferencie ou acelere a ocupação.
                              </Typography>
                            )}
                          </Box>
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                          {Array.isArray(dados.diferenciais_ativos) && dados.diferenciais_ativos.length > 0 && (
                            <Box>
                              <Typography fontSize={10.5} fontWeight={800} sx={{ color: TEAL }} mb={0.75}>FORÇAS DELE</Typography>
                              <Stack spacing={0.5}>
                                {dados.diferenciais_ativos.slice(0, 3).map((x, i) => (
                                  <Typography key={i} fontSize={12.5} sx={{ lineHeight: 1.5 }}>• {typeof x === 'string' ? x : x?.titulo || JSON.stringify(x)}</Typography>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          {Array.isArray(dados.zona_ruido) && dados.zona_ruido.length > 0 && (
                            <Box>
                              <Typography fontSize={10.5} fontWeight={800} sx={{ color: CORAL }} mb={0.75}>FRAQUEZAS DELE (SUA JANELA)</Typography>
                              <Stack spacing={0.5}>
                                {dados.zona_ruido.slice(0, 3).map((x, i) => (
                                  <Typography key={i} fontSize={12.5} sx={{ lineHeight: 1.5 }}>• {typeof x === 'string' ? x : x?.titulo || JSON.stringify(x)}</Typography>
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Box>

                        {dados.momento_atual && (
                          <Box>
                            <Typography fontSize={10.5} fontWeight={800} color="text.disabled" mb={0.5}>MOMENTO DELE</Typography>
                            <Typography fontSize={12.5} color="text.secondary" sx={{ lineHeight: 1.55 }}>{String(dados.momento_atual).slice(0, 400)}</Typography>
                          </Box>
                        )}

                        {fatosDele.length > 0 && (
                          <Box>
                            <Typography fontSize={10.5} fontWeight={800} sx={{ color: '#7F77DD' }} mb={0.5}>O QUE A INTELIGÊNCIA JÁ SABE SOBRE ELE</Typography>
                            <Stack spacing={0.5}>
                              {fatosDele.map((f, i) => <Typography key={i} fontSize={12.5} sx={{ lineHeight: 1.5 }}>• {f}</Typography>)}
                            </Stack>
                          </Box>
                        )}

                        {movs.length > 0 && (
                          <Box>
                            <Typography fontSize={10.5} fontWeight={800} color="text.disabled" mb={0.5}>MOVIMENTOS RECENTES</Typography>
                            <Stack spacing={0.5}>
                              {movs.map((m, i) => (
                                <Typography key={i} fontSize={12.5} sx={{ lineHeight: 1.5 }}>
                                  • {m.titulo}{m.score_impacto ? ` (impacto ${m.score_impacto}/10)` : ''} — {new Date(m.created_at).toLocaleDateString('pt-BR')}
                                </Typography>
                              ))}
                            </Stack>
                            <Link href="#/app/market-intel" sx={{ fontSize: 12, fontWeight: 700, mt: 0.5, display: 'inline-block' }}>ver no feed do mercado →</Link>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              )
            })}
          </Stack>
        </Stack>
      )}
      <Typography fontSize={12} color="text.secondary" mt={2.5}>
        Mapa de território, ciclos completos e gestão dos concorrentes: <Link href="#/app/reports" sx={{ fontWeight: 700 }}>Relatórios</Link>.
      </Typography>
    </Shell>
  )
}

// ── Insights do Consumidor — a LEITURA da escuta (a coleta bruta mora na
// Escuta Social; aqui o cérebro destila o que as menções SIGNIFICAM) ──
const INSIGHT_TIPO = {
  elogio:       { label: 'Elogio',        cor: TEAL,      dica: 'dobrar a aposta' },
  atrito:       { label: 'Atrito',        cor: CORAL,     dica: 'consertar' },
  oportunidade: { label: 'Oportunidade',  cor: '#7F77DD', dica: 'ocupar' },
  tema:         { label: 'Tema',          cor: AMBER,     dica: 'usar no conteúdo' },
  alerta:       { label: 'Alerta',        cor: CORAL,     dica: 'monitorar já' },
}

export function ConsumerInsights() {
  const { workspace } = useWorkspace()
  const [d, setD] = useState(null)
  const [gerando, setGerando] = useState(false)

  const load = useCallback(async () => {
    const { data: brand } = await supabase.from('brands').select('id').eq('workspace_id', workspace.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    const [{ data: snaps }, { data: ins }, nEventos, { data: intel }, { data: book }] = await Promise.all([
      supabase.from('sentiment_snapshots').select('data, positivo_pct, neutro_pct, negativo_pct, avg_positivo, avg_neutro, avg_negativo, total_mencoes')
        .eq('workspace_id', workspace.id).order('created_at', { ascending: true }).limit(60),
      supabase.from('consumer_insights').select('*').eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('listening_events').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      brand ? supabase.from('brand_intelligence').select('modelo').eq('brand_id', brand.id)
        .order('versao', { ascending: false }).limit(1) : { data: [] },
      brand ? supabase.from('brand_books').select('strategy').eq('brand_id', brand.id)
        .order('updated_at', { ascending: false }).limit(1) : { data: [] },
    ])
    // Snapshots antigos não têm *_pct (colunas posteriores) — cai para avg_*.
    const norm = (snaps || []).map(s => ({
      data: s.data,
      positivo_pct: s.positivo_pct ?? s.avg_positivo ?? 0,
      neutro_pct:   s.neutro_pct   ?? s.avg_neutro   ?? 0,
      negativo_pct: s.negativo_pct ?? s.avg_negativo ?? 0,
      total_mencoes: s.total_mencoes,
    }))
    // A página mostra o LOTE mais recente (batch_id da linha mais nova)
    const lote = ins?.length ? ins.filter(i => i.batch_id === ins[0].batch_id) : []
    const next = {
      brandId: brand?.id,
      snaps: norm, insights: lote, geradoEm: lote[0]?.created_at || null,
      totalMencoes: nEventos.count || 0,
      temas: intel?.[0]?.modelo?.conteudo?.temas || [],
      personas: (book?.[0]?.strategy?.personas || []).filter(p => p?.nome),
    }
    setD(next)
    return next
  }, [workspace?.id])

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id, load])

  // Dispara a destilação (background) e faz polling até o lote novo chegar.
  const gerar = async () => {
    setGerando(true)
    const antes = d?.geradoEm || null
    const { data: { session } } = await supabase.auth.getSession()
    fetch('/.netlify/functions/insights-gerar-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ workspace_id: workspace.id }),
    }).catch(() => {})
    for (let i = 0; i < 18; i++) {                    // até ~90s
      await new Promise(r => setTimeout(r, 5000))
      const next = await load()
      if (next.geradoEm && next.geradoEm !== antes) break
    }
    setGerando(false)
  }

  if (!d) return (
    <Shell title="Insights do Consumidor" subtitle="O que a escuta social significa — insights nomeados pela inteligência da marca">
      <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
    </Shell>
  )

  const ultimo = d.snaps[d.snaps.length - 1]

  return (
    <Shell title="Insights do Consumidor" subtitle="O que a escuta social significa — insights nomeados pela inteligência da marca">
      {/* a divisão de trabalho com a Escuta, explícita na tela */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography fontSize={12.5} color="text.secondary" sx={{ flex: 1, minWidth: 260 }}>
          A <b>Escuta Social</b> coleta o que disseram ({d.totalMencoes} menções até agora). Aqui a inteligência da marca lê tudo e nomeia <b>o que isso significa</b>.
        </Typography>
        <Button size="small" variant="text" onClick={() => { navigate('#/app/listening') }} sx={{ fontWeight: 700, flexShrink: 0 }}>
          Ver a coleta bruta →
        </Button>
        <Button size="small" variant="contained" disableElevation disabled={gerando || !d.totalMencoes} onClick={gerar}
          startIcon={gerando ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <AutoAwesomeIcon />}
          sx={{ fontWeight: 800, flexShrink: 0 }}>
          {gerando ? 'Lendo a escuta…' : 'Gerar insights'}
        </Button>
      </Paper>

      {d.totalMencoes === 0 && d.snaps.length === 0 ? (
        <EmConstrucao desc="Ainda não há escuta coletada. Rode a Escuta Social — cada ciclo alimenta esta leitura."
          vem="insights nomeados (elogio · atrito · oportunidade · tema · alerta), conectados às personas" />
      ) : (
        <Stack spacing={3}>
          {/* os insights nomeados — o coração da página */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
              <Typography fontSize={11} fontWeight={800} color="text.secondary">INSIGHTS DA ÚLTIMA LEITURA</Typography>
              {d.geradoEm && <Typography fontSize={11} color="text.disabled">gerados em {new Date(d.geradoEm).toLocaleDateString('pt-BR')}</Typography>}
            </Stack>
            {d.insights.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                <Typography fontSize={13.5} color="text.secondary">
                  {d.totalMencoes} menções coletadas esperando leitura — clique em <b>Gerar insights</b> para a inteligência da marca nomear o que o público sente, quer e rejeita.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {d.insights.map(i => {
                  const tp = INSIGHT_TIPO[i.tipo] || INSIGHT_TIPO.tema
                  return (
                    <Paper key={i.id} variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: `3px solid ${tp.cor}` }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
                        <Chip label={tp.label} size="small" sx={{ fontWeight: 800, fontSize: 10.5, color: tp.cor, bgcolor: `${tp.cor}18` }} />
                        <Typography fontSize={10.5} color="text.disabled" fontWeight={700}>{tp.dica}</Typography>
                        {i.persona && <Chip label={`persona: ${i.persona}`} size="small" variant="outlined" sx={{ fontSize: 10.5 }} />}
                        <Box flex={1} />
                        {i.evidencias != null && <Typography fontSize={11} color="text.disabled">{i.evidencias} menç{i.evidencias === 1 ? 'ão' : 'ões'}</Typography>}
                      </Stack>
                      <Typography fontSize={14} fontWeight={800}>{i.titulo}</Typography>
                      <Typography fontSize={13} color="text.secondary" sx={{ lineHeight: 1.55, mt: 0.25 }}>{i.insight}</Typography>
                      {i.acao && (
                        <Typography fontSize={12.5} sx={{ mt: 1, fontWeight: 700, color: tp.cor }}>→ {i.acao}</Typography>
                      )}
                    </Paper>
                  )
                })}
              </Stack>
            )}
          </Box>
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
                    <Chip key={i} label={p.nome} size="small" onClick={() => { if (d.brandId) navigate(`#/app/brands/${d.brandId}/negocio`) }}
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
