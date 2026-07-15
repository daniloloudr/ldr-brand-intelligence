import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box, Typography, IconButton, TextField, Button, CircularProgress,
  Paper, Chip, Divider, Avatar, Tooltip, Stack,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { fmtDate } from '../../lib/helpers'
import { compileIntel } from '../../lib/brandIntel'
import { RATE_LIMIT_WAIT, MAX_RETRIES } from '../../lib/constants'
import { PageHeader } from '../../components/shell/PageHeader'

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

const _arr = x => Array.isArray(x) ? x.filter(Boolean) : (x ? [x] : [])
const _join = x => _arr(x).map(o => typeof o === 'object' ? (o.hex || o.valor || o.nome || o.termo || '') : o).filter(Boolean).join(', ')

// ── Copiloto com mãos · A1: ferramentas de LEITURA (client-side) ──────
// As tools rodam NO CLIENTE via supabase autenticado — o RLS é o perímetro:
// o chat só lê o que o usuário já pode ler. Este catálogo espelha o futuro
// MCP (mesmas operações, outra superfície). Spec: .spec/backlog.md § Copiloto.
const READ_TOOLS = [
  { name: 'consultar_mercado',
    description: 'Movimentos recentes do mercado e dos concorrentes (clipping) + a síntese do ciclo escrita pela inteligência da marca. Use para perguntas sobre mercado, concorrência recente, notícias, "o que aconteceu".',
    input_schema: { type: 'object', properties: { dias: { type: 'number', description: 'Janela em dias (padrão 30)' } } } },
  { name: 'consultar_tendencias',
    description: 'Radar de tendências do setor, com relevância (1-10) e a recomendação "como a marca surfa isso". Use para perguntas sobre tendências, o que está em alta, oportunidades de conteúdo.',
    input_schema: { type: 'object', properties: {} } },
  { name: 'consultar_insights',
    description: 'Insights nomeados do consumidor (elogio/atrito/oportunidade/tema/alerta) destilados da escuta social, + última leitura de sentimento. Use para perguntas sobre público, percepção e sentimento.',
    input_schema: { type: 'object', properties: {} } },
  { name: 'consultar_concorrentes',
    description: 'Dossiê dos concorrentes: scores (singularidade/consistência/posicionamento), territórios que cada um reivindica e frase-diagnóstico. Use para comparações e posicionamento competitivo.',
    input_schema: { type: 'object', properties: {} } },
]
// ── A2: ferramentas de CRIAÇÃO — o Copiloto executa, mas SÓ com confirmação
// explícita do usuário (ação que gasta crédito nunca roda sozinha).
const CREATE_TOOLS = [
  { name: 'gerar_imagem',
    description: 'GERA uma imagem on-brand no Estúdio (1 crédito). Use quando pedirem para criar/gerar uma peça visual — chame DIRETAMENTE, sem pedir permissão em texto: a plataforma exibe a confirmação ao usuário automaticamente. O prompt descreve a cena em detalhe e NUNCA inclui texto/tipografia na imagem (texto é pós-produção). A estética da marca é aplicada automaticamente.',
    input_schema: { type: 'object', properties: {
      prompt:  { type: 'string', description: 'Descrição detalhada da cena, sem nenhum texto na imagem' },
      formato: { type: 'string', enum: ['1:1', '9:16', '16:9', '4:5'], description: 'Proporção (padrão 4:5)' },
      inserir_logo: { type: 'boolean', description: 'true SOMENTE se o usuário pediu explicitamente a logo/marca na imagem — a plataforma compõe com o ARQUIVO REAL do repositório de Ativos (nunca desenhe/invente a logo)' },
    }, required: ['prompt'] } },
  { name: 'criar_fluxo',
    description: 'CRIA um fluxo nodal no Estúdio a partir de um objetivo (sem custo até rodar). Use para pedidos de pipeline/carrossel/campanha multi-peça — chame DIRETAMENTE, sem pedir permissão em texto: a plataforma exibe a confirmação. Retorna o link do fluxo pronto para abrir.',
    input_schema: { type: 'object', properties: {
      objetivo: { type: 'string', description: 'O que o fluxo deve produzir, em 1-2 frases' },
    }, required: ['objetivo'] } },
]
// F1 · diretor de arte: parecer estruturado vira SINAL para o cérebro (peso
// menor que voto humano — é julgamento da IA, não ensino). Auto-executa.
const REVIEW_TOOL = {
  name: 'registrar_parecer',
  description: 'REGISTRA o veredito do seu parecer de diretor de arte sobre uma imagem enviada pelo usuário. Chame SEMPRE que avaliar uma peça (antes do parecer completo em texto). Não pede confirmação.',
  input_schema: { type: 'object', properties: {
    veredito: { type: 'string', enum: ['aprovada', 'aprovada_com_ressalvas', 'reprovada'] },
    resumo:   { type: 'string', description: 'O parecer em 1 frase' },
  }, required: ['veredito', 'resumo'] },
}

