import { useState, useEffect, useMemo } from 'react'
import {
  Box, Typography, Card, Button, CircularProgress, Alert, Chip,
} from '@mui/material'
import AutoAwesomeIcon         from '@mui/icons-material/AutoAwesome'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import InfoOutlinedIcon        from '@mui/icons-material/InfoOutlined'
import TrendingUpIcon          from '@mui/icons-material/TrendingUp'
import CheckCircleOutlineIcon  from '@mui/icons-material/CheckCircleOutline'
import { useWorkspace }        from '../../lib/WorkspaceContext'
import { supabase }            from '../../lib/supabase'

/* ── Cluster colors ─────────────────────────────────────────────── */

const CORES = ['#0D9E7A', '#E8185A', '#7F77DD', '#EF9F27', '#4A9ECC', '#FF7043']

function enrichClusters(clusters) {
  return (clusters || []).map((cl, i) => ({ ...cl, cor: CORES[i % CORES.length] }))
}

/* ── Helpers ─────────────────────────────────────────────────────── */

const OPOR_COR   = { alta: '#0D9E7A', media: '#EF9F27', baixa: '#8A9AB0' }
const VOL_LABEL  = { alto: 'Alto', medio: 'Médio', baixo: 'Nicho' }
const VOL_COR    = { alto: '#0D9E7A', medio: '#EF9F27', baixo: '#8A9AB0' }
const INTENT_COR = {
  informacional: '#4A9ECC',
  transacional:  '#E8185A',
  navegacional:  '#7F77DD',
}
const INTENT_LABEL = {
  informacional: 'Informacional',
  transacional:  'Transacional',
  navegacional:  'Navegacional',
}

function oporLabel(o) {
  return o === 'alta' ? 'Alto' : o === 'media' ? 'Médio' : 'Baixo'
}

/* ── Keyword Cloud ───────────────────────────────────────────────── */

const CLOUD_SIZE = {
  alto:  { fontSize: 16, fontWeight: 800, opacity: 1 },
  medio: { fontSize: 13, fontWeight: 700, opacity: 0.85 },
  baixo: { fontSize: 11, fontWeight: 600, opacity: 0.65 },
}

function KeywordCloud({ clusters, clusterAtivo }) {
  const visible = clusterAtivo
    ? clusters.filter(c => c.id === clusterAtivo)
    : clusters

  const shuffled = useMemo(() => {
    const all = []
    for (const cl of visible) {
      for (const kw of (cl.keywords || [])) {
        all.push({ ...kw, cor: cl.cor })
      }
    }
    return [...all].sort(() => Math.random() - 0.5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterAtivo, clusters.map(c => c.id).join(',')])

  if (!shuffled.length) return null

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, mb: 4 }}>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: 1.5,
        alignItems: 'center', justifyContent: 'center', minHeight: 80, mb: 2,
      }}>
        {shuffled.map((kw, i) => {
          const size = CLOUD_SIZE[kw.volume] || CLOUD_SIZE.medio
          const isOportunidade = kw.tipo === 'oportunidade'
          return (
            <Typography
              key={i}
              component="span"
              sx={{
                ...size,
                color: kw.cor,
                opacity: size.opacity,
                cursor: 'default',
                lineHeight: 1.3,
                transition: 'opacity 0.15s',
                textDecoration: isOportunidade ? 'underline dotted' : 'none',
                textDecorationColor: kw.cor + '80',
                textUnderlineOffset: '3px',
                '&:hover': { opacity: 1 },
              }}
            >
              {kw.termo}
            </Typography>
          )
        })}
      </Box>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>━</Typography>
          <Typography variant="caption" color="text.disabled">Já se apropria</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textDecoration: 'underline dotted', textUnderlineOffset: '2px' }}>━</Typography>
          <Typography variant="caption" color="text.disabled">Oportunidade de expansão</Typography>
        </Box>
      </Box>
    </Box>
  )
}

/* ── Keywords Table ──────────────────────────────────────────────── */

const COL = '1fr 130px 90px 160px 130px'

