import { createClient } from '@supabase/supabase-js'
import { callAI, MODELS, TOOLS, extractJSON, isDev } from './_ai.js'
import { creditsForOp, debitCredits, refundCredits } from './_credits.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function buildDiagContext(diag) {
  if (!diag?.data) return ''
  const d = diag.data
  const parts = []
  if (d.setor)            parts.push(`Setor: ${d.setor}`)
  if (d.publico_alvo)     parts.push(`Público-alvo: ${d.publico_alvo}`)
  if (d.momento_atual)    parts.push(`Contexto: ${d.momento_atual}`)
  if (d.resumo_executivo) parts.push(`Resumo: ${d.resumo_executivo}`)
  if (d.diferenciais)     parts.push(`Diferenciais: ${d.diferenciais}`)
  return parts.join('\n')
}

// Prod — Call 1: keywords próprias + oportunidades de expansão
function promptTerritorios(dominio, marca, diagCtx, nTerr) {
  return `Você é especialista em SEO.

Pesquise o site "${dominio}" (marca: "${marca}") e leia suas páginas principais.
${diagCtx ? `\nContexto do negócio:\n${diagCtx}\n` : ''}
Identifique dois tipos de keywords para este site:

- tipo "proprio": keywords que o site JÁ aborda — termos presentes nos títulos, serviços, textos e meta-tags. São as keywords que o negócio já se apropria.
- tipo "oportunidade": keywords adjacentes que o site ainda não cobre bem mas tem autoridade para ranquear e expandir seu alcance.

Agrupe em ${nTerr} clusters temáticos. Cada cluster deve ter EXATAMENTE 5 keywords próprias e 5 oportunidades (total 10 por cluster).

Para cada cluster: id (kebab-case), nome descritivo, keywords.
Cada keyword: termo (português brasileiro), tipo ("proprio"|"oportunidade"), intencao (informacional|transacional|navegacional), volume (alto|medio|baixo), oportunidade (alta|media|baixa).

Retorne APENAS JSON válido, sem markdown:
{"clusters":[{"id":"...","nome":"...","keywords":[{"termo":"...","tipo":"proprio","intencao":"informacional","volume":"alto","oportunidade":"alta"}]}]}`
}

// Prod — Call 2: ideias baseadas nos grupos reais do site
function promptIdeias(dominio, diagCtx, clusters, nIdeas) {
  const lista = clusters.map(c => `- "${c.id}": ${c.nome}`).join('\n')
  return `Você é estrategista de conteúdo.

Para o site "${dominio}", gere ${nIdeas} ideias de conteúdo em português brasileiro.
${diagCtx ? `\nContexto:\n${diagCtx}\n` : ''}
Grupos de keywords do site:
${lista}

Distribua as ideias entre grupos diferentes. Foque em conteúdos que respondem buscas reais do público-alvo deste negócio.

Cada ideia: id, titulo, cluster (ID acima), relevancia (1 frase — por que este conteúdo vai atrair tráfego para este site), ideia (2 frases descrevendo o conteúdo), formato (Artigo|Vídeo|Post|Newsletter|Webinar), intencao (informacional|transacional|navegacional).

Retorne APENAS JSON válido, sem markdown:
{"ideias":[{"id":"1","titulo":"...","cluster":"...","relevancia":"...","ideia":"...","formato":"Artigo","intencao":"informacional"}]}`
}

