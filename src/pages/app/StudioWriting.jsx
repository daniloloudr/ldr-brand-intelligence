import { useState, useEffect } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip, Tooltip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import ReplayIcon from '@mui/icons-material/Replay'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import { supabase } from '../../lib/supabase'
import { compileIntel } from '../../lib/brandIntel'
import { WRITING_FRAMEWORKS } from '../../lib/writingFrameworks'
import { PageHeader } from '../../components/shell/PageHeader'
import { RATE_LIMIT_WAIT, MAX_RETRIES } from '../../lib/constants'

const TEAL = '#0D9E7A', PURPLE = '#7F77DD'

const API_URL = import.meta.env.DEV
  ? '/api/v1/messages'
  : '/.netlify/functions/anthropic'

const _arr = x => Array.isArray(x) ? x.filter(Boolean) : (x ? [x] : [])

// System prompt do copywriter da marca: identidade verbal declarada + o que o
// cérebro aprendeu (compileIntel). A peça sai da voz REAL, não de tom genérico.
function buildWriterSystem(brand, book, intelligence) {
  const v = book?.verbal_identity || {}
  const personalidade = [...new Set([..._arr(v.personalidade), ..._arr(v.tom_atributos)])]
  const lines = [
    `Você é o copywriter oficial da marca "${brand?.nome || ''}". Toda peça que você escreve soa como ESTA marca — nunca como copy genérica de agência.`,
  ]
  if (v.posicionamento || v.proposta_valor) lines.push(`Posicionamento: ${v.posicionamento || v.proposta_valor}`)
  if (v.tagline)            lines.push(`Tagline: ${v.tagline}`)
  if (personalidade.length) lines.push(`Personalidade: ${personalidade.join(', ')}`)
  if (v.tom_voz)            lines.push(`Tom de voz: ${v.tom_voz}`)
  if (_arr(v.valores).length) lines.push(`Valores: ${_arr(v.valores).map(x => typeof x === 'object' ? (x.nome || x.valor || '') : x).filter(Boolean).join(', ')}`)
  if (v.tom_evitar)         lines.push(`NUNCA soar assim: ${v.tom_evitar}`)
  lines.push('Regras: português brasileiro; siga EXATAMENTE a estrutura pedida (headers markdown); frases curtas e concretas; zero clichê de marketing ("não perca", "imperdível"); especifique, não infle.')
  const intel = compileIntel(intelligence?.modelo, intelligence?.versao)
  return lines.join('\n') + (intel || '')
}

async function streamCopy({ system, prompt, onText, onDone, onError }) {
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    attempt++
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (import.meta.env.DEV) headers['x-api-key'] = import.meta.env.VITE_ANTHROPIC_KEY || ''
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          stream: true,
          system,
          messages: [{ role: 'user', content: prompt }],
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
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return (
      <Typography key={i} sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: TEAL, mt: i ? 2.5 : 0, mb: 0.75 }}>{line.slice(3)}</Typography>
    )
    if (line.startsWith('- ') || line.startsWith('* ')) return (
      <Typography key={i} sx={{ fontSize: 13.5, lineHeight: 1.65, pl: 1.5,
        '&::before': { content: '"·"', mr: 1, color: TEAL } }}>{line.slice(2)}</Typography>
    )
    if (line.trim()) return (
      <Typography key={i} sx={{ fontSize: 13.5, lineHeight: 1.75 }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
    )
    return <Box key={i} sx={{ height: 8 }} />
  })
}