function TableHeader() {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: COL,
      px: 3, py: 1.5,
      bgcolor: 'background.default',
      borderBottom: '2px solid', borderColor: 'divider',
    }}>
      {['Palavra-chave', 'Oportunidade', 'Volume', 'Intenção', ''].map(h => (
        <Typography key={h} variant="overline" color="text.disabled"
          sx={{ fontSize: '0.6rem' }}>{h}</Typography>
      ))}
    </Box>
  )
}

function KeywordRow({ kw, cor }) {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: COL,
      px: 3, py: '11px', alignItems: 'center',
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: cor, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{kw.termo}</Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LocalFireDepartmentIcon sx={{ fontSize: 13, color: OPOR_COR[kw.oportunidade] }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: OPOR_COR[kw.oportunidade] }}>
          {oporLabel(kw.oportunidade)}
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 12, fontWeight: 700, color: VOL_COR[kw.volume] || '#8A9AB0' }}>
        {VOL_LABEL[kw.volume] || kw.volume}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <InfoOutlinedIcon sx={{ fontSize: 13, color: INTENT_COR[kw.intencao] || '#8A9AB0' }} />
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: INTENT_COR[kw.intencao] || '#8A9AB0' }}>
          {INTENT_LABEL[kw.intencao] || kw.intencao}
        </Typography>
      </Box>

      <Button size="small" variant="outlined" color="inherit"
        startIcon={<AutoAwesomeIcon sx={{ fontSize: '11px !important' }} />}
        sx={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', px: 1 }}>
        Gerar conteúdo
      </Button>
    </Box>
  )
}

function ClusterRows({ clusters, tipo }) {
  return clusters.map(cl => {
    const kws = (cl.keywords || []).filter(k =>
      tipo === 'proprio'
        ? (k.tipo === 'proprio' || !k.tipo)   // fallback: sem tipo = própria
        : k.tipo === 'oportunidade'
    )
    if (!kws.length) return null
    return (
      <Box key={cl.id}>
        <Box sx={{ px: 3, py: 1.25, borderBottom: '1px solid', borderColor: 'divider',
          position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: cl.cor }}>
            {cl.nome}
          </Typography>
        </Box>
        {kws.map((kw, j) => <KeywordRow key={j} kw={kw} cor={cl.cor} />)}
      </Box>
    )
  })
}

function KeywordsSection({ clusters, clusterAtivo }) {
  const visible = clusterAtivo
    ? clusters.filter(c => c.id === clusterAtivo)
    : clusters

  // contar por tipo
  const totalProprias     = visible.reduce((s, c) => s + (c.keywords || []).filter(k => k.tipo === 'proprio' || !k.tipo).length, 0)
  const totalOportunidades = visible.reduce((s, c) => s + (c.keywords || []).filter(k => k.tipo === 'oportunidade').length, 0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* Bloco 1: Próprias */}
      {totalProprias > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#0D9E7A' }} />
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>
                Palavras-chave que você já se apropria
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Termos que o seu site já cobre e ranqueia
              </Typography>
            </Box>
            <Chip label={`${totalProprias} keywords`} size="small"
              sx={{ ml: 'auto', fontWeight: 700, fontSize: '0.65rem',
                bgcolor: 'rgba(13,158,122,0.12)', color: '#0D9E7A', height: 20 }} />
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <TableHeader />
            <ClusterRows clusters={visible} tipo="proprio" />
          </Box>
        </Box>
      )}

      {/* Bloco 2: Oportunidades */}
      {totalOportunidades > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <TrendingUpIcon sx={{ fontSize: 18, color: '#EF9F27' }} />
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>
                Oportunidades de expansão
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Keywords adjacentes para ampliar seu alcance orgânico
              </Typography>
            </Box>
            <Chip label={`${totalOportunidades} keywords`} size="small"
              sx={{ ml: 'auto', fontWeight: 700, fontSize: '0.65rem',
                bgcolor: 'rgba(239,159,39,0.12)', color: '#EF9F27', height: 20 }} />
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <TableHeader />
            <ClusterRows clusters={visible} tipo="oportunidade" />
          </Box>
        </Box>
      )}
    </Box>
  )
}