// Casa do Conteúdo: peça escrita produzida no chat ganha endereço na Biblioteca.
const SAVE_TOOL = {
  name: 'salvar_peca_escrita',
  description: 'SALVA uma peça de texto pronta (post, carrossel, roteiro, e-mail, blog) na Biblioteca da marca (aba Textos). Use SEMPRE que terminar de escrever uma peça completa que o usuário aprovou ou pediu — não pede confirmação, não custa créditos.',
  input_schema: { type: 'object', properties: {
    titulo:   { type: 'string', description: 'Título curto da peça' },
    formato:  { type: 'string', description: 'post | carrossel | roteiro-ugc | email | blog | outro' },
    conteudo: { type: 'string', description: 'A peça completa em markdown' },
  }, required: ['titulo', 'conteudo'] },
}

const CREATE_NAMES = new Set(CREATE_TOOLS.map(t => t.name))

const TOOL_LABEL = {
  consultar_mercado: 'o mercado', consultar_tendencias: 'as tendências',
  consultar_insights: 'os insights do consumidor', consultar_concorrentes: 'os concorrentes',
  gerar_imagem: 'o Estúdio (gerando imagem)', criar_fluxo: 'o Estúdio (montando fluxo)',
}
const ACTION_LABEL = {
  gerar_imagem: { titulo: 'Gerar imagem no Estúdio', custo: '1 crédito' },
  criar_fluxo:  { titulo: 'Criar fluxo no Estúdio',  custo: 'sem custo até rodar' },
}

async function execReadTool(name, input, workspaceId) {
  try {
    if (name === 'consultar_mercado') {
      const desde = new Date(Date.now() - (input?.dias || 30) * 86400000).toISOString()
      const [{ data: sint }, { data: clips }, { data: concs }] = await Promise.all([
        supabase.from('market_sinteses').select('bullets, para_marca, mencoes, created_at')
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1),
        supabase.from('concorrente_clipping').select('concorrente_id, titulo, sentiment, score_impacto, created_at')
          .eq('workspace_id', workspaceId).gte('created_at', desde).order('score_impacto', { ascending: false }).limit(12),
        supabase.from('concorrentes').select('id, nome').eq('workspace_id', workspaceId),
      ])
      const nome = Object.fromEntries((concs || []).map(c => [c.id, c.nome]))
      return JSON.stringify({
        sintese_do_ciclo: sint?.[0] || null,
        movimentos: (clips || []).map(c => ({ quem: nome[c.concorrente_id] || '?', titulo: c.titulo, sentimento: c.sentiment, impacto: c.score_impacto, em: (c.created_at || '').slice(0, 10) })),
      })
    }
    if (name === 'consultar_tendencias') {
      const { data } = await supabase.from('tendencias')
        .select('titulo, conteudo, categoria, relevancia, horizonte, como_surfar, created_at')
        .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(8)
      return JSON.stringify({ tendencias: data || [] })
    }
    if (name === 'consultar_insights') {
      const [{ data: ins }, { data: snap }] = await Promise.all([
        supabase.from('consumer_insights').select('batch_id, tipo, titulo, insight, acao, persona, evidencias, created_at')
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(20),
        supabase.from('sentiment_snapshots').select('data, positivo_pct, neutro_pct, negativo_pct, total_mencoes')
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1),
      ])
      const lote = ins?.length ? ins.filter(i => i.batch_id === ins[0].batch_id) : []
      return JSON.stringify({
        insights: lote.map(({ batch_id: _b, ...i }) => i),
        sentimento_atual: snap?.[0] || null,
      })
    }
    if (name === 'consultar_concorrentes') {
      const [{ data: concs }, { data: diags }] = await Promise.all([
        supabase.from('concorrentes').select('id, nome, dominio').eq('workspace_id', workspaceId).eq('ativo', true),
        supabase.from('diagnosticos_concorrentes').select('concorrente_id, scores, dados, created_at')
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      ])
      const ultimo = {}
      for (const d of diags || []) if (!ultimo[d.concorrente_id]) ultimo[d.concorrente_id] = d
      return JSON.stringify({
        concorrentes: (concs || []).map(c => {
          const d = ultimo[c.id]
          return {
            nome: c.nome, dominio: c.dominio,
            scores: d?.scores || null,
            frase: d?.dados?.frase_diagnostico || null,
            territorios: (d?.dados?.territorios_possiveis || []).map(t => t?.nome).filter(Boolean),
          }
        }),
      })
    }
    return JSON.stringify({ erro: `ferramenta desconhecida: ${name}` })
  } catch (e) {
    return JSON.stringify({ erro: e.message })
  }
}