export function StudioWriting({ brandId }) {
  const [brand, setBrand]         = useState(null)
  const [book, setBook]           = useState(null)
  const [intel, setIntel]         = useState(null)
  const [fw, setFw]               = useState(null)      // framework selecionado
  const [campos, setCampos]       = useState({})
  const [text, setText]           = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)
  const [signaled, setSignaled]   = useState(false)

  useEffect(() => {
    if (!brandId) return
    ;(async () => {
      const [{ data: b }, { data: bbRows }] = await Promise.all([
        supabase.from('brands').select('id, nome, workspace_id').eq('id', brandId).maybeSingle(),
        supabase.from('brand_books').select('verbal_identity').eq('brand_id', brandId)
          .order('updated_at', { ascending: false }).limit(1),
      ])
      setBrand(b || null)
      setBook(bbRows?.[0] || null)
      const { data: bi } = await supabase.from('brand_intelligence')
        .select('versao, modelo').eq('brand_id', brandId)
        .order('versao', { ascending: false }).limit(1).maybeSingle()
      setIntel(bi || null)
    })()
  }, [brandId])

  function gerar() {
    if (!fw) return
    const obrigatorio = fw.campos.find(c => c.required && !(campos[c.id] || '').trim())
    if (obrigatorio) { setError(`Preencha "${obrigatorio.label}".`); return }
    setError('')
    setText('')
    setSignaled(false)
    setStreaming(true)
    streamCopy({
      system: buildWriterSystem(brand, book, intel),
      prompt: fw.build(campos),
      onText: t => setText(t),
      onDone: t => { setText(t); setStreaming(false) },
      onError: e => { setError(e); setStreaming(false) },
    })
  }

  // Copiar = adoção → sinal 'content_used' (fonte writing_room) pro cérebro +
  // dataset (trigger da 029 captura). Uma vez por peça gerada.
  function emitAdoption() {
    if (signaled || !brand?.id || !brand?.workspace_id) return
    setSignaled(true)
    supabase.from('brand_signals').insert({
      brand_id: brand.id, workspace_id: brand.workspace_id,
      tipo: 'content_used', fonte: 'writing_room', ref_id: null,
      payload: {
        item_tipo: 'writing',
        titulo:   (campos[fw?.campos?.[0]?.id] || '').slice(0, 200),
        formato:  fw?.label || null,
        intencao: null,
        cluster:  fw?.key || null,
        briefing: (text || '').slice(0, 2000),
      },
      peso: 1.5,
    }).then(({ error: e }) => { if (e) console.error('[writing] signal falhou:', e.message) })
  }

  async function handleCopy() {
    if (!text) return
    await navigator.clipboard.writeText(text).catch(() => {})
    emitAdoption()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Studio" subtitle="Writing Room — copy no tom da marca" />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
      {intel?.versao && (
        <Chip size="small" icon={<PsychologyOutlinedIcon sx={{ fontSize: '15px !important' }} />}
          label={`Escrevendo com a inteligência da marca (v${intel.versao})`}
          sx={{ mb: 2, fontWeight: 700, bgcolor: 'rgba(127,119,221,0.12)', color: PURPLE }} />
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '360px 1fr' }, gap: 2.5, alignItems: 'start' }}>
        {/* Coluna esquerda: frameworks + campos */}
        <Stack spacing={1.25}>
          {WRITING_FRAMEWORKS.map(f => {
            const on = fw?.key === f.key
            return (
              <Paper key={f.key} variant="outlined" onClick={() => { setFw(f); setCampos({}); setText(''); setError('') }}
                sx={{ p: 1.75, borderRadius: 2, cursor: 'pointer',
                  borderColor: on ? TEAL : 'divider', bgcolor: on ? 'rgba(13,158,122,0.06)' : 'background.paper',
                  '&:hover': { borderColor: TEAL } }}>
                <Typography fontSize={13.5} fontWeight={800}>{f.label}</Typography>
                <Typography fontSize={12} color="text.secondary">{f.desc}</Typography>
              </Paper>
            )
          })}

          {fw && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1.5}>
                {fw.campos.map(c => (
                  <TextField key={c.id} size="small" fullWidth multiline={!!c.multiline} minRows={c.multiline ? 2 : 1}
                    label={c.label + (c.required ? ' *' : '')} placeholder={c.placeholder}
                    value={campos[c.id] || ''} onChange={e => setCampos(p => ({ ...p, [c.id]: e.target.value }))} />
                ))}
                <Button variant="contained" disabled={streaming} onClick={gerar}
                  startIcon={streaming ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                  sx={{ fontWeight: 800, bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' } }}>
                  {streaming ? 'Escrevendo…' : 'Escrever no tom da marca'}
                </Button>
                {error && <Typography fontSize={12} color="error">{error}</Typography>}
              </Stack>
            </Paper>
          )}
        </Stack>

        {/* Coluna direita: a peça */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, minHeight: 320 }}>
          {!fw && !text ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography fontSize={14} fontWeight={800} mb={0.5}>Escolha um formato ao lado</Typography>
              <Typography fontSize={12.5} color="text.secondary">
                Cada framework já vem com a estrutura que funciona — você só dá o tema.<br />
                A voz, o território e os temas vêm do que a marca aprendeu.
              </Typography>
            </Box>
          ) : streaming && !text ? (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={16} />
              <Typography fontSize={13} color="text.secondary">Escrevendo no tom da marca…</Typography>
            </Stack>
          ) : (
            <Box>
              {renderMarkdown(text)}
              {streaming && <Typography component="span" sx={{ color: TEAL, fontWeight: 700 }}>▋</Typography>}
              {!streaming && text && (
                <Stack direction="row" spacing={1.5} mt={3}>
                  <Tooltip title="Copiar marca a peça como adotada — a marca aprende com o que você usa">
                    <Button variant="outlined" size="small" onClick={handleCopy}
                      startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                      sx={{ fontWeight: 700, color: copied ? TEAL : 'text.secondary', borderColor: copied ? TEAL : 'divider' }}>
                      {copied ? 'Copiado!' : 'Copiar peça'}
                    </Button>
                  </Tooltip>
                  <Button variant="outlined" size="small" onClick={gerar} startIcon={<ReplayIcon />}
                    sx={{ fontWeight: 700, color: 'text.secondary', borderColor: 'divider' }}>
                    Regerar
                  </Button>
                </Stack>
              )}
            </Box>
          )}
        </Paper>
      </Box>
      </Box>
    </Box>
  )
}
