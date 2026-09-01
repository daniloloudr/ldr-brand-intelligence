import { useState, useEffect, useRef } from 'react'
import { navigate } from '../../lib/helpers';
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip, Tooltip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import CheckIcon from '@mui/icons-material/Check'
import ReplayIcon from '@mui/icons-material/Replay'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CloseIcon from '@mui/icons-material/Close'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import { IconButton } from '@mui/material'
import { supabase } from '../../lib/supabase'
import { compileIntel } from '../../lib/brandIntel'
import { WRITING_FRAMEWORKS } from '../../lib/writingFrameworks'
import { compileWritingWorkflow, DERIVE_RULES } from '../../lib/writingToWorkflow'
import { PageHeader } from '../../components/shell/PageHeader'
import { Compositor, Faixa } from '../../components/estudio/Compositor'
import { RATE_LIMIT_WAIT, MAX_RETRIES } from '../../lib/constants'
import { PALETTE } from '../../lib/theme'

const TEAL = PALETTE.data.positivo, PURPLE = PALETTE.data.neutro

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
  // Strategy (Onda 2): a copy mira as personas e a narrativa da marca
  const st = book?.strategy || {}
  const personas = (Array.isArray(st.personas) ? st.personas : []).filter(p => p?.nome).slice(0, 3)
  if (personas.length) lines.push(`Escreva PARA estas personas: ${personas.map(p => `${p.nome}${p.dores ? ` (dor: ${String(p.dores).slice(0, 100)})` : ''}`).join(' · ')}`)
  if (st.storytelling_overview) lines.push(`Narrativa da marca (conecte a peça a ela): ${String(st.storytelling_overview).slice(0, 300)}`)
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

// Parse da peça em BLOCOS por header "## " — a unidade de controle humano:
// cada bloco pode ser editado na mão ou refeito sozinho, sem perder o resto.
function parseBlocks(text) {
  const blocks = []
  let cur = null
  for (const line of (text || '').split('\n')) {
    if (line.startsWith('## ')) {
      if (cur) blocks.push(cur)
      cur = { header: line.slice(3).trim(), body: '' }
    } else if (cur) {
      cur.body += (cur.body ? '\n' : '') + line
    } else if (line.trim()) {
      cur = { header: 'Peça', body: line }
    }
  }
  if (cur) blocks.push(cur)
  return blocks.map(b => ({ ...b, body: b.body.trim() }))
}

const assembleBlocks = blocks =>
  blocks.map(b => `## ${b.header}\n${b.body}`).join('\n\n')

// Deriva os prompts VISUAIS da peça (1 chamada, JSON estrito). O prompt de
// imagem descreve a CENA — a estética/voz da marca entram depois, no nó de
// geração (cérebro). Sem streaming: resposta curta.
// A estética da marca (declarada + aprendida) entra na DERIVAÇÃO — a cena já
// nasce nas cores/mood da marca, em vez de brigar com o brand context depois.
function brandVisualHints(book, intel) {
  const vi = book?.visual_identity || {}
  const paleta = (Array.isArray(vi.paleta) ? vi.paleta : []).map(p => p?.hex || p?.valor || p).filter(Boolean).slice(0, 6)
  const estetica = [vi.foto_mood, vi.foto_luz_edicao, vi.foto_enquadramento].filter(Boolean)
  const aprov = (intel?.modelo?.preferencias_visuais?.aprovado || []).map(a => a?.padrao).filter(Boolean).slice(0, 4)
  const lines = []
  if (paleta.length)   lines.push(`Paleta da marca (cores dominantes das cenas): ${paleta.join(', ')}`)
  if (estetica.length) lines.push(`Estética/mood: ${estetica.join('; ')}`)
  if (aprov.length)    lines.push(`Padrões visuais que a marca APROVA (aprendido pelo uso): ${aprov.join('; ')}`)
  return lines.join('\n')
}

