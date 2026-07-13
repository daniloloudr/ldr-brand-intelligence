// home-recommendation.js — Home v2: a recomendação do "E agora?" gerada pelo
// CÉREBRO em vez de regras fixas. O LLM recebe o brand context + inteligência
// aprendida + o estado atual do workspace e escolhe UMA ação de uma lista
// fechada (whitelist — o hash nunca vem do LLM). Tier fast (Haiku): barato o
// suficiente para rodar por load, e o cliente ainda cacheia por 12h.
import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig, extractJSON } from './_ai.js'
import { resolveBrandIntelligence } from './_brain.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Whitelist de ações: o LLM escolhe o id; o servidor resolve o hash.
const ACTIONS = (brandPath) => ({
  personas:     { cta: 'Ir para Função',      hash: `${brandPath}/negocio` },
  expressao:    { cta: 'Ir para Expressão',   hash: `${brandPath}/expression` },
  estrategia:   { cta: 'Ir para Estratégia',  hash: `${brandPath}/essencia` },
  julgar:       { cta: 'Julgar agora',        hash: `${brandPath}/studio/approvals` },
  redacao:      { cta: 'Abrir Redação',       hash: `${brandPath}/studio/writing` },
  imagem:       { cta: 'Criar imagem',        hash: `${brandPath}/studio` },
  fluxos:       { cta: 'Abrir Fluxos',        hash: `${brandPath}/studio/workflow` },
  copiloto:     { cta: 'Abrir Copiloto',      hash: `${brandPath}/assistant` },
  concorrentes: { cta: 'Ver concorrentes',    hash: '#/app/reports' },
  inteligencia: { cta: 'Ver inteligência',    hash: '#/app/ia-loudr' },
  mercado:      { cta: 'Ver mercado',         hash: '#/app/market-intel' },
  tendencias:   { cta: 'Ver tendências',      hash: '#/app/trends' },
  escuta:       { cta: 'Ver escuta',          hash: '#/app/listening' },
})

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers } }
  const { workspace_id } = body
  if (!workspace_id) return { statusCode: 400, headers }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers }

  const { data: brand } = await supabase.from('brands').select('id, nome').eq('workspace_id', workspace_id)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Sem marca' }) }

  // Estado atual: os mesmos números que a Home mostra, na visão do servidor.
  const semana = new Date(Date.now() - 7 * 86400000).toISOString()
  const [ctx, { data: book }, pendJulg, sigPend, { data: concs }, { data: clips }, { data: trend }] = await Promise.all([
    resolveBrandIntelligence(supabase, brand.id, brand.nome),
    supabase.from('brand_books').select('verbal_identity, strategy').eq('brand_id', brand.id)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('studio_generations').select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id).eq('status', 'done').is('feedback', null).not('image_url', 'is', null),
    supabase.from('brand_signals').select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id).is('consumido_em', null),
    supabase.from('concorrentes').select('id').eq('workspace_id', workspace_id).eq('ativo', true),
    supabase.from('concorrente_clipping').select('titulo, score_impacto').eq('workspace_id', workspace_id)
      .gte('created_at', semana).order('score_impacto', { ascending: false }).limit(2),
    supabase.from('tendencias').select('titulo, relevancia').eq('workspace_id', workspace_id)
      .gte('created_at', semana).order('relevancia', { ascending: false }).limit(2),
  ])

  const st = book?.strategy || {}, v = book?.verbal_identity || {}
  const estado = [
    `Peças geradas aguardando julgamento (👍/👎): ${pendJulg.count || 0}`,
    `Evidências novas ainda não destiladas: ${sigPend.count || 0}`,
    `Personas preenchidas: ${st.personas?.length ? 'sim' : 'NÃO'}`,
    `Tom de voz definido: ${v.tom_voz ? 'sim' : 'NÃO'}`,
    `Concorrentes ativos monitorados: ${concs?.length || 0}`,
    ...(clips || []).map(c => `Mercado (esta semana): ${c.titulo}${c.score_impacto ? ` (impacto ${c.score_impacto}/10)` : ''}`),
    ...(trend || []).map(t => `Tendência (esta semana): ${t.titulo}${t.relevancia ? ` (relevância ${t.relevancia}/10)` : ''}`),
  ].join('\n')

  const actions = ACTIONS(`#/app/brands/${brand.id}`)
  const prompt = `${ctx.prefix}

[ESTADO ATUAL DO WORKSPACE]
${estado}

Você é o cérebro da marca ${brand.nome} escolhendo A PRÓXIMA MELHOR AÇÃO para o time dela agora. Ações possíveis (escolha exatamente UMA pelo id):
${Object.keys(actions).join(', ')}

Critério: o que gera MAIS aprendizado ou resultado para a marca AGORA. Gaps no brand book (personas/tom) vêm antes de tudo; muitos julgamentos pendentes são ouro; movimentos de mercado de alto impacto merecem reação; se está tudo em dia, recomende criar (redacao/imagem/fluxos).
Escreva "texto" em 1-2 frases, direto, específico DESTA marca (cite o dado que motivou — número, movimento ou tendência). Sem jargão interno: nunca mencione sinais, destilação, chunks ou versões do modelo.

Retorne APENAS JSON: {"acao":"<id>","texto":"<1-2 frases>"}`

  try {
    const { text } = await callAI({ ...aiConfig('fast'), maxTokens: 400,
      messages: [{ role: 'user', content: prompt }], supabase, tag: 'home-reco' })
    const out = extractJSON(text)
    const escolhida = actions[out?.acao]
    if (!escolhida || !out?.texto) return { statusCode: 200, headers, body: JSON.stringify({ reco: null }) }
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ reco: { t: String(out.texto).slice(0, 280), cta: escolhida.cta, hash: escolhida.hash, origem: 'cerebro' } }),
    }
  } catch (e) {
    console.error('[home-reco]', e.message)
    return { statusCode: 200, headers, body: JSON.stringify({ reco: null }) }
  }
}
