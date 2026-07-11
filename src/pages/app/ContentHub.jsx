import { useState, useEffect }    from 'react'
import {
  Box, Typography, Card, Button, CircularProgress, Alert, Chip, Tabs, Tab,
} from '@mui/material'
import AutoAwesomeIcon  from '@mui/icons-material/AutoAwesome'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase }     from '../../lib/supabase'
import { ContentPalavras }     from './ContentPalavras'
import { ContentOportunidades } from './ContentOportunidades'
import { ContentIdeias }        from './ContentIdeias'
import { PageHeader }           from '../../components/shell/PageHeader'

const CORES = ['#0D9E7A', '#E8185A', '#7F77DD', '#EF9F27', '#4A9ECC', '#FF7043']

function enrichClusters(clusters) {
  return (clusters || []).map((cl, i) => ({ ...cl, cor: CORES[i % CORES.length] }))
}

export function ContentHub() {
  const { workspace }               = useWorkspace()
  const [analise, setAnalise]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState('')
  const [tab, setTab]               = useState(0)

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
      const nova = await pollForAnalysis(since)
      setAnalise(nova)
      setTab(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const clusters = enrichClusters(analise?.dados?.clusters)
  const ideias   = analise?.dados?.ideias || []

  const totalProprias     = clusters.reduce((s, c) =>
    s + (c.keywords || []).filter(k => k.tipo === 'proprio' || !k.tipo).length, 0)
  const totalOportunidades = clusters.reduce((s, c) =>
    s + (c.keywords || []).filter(k => k.tipo === 'oportunidade').length, 0)

  return (
    <Box>
      <PageHeader
        title="Hub de Conteúdo"
        subtitle="Territórios de keywords identificados a partir do seu site."
        action={
          <Button
            variant="contained" color="primary"
            startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleGerar} disabled={generating}
            sx={{ fontWeight: 800 }}>
            {generating ? 'Analisando…' : analise ? 'Reanalisar' : 'Analisar site'}
          </Button>
        }
      />
      <Box sx={{ p: 4 }}>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
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
          {/* Meta + tabs */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', display: 'block', mb: 1.5 }}>
              {clusters.length} territórios · {totalProprias + totalOportunidades} keywords
            </Typography>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'none',
                  minHeight: 44,
                  px: 2,
                },
              }}
            >
              <Tab label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Palavras-chave
                  <Chip label={totalProprias} size="small"
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
                      bgcolor: tab === 0 ? 'primary.main' : 'rgba(255,255,255,0.08)',
                      color: tab === 0 ? '#fff' : 'text.secondary' }} />
                </Box>
              } />
              <Tab label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Oportunidades
                  <Chip label={totalOportunidades} size="small"
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
                      bgcolor: tab === 1 ? '#EF9F27' : 'rgba(255,255,255,0.08)',
                      color: tab === 1 ? '#fff' : 'text.secondary' }} />
                </Box>
              } />
              <Tab label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Ideias de Conteúdo
                  <Chip label={ideias.length} size="small"
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
                      bgcolor: tab === 2 ? '#7F77DD' : 'rgba(255,255,255,0.08)',
                      color: tab === 2 ? '#fff' : 'text.secondary' }} />
                </Box>
              } />
            </Tabs>
          </Box>

          {/* Tab content */}
          {tab === 0 && <ContentPalavras clusters={clusters} />}
          {tab === 1 && <ContentOportunidades clusters={clusters} />}
          {tab === 2 && <ContentIdeias ideias={ideias} clusters={clusters} workspace={workspace} />}
        </>
      )}
      </Box>
    </Box>
  )
}