// Executa uma ação de CRIAÇÃO já confirmada pelo usuário.
async function execCreateTool(name, input, { brandId }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }

    if (name === 'gerar_imagem') {
      // REGRA DE MARCA: logo só entra quando o usuário pediu — e é o ARQUIVO REAL
      // do repositório de Ativos como referência i2i (nunca a logo "desenhada").
      let references = []
      let prompt = input?.prompt || ''
      if (input?.inserir_logo) {
        const { data: logos } = await supabase.from('brand_assets').select('valor, metadata')
          .eq('brand_id', brandId).eq('tipo', 'logo').order('created_at', { ascending: true })
        const comUrl = (logos || []).filter(l => /^https?:\/\//.test(l?.valor || ''))
        const logo = comUrl.find(l => l.metadata?.header) || comUrl[0]
        if (!logo) return JSON.stringify({ erro: 'O repositório de Ativos não tem logo em arquivo de imagem (URL). Peça ao usuário para subir a logo em Estúdio → Ativos antes de inserir na peça.' })
        references = [logo.valor]
        prompt += '\n\nComponha na peça a LOGO OFICIAL fornecida como imagem de referência — aplique-a fiel, discreta e bem posicionada, sem redesenhar, distorcer ou alterar cores da logo.'
      }
      const res = await fetch('/.netlify/functions/studio-generate', {
        method: 'POST', headers: auth,
        // sem `model`: cai no DEFAULT_MODEL do servidor ('auto' não é id do fal — dava 502)
        body: JSON.stringify({ brand_id: brandId, prompt, formato: input?.formato || '4:5', use_brand: true, references }),
      })
      const j = await res.json()
      if (!res.ok) return JSON.stringify({ erro: j.error || `Erro ${res.status}` })
      // aguarda a geração concluir (fila + webhook; até ~3 min)
      for (let i = 0; i < 36; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const { data: g } = await supabase.from('studio_generations')
          .select('status, image_url, error').eq('id', j.generation_id).maybeSingle()
        if (g?.status === 'done' && g.image_url) {
          // REGRA (Danilo 2026-07-12): não se entrega peça sem o próprio juiz
          // assinar — toda geração passa pelo diretor de arte ANTES de chegar
          // ao usuário. Reprovada não é descartada: é entregue COM o parecer
          // e a oferta de regerar com os ajustes (novo crédito = nova confirmação).
          let parecer = null
          try {
            const rev = await fetch('/.netlify/functions/art-review', { method: 'POST', headers: auth,
              body: JSON.stringify({ brand_id: brandId, image_url: g.image_url, generation_id: j.generation_id }) })
            if (rev.ok) parecer = await rev.json()
          } catch { /* juiz indisponível não bloqueia a entrega */ }
          return JSON.stringify({
            status: 'pronta', image_url: g.image_url, parecer,
            instrucao: parecer
              ? (parecer.veredito === 'reprovada'
                ? 'ATENÇÃO: o diretor de arte REPROVOU esta peça. Mostre a imagem, seja transparente sobre o veredito e os motivos, e OFEREÇA regerar já incorporando os ajustes (nova geração = novo crédito, com confirmação). Não finja que ficou boa.'
                : `O diretor de arte deu veredito "${parecer.veredito}". Mostre a imagem (URL na resposta) e o parecer em 1-2 linhas.`)
              : 'Inclua a URL da imagem na resposta para o usuário vê-la.',
          })
        }
        if (g?.status === 'error') return JSON.stringify({ erro: g.error || 'falha na geração' })
      }
      return JSON.stringify({ erro: 'tempo esgotado aguardando a geração (a peça pode aparecer na galeria do Estúdio em instantes)' })
    }

    if (name === 'criar_fluxo') {
      const res = await fetch('/.netlify/functions/studio-workflow-build', {
        method: 'POST', headers: auth,
        body: JSON.stringify({ brand_id: brandId, prompt: input?.objetivo || '' }),
      })
      const j = await res.json()
      if (!res.ok) return JSON.stringify({ erro: j.error || `Erro ${res.status}` })
      const { data: brand } = await supabase.from('brands').select('workspace_id').eq('id', brandId).single()
      const { data: wf, error } = await supabase.from('studio_workflows').insert({
        workspace_id: brand?.workspace_id, brand_id: brandId, is_template: false,
        nome: j.nome || 'Fluxo do Copiloto', nodes: j.nodes || [], edges: j.edges || [],
      }).select('id, nome').single()
      if (error) return JSON.stringify({ erro: error.message })
      return JSON.stringify({ status: 'criado', nome: wf.nome, link: `#/app/brands/${brandId}/studio/workflow/${wf.id}`, instrucao: 'Inclua o link na resposta para o usuário abrir o fluxo.' })
    }

    return JSON.stringify({ erro: `ação desconhecida: ${name}` })
  } catch (e) {
    return JSON.stringify({ erro: e.message })
  }
}