// Dev — 1 chamada combinada (Haiku: ~5s, cabe folgado no timeout de 30s)
function promptDev(dominio, marca, diagCtx) {
  return `SEO expert. Business: "${marca}" (${dominio}).
${diagCtx ? `Context:\n${diagCtx}\n` : ''}
Return JSON with 3 keyword clusters and 2 content ideas for this business.
Each cluster: 2 "proprio" keywords (already used by this business) + 2 "oportunidade" keywords (expansion opportunities).

JSON format only, no markdown:
{"clusters":[{"id":"kebab-id","nome":"Cluster Name","keywords":[{"termo":"keyword","tipo":"proprio","intencao":"informacional","volume":"alto","oportunidade":"alta"},{"termo":"keyword2","tipo":"oportunidade","intencao":"informacional","volume":"medio","oportunidade":"alta"}]}],"ideias":[{"id":"1","titulo":"...","cluster":"kebab-id","relevancia":"1 sentence","ideia":"2 sentences","formato":"Artigo","intencao":"informacional"}]}`
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  const { workspace_id } = body
  if (!workspace_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  const { data: ws } = await supabase
    .from('workspaces').select('id, nome, dominio').eq('id', workspace_id).single()
  if (!ws) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Workspace não encontrado' }) }

  if (!ws.dominio) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Configure o domínio do workspace antes de analisar.' }) }
  }

  // Débito de crédito (Content Hub = 2). Admin bypassa. Estorna se a análise falhar.
  const amount = creditsForOp('content')
  if (!platformAdmin) {
    const r = await debitCredits(supabase, { workspace_id, amount, operacao: 'content', user_id: user.id })
    if (r.insufficient) return { statusCode: 402, headers, body: JSON.stringify({ error: 'Créditos insuficientes para gerar conteúdo.', need: amount }) }
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: r.error || 'Falha ao debitar créditos' }) }
  }
  const estorna = async () => { if (!platformAdmin) await refundCredits(supabase, { workspace_id, amount, operacao: 'content' }) }

  const { data: diag } = await supabase
    .from('diagnosticos').select('data').eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false }).limit(1).single()

  const dev     = isDev()
  const dominio = ws.dominio
  const marca   = ws.nome || ws.dominio
  const diagCtx = buildDiagContext(diag)

  let clusters, ideias
  try {
    if (dev) {
      // Dev: Haiku (~5-8s) — cabe folgado no timeout de 30s do netlify-cli
      const { text } = await callAI({
        model:     MODELS.fast,
        maxTokens: 2000,
        messages:  [{ role: 'user', content: promptDev(dominio, marca, diagCtx) }],
        supabase, tag: 'conteudo', workspace_id: workspace_id,
        retries:   1,
        retryDelay: 2000,
      })
      const parsed = extractJSON(text)
      clusters = parsed?.clusters
      ideias   = parsed?.ideias
    } else {
      // Prod: 2 chamadas sequenciais com web search (total ~40-60s, timeout 120s)
      const opts = { model: MODELS.smart, tools: [TOOLS.webSearch], retries: 1, retryDelay: 5000 }

      const resC = await callAI({
        ...opts,
        maxTokens: 5000,
        messages:  [{ role: 'user', content: promptTerritorios(dominio, marca, diagCtx, 6) }],
        supabase, tag: 'conteudo', workspace_id: workspace_id,
      })
      clusters = extractJSON(resC.text)?.clusters
      if (!clusters?.length) throw new Error('Análise inválida retornada pela IA')

      const resI = await callAI({
        ...opts,
        maxTokens: 2000,
        messages:  [{ role: 'user', content: promptIdeias(dominio, diagCtx, clusters, 6) }],
        supabase, tag: 'conteudo', workspace_id: workspace_id,
      })
      ideias = extractJSON(resI.text)?.ideias
    }
  } catch (e) {
    await estorna()
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }

  if (!clusters?.length || !ideias?.length) {
    await estorna()
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Análise inválida retornada pela IA' }) }
  }

  const parsed = { clusters, ideias }

  const { data: analise, error: insertErr } = await supabase
    .from('content_hub_analyses')
    .insert({ workspace_id, dados: parsed })
    .select().single()

  if (insertErr) { await estorna(); return { statusCode: 500, headers, body: JSON.stringify({ error: insertErr.message }) } }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ analise: { ...analise, dados: parsed } }),
  }
}