async function deriveVisualPrompts({ fwKey, peca, brandVisual }) {
  const headers = { 'Content-Type': 'application/json' }
  if (import.meta.env.DEV) headers['x-api-key'] = import.meta.env.VITE_ANTHROPIC_KEY || ''
  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: 'Você é diretor de arte. Dada uma peça de conteúdo, você deriva prompts de IMAGEM para gerar os visuais dela (use a seção "Sugestão de imagem" da peça quando existir). REGRA ABSOLUTA: NENHUM texto, letra, número, logotipo ou tipografia na imagem (o texto entra na pós-produção); preveja espaço negativo onde o texto entrará. As cenas NASCEM na estética da marca fornecida — cores dominantes, luz e mood fazem parte da descrição da cena. Cada prompt: português, 1–3 frases, cena CONCRETA (sujeito, ambiente, enquadramento, luz, cores), sem citar a marca pelo nome. Responda APENAS com JSON estrito: {"prompts":[{"titulo":"","prompt":""}]}',
      messages: [{ role: 'user', content: `${DERIVE_RULES[fwKey]}${brandVisual ? `\n\nESTÉTICA DA MARCA (as cenas nascem nela):\n${brandVisual}` : ''}\n\nPEÇA:\n${peca.slice(0, 6000)}` }],
    }),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Erro ${res.status}`) }
  const data = await res.json()
  const text = data?.content?.[0]?.text || ''
  const m = text.match(/\{[\s\S]*\}/)
  const parsed = m ? JSON.parse(m[0]) : null
  if (!parsed?.prompts?.length) throw new Error('Não consegui derivar os prompts da peça.')
  return parsed.prompts.filter(p => (p?.prompt || '').trim())
}

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return (
      <Typography key={i} sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'primary.main', mt: i ? 2.5 : 0, mb: 0.75 }}>{line.slice(3)}</Typography>
    )
    if (line.startsWith('- ') || line.startsWith('* ')) return (
      <Typography key={i} sx={{ fontSize: 13.5, lineHeight: 1.65, pl: 1.5,
        '&::before': { content: '"·"', mr: 1, color: 'primary.main' } }}>{line.slice(2)}</Typography>
    )
    if (line.trim()) return (
      <Typography key={i} sx={{ fontSize: 13.5, lineHeight: 1.75 }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
    )
    return <Box key={i} sx={{ height: 8 }} />
  })
}

export function StudioWriting({ brandId, cabecalho = true }) {
  const [brand, setBrand]         = useState(null)
  const [book, setBook]           = useState(null)
  const [intel, setIntel]         = useState(null)
  const [fw, setFw]               = useState(null)      // framework selecionado
  const [campos, setCampos]       = useState({})
  const [text, setText]           = useState('')
  const [blocks, setBlocks]       = useState([])      // peça parseada em blocos editáveis
  const [editing, setEditing]     = useState(null)    // índice do bloco em edição manual
  const [draft, setDraft]         = useState('')
  const [redoing, setRedoing]     = useState(null)    // índice do bloco sendo refeito
  const [streaming, setStreaming] = useState(false)
  const [compiling, setCompiling] = useState(false)   // criando o workflow com as peças
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)
  const [signaled, setSignaled]   = useState(false)

  useEffect(() => {
    if (!brandId) return
    ;(async () => {
      const [{ data: b }, { data: bbRows }] = await Promise.all([
        supabase.from('brands').select('id, nome, workspace_id').eq('id', brandId).maybeSingle(),
        supabase.from('brand_books').select('verbal_identity, visual_identity, strategy').eq('brand_id', brandId)
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
    setBlocks([])
    setEditing(null)
    setSignaled(false)
    savedIdRef.current = null   // geração nova = peça nova na Biblioteca
    setStreaming(true)
    streamCopy({
      system: buildWriterSystem(brand, book, intel),
      prompt: fw.build(campos),
      onText: t => setText(t),
      onDone: t => { setText(t); setBlocks(parseBlocks(t)); setStreaming(false); autoSalvar(t) },
      onError: e => { setError(e); setStreaming(false) },
    })
  }

  // Refaz UM bloco mantendo o resto — a IA vê a peça inteira e reescreve só
  // aquela seção, coerente com o que ficou. Controle humano granular.
  function redoBlock(i) {
    const b = blocks[i]
    if (!b || redoing != null) return
    setRedoing(i)
    setEditing(null)
    const prompt = `A peça abaixo já está escrita e aprovada, EXCETO a seção "${b.header}", que precisa ser reescrita.

