// ════════════════════════════════════════════════════════════════════
// brand-distill-background.js — O CÉREBRO da Camada de Inteligência (Fase 1)
// Lê brand_signals não-consumidos + a versão atual do modelo vivo → destila a
// PRÓXIMA versão (LLM) → grava em brand_intelligence → marca sinais consumidos.
// Background function: sem limite de 30s. Idempotente pelo consumido_em.
// Spec: specs/features/brand-intelligence.md §2/§3.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { callAI, MODELS, isDev, extractJSON } from './_ai.js'
import { resolveBrandContext } from './_studio.js'

const MAX_SIGNALS = 150   // teto de sinais por destilação

// Coleta recursiva de todos os campos de confiança do modelo → média de assertividade
function avgConfianca(obj, acc = []) {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if ((k === 'confianca' || k === 'confidence') && typeof v === 'number') acc.push(v)
      else avgConfianca(v, acc)
    }
  }
  return acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : null
}

// Texto compacto de um sinal para o LLM
function fmtSignal(s) {
  const p = s.payload || {}
  if (s.tipo === 'image_vote')
    return `[voto ${p.voto === 'up' ? '👍 APROVADO' : '👎 REPROVADO'}] provider=${p.provider || '?'} formato=${p.formato || '?'} tipo=${p.media_type || 'image'} prompt="${(p.prompt || '').slice(0, 400)}" (ref:${s.ref_id})`
  if (s.tipo === 'campaign_verdict')
    return `[campanha ${p.status}] conceito="${(p.conceito || '').slice(0, 400)}" formatos=${JSON.stringify(p.formatos || [])}`
  if (s.tipo === 'diagnostic')
    return `[diagnóstico] singularidade=${p.score_singularidade} consistencia=${p.score_consistencia} posicionamento=${p.score_posicionamento} "${(p.frase || '').slice(0, 300)}"`
  if (s.tipo === 'listening_sentiment')
    return `[sentimento] +${p.avg_positivo} =${p.avg_neutro} -${p.avg_negativo} (${p.total_mencoes} menções, ${p.periodo || ''})`
  if (s.tipo === 'brandbook_edit')
    return `[edição do brand book pelo time] (${p.acao})`
  return `[${s.tipo}] ${JSON.stringify(p).slice(0, 300)}`
}

const SYSTEM = [
  'Você é o DESTILADOR de inteligência de marca do LOUDR. Você mantém um MODELO VIVO, estruturado, de uma marca — que fica mais assertivo conforme evidências se acumulam.',
  'Recebe: (a) o MODELO ATUAL (pode estar vazio) e (b) SINAIS NOVOS (votos em peças geradas, veredictos de campanha, diagnósticos, sentimento, edições do brand book).',
  'Produz a PRÓXIMA versão do modelo. Regras:',
  '- Aumente a confiança (0 a 1) quando vários sinais se corroboram; diminua/remova quando se contradizem.',
  '- preferencias_visuais: derive de image_vote — padrões que recebem 👍 vão em "aprovado" (com exemplos = refs); 👎 em "reprovado". Calcule modelo_preferido.win_rate por provider (aprovações/total do provider).',
  '- do_dont e fatos: extraia de diagnósticos, veredictos e edições. Cite as fontes (tipos de sinal) em "fontes".',
  '- NÃO invente: baseie tudo nos sinais + no brand book. Seja conciso e de alto sinal. Preserve conhecimento anterior ainda válido.',
  'Responda APENAS com JSON estrito neste schema (sem markdown, sem comentário):',
  '{"posicionamento":{"valor":"","confianca":0,"fontes":[]},"voz":{"valor":"","confianca":0,"fontes":[]},"preferencias_visuais":{"aprovado":[{"padrao":"","confianca":0,"exemplos":[]}],"reprovado":[{"padrao":"","confianca":0}],"modelo_preferido":{"provider":"","win_rate":0}},"do_dont":{"do":[],"dont":[]},"fatos":[{"fato":"","confianca":0,"fontes":[]}]}',
].join('\n')

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }
  const { brand_id } = body
  if (!brand_id) return { statusCode: 400 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // 1. sinais não-consumidos + versão atual + brand book (grounding)
  const [{ data: signals }, { data: brand }, { data: atual }] = await Promise.all([
    supabase.from('brand_signals').select('id, tipo, ref_id, payload, peso, workspace_id')
      .eq('brand_id', brand_id).is('consumido_em', null).order('created_at', { ascending: true }).limit(MAX_SIGNALS),
    supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single(),
    supabase.from('brand_intelligence').select('versao, modelo').eq('brand_id', brand_id).order('versao', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!brand) return { statusCode: 404 }
  if (!signals?.length) return { statusCode: 200, body: 'sem sinais novos' }

  const { prefix: brandBook } = await resolveBrandContext(supabase, brand_id, brand.nome)

  // 2. destila
  const tipos = {}
  for (const s of signals) tipos[s.tipo] = (tipos[s.tipo] || 0) + 1
  const content = [
    `[BRAND BOOK — base estática]\n${brandBook}`,
    `\n[MODELO ATUAL v${atual?.versao || 0}]\n${JSON.stringify(atual?.modelo || {}, null, 0)}`,
    `\n[SINAIS NOVOS — ${signals.length}]\n${signals.map(fmtSignal).join('\n')}`,
    '\nDestile a próxima versão do modelo (JSON estrito).',
  ].join('\n')

  let modelo
  try {
    const { text } = await callAI({
      model: isDev() ? MODELS.medium : MODELS.smart,
      maxTokens: 4000, retries: 1, retryDelay: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    })
    modelo = extractJSON(text)
  } catch (e) {
    console.error('[distill] LLM falhou:', e.message)
    return { statusCode: 502, body: e.message }
  }
  if (!modelo || typeof modelo !== 'object') return { statusCode: 502, body: 'destilação inválida' }

  // 3. grava nova versão
  const versao = (atual?.versao || 0) + 1
  const signalIds = signals.map(s => s.id)
  const { error: insErr } = await supabase.from('brand_intelligence').insert({
    brand_id, workspace_id: brand.workspace_id, versao, modelo,
    confianca_media: avgConfianca(modelo),
    gerado_de: { count: signals.length, tipos, signal_ids: signalIds },
  })
  if (insErr) { console.error('[distill] insert falhou:', insErr.message); return { statusCode: 500, body: insErr.message } }

  // 4. marca sinais consumidos (idempotência)
  await supabase.from('brand_signals').update({ consumido_em: new Date().toISOString() }).in('id', signalIds)

  console.log(`[distill] marca ${brand_id} → v${versao} (${signals.length} sinais, conf ${avgConfianca(modelo)?.toFixed(2)})`)
  return { statusCode: 200, body: JSON.stringify({ versao, sinais: signals.length }) }
}