function buildSystemPrompt(brand, book, ragChunks, intelligence) {
  const v  = book?.verbal_identity || {}
  const vi = book?.visual_identity || {}
  // fallback legado (brand books antigos)
  const id = book?.identity || {}
  const pos = book?.positioning || {}

  const tagline       = v.tagline || ''
  const proposito     = v.proposito || ''
  const missao        = v.missao || id.missao || ''
  const visao         = v.visao || id.visao || ''
  const valores       = _arr(v.valores).length ? v.valores : id.valores
  const arquetipo     = v.arquetipo || id.arquetipo || ''
  const personalidade = [...new Set([..._arr(v.personalidade), ..._arr(v.tom_atributos)])]
  const tomVoz        = v.tom_voz || id.tom_voz || ''
  const tomEvitar     = v.tom_evitar || ''
  const posicionamento = v.posicionamento || pos.posicionamento || ''
  const propostaValor  = v.proposta_valor || pos.proposta_valor || ''
  const mensagem       = v.mensagem_central || pos.mensagem_central || ''
  const publicoAlvo    = v.publico_alvo || id.publico_alvo || ''
  const vocabOk        = _join(v.vocabulario_aprovado)
  const vocabNao       = _join(v.vocabulario_proibido) || _join(id.vocabulario_proibido)
  const paleta         = _join(vi.paleta)
  const tipografia     = [vi.tipo_principal_nome, vi.tipo_secundario_nome, vi.tipo_display].filter(Boolean).join(' · ')

  const hasContent = !!(tomVoz || valores?.length || posicionamento || personalidade.length ||
    missao || proposito || paleta || (ragChunks?.length) || intelligence?.modelo)

  if (!hasContent) {
    return `Você é o Brand Assistant da marca "${brand?.nome || 'desconhecida'}" na plataforma s1ngulr.
Ainda não há um brand book configurado. Oriente o usuário a preencher o brand book para habilitar respostas contextualizadas.`
  }

  let prompt = `Você é o Brand Assistant da marca "${brand?.nome}" na plataforma s1ngulr.
Você conhece profundamente esta marca e responde com base exclusivamente no brand book abaixo.
Seja estratégico, direto e on-brand. Nunca invente informações que não estão no brand book.

# Brand Book — ${brand?.nome}

## Identidade Verbal`
  if (tagline)        prompt += `\n- Tagline: ${tagline}`
  if (proposito)      prompt += `\n- Propósito: ${proposito}`
  if (missao)         prompt += `\n- Missão: ${missao}`
  if (visao)          prompt += `\n- Visão: ${visao}`
  if (_arr(valores).length) prompt += `\n- Valores: ${_join(valores)}`
  if (arquetipo)      prompt += `\n- Arquétipo: ${arquetipo}`
  if (personalidade.length) prompt += `\n- Personalidade: ${personalidade.join(', ')}`
  if (tomVoz)         prompt += `\n- Tom de voz: ${tomVoz}`
  if (tomEvitar)      prompt += `\n- No tom, evitar: ${tomEvitar}`
  if (publicoAlvo)    prompt += `\n- Público-alvo: ${publicoAlvo}`
  if (vocabOk)        prompt += `\n- Vocabulário on-brand: ${vocabOk}`
  if (vocabNao)       prompt += `\n- Vocabulário proibido: ${vocabNao}`

  if (posicionamento || propostaValor || mensagem) {
    prompt += `\n\n## Posicionamento`
    if (posicionamento) prompt += `\n- Posicionamento: ${posicionamento}`
    if (propostaValor)  prompt += `\n- Proposta de valor: ${propostaValor}`
    if (mensagem)       prompt += `\n- Mensagem central: ${mensagem}`
  }

  if (paleta || tipografia || vi.foto_mood) {
    prompt += `\n\n## Identidade Visual`
    if (paleta)        prompt += `\n- Paleta: ${paleta}`
    if (tipografia)    prompt += `\n- Tipografia: ${tipografia}`
    if (vi.foto_mood)  prompt += `\n- Mood fotográfico: ${vi.foto_mood}`
  }

  prompt += `\n\nResponda sempre em português brasileiro, de forma estratégica e alinhada com o brand book acima.\n\nVocê tem FERRAMENTAS de consulta aos dados REAIS da plataforma (mercado, tendências, insights do consumidor, concorrentes). Quando a pergunta tocar nesses temas, USE a ferramenta em vez de responder de memória — e baseie a resposta nos dados retornados, citando-os.
Você também tem ferramentas de CRIAÇÃO (gerar_imagem, criar_fluxo) — quando pedirem para PRODUZIR algo, chame a ferramenta IMEDIATAMENTE, sem pedir permissão em texto (a plataforma mostra a confirmação ao usuário; pedir duas vezes é ruim). Apresente brevemente o conceito e chame.
REGRA INVIOLÁVEL DE QUALIDADE: você NUNCA gera uma peça que você mesmo reprovaria como diretor de arte. ANTES de chamar gerar_imagem, confronte o conceito com os padrões que a marca REPROVA e com a paleta/estética aprendidas (estão no seu contexto) — e escreva o prompt já em conformidade (cores EXATAS da paleta, ancoragem da marca, nada dos padrões reprovados). Se o próprio pedido do usuário violar um padrão reprovado, diga isso e proponha o conceito ajustado antes de gerar. Toda peça gerada passa automaticamente pelo diretor de arte antes de chegar ao usuário — seja transparente com o veredito. Peças ESCRITAS (copy, post, roteiro) você escreve diretamente na resposta, terminando com um bloco "Sugestão de imagem" descrevendo a arte para a pós-produção. Quando o usuário ENVIAR UMA IMAGEM (peça criada aqui ou fora — agência, freela), atue como DIRETOR DE ARTE da marca: avalie contra o brand book e a inteligência aprendida (paleta, tipografia, estética, do/don't, padrões aprovados/reprovados, território). Primeiro chame registrar_parecer com o veredito; depois escreva o parecer completo: **VEREDITO** (Aprovada / Aprovada com ressalvas / Reprovada) · **O que sustenta a marca** · **O que foge** · **Ajustes concretos** (lista acionável). Seja específico e franco — cite cores, composição e elementos reais da imagem.
Imagens geradas NUNCA contêm texto, tipografia ou LOGO — logo só entra se o usuário PEDIR explicitamente (aí use inserir_logo: true, que compõe com o arquivo real do repositório de marca; jamais descreva/desenhe a logo no prompt).`

  if (ragChunks?.length) {
    prompt += `\n\n## Trechos mais relevantes para esta pergunta (via RAG):\n`
    ragChunks.forEach(c => { prompt += `- ${c.chunk_text}\n` })
  }

  prompt += compileIntel(intelligence?.modelo, intelligence?.versao)

  return prompt
}

