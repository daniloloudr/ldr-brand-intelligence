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
import { embedIntelChunks } from './_embed.js'

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

// Corpo compacto de um sinal para o LLM (sem os metadados de recência/peso)
function fmtSignalBody(s) {
  const p = s.payload || {}
  if (s.tipo === 'image_vote')
    return `[voto ${p.voto === 'up' ? '👍 APROVADO' : '👎 REPROVADO'}] provider=${p.provider || '?'} formato=${p.formato || '?'} tipo=${p.media_type || 'image'} prompt="${(p.prompt || '').slice(0, 400)}" (ref:${s.ref_id})`
  if (s.tipo === 'campaign_verdict')
    return `[campanha ${p.status}] conceito="${(p.conceito || '').slice(0, 400)}" formatos=${JSON.stringify(p.formatos || [])}`
  if (s.tipo === 'diagnostic') {
    const terr = Array.isArray(p.territorios) && p.territorios.length
      ? ' · territórios possíveis: ' + p.territorios.map(t => `${t.nome}${t.confianca ? ` (${t.confianca})` : ''} — ${(t.tese || '').slice(0, 160)}`).join(' | ')
      : (p.territorio_legado ? ` · território: ${p.territorio_legado}` : '')
    return `[diagnóstico] singularidade=${p.score_singularidade} consistencia=${p.score_consistencia} posicionamento=${p.score_posicionamento} "${(p.frase || '').slice(0, 300)}"${terr}`
  }
  if (s.tipo === 'competitive') {
    const terr = Array.isArray(p.territorios) && p.territorios.length
      ? ' · territórios que ELE reivindica: ' + p.territorios.map(t => `${t.nome}${t.confianca ? ` (${t.confianca})` : ''}`).join(' | ')
      : ''
    return `[CONCORRENTE: ${p.concorrente || '?'}] singularidade=${p.score_singularidade} consistencia=${p.score_consistencia} posicionamento=${p.score_posicionamento} "${(p.frase || '').slice(0, 200)}"${terr}`
  }
  if (s.tipo === 'listening_sentiment')
    return `[sentimento] +${p.avg_positivo} =${p.avg_neutro} -${p.avg_negativo} (${p.total_mencoes} menções, ${p.periodo || ''})`
  if (s.tipo === 'brandbook_edit')
    return `[edição do brand book pelo time] (${p.acao})`
  if (s.tipo === 'assistant_correction')
    return `[ENSINO EXPLÍCITO DO TIME no Brand Assistant] pergunta="${(p.pergunta || '').slice(0, 200)}" · o time CORRIGIU/ENSINOU: "${(p.correcao || '').slice(0, 500)}"`
  return `[${s.tipo}] ${JSON.stringify(p).slice(0, 300)}`
}

// Anota cada sinal com RECÊNCIA + PESO para o destilador ponderar (trilho C).
function fmtSignal(s, now) {
  const dias = s.created_at ? Math.max(0, Math.round((now - new Date(s.created_at)) / 86400000)) : null
  const quando = dias === null ? 'há ?d' : dias === 0 ? 'hoje' : `há ${dias}d`
  return `{${quando}, peso ${s.peso ?? 1}} ${fmtSignalBody(s)}`
}

