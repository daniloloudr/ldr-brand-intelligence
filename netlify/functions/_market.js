// _market.js — síntese do ciclo de mercado (fase 1 · Inteligência de Mercado).
// Lê o clipping da janela (matéria-prima 100% local — sem web search) com o
// contexto da marca e escreve o briefing de segunda-feira: o que importa e o
// que fazer. Chamado on-demand (market-sintese-background) e pelo cron do clipping.
import { callAI, MODELS, isDev, extractJSON } from './_ai.js'
import { resolveBrandIntelligence } from './_brain.js'

export async function gerarSinteseMercado(supabase, { workspace_id, janela_dias = 7 }) {
  const desde = new Date(Date.now() - janela_dias * 86400000).toISOString()
  const [{ data: clips }, { data: concs }, { data: brand }] = await Promise.all([
    supabase.from('concorrente_clipping').select('concorrente_id, titulo, conteudo, fonte, sentiment, score_impacto, created_at')
      .eq('workspace_id', workspace_id).gte('created_at', desde)
      .order('score_impacto', { ascending: false }).limit(60),
    supabase.from('concorrentes').select('id, nome').eq('workspace_id', workspace_id),
    supabase.from('brands').select('id, nome').eq('workspace_id', workspace_id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle(),
  ])
  if (!clips?.length) return { status: 'sem_clipping' }
  if (!brand)         return { status: 'sem_marca' }

  const nome = Object.fromEntries((concs || []).map(c => [c.id, c.nome]))
  const ctx = await resolveBrandIntelligence(supabase, brand.id, brand.nome)
  const itens = clips.map(c =>
    `[${nome[c.concorrente_id] || 'mercado'} · ${c.sentiment || '?'}${c.score_impacto ? ` · impacto ${c.score_impacto}/10` : ''}] ${c.titulo}${c.conteudo ? ` — ${c.conteudo.slice(0, 200)}` : ''}`)

  const prompt = `${ctx.prefix}

[MOVIMENTOS DO MERCADO — últimos ${janela_dias} dias, ${itens.length} itens, do maior impacto ao menor]
${itens.join('\n')}

Você é a inteligência da marca ${brand.nome} escrevendo o BRIEFING DO CICLO para o time dela. Regras:
- "bullets": exatamente 3, cada um sintetizando um movimento ou padrão que IMPORTA (cite quem se moveu e por que isso pesa). Nada de listar tudo — hierarquize.
- "para_marca": 1-2 frases com a leitura estratégica — o que ESTES movimentos significam para a ${brand.nome} e a reação recomendada, no tom da marca descrito acima.
- Específico e direto; sem jargão interno; se a semana foi fraca, diga isso com franqueza.

Retorne APENAS JSON, sem markdown:
{"bullets":["<200chars>","<200chars>","<200chars>"],"para_marca":"<300chars>"}`

  let out
  try {
    const { text } = await callAI({
      model: isDev() ? MODELS.medium : MODELS.smart,
      maxTokens: 1500, retries: 1, retryDelay: 3000,
      messages: [{ role: 'user', content: prompt }],
      supabase, tag: 'sintese-mercado',
    })
    out = extractJSON(text)
  } catch (e) {
    console.error(`[market-sintese] ws ${workspace_id}: ${e.message}`)
    return { status: 'llm_error' }
  }
  if (!Array.isArray(out?.bullets) || !out.bullets.length) return { status: 'invalido' }

  const { error } = await supabase.from('market_sinteses').insert({
    workspace_id,
    bullets:     out.bullets.slice(0, 3).map(b => String(b).slice(0, 400)),
    para_marca:  out.para_marca ? String(out.para_marca).slice(0, 600) : null,
    janela_dias, mencoes: itens.length,
  })
  if (error) { console.error(`[market-sintese] insert ws ${workspace_id}: ${error.message}`); return { status: 'insert_error' } }
  return { status: 'ok' }
}