// Stream + loop de tool use: quando o modelo pede uma ferramenta (stop_reason
// 'tool_use'), executa no cliente, devolve o resultado e continua a conversa —
// até 4 rodadas. O texto flui no MESMO balão entre as rodadas.
async function runAssistantStream({ messages, systemPrompt, tools, execTool, onText, onStatus, onDone, onError, onRateLimit }) {
  const msgs = messages.map(m => ({ role: m.role, content: m.content }))
  let fullText = ''

  for (let rodada = 0; rodada < 5; rodada++) {
    let res, attempt = 0
    while (true) {
      attempt++
      try {
        const headers = { 'Content-Type': 'application/json' }
        if (import.meta.env.DEV) headers['x-api-key'] = import.meta.env.VITE_ANTHROPIC_KEY || ''
        res = await fetch(API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 4096,
            stream: true,
            system: systemPrompt,
            messages: msgs,
            ...(tools?.length ? { tools } : {}),
          }),
        })
      } catch (e) { onError(e.message || 'Erro de rede'); return }

      if (res.status === 429 || res.status === 529) {
        if (attempt >= MAX_RETRIES) { onError('Limite de uso da API.'); return }
        if (onRateLimit) {
          for (let s = RATE_LIMIT_WAIT; s > 0; s--) { onRateLimit(s); await new Promise(r => setTimeout(r, 1000)) }
          onRateLimit(0)
        } else {
          await new Promise(r => setTimeout(r, RATE_LIMIT_WAIT * 1000))
        }
        continue
      }
      break
    }
    if (!res.ok) { const e = await res.json().catch(() => ({})); onError(e?.error?.message || `Erro ${res.status}`); return }

    // Lê o SSE acumulando blocos (texto + tool_use com input em JSON parcial)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', stopReason = null
    const blocks = {}   // index → { type, id, name, json, text }
    try {
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
          if (evt.type === 'content_block_start')
            blocks[evt.index] = { type: evt.content_block?.type, id: evt.content_block?.id, name: evt.content_block?.name, json: '', text: '' }
          if (evt.type === 'content_block_delta') {
            const b = blocks[evt.index] || (blocks[evt.index] = { type: 'text', json: '', text: '' })
            if (evt.delta?.type === 'text_delta') { b.text += evt.delta.text || ''; fullText += evt.delta.text || ''; onText(fullText) }
            if (evt.delta?.type === 'input_json_delta') b.json += evt.delta.partial_json || ''
          }
          if (evt.type === 'message_delta' && evt.delta?.stop_reason) stopReason = evt.delta.stop_reason
        }
      }
    } catch (e) { onError(e.message || 'Erro de stream'); return }

    const ordered = Object.keys(blocks).sort((a, b) => a - b).map(k => blocks[k])
    const toolUses = ordered.filter(b => b.type === 'tool_use')
    if (stopReason !== 'tool_use' || !toolUses.length || !execTool) { onDone(fullText); return }

    // O modelo pediu ferramentas: registra o turno, executa e devolve os resultados
    const assistantContent = ordered.map(b => {
      if (b.type === 'tool_use') {
        let input = {}; try { input = b.json ? JSON.parse(b.json) : {} } catch { /* input vazio */ }
        return { type: 'tool_use', id: b.id, name: b.name, input }
      }
      return b.text ? { type: 'text', text: b.text } : null
    }).filter(Boolean)
    msgs.push({ role: 'assistant', content: assistantContent })

    const results = []
    for (const tu of assistantContent.filter(c => c.type === 'tool_use')) {
      // criação: o card de confirmação é o status; o spinner entra só após confirmar
      if (!CREATE_NAMES.has(tu.name)) onStatus?.(`Consultando ${TOOL_LABEL[tu.name] || tu.name}…`)
      const out = await execTool(tu.name, tu.input)
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: out })
    }
    onStatus?.('')
    msgs.push({ role: 'user', content: results })
    if (fullText && !fullText.endsWith('\n\n')) { fullText += '\n\n'; onText(fullText) }
  }
  onDone(fullText)
}

// Torna URLs vivas no chat: imagem geradas viram <img>, links viram âncora
// (inclusive rotas internas #/app/… que as ações de criação devolvem).
const IMG_URL = /(https?:\/\/[^\s)]+(?:\.png|\.jpe?g|\.webp|\.gif)(?:\?[^\s)]*)?|https?:\/\/[^\s)]*(?:fal\.media|\/storage\/v1\/object)[^\s)]*)/i
// O modelo responde em markdown (##, **, listas, ---) — renderizamos o
// subconjunto que ele usa, sem lib nova, preservando imagens/links vivos.

// negrito/itálico dentro de um trecho de texto puro
function mdInline(str, keyBase) {
  return String(str).split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((t, j) => {
    if (/^\*\*[^*\n]+\*\*$/.test(t)) return <strong key={`${keyBase}-b${j}`}>{t.slice(2, -2)}</strong>
    if (/^\*[^*\n]+\*$/.test(t))     return <em key={`${keyBase}-i${j}`}>{t.slice(1, -1)}</em>
    return t
  })
}

