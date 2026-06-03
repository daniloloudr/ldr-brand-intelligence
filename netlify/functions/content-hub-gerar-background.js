import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig, extractJSON, isDev } from './_ai.js'

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

function promptTerritorios(dominio, marca, diagCtx, nTerr) {
  return `Você é especialista em SEO.

PASSO 1 — Pesquise e leia o site "${dominio}":
- Acesse a homepage e leia título, subtítulos, menu de navegação, CTAs e descrições de serviços/produtos.
- Acesse ao menos 3 páginas internas (ex: /sobre, /servicos, /contato ou equivalentes).
- Extraia os termos exatos que aparecem no conteúdo — esses serão as keywords "proprio".

PASSO 2 — Com base no que leu, identifique:
- tipo "proprio": termos que LITERALMENTE APARECEM no conteúdo do site — nos títulos, menus, textos de serviços, CTAs, descrições. Não invente — extraia do texto real.
- tipo "oportunidade": keywords adjacentes que o público-alvo busca mas o site ainda não cobre diretamente.
${diagCtx ? `\nContexto do negócio:\n${diagCtx}\n` : ''}
Agrupe em ${nTerr} clusters temáticos. Cada cluster deve ter EXATAMENTE 5 keywords próprias e 5 oportunidades (total 10 por cluster).

Para cada cluster: id (kebab-case), nome descritivo, keywords.
Cada keyword: termo (português brasileiro), tipo ("proprio"|"oportunidade"), intencao (informacional|transacional|navegacional), volume (alto|medio|baixo), oportunidade (alta|media|baixa).

Retorne APENAS JSON válido, sem markdown:
{"clusters":[{"id":"...","nome":"...","keywords":[{"termo":"...","tipo":"proprio","intencao":"informacional","volume":"alto","oportunidade":"alta"}]}]}`
}

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

function promptDev(dominio, marca, diagCtx) {
  return `SEO expert. Business: "${marca}" (${dominio}).
${diagCtx ? `Context:\n${diagCtx}\n` : ''}
Return JSON with 3 keyword clusters and 3 content ideas for this business.
Each cluster: EXACTLY 5 "proprio" keywords (already used by this business) + 5 "oportunidade" keywords (expansion opportunities). Total 10 per cluster.

JSON format only, no markdown:
{"clusters":[{"id":"kebab-id","nome":"Cluster Name","keywords":[{"termo":"keyword","tipo":"proprio","intencao":"informacional","volume":"alto","oportunidade":"alta"},{"termo":"keyword2","tipo":"oportunidade","intencao":"informacional","volume":"medio","oportunidade":"alta"}]}],"ideias":[{"id":"1","titulo":"...","cluster":"kebab-id","relevancia":"1 sentence","ideia":"2 sentences","formato":"Artigo","intencao":"informacional"}]}`
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 }
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }

  const { workspace_id } = body
  if (!workspace_id) return { statusCode: 400 }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403 }

  const { data: ws } = await supabase
    .from('workspaces').select('id, nome, dominio').eq('id', workspace_id).single()
  if (!ws?.dominio) return { statusCode: 400 }

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
      const { text } = await callAI({
        ...aiConfig('fast'),
        messages: [{ role: 'user', content: promptDev(dominio, marca, diagCtx) }],
      })
      const parsed = extractJSON(text)
      clusters = parsed?.clusters
      ideias   = parsed?.ideias
    } else {
      const cfg = aiConfig('standard')

      const resC = await callAI({
        ...cfg,
        maxTokens: 5000,
        messages:  [{ role: 'user', content: promptTerritorios(dominio, marca, diagCtx, 6) }],
      })
      clusters = extractJSON(resC.text)?.clusters
      if (!clusters?.length) throw new Error('Análise inválida retornada pela IA')

      const resI = await callAI({
        ...cfg,
        maxTokens: 2000,
        messages:  [{ role: 'user', content: promptIdeias(dominio, diagCtx, clusters, 6) }],
      })
      ideias = extractJSON(resI.text)?.ideias
    }
  } catch (e) {
    // Background functions can't return errors to the client — log and save error row
    await supabase.from('content_hub_analyses').insert({
      workspace_id,
      dados: { error: e.message },
    })
    return { statusCode: 200 }
  }

  if (!clusters?.length || !ideias?.length) {
    await supabase.from('content_hub_analyses').insert({
      workspace_id,
      dados: { error: 'Análise inválida retornada pela IA' },
    })
    return { statusCode: 200 }
  }

  await supabase.from('content_hub_analyses').insert({
    workspace_id,
    dados: { clusters, ideias },
  })

  return { statusCode: 200 }
}
