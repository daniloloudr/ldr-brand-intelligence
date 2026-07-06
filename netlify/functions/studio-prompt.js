// ════════════════════════════════════════════════════════════════════
// studio-prompt.js — "Melhorar o Prompt" de imagem (on-brand)
// Recebe um prompt/ideia + brand context e devolve um prompt rico.
// Usa Sonnet 4.6 (qualidade de direção de arte). Sem web search.
// Spec: specs/features/studio.md — Bloco Imagem (melhorar prompt)
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig } from './_ai.js'
import { resolveBrandIntelligence } from './_brain.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) } }

  const { brand_id, idea = '', model: modelReq, max_chars } = body
  const useBrand = body.use_brand !== false
  if (!brand_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'brand_id obrigatório' }) }

  // Default: Sonnet 4.6 (qualidade de direção de arte). Workflow pede Haiku + curto.
  const MODEL = modelReq === 'haiku' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
  const limit = Number.isFinite(max_chars) && max_chars > 0 ? Math.min(max_chars, 2000) : null

  const { data: brand } = await supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Marca não encontrada' }) }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', brand.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  let prefix = ''
  if (useBrand) ({ prefix } = await resolveBrandIntelligence(supabase, brand_id, brand.nome))

  const system = [
    'Você é um diretor de arte sênior que escreve prompts para geração de imagem por IA.',
    'Sua tarefa é MELHORAR o prompt recebido: torná-lo vívido e específico em cena, sujeito, composição, enquadramento, iluminação, paleta, mood e nível de detalhe — sem trair a intenção original.',
    'Se houver contexto de marca, respeite paleta, personalidade e estética.',
    'Escreva UM único prompt em português.',
    limit ? `Seja conciso e direto: no MÁXIMO ${limit} caracteres na resposta.` : '',
    'Responda APENAS com o prompt — sem aspas, sem títulos, sem explicação, sem preâmbulo.',
  ].filter(Boolean).join(' ')

  const userMsg = idea?.trim()
    ? `Melhore e enriqueça este prompt de imagem, preservando a intenção:\n${idea.trim()}`
    : 'Sugira uma cena on-brand interessante para um post visual da marca.'

  const content = useBrand && prefix ? `${prefix}\n\n[PROMPT]\n${userMsg}` : userMsg

  try {
    const { text } = await callAI({
      ...aiConfig('fast'),
      model: MODEL,
      maxTokens: limit ? Math.ceil(limit / 2) + 60 : 400,
      system,
      messages: [{ role: 'user', content }],
    })
    let promptOut = (text || '').trim().replace(/^["“']|["”']$/g, '')
    // Garantia dura do limite (corta no último espaço antes do teto p/ não cortar palavra)
    if (limit && promptOut.length > limit) {
      promptOut = promptOut.slice(0, limit)
      const lastSpace = promptOut.lastIndexOf(' ')
      if (lastSpace > limit * 0.6) promptOut = promptOut.slice(0, lastSpace)
      promptOut = promptOut.trim()
    }
    if (!promptOut) return { statusCode: 502, headers, body: JSON.stringify({ error: 'Sem sugestão' }) }
    return { statusCode: 200, headers, body: JSON.stringify({ prompt: promptOut }) }
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: e.message }) }
  }
}
