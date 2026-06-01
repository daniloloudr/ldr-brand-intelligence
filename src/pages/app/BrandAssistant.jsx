import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box, Typography, IconButton, TextField, Button, CircularProgress,
  Paper, Chip, Divider, Avatar, Tooltip,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { fmtDate } from '../../lib/helpers'
import { RATE_LIMIT_WAIT, MAX_RETRIES } from '../../lib/constants'

const API_URL = import.meta.env.DEV
  ? '/api/v1/messages'
  : '/.netlify/functions/anthropic'

const SUGESTOES = [
  'Crie um briefing de campanha para redes sociais alinhado com a nossa identidade',
  'Quais são os pontos mais importantes do nosso posicionamento?',
  'Como o nosso tom de voz se aplica em um e-mail de boas-vindas?',
  'Sugira 5 hashtags consistentes com a nossa marca',
  'Quais valores da marca deveriam estar visíveis nesta campanha?',
]

function buildSystemPrompt(brand, book) {
  if (!book) {
    return `Você é o Brand Assistant da marca "${brand?.nome || 'desconhecida'}" na plataforma LOUDR OS.
Ainda não há um brand book configurado. Oriente o usuário a preencher o brand book para habilitar respostas contextualizadas.`
  }

  const id = book.identity || {}
  const pos = book.positioning || {}
  const ds = book.design_system || {}

  return `Você é o Brand Assistant da marca "${brand?.nome}" na plataforma LOUDR OS.
Você conhece profundamente esta marca e responde com base exclusivamente no brand book abaixo.
Seja estratégico, direto e on-brand. Nunca invente informações que não estão no brand book.

# Brand Book — ${brand?.nome}

## Identidade
- Missão: ${id.missao || 'não definida'}
- Visão: ${id.visao || 'não definida'}
- Valores: ${(id.valores || []).join(', ') || 'não definidos'}
- Arquétipo: ${id.arquetipo || 'não definido'}
- Tom de voz: ${id.tom_voz || 'não definido'}
- Público-alvo: ${id.publico_alvo || 'não definido'}
- Vocabulário proibido: ${(id.vocabulario_proibido || []).join(', ') || 'nenhum'}

## Posicionamento
- Posicionamento: ${pos.posicionamento || 'não definido'}
- Proposta de valor: ${pos.proposta_valor || 'não definida'}
- Mensagem central: ${pos.mensagem_central || 'não definida'}

## Design System
- Fonte primária: ${ds.typography?.font_primary || 'não definida'}
- Cor primária: ${ds.colors?.primary?.main || 'não definida'}
- Cor secundária: ${ds.colors?.secondary?.main || 'não definida'}

Responda sempre em português brasileiro, de forma estratégica e alinhada com o brand book acima.`
}

async function runAssistantStream({ messages, systemPrompt, onText, onDone, onError, onRateLimit }) {
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
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          stream: true,
          system: systemPrompt,
          messages,
        }),
      })

      if (res.status === 429 || res.status === 529) {
        if (attempt >= MAX_RETRIES) { onError('Limite de uso da API.'); return }
        const wait = RATE_LIMIT_WAIT
        if (onRateLimit) {
          for (let s = wait; s > 0; s--) { onRateLimit(s); await new Promise(r => setTimeout(r, 1000)) }
          onRateLimit(0)
        } else {
          await new Promise(r => setTimeout(r, wait * 1000))
        }
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

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 2 }}>
      {!isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#7F77DD', mr: 1, mt: 0.5, flexShrink: 0, fontSize: 13, fontFamily: "'Cairo', sans-serif" }}>
          <AutoAwesomeIcon sx={{ fontSize: 14 }} />
        </Avatar>
      )}
      <Paper sx={{
        maxWidth: '72%', p: '10px 14px',
        bgcolor: isUser ? 'primary.main' : 'background.paper',
        color: isUser ? '#fff' : 'text.primary',
        border: isUser ? 'none' : '1px solid',
        borderColor: 'divider',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
      }}>
        <Typography sx={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </Typography>
      </Paper>
      {isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#0D9E7A', ml: 1, mt: 0.5, flexShrink: 0, fontSize: 12, fontFamily: "'Cairo', sans-serif" }}>
          U
        </Avatar>
      )}
    </Box>
  )
}

