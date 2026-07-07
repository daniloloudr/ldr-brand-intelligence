import { useState, useEffect } from 'react'
import {
  Drawer, Box, Typography, IconButton, Button, CircularProgress, Chip, Divider,
} from '@mui/material'
import CloseIcon       from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckIcon       from '@mui/icons-material/Check'
import { supabase } from '../../lib/supabase'
import { compileIntel } from '../../lib/brandIntel'
import { RATE_LIMIT_WAIT, MAX_RETRIES } from '../../lib/constants'

const API_URL = import.meta.env.DEV
  ? '/api/v1/messages'
  : '/.netlify/functions/anthropic'

const INTENT_LABEL = { informacional: 'Informacional', transacional: 'Transacional', navegacional: 'Navegacional' }
const OPOR_COR     = { alta: '#0D9E7A', media: '#EF9F27', baixa: '#8A9AB0' }
const VOL_COR      = { alto: '#0D9E7A', medio: '#EF9F27', baixo: '#8A9AB0' }
const VOL_LABEL    = { alto: 'Alto', medio: 'Médio', baixo: 'Nicho' }

function buildPrompt(item, workspace, intelBlock) {
  const marca = workspace.dominio || workspace.nome
  const intel = intelBlock ? `\n${intelBlock}\n` : ''
  if (item._tipo === 'ideia') {
    return `Você é estrategista de conteúdo.
${intel}
Crie um briefing de conteúdo para o site "${marca}":

Título da ideia: "${item.titulo}"
Formato: ${item.formato}
Intenção: ${item.intencao}
Contexto: ${item.relevancia}

Gere exatamente nessa estrutura, usando markdown:

## Título SEO
(máx 60 caracteres, inclua a palavra-chave principal)

## Meta description
(máx 155 caracteres, inclui CTA implícito)

## Estrutura do conteúdo
(liste os H2 e H3 principais — 4 a 6 tópicos)

## Introdução
(2 a 3 frases que engajam e contextualizam a busca)

## Call-to-action
(1 frase de CTA para o final do conteúdo)

Responda em português brasileiro, direto ao ponto.`
  }

  return `Você é especialista em SEO e estratégia de conteúdo.
${intel}
Crie um briefing de conteúdo para o site "${marca}":

Palavra-chave: "${item.termo}"
Intenção de busca: ${item.intencao}
Volume estimado: ${item.volume}
Nível de oportunidade: ${item.oportunidade}

Gere exatamente nessa estrutura, usando markdown:

## Título SEO
(máx 60 caracteres, inclua a keyword)

## Meta description
(máx 155 caracteres, inclui CTA implícito)

## Estrutura do artigo
(liste os H2 e H3 principais — 4 a 6 tópicos)

## Introdução
(2 a 3 frases que engajam e contextualizam a busca)

## Call-to-action
(1 frase de CTA para o final do conteúdo)

Responda em português brasileiro, direto ao ponto.`
}

// Lê o cérebro da marca (modelo vivo destilado) p/ o briefing sair on-brand.
// Devolve { brand, intelBlock } — falha silenciosa (briefing sem intel ainda funciona).
async function loadBrainContext(workspaceId) {
  try {
    const { data: brand } = await supabase.from('brands')
      .select('id, nome').eq('workspace_id', workspaceId).limit(1).maybeSingle()
    if (!brand) return { brand: null, intelBlock: '' }
    const { data: bi } = await supabase.from('brand_intelligence')
      .select('versao, modelo').eq('brand_id', brand.id)
      .order('versao', { ascending: false }).limit(1).maybeSingle()
    return { brand, intelBlock: compileIntel(bi?.modelo, bi?.versao) }
  } catch {
    return { brand: null, intelBlock: '' }
  }
}

