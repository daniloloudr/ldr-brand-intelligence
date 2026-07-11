// IntelligencePages — as páginas do grupo Intelligence da nova árvore.
// Market Intelligence e Competitors são REAIS (dados que já existem, nova
// vitrine); Consumer Insights, Trends e Reports nascem "em construção"
// (copy honesta do que vem) — Onda 3 do plano.
import { useState, useEffect } from 'react'
import { Box, Paper, Typography, Stack, CircularProgress, Chip, Link } from '@mui/material'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
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

// ── Em construção (Onda 3) ───────────────────────────────────────────
export function ConsumerInsights() {
  return (
    <Shell title="Insights do Consumidor" subtitle="O que o público sente e diz — destilado em insights acionáveis">
      <EmConstrucao desc="Os insights de consumidor serão destilados do Social Listening + evidências do cérebro da marca: temas recorrentes, mudanças de sentimento e oportunidades nomeadas."
        vem="insights automáticos por ciclo, conectados às personas da Strategy" />
    </Shell>
  )
}

export function TrendsPage() {
  return (
    <Shell title="Tendências" subtitle="Tendências do setor antes de virarem lugar-comum">
      <EmConstrucao desc="Radar de tendências do seu setor via pesquisa recorrente — as relevantes viram evidência para o cérebro e sugestões de conteúdo no Content Hub."
        vem="radar semanal por setor + 'como a sua marca surfa isso' gerado no seu tom" />
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
