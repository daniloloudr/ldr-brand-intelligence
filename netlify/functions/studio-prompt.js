// ════════════════════════════════════════════════════════════════════
// studio-prompt.js — "Melhorar o Prompt" de imagem (on-brand)
// Recebe um prompt/ideia + brand context e devolve um prompt rico.
// Usa Sonnet 4.6 (qualidade de direção de arte). Sem web search.
// Spec: .spec/features/studio.md — Bloco Imagem (melhorar prompt)
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

  // Default: HAIKU (Danilo, 31/08/2026). O trabalho aqui deixou de ser "escrever
  // bonito" e virou "restringir" — refinar sem acrescentar, em 300 caracteres.
  // Para isso o Sonnet era caro sem ser melhor: o que segura a invenção é a
  // instrução e o corte duro, não a capacidade do modelo. `model: 'sonnet'`
  // continua disponível para quem quiser pagar por direção de arte.
  const MODEL = modelReq === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
  // O teto agora é PADRÃO, não opcional (Danilo, 31/08/2026). Antes só existia
  // se quem chamava pedisse `max_chars` — e só o canvas pedia. A página Imagem e
  // a de Vídeo chamavam sem limite, com Sonnet e a instrução de "enriquecer": o
  // resultado era um parágrafo inventado por cima de um pedido de uma linha.
  // Limite que depende de o chamador lembrar não é limite.
  const LIMITE_PADRAO = 300
  const limit = Number.isFinite(max_chars) && max_chars > 0 ? Math.min(max_chars, 2000) : LIMITE_PADRAO

  const { data: brand } = await supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Marca não encontrada' }) }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', brand.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  let prefix = ''
  if (useBrand) ({ prefix } = await resolveBrandIntelligence(supabase, brand_id, brand.nome))

  // O sistema anterior mandava "MELHORAR... vívido e específico... enriqueça".
  // O modelo obedecia: transformava "modelo de costas na praia" em três frases
  // com adereços, clima e história que ninguém pediu. Não era alucinação
  // espontânea — era a instrução. Agora o papel é REVISOR, não redator.
  const system = [
    'Você REFINA prompts de geração de imagem. Você é um revisor, não um redator criativo.',
    'REGRA PRINCIPAL: torne preciso o que JÁ foi pedido. Não acrescente elemento, objeto, pessoa, cenário, adereço, ação, clima, estilo ou história que não esteja no texto original.',
    'PODE: desambiguar termo vago, usar linguagem fotográfica para o que o texto já implica, e ordenar (sujeito → ação → enquadramento → luz).',
    'NÃO PODE: completar a cena, inventar detalhe ausente, encher de adjetivos, ou colocar logo/marca/texto escrito na imagem.',
    'Texto original curto ⇒ resposta curta. Prompt curto e fiel vale mais que prompt longo e inventado — o excesso compete com a referência de imagem e tira fidelidade.',
    'Escreva em termos POSITIVOS, descrevendo o que deve aparecer. Modelo de imagem não obedece negação: escrever "sem X" injeta X na cena.',
    'Contexto de marca, quando houver, muda COMO descrever (paleta, tom) — nunca O QUE está na cena.',
    `Limite rígido: no MÁXIMO ${limit} caracteres.`,
    'Escreva UM único prompt em português.',
    'Responda APENAS com o prompt — sem aspas, sem títulos, sem explicação, sem preâmbulo.',
  ].join(' ')

  const userMsg = idea?.trim()
    ? `Refine este prompt mantendo EXATAMENTE os mesmos elementos, sem acrescentar nada:\n${idea.trim()}`
    : 'Sugira uma cena on-brand simples e direta para um post visual da marca.'

  const content = useBrand && prefix ? `${prefix}\n\n[PROMPT]\n${userMsg}` : userMsg

  try {
    const { text } = await callAI({
      ...aiConfig('fast'),
      model: MODEL,
      maxTokens: Math.ceil(limit / 2) + 60,
      system,
      messages: [{ role: 'user', content }],
      supabase, tag: 'studio', workspace_id: brand.workspace_id,
    })
    let promptOut = (text || '').trim().replace(/^["“']|["”']$/g, '')
    // Garantia dura do limite (corta no último espaço antes do teto p/ não cortar
    // palavra). A instrução no system é pedido; ISTO é a garantia.
    if (promptOut.length > limit) {
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