async function streamBrief({ item, workspace, intelBlock, onText, onDone, onError }) {
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    attempt++
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (import.meta.env.DEV) {
        headers['x-api-key'] = import.meta.env.VITE_ANTHROPIC_KEY || ''
      }
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          stream: true,
          messages: [{ role: 'user', content: buildPrompt(item, workspace, intelBlock) }],
        }),
      })

      if (res.status === 429 || res.status === 529) {
        if (attempt >= MAX_RETRIES) { onError('Limite de uso da API. Tente novamente em instantes.'); return }
        await new Promise(r => setTimeout(r, RATE_LIMIT_WAIT * 1000))
        continue
      }
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Erro ${res.status}`) }

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
            onText(fullText)
          }
          if (evt.type === 'message_stop') onDone(fullText)
        }
      }
      return
    } catch (e) { onError(e.message || 'Erro desconhecido'); return }
  }
}

function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('## ')) {
      elements.push(
        <Typography key={i} sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'primary.main', mt: elements.length ? 2.5 : 0, mb: 0.75 }}>
          {line.slice(3)}
        </Typography>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <Typography key={i} sx={{ fontSize: 13, lineHeight: 1.6, pl: 1.5, color: 'text.primary',
          '&::before': { content: '"·"', mr: 1, color: 'primary.main' } }}>
          {line.slice(2)}
        </Typography>
      )
    } else if (line.trim()) {
      elements.push(
        <Typography key={i} sx={{ fontSize: 13, lineHeight: 1.7, color: 'text.primary' }}>
          {line}
        </Typography>
      )
    }
    i++
  }
  return elements
}

export function ContentGerarDrawer({ item, workspace, open, onClose }) {
  const [streaming, setStreaming] = useState(false)
  const [text, setText]          = useState('')
  const [error, setError]        = useState('')
  const [copied, setCopied]      = useState(false)
  const [brain, setBrain]        = useState({ brand: null, intelBlock: '' })
  const [signaled, setSignaled]  = useState(false)

  useEffect(() => {
    if (!open || !item) return
    let cancelled = false
    setText('')
    setError('')
    setSignaled(false)
    setStreaming(true)
    loadBrainContext(workspace.id).then(ctx => {
      if (cancelled) return
      setBrain(ctx)
      streamBrief({
        item,
        workspace,
        intelBlock: ctx.intelBlock,
        onText:  t => setText(t),
        onDone:  t => { setText(t); setStreaming(false) },
        onError: e => { setError(e); setStreaming(false) },
      })
    })
    return () => { cancelled = true }
  }, [open, item])

  // Copiar = o time ADOTOU o briefing → sinal 'content_used' pro cérebro
  // (fecha o loop do Content Hub na escrita). Uma vez por briefing.
  function emitContentUsed() {
    if (signaled || !brain.brand?.id || !workspace?.id) return
    setSignaled(true)
    supabase.from('brand_signals').insert({
      brand_id: brain.brand.id, workspace_id: workspace.id,
      tipo: 'content_used', fonte: 'content_hub', ref_id: null,
      payload: {
        item_tipo: item?._tipo || 'keyword',
        titulo:    (item?._tipo === 'ideia' ? item?.titulo : item?.termo) || '',
        formato:   item?.formato || null,
        intencao:  item?.intencao || null,
        cluster:   item?.cluster || null,
        briefing:  (text || '').slice(0, 1500),
      },
      peso: 1.5,
    }).then(({ error: e }) => { if (e) console.error('[content] signal falhou:', e.message) })
  }

  async function handleCopy() {
    if (!text) return
    await navigator.clipboard.writeText(text).catch(() => {})
    emitContentUsed()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const titulo = item?._tipo === 'ideia' ? item.titulo : item?.termo
  const badges = item?._tipo === 'ideia'
    ? [item.formato, INTENT_LABEL[item.intencao] || item.intencao].filter(Boolean)
    : [
        item?.volume  ? (VOL_LABEL[item.volume]  || item.volume)   : null,
        item?.intencao ? (INTENT_LABEL[item.intencao] || item.intencao) : null,
      ].filter(Boolean)

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, bgcolor: 'background.paper' } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon sx={{ color: '#7F77DD', fontSize: 18 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 900, letterSpacing: '-0.01em' }}>
                Briefing de conteúdo
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled', mt: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography sx={{ fontSize: 17, fontWeight: 900, lineHeight: 1.3, mb: 1 }}>
            {titulo}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {badges.map(b => (
              <Chip key={b} label={b} size="small"
                sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700,
                  bgcolor: 'rgba(127,119,221,0.12)', color: '#7F77DD' }} />
            ))}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {error ? (
            <Typography color="error" variant="body2">{error}</Typography>
          ) : streaming && !text ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 4 }}>
              <CircularProgress size={16} color="primary" />
              <Typography variant="body2" color="text.secondary">Gerando briefing…</Typography>
            </Box>
          ) : (
            <Box>
              {renderMarkdown(text)}
              {streaming && (
                <Typography component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>▋</Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Footer */}
        {!streaming && text && (
          <>
            <Divider />
            <Box sx={{ p: 2.5, display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined" size="small" fullWidth
                startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={handleCopy}
                sx={{ fontWeight: 700, fontSize: 12, borderColor: copied ? 'primary.main' : 'divider',
                  color: copied ? 'primary.main' : 'text.secondary' }}
              >
                {copied ? 'Copiado!' : 'Copiar briefing'}
              </Button>
              <Button
                variant="outlined" size="small" fullWidth
                startIcon={<AutoAwesomeIcon sx={{ fontSize: '13px !important' }} />}
                onClick={() => { setText(''); setSignaled(false); setStreaming(true); streamBrief({
                  item, workspace, intelBlock: brain.intelBlock,
                  onText: t => setText(t),
                  onDone: t => { setText(t); setStreaming(false) },
                  onError: e => { setError(e); setStreaming(false) },
                }) }}
                sx={{ fontWeight: 700, fontSize: 12 }}
              >
                Regerar
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  )
}