function KeywordsTable({ clusters, clusterAtivo }) {
  const visible = clusterAtivo
    ? clusters.filter(c => c.id === clusterAtivo)
    : clusters

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <TableHeader />
      {visible.map(cl => (
        <Box key={cl.id}>
          <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
            position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: cl.cor }}>
              {cl.nome}
            </Typography>
          </Box>
          {(cl.keywords || []).map((kw, j) => (
            <KeywordRow key={j} kw={kw} cor={cl.cor} />
          ))}
        </Box>
      ))}
    </Box>
  )
}

/* ── Content Ideas ───────────────────────────────────────────────── */

function selectFeatured(clusters, ideias) {
  const all = []
  for (const cl of clusters) {
    for (const kw of (cl.keywords || [])) {
      all.push({ ...kw, clusterId: cl.id, clusterNome: cl.nome, clusterCor: cl.cor })
    }
  }
  if (!all.length) return []

  const oScore = { alta: 3, media: 2, baixa: 1 }
  const sorted = [...all].sort((a, b) => (oScore[b.oportunidade] || 0) - (oScore[a.oportunidade] || 0))

  const bestAI = sorted.find(k => k.intencao === 'informacional') || sorted[0]
  const used   = new Set([bestAI?.termo])

  const bestShort = sorted.find(k =>
    !used.has(k.termo) && k.termo.trim().split(/\s+/).length <= 2
  ) || sorted.find(k => !used.has(k.termo))
  if (bestShort) used.add(bestShort.termo)

  const bestLong = sorted.find(k =>
    !used.has(k.termo) && k.termo.trim().split(/\s+/).length >= 3
  ) || sorted.find(k => !used.has(k.termo))

  const findIdeia = (kw) =>
    kw ? (ideias.find(i => i.cluster === kw.clusterId) || ideias[0]) : null

  return [
    { kw: bestAI,    badge: 'MELHOR VISIBILIDADE COM IA',     tipo: 'específica', badgeCor: '#0D9E7A', ideia: findIdeia(bestAI) },
    { kw: bestShort, badge: 'MELHOR OPORTUNIDADE SHORT-TAIL', tipo: 'short-tail', badgeCor: '#EF9F27', ideia: findIdeia(bestShort) },
    { kw: bestLong,  badge: 'MELHOR OPORTUNIDADE LONG-TAIL',  tipo: 'long-tail',  badgeCor: '#EF9F27', ideia: findIdeia(bestLong) },
  ].filter(f => f.kw)
}

function IdeaCardInner({ kw, ideia, compact }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75,
        mb: compact ? 1.5 : 2 }}>
        <Typography variant="caption" color="text.secondary">Oportunidade:</Typography>
        <LocalFireDepartmentIcon sx={{ fontSize: 13, color: OPOR_COR[kw.oportunidade] }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700,
          color: OPOR_COR[kw.oportunidade] }}>
          {oporLabel(kw.oportunidade)}
        </Typography>
      </Box>

      {ideia && (
        <>
          <Box sx={{ p: compact ? 1.5 : 2, border: '1px solid', borderColor: 'divider',
            borderRadius: 1.5, mb: 1.5 }}>
            <Typography variant="overline" color="text.disabled"
              sx={{ display: 'block', mb: 0.5, fontSize: '0.58rem' }}>
              Por que é relevante?
            </Typography>
            <Typography sx={{ fontSize: compact ? 11.5 : 12.5,
              color: 'text.secondary', lineHeight: 1.6 }}>
              {ideia.relevancia}
            </Typography>
          </Box>
          <Box sx={{ p: compact ? 1.5 : 2, border: '1px solid', borderColor: 'divider',
            borderRadius: 1.5 }}>
            <Typography variant="overline" color="text.disabled"
              sx={{ display: 'block', mb: 0.5, fontSize: '0.58rem' }}>
              Ideia de conteúdo
            </Typography>
            <Typography sx={{ fontSize: compact ? 11.5 : 12.5, lineHeight: 1.6 }}>
              {ideia.ideia}
            </Typography>
          </Box>
        </>
      )}
    </>
  )
}