const SYSTEM = [
  'Você é o DESTILADOR de inteligência de marca do LOUDR. Você mantém um MODELO VIVO, estruturado, de uma marca — que fica mais assertivo conforme evidências se acumulam.',
  'Recebe: (a) o MODELO ATUAL (pode estar vazio) e (b) SINAIS NOVOS (votos em peças geradas, veredictos de campanha, diagnósticos, diagnósticos de CONCORRENTES, sentimento, edições do brand book).',
  'Produz a PRÓXIMA versão do modelo. Regras:',
  '- CONFIANÇA POR FACETA: cada faceta (posicionamento, voz, cada preferência visual, cada do/dont, cada fato) tem confiança PRÓPRIA (0 a 1). Calibre uma a uma pela força, quantidade e recência das evidências DAQUELA faceta — nunca um número global chutado.',
  '- Aumente a confiança quando vários sinais se corroboram; diminua quando se contradizem.',
  '- RECÊNCIA: cada sinal vem anotado com {quando, peso}. Sinais mais RECENTES e de MAIOR peso têm precedência. Ao ponderar evidências, combine recência × peso.',
  '- CONTRADIÇÃO: quando sinais se contradizem entre si OU contradizem o MODELO ATUAL, NÃO faça média cega. Prevalece o lado mais recente + de maior peso + ensino explícito. Ao lado perdedor, NÃO apague conhecimento útil — rebaixe a confiança e, se relevante, registre a ressalva no próprio "valor"/"fato".',
  '- DECAIMENTO: se o MODELO ATUAL afirma algo que os sinais novos contradizem, ou que já não é corroborado, REDUZA sua confiança em vez de mantê-la. Só permanece alta a confiança do que é recente e reforçado.',
  '- preferencias_visuais: derive de image_vote — padrões que recebem 👍 vão em "aprovado" (com exemplos = refs); 👎 em "reprovado". Calcule modelo_preferido.win_rate por provider (aprovações/total do provider). Votos recentes pesam mais que antigos.',
  '- do_dont e fatos: extraia de diagnósticos, veredictos e edições. Cite as fontes (tipos de sinal) em "fontes".',
  '- assistant_correction é ENSINO HUMANO EXPLÍCITO (o time corrigindo o Brand Assistant) — trate como sinal de ALTÍSSIMA prioridade e confiança para voz, posicionamento, do_dont e fatos; sobrepõe inferências mais fracas e vence empates de recência.',
  '- competitive descreve CONCORRENTES e o mercado (NÃO a sua marca). Use para AFIAR A DIFERENCIAÇÃO: registre em "fatos" onde cada concorrente se posiciona e quais territórios ele reivindica; em "do_dont" derive movimentos de diferenciação (ex.: não reforçar um território já dominado por concorrente; ocupar espaço livre que nenhum concorrente reivindica); pode calibrar "posicionamento" para o que diferencia. NUNCA atribua atributos/territórios do concorrente à própria marca.',
  '- NÃO invente: baseie tudo nos sinais + no brand book. Seja conciso e de alto sinal. Preserve conhecimento anterior ainda válido (com sua confiança recalibrada).',
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
    supabase.from('brand_signals').select('id, tipo, ref_id, payload, peso, created_at, workspace_id')
      .eq('brand_id', brand_id).is('consumido_em', null).order('created_at', { ascending: true }).limit(MAX_SIGNALS),
    supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single(),
    supabase.from('brand_intelligence').select('versao, modelo').eq('brand_id', brand_id).order('versao', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!brand) return { statusCode: 404 }
  if (!signals?.length) return { statusCode: 200, body: 'sem sinais novos' }

  const { prefix: brandBook } = await resolveBrandContext(supabase, brand_id, brand.nome)

  // 2. destila
  const now = Date.now()
  const tipos = {}
  for (const s of signals) tipos[s.tipo] = (tipos[s.tipo] || 0) + 1
  const content = [
    `[BRAND BOOK — base estática]\n${brandBook}`,
    `\n[MODELO ATUAL v${atual?.versao || 0}]\n${JSON.stringify(atual?.modelo || {}, null, 0)}`,
    `\n[SINAIS NOVOS — ${signals.length}, do mais antigo ao mais recente; {quando, peso} anota recência e força]\n${signals.map(s => fmtSignal(s, now)).join('\n')}`,
    '\nDestile a próxima versão do modelo (JSON estrito), aplicando recência, resolução de contradição e confiança por faceta.',
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

  // 5. RAG re-derivado do modelo vivo (trilho B): o Assistant passa a recuperar
  //    semanticamente o que a marca APRENDEU, não só o brand book digitado.
  //    Falha aqui não invalida a destilação já gravada.
  try {
    const n = await embedIntelChunks(supabase, brand_id, modelo)
    console.log(`[distill] RAG re-derivado: ${n} chunks do modelo vivo`)
  } catch (e) {
    console.error('[distill] embed do modelo vivo falhou (não-fatal):', e.message)
  }

  console.log(`[distill] marca ${brand_id} → v${versao} (${signals.length} sinais, conf ${avgConfianca(modelo)?.toFixed(2)})`)
  return { statusCode: 200, body: JSON.stringify({ versao, sinais: signals.length }) }
}
