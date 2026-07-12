// insights-gerar-background.js — destila a escuta social bruta em INSIGHTS
// NOMEADOS do consumidor (Onda 3). A divisão de produto: Escuta Social = o que
// disseram (coleta); Insights do Consumidor = o que isso significa (leitura).
// Sem web search: a matéria-prima é 100% local (listening_events + snapshots +
// personas + o que o cérebro já aprendeu). Grava em consumer_insights por lote.
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { callAI, MODELS, isDev, extractJSON } from './_ai.js'
import { resolveBrandIntelligence } from './_brain.js'

const TIPOS = ['elogio', 'atrito', 'oportunidade', 'tema', 'alerta']

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

  const { data: brand } = await supabase.from('brands').select('id, nome').eq('workspace_id', workspace_id)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (!brand) return { statusCode: 404 }

  // Matéria-prima: menções recentes + série de sentimento + personas + cérebro
  const [{ data: eventos }, { data: snaps }, { data: book }, ctx] = await Promise.all([
    supabase.from('listening_events').select('fonte, conteudo, sentimento, score, created_at')
      .eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(80),
    supabase.from('sentiment_snapshots').select('data, positivo_pct, neutro_pct, negativo_pct, avg_positivo, avg_neutro, avg_negativo, total_mencoes')
      .eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(12),
    supabase.from('brand_books').select('strategy').eq('brand_id', brand.id)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    resolveBrandIntelligence(supabase, brand.id, brand.nome),
  ])
  if (!eventos?.length) return { statusCode: 200, body: JSON.stringify({ status: 'sem_escuta', inseridos: 0 }) }

  const personas = (book?.strategy?.personas || []).filter(p => p?.nome)
    .map(p => `${p.nome}${p.dores ? ` (dores: ${String(p.dores).slice(0, 100)})` : ''}`)
  const serie = (snaps || []).reverse()
    .map(s => `${s.data}: +${s.positivo_pct ?? s.avg_positivo ?? 0}% =${s.neutro_pct ?? s.avg_neutro ?? 0}% -${s.negativo_pct ?? s.avg_negativo ?? 0}% (${s.total_mencoes} menções)`)
  const mencoes = eventos.map(e =>
    `[${e.fonte || '?'} · ${e.sentimento || '?'}${e.score != null ? ` · força ${e.score}` : ''}] ${(e.conteudo || '').slice(0, 280)}`)

  const prompt = `${ctx.prefix}

${personas.length ? `[PERSONAS DA MARCA]\n${personas.join('\n')}\n` : ''}
[EVOLUÇÃO DO SENTIMENTO — do mais antigo ao mais recente]
${serie.join('\n') || '(sem série ainda)'}

[MENÇÕES COLETADAS NA ESCUTA SOCIAL — ${mencoes.length}, da mais recente à mais antiga]
${mencoes.join('\n')}

Você é a inteligência da marca ${brand.nome} lendo a escuta social e destilando INSIGHTS DO CONSUMIDOR: afirmações acionáveis sobre o que o público sente, quer e rejeita. Regras:
- 4 a 7 insights, cada um sustentado por menções REAIS acima (cite a evidência dentro do texto: o padrão observado e em quais fontes).
- Nada de obviedade ("o público gosta de conteúdo de qualidade") — só o que é ESPECÍFICO desta marca e acionável.
- Tipos: elogio (o que o público celebra — dobrar a aposta), atrito (o que incomoda — consertar), oportunidade (desejo não atendido — ocupar), tema (assunto que o público puxa — usar no conteúdo), alerta (risco reputacional emergente).
- Quando um insight tocar uma persona listada, nomeie-a no campo "persona".
- "acao": 1 frase concreta do que fazer — no tom da marca descrito acima.
- "evidencias": número de menções que sustentam o insight.

Retorne APENAS JSON, sem markdown:
{"insights":[{"tipo":"elogio|atrito|oportunidade|tema|alerta","titulo":"<70chars>","insight":"<300chars>","acao":"<200chars>","persona":"<nome ou null>","evidencias":<n>}]}`

  let insights
  try {
    const { text } = await callAI({
      model: isDev() ? MODELS.medium : MODELS.smart,
      maxTokens: 3000, retries: 1, retryDelay: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    insights = extractJSON(text)?.insights
  } catch (e) {
    console.error('[insights]', e.message)
    return { statusCode: 200, body: JSON.stringify({ status: 'llm_error', inseridos: 0 }) }
  }
  if (!Array.isArray(insights) || !insights.length)
    return { statusCode: 200, body: JSON.stringify({ status: 'vazio', inseridos: 0 }) }

  const batch_id = randomUUID()
  const { error: insErr } = await supabase.from('consumer_insights').insert(
    insights.slice(0, 8).filter(i => i?.titulo && i?.insight).map(i => ({
      workspace_id, batch_id,
      tipo:       TIPOS.includes(i.tipo) ? i.tipo : 'tema',
      titulo:     String(i.titulo).slice(0, 140),
      insight:    String(i.insight).slice(0, 600),
      acao:       i.acao ? String(i.acao).slice(0, 400) : null,
      persona:    i.persona ? String(i.persona).slice(0, 80) : null,
      evidencias: Number.isFinite(i.evidencias) ? i.evidencias : null,
    })))
  if (insErr) { console.error('[insights] insert:', insErr.message); return { statusCode: 200, body: JSON.stringify({ status: 'insert_error', inseridos: 0 }) } }

  console.log(`[insights] ws ${workspace_id}: ${insights.length} insights (lote ${batch_id})`)
  return { statusCode: 200, body: JSON.stringify({ status: 'ok', inseridos: insights.length }) }
}