function FeaturedIdeaCard({ item }) {
  const { kw, badge, tipo, badgeCor, ideia } = item
  return (
    <Card sx={{ p: 3.5, border: '1px solid', borderColor: 'divider',
      borderTop: `3px solid ${badgeCor}` }}>
      <Chip label={badge} size="small"
        sx={{ height: 20, fontSize: '0.58rem', fontWeight: 800, mb: 2.5,
          bgcolor: badgeCor + '18', color: badgeCor, letterSpacing: '0.06em' }} />

      <Typography variant="overline" color="text.disabled"
        sx={{ display: 'block', mb: 0.5 }}>
        Palavra-chave {tipo}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2, mb: 1.5 }}>
        {kw.termo}
      </Typography>

      <IdeaCardInner kw={kw} ideia={ideia} compact={false} />

      <Box sx={{ mt: 2.5 }}>
        <Button variant="contained" size="small"
          startIcon={<AutoAwesomeIcon sx={{ fontSize: '13px !important' }} />}
          sx={{ fontWeight: 800, fontSize: 12 }}>
          Gerar conteúdo
        </Button>
      </Box>
    </Card>
  )
}

function MiniIdeaCard({ item }) {
  const { kw, badge, tipo, badgeCor, ideia } = item
  return (
    <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider',
      borderTop: `3px solid ${badgeCor}`, display: 'flex', flexDirection: 'column' }}>
      <Chip label={badge} size="small"
        sx={{ height: 20, fontSize: '0.58rem', fontWeight: 800, mb: 2,
          bgcolor: badgeCor + '18', color: badgeCor, letterSpacing: '0.06em',
          alignSelf: 'flex-start' }} />

      <Typography variant="overline" color="text.disabled"
        sx={{ display: 'block', mb: 0.5 }}>
        Palavra-chave {tipo}
      </Typography>
      <Typography sx={{ fontSize: 17, fontWeight: 900, lineHeight: 1.25, mb: 1.5 }}>
        {kw.termo}
      </Typography>

      <IdeaCardInner kw={kw} ideia={ideia} compact />

      <Box sx={{ mt: 2.5 }}>
        <Button variant="contained" size="small" fullWidth
          startIcon={<AutoAwesomeIcon sx={{ fontSize: '12px !important' }} />}
          sx={{ fontWeight: 800, fontSize: 11 }}>
          Gerar conteúdo
        </Button>
      </Box>
    </Card>
  )
}

/* ── ContentHub ──────────────────────────────────────────────────── */