// URLs/imagens/links internos + inline markdown no que sobra
function inlineParts(text, keyBase) {
  const parts = String(text).split(/(https?:\/\/[^\s)]+|#\/app\/[^\s)]+)/g)
  return parts.map((part, i) => {
    if (IMG_URL.test(part) && /^https?:\/\//.test(part))
      return (
        <Box key={`${keyBase}-img${i}`} sx={{ my: 1 }}>
          <img src={part} alt="peça gerada" style={{ maxWidth: '100%', maxHeight: 340, borderRadius: 8, display: 'block' }} />
        </Box>
      )
    if (/^https?:\/\//.test(part))
      return <a key={`${keyBase}-a${i}`} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#7F77DD', fontWeight: 700 }}>{part}</a>
    if (part.startsWith('#/app/'))
      return <a key={`${keyBase}-e${i}`} href={part} style={{ color: '#7F77DD', fontWeight: 700 }}>abrir no Estúdio →</a>
    return <span key={`${keyBase}-t${i}`}>{mdInline(part, `${keyBase}-${i}`)}</span>
  })
}

function renderRich(text) {
  const limpo = String(text || '').replace(/!?\[[^\]]*\]\((https?:\/\/[^\s)]+|#\/app\/[^\s)]+)\)/g, '$1')
  return limpo.split('\n').map((line, i) => {
    // separador --- vira linha visual
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line))
      return <Box key={i} sx={{ borderBottom: '1px solid', borderColor: 'divider', my: 1.25 }} />
    // títulos # a ####
    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      const nivel = h[1].length
      return (
        <Typography key={i} component="div"
          sx={{ fontWeight: nivel <= 2 ? 900 : 800, fontSize: nivel === 1 ? 16 : nivel === 2 ? 15 : 14, mt: i === 0 ? 0 : 1.5, mb: 0.5 }}>
          {inlineParts(h[2], i)}
        </Typography>
      )
    }
    // listas com marcador
    const li = line.match(/^\s*[-*•]\s+(.*)/)
    if (li) return (
      <Box key={i} sx={{ display: 'flex', gap: 0.75, pl: 1 }}>
        <span>•</span><span style={{ flex: 1 }}>{inlineParts(li[1], i)}</span>
      </Box>
    )
    if (!line.trim()) return <Box key={i} sx={{ height: 8 }} />
    return <div key={i}>{inlineParts(line, i)}</div>
  })
}

function ChatBubble({ msg, question, onTeach }) {
  const isUser = msg.role === 'user'
  const [teaching, setTeaching] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const canTeach = !isUser && onTeach && !String(msg.content || '').startsWith('Erro')

  async function submit() {
    if (!text.trim()) return
    setSending(true)
    const ok = await onTeach({ pergunta: question, resposta: msg.content, correcao: text.trim() })
    setSending(false)
    if (ok) { setDone(true); setTeaching(false); setText('') }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 2 }}>
      {!isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#7F77DD', mr: 1, mt: 0.5, flexShrink: 0, fontSize: 13, fontFamily: "'Cairo', sans-serif" }}>
          <AutoAwesomeIcon sx={{ fontSize: 14 }} />
        </Avatar>
      )}
      <Box sx={{ maxWidth: '72%' }}>
        <Paper sx={{
          p: '10px 14px',
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? '#fff' : 'text.primary',
          border: isUser ? 'none' : '1px solid',
          borderColor: 'divider',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        }}>
          <Typography component="div" sx={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {renderRich(msg.content)}
          </Typography>
        </Paper>
        {/* Ensinar a marca — vira sinal assistant_correction p/ a Camada de Inteligência */}
        {canTeach && (
          <Box sx={{ mt: 0.5 }}>
            {done ? (
              <Typography sx={{ fontSize: 11, color: 'primary.main', fontWeight: 700 }}>✓ Ensinado — a marca vai aprender com isso.</Typography>
            ) : teaching ? (
              <Stack spacing={0.75} sx={{ maxWidth: 420 }}>
                <TextField value={text} onChange={e => setText(e.target.value)} autoFocus
                  placeholder="Corrija ou ensine algo sobre a marca a partir desta resposta…"
                  multiline minRows={2} maxRows={5} size="small" sx={{ '& .MuiInputBase-input': { fontSize: 13 } }} />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => { setTeaching(false); setText('') }} sx={{ fontSize: 11 }}>Cancelar</Button>
                  <Button size="small" variant="contained" disabled={sending || !text.trim()} onClick={submit}
                    startIcon={sending ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <SchoolOutlinedIcon sx={{ fontSize: 15 }} />}
                    sx={{ fontSize: 11, fontWeight: 700 }}>
                    {sending ? 'Ensinando…' : 'Ensinar a marca'}
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Tooltip title="Corrija ou ensine algo — a marca aprende com isso">
                <Button size="small" startIcon={<SchoolOutlinedIcon sx={{ fontSize: 15 }} />} onClick={() => setTeaching(true)}
                  sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'none', px: 0.75, minWidth: 0 }}>
                  Ensinar a marca
                </Button>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
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
  const [toolStatus, setToolStatus] = useState('')   // "Consultando o mercado…" (tools de leitura)
  const [pendingAction, setPendingAction] = useState(null)   // A2: ação de criação aguardando confirmação { name, input, resolve }
  const [anexo, setAnexo] = useState(null)                    // F1: imagem anexada { url } aguardando envio
  const [anexando, setAnexando] = useState(false)
  const fileRef = useRef(null)
  const ultimaImagemRef = useRef(null)                        // última peça avaliada (vai no sinal do parecer)
  const [rateLimitSec, setRateLimit] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [chunksCount, setChunksCount] = useState(0)
  const [intelligence, setIntelligence] = useState(null)   // modelo vivo destilado (Camada de Inteligência)

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
      supabase.from('brand_books').select('*').eq('brand_id', brandId)
        .order('updated_at', { ascending: false }).limit(1),
      supabase.from('conversations').select('*').eq('brand_id', brandId)
        .order('created_at', { ascending: false }).limit(20),
    ])
    setBrand(b)
    setBook(bb?.[0] || null)
    setConvs(convs || [])

    // Conta chunks indexados
    if (b?.id) {
      const { count } = await supabase
        .from('brand_book_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', b.id)
      setChunksCount(count || 0)

      // Modelo vivo destilado (última versão) — o que a marca aprendeu com o uso
      const { data: bi } = await supabase
        .from('brand_intelligence')
        .select('versao, modelo')
        .eq('brand_id', b.id)
        .order('versao', { ascending: false }).limit(1).maybeSingle()
      setIntelligence(bi || null)
    }

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

  // "Ensinar a marca" — correção humana vira sinal (assistant_correction) de alto
  // valor para a Camada de Inteligência. Peso alto: é ensino explícito.
  async function ensinarMarca({ pergunta, resposta, correcao }) {
    if (!brand?.id || !workspace?.id) return false
    const { error } = await supabase.from('brand_signals').insert({
      brand_id: brand.id, workspace_id: workspace.id,
      tipo: 'assistant_correction', fonte: 'assistant', ref_id: activeConv?.id || null,
      payload: {
        pergunta: (pergunta || '').slice(0, 1000),
        resposta: (resposta || '').slice(0, 2000),
        correcao: (correcao || '').slice(0, 2000),
      },
      peso: 3,
    })
    return !error
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

  async function confirmarAcao() {
    const pa = pendingAction
    if (!pa) return
    setPendingAction(null)
    setToolStatus(`Consultando ${TOOL_LABEL[pa.name] || pa.name}…`)
    const out = await execCreateTool(pa.name, pa.input, { brandId })
    pa.resolve(out)
  }
  function cancelarAcao() {
    const pa = pendingAction
    if (!pa) return
    setPendingAction(null)
    pa.resolve(JSON.stringify({ cancelado: true, motivo: 'O usuário NÃO confirmou a ação. Não tente de novo — pergunte se quer ajustar algo.' }))
  }

  async function anexarImagem(file) {
    if (!file || !file.type?.startsWith('image/')) return
    setAnexando(true)
    const path = `${brandId}/chat/${Date.now()}-${(file.name || 'peca').replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
    if (!error) setAnexo({ url: supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl })
    setAnexando(false)
  }

  async function sendMessage() {
    if ((!input.trim() && !anexo?.url) || streaming) return

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

    const imgUrl = anexo?.url || null
    const texto = input.trim() || (imgUrl ? 'Avalie esta peça como diretor de arte da marca.' : '')
    // display/persistência: URL no texto (renderRich mostra a imagem); API: bloco de imagem real
    const userMsg = { role: 'user', content: imgUrl ? `${imgUrl}\n${texto}` : texto, conversation_id: conv.id }
    if (imgUrl) ultimaImagemRef.current = imgUrl
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setAnexo(null)
    setStreaming(true)
    setStreamText('')
    setToolStatus('')

    await supabase.from('messages').insert({
      conversation_id: conv.id,
      role: 'user',
      content: userMsg.content,
    })

    // Busca chunks relevantes via RAG (Voyage AI + pgvector)
    let ragChunks = []
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()
      if (sess) {
        const searchRes = await fetch('/.netlify/functions/brand-book-search', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.access_token}` },
          body:    JSON.stringify({ brand_id: brandId, query: userMsg.content }),
        })
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          ragChunks = (searchData.chunks || []).filter(c => c.similarity > 0.5)
        }
      }
    } catch { /* RAG failure não bloqueia o assistente */ }

    const systemPrompt = buildSystemPrompt(brand, book, ragChunks, intelligence)
    const history = [...messages, userMsg]
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
    if (imgUrl) history[history.length - 1] = {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imgUrl } },
        { type: 'text', text: texto },
      ],
    }

    await runAssistantStream({
      messages: history,
      systemPrompt,
      tools: [...READ_TOOLS, ...CREATE_TOOLS, REVIEW_TOOL, SAVE_TOOL],
      execTool: async (name, inp) => {
        if (name === 'salvar_peca_escrita') {
          const { data: pc, error } = await supabase.from('pecas_escritas').insert({
            workspace_id: workspace?.id, brand_id: brand?.id,
            titulo: (inp?.titulo || 'Peça').slice(0, 140), formato: inp?.formato || null,
            conteudo: inp?.conteudo || '', origem: 'copiloto',
          }).select('id').single()
          return JSON.stringify(error ? { erro: error.message } : { ok: true, link: `#/app/brands/${brandId}/studio/biblioteca`, instrucao: 'Salva na Biblioteca → Textos. Inclua o link na resposta.' })
        }
        if (name === 'registrar_parecer') {
          const { error } = await supabase.from('brand_signals').insert({
            brand_id: brand?.id, workspace_id: workspace?.id,
            tipo: 'art_review', fonte: 'copiloto', ref_id: conv.id, peso: 0.8,
            payload: { veredito: inp?.veredito || null, resumo: (inp?.resumo || '').slice(0, 400), image_url: ultimaImagemRef.current },
          })
          return JSON.stringify(error ? { erro: error.message } : { ok: true, instrucao: 'Parecer registrado. Agora escreva o parecer completo: VEREDITO · o que sustenta a marca · o que foge · ajustes concretos.' })
        }
        if (!CREATE_NAMES.has(name)) return execReadTool(name, inp, workspace?.id)
        // criação: pausa o loop e espera a confirmação humana (portão de crédito)
        return new Promise(resolve => setPendingAction({ name, input: inp, resolve }))
      },
      onStatus: st => setToolStatus(st),
      onText: text => setStreamText(text),
      onDone: async (fullText) => {
        const assistantMsg = { role: 'assistant', content: fullText, conversation_id: conv.id }
        setMessages(prev => [...prev, assistantMsg])
        setStreamText('')
        setStreaming(false)
        setToolStatus('')

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
        setToolStatus('')
      },
      onRateLimit: (sec) => setRateLimit(sec),
    })
  }

  const systemPrompt = buildSystemPrompt(brand, book, [], intelligence)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={`${brand?.nome || ''} — Copiloto`}
        subtitle="Estratégia, briefings, copy e orientações de marca · baseado no brand book."
        action={
          <Button onClick={() => { window.location.hash = `#/app/brands/${brand?.id}` }} sx={{ color: 'text.secondary', fontWeight: 700 }}>
            ← Voltar ao Brand Book
          </Button>
        }
      />
    <Box sx={{ display: 'flex', height: 'calc(100vh - 130px)', overflow: 'hidden' }}>

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
            <ChatBubble key={i} msg={msg}
              question={messages[i - 1]?.role === 'user' ? messages[i - 1].content : ''}
              onTeach={msg.role === 'assistant' ? ensinarMarca : undefined} />
          ))}

          {streaming && streamText && (
            <ChatBubble msg={{ role: 'assistant', content: streamText + '▋' }} />
          )}

          {pendingAction && (
            <Paper sx={{ p: 2, mb: 2, ml: 4.5, maxWidth: 520, borderRadius: 2, border: '1px solid rgba(127,119,221,0.45)', bgcolor: 'rgba(127,119,221,0.06)' }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                <AutoAwesomeIcon sx={{ fontSize: 16, color: '#7F77DD' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                  {ACTION_LABEL[pendingAction.name]?.titulo || pendingAction.name}
                </Typography>
                <Chip label={ACTION_LABEL[pendingAction.name]?.custo || ''} size="small"
                  sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(127,119,221,0.14)', color: '#7F77DD' }} />
              </Stack>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5, mb: 1.5 }}>
                {pendingAction.input?.prompt || pendingAction.input?.objetivo || ''}
                {pendingAction.input?.formato ? ` · formato ${pendingAction.input.formato}` : ''}
                {pendingAction.input?.inserir_logo ? ' · 🏷 com a logo oficial dos Ativos' : ''}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" disableElevation onClick={confirmarAcao}
                  sx={{ fontWeight: 800, bgcolor: '#7F77DD', '&:hover': { bgcolor: '#6A62C8' } }}>Confirmar e executar</Button>
                <Button size="small" variant="text" color="inherit" onClick={cancelarAcao} sx={{ fontWeight: 700 }}>Agora não</Button>
              </Stack>
            </Paper>
          )}

          {streaming && toolStatus && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pl: 4.5 }}>
              <CircularProgress size={14} sx={{ color: '#7F77DD' }} />
              <Typography variant="caption" sx={{ color: '#7F77DD', fontWeight: 700 }}>{toolStatus}</Typography>
            </Box>
          )}

          {streaming && !streamText && !toolStatus && (
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
          {anexo?.url && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <img src={anexo.url} alt="peça anexada" style={{ height: 44, borderRadius: 6 }} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary', flex: 1 }}>Peça anexada — o Copiloto avalia como diretor de arte</Typography>
              <IconButton size="small" onClick={() => setAnexo(null)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
            </Box>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={e => { anexarImagem(e.target.files?.[0]); e.target.value = '' }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <Tooltip title="Anexar peça para o diretor de arte avaliar">
              <span>
                <IconButton onClick={() => fileRef.current?.click()} disabled={streaming || anexando}
                  sx={{ borderRadius: 2, width: 42, height: 42, flexShrink: 0, border: '1px solid', borderColor: 'divider' }}>
                  {anexando ? <CircularProgress size={16} /> : <ImageOutlinedIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
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
              disabled={(!input.trim() && !anexo?.url) || streaming}
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

    </Box>
    </Box>
  )
}