export function BrandAssistant({ brandId }) {
  const { workspace, user } = useWorkspace()
  const [brand, setBrand]           = useState(null)
  const [book, setBook]             = useState(null)
  const [conversations, setConvs]   = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [streaming, setStreaming]   = useState(false)
  const [streamText, setStreamText] = useState('')
  const [rateLimitSec, setRateLimit] = useState(0)
  const [loading, setLoading]       = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!brandId) return
    loadBrand()
  }, [brandId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  async function loadBrand() {
    setLoading(true)
    const [{ data: b }, { data: bb }, { data: convs }] = await Promise.all([
      supabase.from('brands').select('*').eq('id', brandId).single(),
      supabase.from('brand_books').select('*').eq('brand_id', brandId).maybeSingle(),
      supabase.from('conversations').select('*').eq('brand_id', brandId)
        .order('created_at', { ascending: false }).limit(20),
    ])
    setBrand(b)
    setBook(bb)
    setConvs(convs || [])
    setLoading(false)
  }

  async function loadMessages(convId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at')
    setMessages(data || [])
  }

  async function selectConv(conv) {
    setActiveConv(conv)
    await loadMessages(conv.id)
  }

  async function newConversation() {
    const { data } = await supabase.from('conversations').insert({
      brand_id: brandId,
      user_id: user?.id,
      titulo: `Conversa ${new Date().toLocaleDateString('pt-BR')}`,
    }).select().single()
    if (data) {
      setConvs(prev => [data, ...prev])
      setActiveConv(data)
      setMessages([])
    }
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return

    let conv = activeConv
    if (!conv) {
      const { data, error: convErr } = await supabase.from('conversations').insert({
        brand_id: brandId,
        user_id: user?.id,
        titulo: input.slice(0, 60),
      }).select().single()
      if (convErr || !data) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Erro ao criar conversa: ${convErr?.message || 'tente novamente'}` }])
        setStreaming(false)
        return
      }
      conv = data
      setActiveConv(data)
      setConvs(prev => [data, ...prev])
    }

    const userMsg = { role: 'user', content: input.trim(), conversation_id: conv.id }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamText('')

    await supabase.from('messages').insert({
      conversation_id: conv.id,
      role: 'user',
      content: userMsg.content,
    })

    const systemPrompt = buildSystemPrompt(brand, book)
    const history = [...messages, userMsg]
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    await runAssistantStream({
      messages: history,
      systemPrompt,
      onText: text => setStreamText(text),
      onDone: async (fullText) => {
        const assistantMsg = { role: 'assistant', content: fullText, conversation_id: conv.id }
        setMessages(prev => [...prev, assistantMsg])
        setStreamText('')
        setStreaming(false)

        await supabase.from('messages').insert({
          conversation_id: conv.id,
          role: 'assistant',
          content: fullText,
        })

        await supabase.from('conversations')
          .update({ titulo: userMsg.content.slice(0, 60) })
          .eq('id', conv.id)
      },
      onError: (err) => {
        setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${err}`, conversation_id: conv.id }])
        setStreamText('')
        setStreaming(false)
      },
      onRateLimit: (sec) => setRateLimit(sec),
    })
  }

  const systemPrompt = buildSystemPrompt(brand, book)
  const bookSections = book ? [
    { label: 'Identidade', filled: !!(book.identity?.missao) },
    { label: 'Posicionamento', filled: !!(book.positioning?.posicionamento) },
    { label: 'Design System', filled: !!(book.design_system?.colors) },
    { label: 'Referências', filled: !!(book.references?.brands?.length) },
  ] : []

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Esquerda: histórico de conversas ── */}
      <Box sx={{
        width: 220, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="overline" color="text.disabled" display="block" mb={1}>Conversas</Typography>
          <Button
            fullWidth variant="outlined" startIcon={<AddIcon />} size="small"
            onClick={newConversation}
            sx={{ borderColor: 'divider', color: 'text.secondary', fontWeight: 700, fontSize: 11 }}
          >
            Nova conversa
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          {conversations.length === 0 ? (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', p: 1, textAlign: 'center', mt: 2 }}>
              Nenhuma conversa ainda
            </Typography>
          ) : (
            conversations.map(conv => (
              <Box
                key={conv.id}
                onClick={() => selectConv(conv)}
                sx={{
                  p: '8px 10px', borderRadius: 1, cursor: 'pointer', mb: 0.5,
                  bgcolor: activeConv?.id === conv.id ? 'rgba(13,158,122,0.08)' : 'transparent',
                  border: '1px solid',
                  borderColor: activeConv?.id === conv.id ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(13,158,122,0.04)' },
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: activeConv?.id === conv.id ? 800 : 500, lineHeight: 1.4 }} noWrap>
                  {conv.titulo}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {fmtDate(conv.created_at)}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* ── Centro: chat ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#7F77DD', fontSize: 20 }} />
          <Typography fontWeight={800} fontSize={15}>
            {brand?.nome} — Brand Assistant
          </Typography>
        </Box>

        {/* Mensagens */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {messages.length === 0 && !streaming && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: '#7F77DD', fontSize: 36, mb: 1 }} />
              <Typography fontWeight={800} textAlign="center">
                Como posso ajudar com a {brand?.nome}?
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
                Faço estratégia, briefings, copy e orientações de marca — tudo baseado no brand book.
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.75, width: '100%', maxWidth: 420 }}>
                {SUGESTOES.slice(0, 3).map(s => (
                  <Button
                    key={s}
                    variant="outlined"
                    onClick={() => { setInput(s) }}
                    sx={{
                      borderColor: 'divider', color: 'text.secondary', fontWeight: 600,
                      fontSize: 12, textTransform: 'none', letterSpacing: 0, textAlign: 'left',
                      justifyContent: 'flex-start', py: 1, px: 2,
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {streaming && streamText && (
            <ChatBubble msg={{ role: 'assistant', content: streamText + '▋' }} />
          )}

          {streaming && !streamText && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pl: 4.5 }}>
              <CircularProgress size={14} color="primary" />
              <Typography variant="caption" color="text.secondary">
                {rateLimitSec > 0 ? `Rate limit — aguardando ${rateLimitSec}s…` : 'Pensando…'}
              </Typography>
            </Box>
          )}

          <div ref={bottomRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={streaming ? 'Aguardando resposta…' : 'Pergunte sobre a marca…'}
              disabled={streaming}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <IconButton
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              sx={{
                bgcolor: 'primary.main', color: '#fff',
                borderRadius: 2, width: 42, height: 42, flexShrink: 0,
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'divider' },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* ── Direita: painel de contexto ── */}
      <Box sx={{
        width: 240, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider',
        p: 2.5, overflowY: 'auto',
      }}>
        <Typography variant="overline" color="text.disabled" display="block" mb={2}>
          Contexto RAG
        </Typography>

        {bookSections.length > 0 ? (
          <>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              Seções do brand book em uso:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              {bookSections.map(({ label, filled }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: filled ? '#0D9E7A' : 'divider', flexShrink: 0 }} />
                  <Typography variant="caption" color={filled ? 'text.primary' : 'text.disabled'} fontWeight={filled ? 700 : 400}>
                    {label}
                  </Typography>
                  {!filled && (
                    <Chip label="vazio" size="small"
                      sx={{ height: 14, fontSize: '0.55rem', fontWeight: 700, color: '#EF9F27', bgcolor: 'rgba(239,159,39,0.1)', ml: 'auto' }} />
                  )}
                </Box>
              ))}
            </Box>

            {bookSections.some(s => !s.filled) && (
              <Box sx={{ p: 1.5, bgcolor: 'rgba(239,159,39,0.06)', borderRadius: 1, border: '1px solid rgba(239,159,39,0.2)' }}>
                <Typography variant="caption" color="#EF9F27" fontWeight={700} display="block" mb={0.5}>
                  Gaps no brand book
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Preencha as seções vazias para respostas mais precisas.
                </Typography>
                <Button
                  size="small" color="warning" onClick={() => { window.location.hash = `#/app/brands/${brandId}` }}
                  sx={{ mt: 1, fontSize: 10, fontWeight: 800, px: 1.5, py: 0.5 }}
                >
                  Editar brand book →
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="caption" color="text.disabled">
              Brand book não configurado. Configure para contexto mais rico.
            </Typography>
            <Button
              fullWidth size="small" variant="outlined"
              onClick={() => { window.location.hash = `#/app/brands/${brandId}` }}
              sx={{ mt: 2, borderColor: 'divider', fontSize: 10, fontWeight: 800 }}
            >
              Configurar brand book
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