export function ContentHub() {
  const { workspace }               = useWorkspace()
  const [analise, setAnalise]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState('')
  const [clusterAtivo, setClusterAtivo] = useState(null)

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id])

  async function load() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('content_hub_analyses')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(10)
      const valid = (data || []).find(r => r.dados?.clusters?.length > 0)
      if (valid) setAnalise(valid)
    } catch { /* no analysis yet */ } finally {
      setLoading(false)
    }
  }

  async function pollForAnalysis(since) {
    const MAX_WAIT = 120_000
    const start = Date.now()
    return new Promise((resolve, reject) => {
      const check = async () => {
        if (Date.now() - start > MAX_WAIT) {
          reject(new Error('A análise demorou mais que o esperado. Tente novamente.'))
          return
        }
        const { data } = await supabase
          .from('content_hub_analyses')
          .select('*')
          .eq('workspace_id', workspace.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) {
          if (data.dados?.error) reject(new Error(data.dados.error))
          else resolve(data)
        } else {
          setTimeout(check, 3000)
        }
      }
      setTimeout(check, 3000)
    })
  }

  async function handleGerar() {
    setGenerating(true)
    setError('')
    const since = new Date().toISOString()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada.')
      const res = await fetch('/.netlify/functions/content-hub-gerar-background', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ workspace_id: workspace.id }),
      })
      if (res.status === 401) throw new Error('Sessão expirada.')
      if (res.status === 403) throw new Error('Sem acesso ao workspace.')
      if (res.status === 400) throw new Error('Configure o domínio do workspace antes de analisar.')
      if (!res.ok && res.status !== 202) throw new Error(`Erro ${res.status}`)
      const analise = await pollForAnalysis(since)
      setAnalise(analise)
      setClusterAtivo(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const clusters = enrichClusters(analise?.dados?.clusters)
  const ideias   = analise?.dados?.ideias || []
  const featured = selectFeatured(clusters, ideias)
  const totalKws = clusters.reduce((s, c) => s + (c.keywords?.length || 0), 0)

  return (
    <Box sx={{ p: 4 }}>

      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">
            Content Hub
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Territórios de keywords identificados a partir do seu site.
          </Typography>
        </Box>
        <Button
          variant="outlined" color="primary" size="small"
          startIcon={generating
            ? <CircularProgress size={14} color="inherit" />
            : <AutoAwesomeIcon />}
          onClick={handleGerar} disabled={generating}
          sx={{ fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {generating ? 'Analisando...' : analise ? 'Reanalisar' : 'Analisar site'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Box>

      ) : !analise ? (
        <Box sx={{ border: '1px dashed', borderColor: 'divider',
          p: '60px 32px', textAlign: 'center', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1 }}>
            Nenhuma análise ainda
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            A IA analisa o seu site, mapeia os territórios de keywords e identifica oportunidades de conteúdo.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleGerar}
            disabled={generating}
            startIcon={generating
              ? <CircularProgress size={14} color="inherit" />
              : <AutoAwesomeIcon />}>
            {generating ? 'Analisando...' : 'Analisar site →'}
          </Button>
        </Box>

      ) : (
        <>
          {/* Stats + cluster filter */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3,
            alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="overline" color="text.disabled"
              sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
              {clusters.length} territórios · {totalKws} keywords
            </Typography>
            <Box sx={{ width: '1px', height: 14, bgcolor: 'divider', flexShrink: 0 }} />
            <Typography variant="overline" color="text.disabled"
              sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
              Filtrar:
            </Typography>
            {clusters.map(cl => (
              <Chip key={cl.id} label={cl.nome} size="small"
                onClick={() => setClusterAtivo(clusterAtivo === cl.id ? null : cl.id)}
                sx={{
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.62rem',
                  bgcolor: clusterAtivo === cl.id ? cl.cor : cl.cor + '18',
                  color:   clusterAtivo === cl.id ? '#fff' : cl.cor,
                  '&:hover': { bgcolor: clusterAtivo === cl.id ? cl.cor : cl.cor + '30' },
                }} />
            ))}
            {clusterAtivo && (
              <Button size="small" onClick={() => setClusterAtivo(null)}
                sx={{ fontWeight: 700, fontSize: 11, color: 'text.secondary',
                  minWidth: 0, p: '2px 8px' }}>
                Limpar
              </Button>
            )}
          </Box>

          {/* Keyword cloud */}
          <KeywordCloud clusters={clusters} clusterAtivo={clusterAtivo} />

          {/* Keywords — duas seções: próprias + oportunidades */}
          <Box sx={{ mb: 5 }}>
            <KeywordsSection clusters={clusters} clusterAtivo={clusterAtivo} />
          </Box>

          {/* AI Content Ideas */}
          {featured.length > 0 && (
            <Box sx={{
              bgcolor: 'rgba(255,255,255,0.015)',
              border: '1px solid', borderColor: 'divider',
              borderRadius: 3, p: { xs: 3, md: 4 },
            }}>
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900,
                  letterSpacing: '-0.02em', color: 'primary.main', mb: 0.5 }}>
                  Conteúdos Sugeridos por IA
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  para {workspace?.nome || workspace?.dominio}
                </Typography>
                <Chip label={`${ideias.length} ideias de conteúdo`} size="small"
                  sx={{ mt: 1.5, fontWeight: 700, fontSize: '0.7rem',
                    bgcolor: 'primary.main', color: '#fff', height: 22 }} />
              </Box>

              <FeaturedIdeaCard item={featured[0]} />

              {featured.length > 1 && (
                <Box sx={{ mt: 2, display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  {featured.slice(1).map((item, i) => (
                    <MiniIdeaCard key={i} item={item} />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