${assembleBlocks(blocks)}

Reescreva APENAS a seção "${b.header}" — uma alternativa nova, coerente com o restante da peça e com o mesmo propósito da seção original. Responda SOMENTE com o novo conteúdo dessa seção: sem o header "## ${b.header}", sem comentários, sem as outras seções.`
    streamCopy({
      system: buildWriterSystem(brand, book, intel),
      prompt,
      onText: t => setBlocks(bs => bs.map((x, j) => j === i ? { ...x, body: t.trim() } : x)),
      onDone: t => { setBlocks(bs => bs.map((x, j) => j === i ? { ...x, body: t.trim() } : x)); setRedoing(null); setSignaled(false) },
      onError: e => { setError(e); setRedoing(null) },
    })
  }

  function startEdit(i) { setEditing(i); setDraft(blocks[i]?.body || '') }

  // E1.3: reescrever uma seção na mão é ENSINO DE VOZ — "a IA escreveu X, o
  // humano preferiu Y". Vira sinal de alto valor pro cérebro (não-fatal).
  function emitEditSignal(secao, original, edicao) {
    if (!brand?.id || !brand?.workspace_id) return
    const o = (original || '').trim(), e = (edicao || '').trim()
    if (!e || e === o) return   // edição vazia/idêntica não ensina nada
    supabase.from('brand_signals').insert({
      brand_id: brand.id, workspace_id: brand.workspace_id,
      tipo: 'writing_edit', fonte: 'writing_room', ref_id: null,
      payload: {
        secao: (secao || '').slice(0, 120),
        formato: fw?.label || null, cluster: fw?.key || null,
        original: o.slice(0, 1500), edicao: e.slice(0, 1500),
      },
      peso: 2.5,
    }).then(({ error: err }) => { if (err) console.error('[writing] edit signal falhou:', err.message) })
  }

  function saveEdit(i) {
    const b = blocks[i]
    emitEditSignal(b?.header, b?.body, draft)
    setBlocks(bs => bs.map((x, j) => j === i ? { ...x, body: draft.trim() } : x))
    setEditing(null)
    setSignaled(false)   // peça mudou → nova adoção conta como novo exemplo
  }

  const pecaFinal = () => blocks.length ? assembleBlocks(blocks) : text

  const [saved, setSaved] = useState(false)
  const savedIdRef = useRef(null)   // peça desta geração já salva → edições atualizam a mesma linha
  // Casa do Conteúdo: TUDO que é gerado nasce salvo na Biblioteca (Danilo 2026-07-14).
  // Auto-save no fim da geração; o botão vira "atualizar" p/ edições da mesma peça.
  async function autoSalvar(t) {
    if (!t?.trim() || !brand?.workspace_id) return
    const titulo = (campos[fw?.campos?.[0]?.id] || fw?.label || 'Peça').slice(0, 140)
    const { data, error: e } = await supabase.from('pecas_escritas').insert({
      workspace_id: brand.workspace_id, brand_id: brandId,
      titulo, formato: fw?.key || null, conteudo: t, origem: 'redacao',
    }).select('id').single()
    if (!e) { savedIdRef.current = data?.id || null; setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  async function salvarNaBiblioteca() {
    const t = pecaFinal()
    if (!t.trim() || !brand?.workspace_id) return
    if (savedIdRef.current) {   // mesma peça editada → atualiza, não duplica
      const { error: e } = await supabase.from('pecas_escritas')
        .update({ conteudo: t }).eq('id', savedIdRef.current)
      if (!e) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
      return
    }
    await autoSalvar(t)
  }

  // Copiar = adoção → sinal 'content_used' (fonte writing_room) pro cérebro +
  // dataset (trigger da 029 captura). Uma vez por versão da peça (edição reabre).
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
        briefing: pecaFinal().slice(0, 2000),
      },
      peso: 1.5,
    }).then(({ error: e }) => { if (e) console.error('[writing] signal falhou:', e.message) })
  }

  async function handleCopy() {
    const t = pecaFinal()
    if (!t) return
    await navigator.clipboard.writeText(t).catch(() => {})
    emitAdoption()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Fase 2: compila a peça num Workflow do canvas — prompts visuais derivados,
  // um caminho de geração por slide/variação/cena (Reel encadeia imagem→vídeo).
  // Nada gera sozinho: o usuário revisa os prompts no canvas e dispara.
  async function criarWorkflow() {
    if (!fw || !blocks.length || compiling) return
    setCompiling(true)
    setError('')
    try {
      const peca = pecaFinal()
      const prompts = await deriveVisualPrompts({ fwKey: fw.key, peca, brandVisual: brandVisualHints(book, intel) })
      const titulo = (campos[fw.campos?.[0]?.id] || fw.label).slice(0, 60)
      const { nome, nodes, edges } = compileWritingWorkflow({ fwKey: fw.key, fwLabel: fw.label, titulo, peca, prompts })
      const { data: wf, error: e } = await supabase.from('studio_workflows').insert({
        workspace_id: brand?.workspace_id, brand_id: brandId, is_template: false,
        nome, nodes, edges,
      }).select().single()
      if (e) throw new Error(e.message)
      emitAdoption()   // levar pro workflow = adoção da peça
      navigate(`#/app/brands/${brandId}/studio/workflow/${wf.id}`)
    } catch (e) {
      setError(e.message || 'Falha ao criar o workflow.')
      setCompiling(false)
    }
  }

  return (
    <Box>
      {cabecalho && <PageHeader title="Estúdio" subtitle="Redação — copy no tom da marca" />}

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
      <Compositor
        atalhos={
          <Faixa rotulo="Framework">
            <>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {WRITING_FRAMEWORKS.map(f => (
                  <Chip key={f.key} label={f.label} size="small" clickable disabled={streaming}
                    onClick={() => { setFw(f); setCampos({}); setText(''); setError('') }}
                    variant={fw?.key === f.key ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 700, ...(fw?.key === f.key && { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }) }} />
                ))}
              </Stack>
              {/* A descrição do framework era o corpo do card. Como chip ela não
                  cabe — então aparece só a do escolhido, que é a única que a
                  pessoa precisa ler depois de escolher. */}
              {fw && <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1 }}>{fw.desc}</Typography>}
            </>
          </Faixa>
        }
        pedido={fw && (
          <Faixa rotulo="O pedido">
            <Stack spacing={1.5}>
              {fw.campos.map(c => (
                <TextField key={c.id} size="small" fullWidth multiline={!!c.multiline} minRows={c.multiline ? 2 : 1}
                  label={c.label + (c.required ? ' *' : '')} placeholder={c.placeholder}
                  value={campos[c.id] || ''} onChange={e => setCampos(p => ({ ...p, [c.id]: e.target.value }))} />
              ))}
            </Stack>
          </Faixa>
        )}
        assinatura={intel?.versao ? (
          <Chip size="small" icon={<PsychologyOutlinedIcon sx={{ fontSize: '15px !important' }} />}
            label={`Inteligência da marca v${intel.versao}`}
            sx={{ fontWeight: 700, bgcolor: 'rgba(127,119,221,0.12)', color: PURPLE }} />
        ) : null}
        aviso={error ? <Typography sx={{ fontSize: 12.5 }} color="error">{error}</Typography> : null}
        acao={
          <Button variant="contained" disabled={streaming || !fw} onClick={gerar}
            startIcon={streaming ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{ fontWeight: 800, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}>
            {streaming ? 'Escrevendo…' : 'Escrever no tom da marca'}
          </Button>
        }
      />

        {/* A peça, largura cheia — antes era a coluna direita de um grid de
            360px + resto, e o texto longo lia mal num terço da tela. */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, minHeight: 320 }}>
          {!text && !streaming ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="subtitle1" mb={0.5}>A peça aparece aqui</Typography>
              <Typography variant="body2" color="text.secondary">
                Escolha um framework acima e dê o tema — a estrutura já vem pronta.<br />
                A voz, o território e os temas vêm do que a marca aprendeu.
              </Typography>
            </Box>
          ) : streaming && !text ? (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Escrevendo no tom da marca…</Typography>
            </Stack>
          ) : streaming ? (
            <Box>
              {renderMarkdown(text)}
              <Typography component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>▋</Typography>
            </Box>
          ) : blocks.length ? (
            <Box>
              <Typography variant="caption" color="text.secondary" mb={1.5}>
                Cada seção pode ser <strong>editada</strong> ou <strong>refeita</strong> sozinha — o resto da peça não muda.
              </Typography>
              <Stack spacing={1.5}>
                {blocks.map((b, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2,
                    opacity: redoing != null && redoing !== i ? 0.55 : 1,
                    borderColor: redoing === i ? TEAL : editing === i ? PURPLE : 'divider' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                      <Typography sx={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'primary.main' }}>
                        {b.header}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        {editing === i ? (
                          <>
                            <Tooltip title="Salvar edição"><IconButton size="small" onClick={() => saveEdit(i)} sx={{ color: 'primary.main' }}><CheckIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                            <Tooltip title="Cancelar"><IconButton size="small" onClick={() => setEditing(null)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip title="Editar esta seção na mão">
                              <IconButton size="small" disabled={redoing != null} onClick={() => startEdit(i)}><EditOutlinedIcon sx={{ fontSize: 16 }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Refazer só esta seção — o resto da peça não muda">
                              <Typography component="span"><IconButton size="small" disabled={redoing != null} onClick={() => redoBlock(i)}>
                                {redoing === i ? <CircularProgress size={14} /> : <ReplayIcon sx={{ fontSize: 16 }} />}
                              </IconButton></Typography>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </Stack>
                    {editing === i ? (
                      <TextField fullWidth multiline minRows={3} size="small" value={draft}
                        onChange={e => setDraft(e.target.value)} autoFocus />
                    ) : (
                      <Box>
                        {renderMarkdown(b.body)}
                        {redoing === i && <Typography component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>▋</Typography>}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
              <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap" useFlexGap>
                <Tooltip title="Copiar marca a peça como adotada — a marca aprende com o que você usa">
                  <Button variant="outlined" size="small" onClick={handleCopy} disabled={redoing != null || compiling}
                    startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                    sx={{ fontWeight: 700, color: copied ? TEAL : 'text.secondary', borderColor: copied ? TEAL : 'divider' }}>
                    {copied ? 'Copiado!' : 'Copiar peça'}
                  </Button>
                </Tooltip>
                <Tooltip title="Guarda a peça na Biblioteca → Textos (a casa do conteúdo escrito)">
                  <Button variant="outlined" size="small" onClick={salvarNaBiblioteca} disabled={redoing != null || compiling}
                    startIcon={saved ? <CheckIcon /> : <BookmarkAddOutlinedIcon />}
                    sx={{ fontWeight: 700, color: saved ? TEAL : 'text.secondary', borderColor: saved ? TEAL : 'divider' }}>
                    {saved ? 'Salvo!' : 'Salvar na Biblioteca'}
                  </Button>
                </Tooltip>
                <Button variant="outlined" size="small" onClick={gerar} startIcon={<ReplayIcon />} disabled={redoing != null || compiling}
                  sx={{ fontWeight: 700, color: 'text.secondary', borderColor: 'divider' }}>
                  Refazer tudo
                </Button>
                {fw?.key !== 'email' && (
                  <Tooltip title="Compila a peça num workflow: um caminho de geração por seção (Reel vira imagem→vídeo). Você revisa os prompts no canvas antes de gerar.">
                    <Button variant="contained" size="small" onClick={criarWorkflow} disabled={redoing != null || compiling}
                      startIcon={compiling ? <CircularProgress size={14} color="inherit" /> : <AccountTreeOutlinedIcon />}
                      sx={{ fontWeight: 800, bgcolor: PURPLE, '&:hover': { bgcolor: PALETTE.neutral[500] } }}>
                      {compiling ? 'Montando o workflow…' : 'Criar workflow com as peças'}
                    </Button>
                  </Tooltip>
                )}
              </Stack>
              {error && <Typography variant="caption" color="error" mt={1}>{error}</Typography>}
            </Box>
          ) : (
            <Box>{renderMarkdown(text)}</Box>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
