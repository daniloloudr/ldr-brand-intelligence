import { useState } from 'react'
import {
  Box, Typography, Button, TextField, CircularProgress, Alert,
  Paper, Chip, LinearProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { RATE_LIMIT_WAIT, MAX_RETRIES } from '../../lib/constants'

const API_URL = import.meta.env.DEV
  ? '/api/v1/messages'
  : '/.netlify/functions/anthropic'

const CANAIS = ['Instagram', 'LinkedIn', 'Facebook', 'Twitter/X', 'TikTok', 'E-mail', 'Site', 'OOH', 'Rádio/TV', 'Outro']

function buildApprovalPrompt(brand, book, campaign) {
  const id  = book?.identity || {}
  const pos = book?.positioning || {}

  return {
    system: `Você é um especialista em brand governance da LOUDR OS. Avalie se a peça de comunicação está alinhada com o brand book da marca.

# Brand Book — ${brand?.nome}
- Missão: ${id.missao || 'não definida'}
- Valores: ${(id.valores || []).join(', ') || 'não definidos'}
- Arquétipo: ${id.arquetipo || 'não definido'}
- Tom de voz: ${id.tom_voz || 'não definido'}
- Vocabulário proibido: ${(id.vocabulario_proibido || []).join(', ') || 'nenhum'}
- Posicionamento: ${pos.posicionamento || 'não definido'}
- Proposta de valor: ${pos.proposta_valor || 'não definida'}

Responda SOMENTE com JSON válido, sem markdown:
{
  "aprovado": true/false,
  "score_geral": 0-10,
  "dimensoes": {
    "tom_voz":        { "score": 0-10, "ok": true/false, "nota": "..." },
    "valores":        { "score": 0-10, "ok": true/false, "nota": "..." },
    "vocabulario":    { "score": 0-10, "ok": true/false, "nota": "..." },
    "posicionamento": { "score": 0-10, "ok": true/false, "nota": "..." }
  },
  "palavras_problematicas": ["..."],
  "sugestoes": ["...", "..."],
  "resumo": "..."
}`,
    message: `Avalie esta peça de comunicação:

Título: ${campaign.title}
Canal: ${campaign.canal || 'não especificado'}
Conteúdo:
${campaign.copy}

${campaign.objetivo ? `Objetivo: ${campaign.objetivo}` : ''}`
  }
}

async function getVerdict(brand, book, campaign, onProgress) {
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    attempt++
    const { system, message } = buildApprovalPrompt(brand, book, campaign)
    const headers = { 'Content-Type': 'application/json' }
    if (import.meta.env.DEV) {
      headers['x-api-key'] = import.meta.env.VITE_ANTHROPIC_KEY || ''
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        stream: true,
        system,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (res.status === 429 || res.status === 529) {
      if (attempt >= MAX_RETRIES) throw new Error('Limite de uso da API. Tente novamente em alguns minutos.')
      onProgress?.('rate_limit')
      await new Promise(r => setTimeout(r, RATE_LIMIT_WAIT * 1000))
      continue
    }

    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e?.error?.message || `Erro ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        let evt; try { evt = JSON.parse(data) } catch { continue }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          fullText += evt.delta.text || ''
        }
      }
    }

    try {
      const j0 = fullText.indexOf('{'), j1 = fullText.lastIndexOf('}')
      if (j0 >= 0 && j1 > j0) return JSON.parse(fullText.slice(j0, j1 + 1))
    } catch {}
    throw new Error('Não foi possível extrair o veredicto. Tente novamente.')
  }
}

export function CampaignNew({ brandId }) {
  const { user } = useWorkspace()
  const [title, setTitle]     = useState('')
  const [copy, setCopy]       = useState('')
  const [canal, setCanal]     = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError]     = useState('')

  function goBack() {
    const h = window.location.hash
    window.location.hash = h.replace('/campaigns/new', '/campaigns')
  }

  async function submit() {
    if (!title.trim() || !copy.trim()) return
    setLoading(true)
    setError('')
    setProgress('Carregando brand book…')

    try {
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      const { data: book }  = await supabase.from('brand_books').select('*').eq('brand_id', brandId).maybeSingle()

      setProgress('Analisando com IA…')

      const campaign = { title: title.trim(), copy: copy.trim(), canal, objetivo }
      const verdict  = await getVerdict(brand, book, campaign, (type) => {
        if (type === 'rate_limit') setProgress('Rate limit — aguardando…')
      })

      setProgress('Salvando…')

      const { data: saved } = await supabase.from('campaigns').insert({
        brand_id:     brandId,
        submitted_by: user?.id,
        title:        title.trim(),
        content:      { copy, canal, objetivo },
        status:       verdict.aprovado ? 'approved' : 'rejected',
        verdict,
        reviewed_at:  new Date().toISOString(),
      }).select().single()

      if (saved) {
        const base = window.location.hash.replace('/campaigns/new', '/campaigns')
        window.location.hash = `${base}/${saved.id}`
      }
    } catch (err) {
      setError(err.message || 'Erro inesperado')
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <Box sx={{ p: 4, maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={goBack}
          sx={{ color: 'text.secondary', fontWeight: 700, minWidth: 0 }}
        >
          Campanhas
        </Button>
        <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">Nova campanha</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="Título da campanha *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
          autoFocus
        />

        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}
            textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1}>
            Canal
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {CANAIS.map(c => (
              <Chip
                key={c}
                label={c}
                size="small"
                onClick={() => setCanal(canal === c ? '' : c)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: canal === c ? 'primary.main' : 'rgba(13,158,122,0.08)',
                  color:   canal === c ? '#fff'         : 'primary.main',
                  fontWeight: 700,
                  '&:hover': { bgcolor: canal === c ? 'primary.dark' : 'rgba(13,158,122,0.15)' },
                }}
              />
            ))}
          </Box>
        </Box>

        <TextField
          label="Objetivo da campanha"
          value={objetivo}
          onChange={e => setObjetivo(e.target.value)}
          fullWidth
          placeholder="Ex: gerar leads, anunciar lançamento, aumentar reconhecimento…"
        />

        <TextField
          label="Conteúdo da peça *"
          value={copy}
          onChange={e => setCopy(e.target.value)}
          fullWidth
          multiline
          minRows={6}
          placeholder="Cole aqui o copy, roteiro, texto ou descrição visual da peça…"
        />

        {error && <Alert severity="error">{error}</Alert>}

        {loading && (
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: '#7F77DD', fontSize: 20 }} />
              <Typography fontWeight={700} fontSize={14}>{progress}</Typography>
            </Box>
            <LinearProgress color="info" sx={{ '& .MuiLinearProgress-bar': { animationDuration: '1.5s' } }} />
          </Paper>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={goBack} sx={{ borderColor: 'divider', color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={loading || !title.trim() || !copy.trim()}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
          >
            {loading ? 'Analisando…' : 'Analisar campanha'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
