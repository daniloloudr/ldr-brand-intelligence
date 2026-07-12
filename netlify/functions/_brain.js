// ════════════════════════════════════════════════════════════════════
// _brain.js — O CÉREBRO DE MARCA (Camada de Inteligência) como módulo único.
// É o IP do produto: as superfícies (Studio, Assistant, Content, Posicionamento)
// são clientes finos; a borda (_ai.js, _embed.js) é commodity trocável.
//
// As operações:
//   ingest   → emitSignal()               grava brand_signals por código
//                                         (sinais de uso nascem de triggers — migration 025)
//   distill  → distillBrand()             sinais + versão atual → próxima versão do modelo vivo
//   search   → searchBrandKnowledge()     RAG: brand book digitado + "intel:" aprendido
//   context  → resolveBrandIntelligence() porta ÚNICA de contexto p/ toda IA de borda
//   dataset  → fetchDataset()             exemplos julgados (contexto → output → avaliação);
//                                         captura é automática via triggers (migration 029)
//
// Spec: .spec/features/brand-intelligence.md
// ════════════════════════════════════════════════════════════════════
import { callAI, MODELS, isDev, extractJSON } from './_ai.js'
import { voyageEmbed, embedIntelChunks } from './_embed.js'

// ── Contexto (read) ──────────────────────────────────────────────────
const arr = x => Array.isArray(x) ? x.filter(Boolean) : (x ? [x] : [])

// facets controla quais facetas da marca entram no contexto: { verbal, visual }.
// Default = ambas (compat). No Workflow, nós Brand Voice/Brand Visual escolhem.
export function compileBrandContext({ brandBook, tokens, brandNome, facets }) {
  const useVerbal = facets ? !!facets.verbal : true
  const useVisual = facets ? !!facets.visual : true
  const v  = brandBook?.verbal_identity || {}
  const vi = brandBook?.visual_identity || {}

  const cores = (tokens || [])
    .filter(t => /^color/i.test(t.nome || '') || t.categoria === 'color')
    .map(t => t.valor).filter(Boolean)
  const paleta = arr(vi.paleta).map(p => p?.hex || p?.valor || p).filter(Boolean)
  const todasCores = [...new Set([...paleta, ...cores])].slice(0, 8)

  const personalidade = [...new Set([...arr(v.personalidade), ...arr(v.tom_atributos)].filter(Boolean))]
  const tipografia = [vi.tipo_principal_nome, vi.tipo_secundario_nome, vi.tipo_display].filter(Boolean)
  const estetica = [vi.foto_mood, vi.foto_luz_edicao, vi.foto_enquadramento, vi.ilustracao_estilo, vi.icone_estilo].filter(Boolean)
  const evitar = [
    ...(useVerbal ? [v.tom_evitar] : []),
    ...(useVisual ? [arr(vi.usos_proibidos).join('; '), arr(vi.foto_dont).join('; ')] : []),
  ].filter(Boolean)

  // Strategy (Onda 2): personas e narrativa afiam o alvo de toda geração
  const st = brandBook?.strategy || {}
  const personas = (Array.isArray(st.personas) ? st.personas : [])
    .filter(p => p?.nome).slice(0, 3)
    .map(p => `${p.nome}${p.dores ? ` (dor: ${String(p.dores).slice(0, 80)})` : ''}`)

  const linhas = []
  linhas.push(`Marca: ${brandNome || ''}`)
  if (useVerbal && (v.posicionamento || v.proposta_valor)) linhas.push(`Posicionamento: ${v.posicionamento || v.proposta_valor}`)
  if (useVerbal && personalidade.length) linhas.push(`Personalidade: ${personalidade.join(', ')} — a peça deve transmitir isso`)
  if (useVerbal && v.tom_voz) linhas.push(`Tom: ${v.tom_voz}`)
  if (useVerbal && personas.length) linhas.push(`Personas-alvo: ${personas.join(' · ')}`)
  if (useVerbal && st.storytelling_overview) linhas.push(`Narrativa da marca: ${String(st.storytelling_overview).slice(0, 240)}`)
  if (useVisual && todasCores.length) linhas.push(`Paleta (use como cores dominantes): ${todasCores.join(', ')}`)
  if (useVisual && tipografia.length) linhas.push(`Tipografia (se houver texto): ${tipografia.join(', ')}`)
  if (useVisual && estetica.length) linhas.push(`Estética visual: ${estetica.join('; ')}`)
  if (evitar.length) linhas.push(`Evitar: ${evitar.join('; ')}`)

  const prefix = `[BRAND CONTEXT]\n${linhas.join('\n')}`
  const snapshot = { facets: { verbal: useVerbal, visual: useVisual }, verbal: v, visual: vi, cores: todasCores, personalidade, tipografia, estetica }
  return { prefix, snapshot }
}

/** Lê brand_book (linha mais recente) + tokens e compila o brand context. */
export async function resolveBrandContext(supabase, brand_id, brandNome, facets) {
  const [{ data: bbRows }, { data: tokens }] = await Promise.all([
    supabase.from('brand_books').select('verbal_identity, visual_identity, strategy')
      .eq('brand_id', brand_id).order('updated_at', { ascending: false }).limit(1),
    supabase.from('design_tokens').select('nome, valor, categoria').eq('brand_id', brand_id),
  ])
  return compileBrandContext({ brandBook: bbRows?.[0] || null, tokens, brandNome, facets })
}

// Compila o modelo vivo (destilado) em linhas acionáveis para o prompt de geração.
function compileIntelligence(m) {
  const lines = []
  if (m?.territorio?.valor) lines.push(`Território da marca (aprendido): ${m.territorio.valor}`)
  const pv = m?.preferencias_visuais || {}
  const aprov  = (pv.aprovado  || []).map(a => a?.padrao).filter(Boolean)
  const reprov = (pv.reprovado || []).map(a => a?.padrao).filter(Boolean)
  if (aprov.length)  lines.push(`Padrões que a marca APROVA (priorize): ${aprov.join('; ')}`)
  if (reprov.length) lines.push(`Padrões que a marca REPROVA (evite): ${reprov.join('; ')}`)
  if (pv.modelo_preferido?.provider) lines.push(`Estilo/modelo que mais performa: ${pv.modelo_preferido.provider}`)
  const dos   = (m?.do_dont?.do   || []).filter(Boolean)
  const donts = (m?.do_dont?.dont || []).filter(Boolean)
  if (dos.length)   lines.push(`Faça: ${dos.join('; ')}`)
  if (donts.length) lines.push(`Não faça: ${donts.join('; ')}`)
  const ct = m?.conteudo || {}
  if (ct.temas?.length)   lines.push(`Temas de conteúdo que a marca usa: ${ct.temas.join('; ')}`)
  if (ct.angulos?.length) lines.push(`Ângulos que funcionam: ${ct.angulos.join('; ')}`)
  const fatos = (m?.fatos || []).filter(f => f?.fato && (f.confianca ?? 1) >= 0.5).map(f => f.fato)
  if (fatos.length) lines.push(`Fatos consolidados: ${fatos.join('; ')}`)
  return lines.length ? lines.join('\n') : null
}

// Porta ÚNICA de contexto de marca: brand context estático + o modelo vivo
// destilado dos brand_signals (última versão) → realimenta a geração.
// Trocar modelo de borda nunca toca aqui. Spec: brand-intelligence.md
export async function resolveBrandIntelligence(supabase, brand_id, brandNome, facets) {
  const base = await resolveBrandContext(supabase, brand_id, brandNome, facets)
  const { data: bi } = await supabase.from('brand_intelligence')
    .select('versao, modelo').eq('brand_id', brand_id)
    .order('versao', { ascending: false }).limit(1).maybeSingle()
  const learned = bi?.modelo ? compileIntelligence(bi.modelo) : null
  if (!learned) return base
  return {
    prefix: `${base.prefix}\n\n[INTELIGÊNCIA DA MARCA — aprendido com o uso (v${bi.versao})]\n${learned}`,
    snapshot: { ...base.snapshot, intelligence_versao: bi.versao },
  }
}

// ── Ingestão (write) ─────────────────────────────────────────────────
// Porta única p/ emitir um sinal por código. Os sinais de uso (votos, verdicts,
// diagnósticos, sentiment, edições) nascem de triggers no banco (migration 025);
// isto cobre o que não passa por tabela com trigger (clipping, concorrentes…).
export async function emitSignal(supabase, { brand_id, workspace_id, tipo, fonte, ref_id = null, peso = 1, payload = {} }) {
  const { error } = await supabase.from('brand_signals').insert({
    brand_id, workspace_id, tipo, fonte, ref_id, peso, payload,
  })
  return { error }
}

// ── Busca (read semântico) ───────────────────────────────────────────
// Top-N semântico sobre brand_book_chunks — une o brand book digitado e os
// chunks "intel:" do modelo vivo (mesma tabela, mesma RPC). Falha de embedding
// degrada para [] em vez de propagar.
export async function searchBrandKnowledge(supabase, brand_id, query, limit = 5) {
  const { count } = await supabase.from('brand_book_chunks')
    .select('id', { count: 'exact', head: true }).eq('brand_id', brand_id)
  if (!count) return []

  let embedding
  try { [embedding] = await voyageEmbed([query]) } catch { return [] }

  const { data: chunks } = await supabase.rpc('match_brand_book_chunks', {
    p_brand_id:  brand_id,
    p_embedding: embedding,
    p_limit:     limit,
  })
  return chunks || []
}

// ── Dataset (contexto → output → avaliação humana) ──────────────────
// Leitura canônica dos exemplos julgados de uma marca (migration 029; a
// captura é 100% via triggers). É o insumo do fine-tune por tenant no futuro
// e de painéis de qualidade — nunca escreva aqui por código.
export async function fetchDataset(supabase, brand_id, { superficie = null, limit = 200 } = {}) {
  let q = supabase.from('brand_dataset')
    .select('id, created_at, superficie, contexto, output, avaliacao, schema_versao')
    .eq('brand_id', brand_id).order('created_at', { ascending: false }).limit(limit)
  if (superficie) q = q.eq('superficie', superficie)
  const { data } = await q
  return data || []
}

// ── Taxonomia do modelo vivo ─────────────────────────────────────────
// O LLM propõe; o código GARANTE o shape. Toda versão gravada passa por aqui:
// facetas conhecidas, tipos coagidos, confianças em [0,1], listas com teto.
// Consumidores (compileIntelligence, intelChunks, painéis) podem confiar.
const clamp01 = n => (typeof n === 'number' && isFinite(n)) ? Math.min(1, Math.max(0, n)) : null
const str     = (x, max) => (typeof x === 'string' ? x.trim().slice(0, max) : '')
const strList = (x, max, len) => (Array.isArray(x) ? x : [])
  .map(i => typeof i === 'string' ? i : str(i?.valor || i?.fato || i?.padrao || i?.tema || '', len))
  .map(t => (t || '').trim().slice(0, len)).filter(Boolean).slice(0, max)

function facetTexto(f, max = 600) {
  const valor = str(f?.valor ?? f, max)
  if (!valor) return null
  return { valor, confianca: clamp01(f?.confianca) ?? 0.5, fontes: strList(f?.fontes, 8, 60) }
}

export function normalizeModelo(raw) {
  const m = raw && typeof raw === 'object' ? raw : {}
  const pv = m.preferencias_visuais || {}
  const padroes = (arr, comExemplos) => (Array.isArray(arr) ? arr : []).map(a => {
    const padrao = str(a?.padrao ?? a, 300)
    if (!padrao) return null
    const out = { padrao, confianca: clamp01(a?.confianca) ?? 0.5 }
    if (comExemplos) out.exemplos = strList(a?.exemplos, 5, 200)
    return out
  }).filter(Boolean).slice(0, 15)
  const fatos = (Array.isArray(m.fatos) ? m.fatos : []).map(f => {
    const fato = str(f?.fato ?? f, 400)
    if (!fato) return null
    return { fato, confianca: clamp01(f?.confianca) ?? 0.5, fontes: strList(f?.fontes, 8, 60) }
  }).filter(Boolean).slice(0, 30)
  const ct = m.conteudo || {}
  return {
    posicionamento: facetTexto(m.posicionamento),
    voz:            facetTexto(m.voz),
    territorio:     facetTexto(m.territorio),
    preferencias_visuais: {
      aprovado:  padroes(pv.aprovado, true),
      reprovado: padroes(pv.reprovado, false),
      modelo_preferido: pv.modelo_preferido?.provider
        ? { provider: str(pv.modelo_preferido.provider, 80), win_rate: clamp01(pv.modelo_preferido.win_rate) }
        : null,
    },
    do_dont: { do: strList(m.do_dont?.do, 20, 300), dont: strList(m.do_dont?.dont, 20, 300) },
    conteudo: {
      temas:     strList(ct.temas, 15, 120),
      formatos:  strList(ct.formatos, 8, 40),
      angulos:   strList(ct.angulos, 10, 200),
      confianca: clamp01(ct.confianca),
    },
    fatos,
  }
}

// ── Destilação ───────────────────────────────────────────────────────
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
    // clipping: movimentos recentes do concorrente (notícias/menções por ciclo)
    if (Array.isArray(p.movimentos) && p.movimentos.length) {
      const mv = p.movimentos.map(m => `${m.titulo}${m.score_impacto ? ` (impacto ${m.score_impacto}${m.sentiment ? `, ${m.sentiment}` : ''})` : ''}`).join(' | ')
      return `[CONCORRENTE: ${p.concorrente || '?'} — MOVIMENTOS RECENTES] ${mv}`
    }
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
  if (s.tipo === 'content_used')
    return `[conteúdo ADOTADO pelo time] ${p.item_tipo === 'ideia' ? 'ideia' : 'keyword'}="${(p.titulo || '').slice(0, 120)}" formato=${p.formato || '?'} intenção=${p.intencao || '?'} briefing="${(p.briefing || '').slice(0, 400)}"`
  if (s.tipo === 'writing_edit')
    return `[COPY REESCRITA PELO TIME — ensino de voz] seção="${p.secao || '?'}" formato=${p.formato || '?'} · a IA escreveu: "${(p.original || '').slice(0, 300)}" · o time preferiu: "${(p.edicao || '').slice(0, 400)}"`
  if (s.tipo === 'image_regen')
    return `[REGENERADO — reprovação implícita] provider=${p.provider || '?'} formato=${p.formato || '?'} tipo=${p.media_type || 'image'}${p.ajuste ? ` · o usuário pediu para ajustar: "${p.ajuste}"` : ''} prompt="${(p.prompt || '').slice(0, 300)}" (ref:${s.ref_id})`
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
  '- writing_edit = o time REESCREVEU um trecho de copy gerado. Aprenda com a DIFERENÇA entre o que a IA escreveu e o que o humano preferiu — é ensino direto de voz e estilo (quase tão forte quanto assistant_correction); alimenta voz, do_dont e conteudo.',
  '- image_regen = o usuário REGENEROU uma peça sem votar — reprovação IMPLÍCITA, mais fraca que um 👎 explícito (pese menos no win-rate e nas preferências). Quando houver "ajuste", ele diz EXATAMENTE o que faltou — trate como correção direcionada de alta relevância para as preferências visuais.',
  '- do_dont e fatos: extraia de diagnósticos, veredictos e edições. Cite as fontes (tipos de sinal) em "fontes".',
  '- territorio: o território de posicionamento que a MARCA deve reivindicar — derive de diagnostic (territórios possíveis) cruzado com competitive (não reivindique espaço dominado por concorrente; prefira espaço livre).',
  '- conteudo: derive de content_used e campanhas aprovadas — os TEMAS, formatos e ângulos de conteúdo que o time realmente adota. Se não houver sinal de conteúdo, deixe as listas vazias.',
  '- assistant_correction é ENSINO HUMANO EXPLÍCITO (o time corrigindo o Brand Assistant) — trate como sinal de ALTÍSSIMA prioridade e confiança para voz, posicionamento, do_dont e fatos; sobrepõe inferências mais fracas e vence empates de recência.',
  '- content_used = o time ADOTOU um conteúdo/briefing gerado (copiou pra usar). Aprenda com ele os TEMAS, formatos e ângulos de conteúdo que a marca realmente usa — alimenta voz, do_dont e fatos de território de conteúdo.',
  '- trend = tendências do SETOR (radar de mercado, não a marca). Use como contexto leve: pode alimentar "conteudo" (temas/ângulos em ascensão que combinam com a marca) e "fatos" de mercado. Peso baixo — nunca deixe tendência sobrepor ensino humano ou votos.',
  '- competitive descreve CONCORRENTES e o mercado (NÃO a sua marca). Use para AFIAR A DIFERENCIAÇÃO: registre em "fatos" onde cada concorrente se posiciona e quais territórios ele reivindica; em "do_dont" derive movimentos de diferenciação (ex.: não reforçar um território já dominado por concorrente; ocupar espaço livre que nenhum concorrente reivindica); pode calibrar "posicionamento" para o que diferencia. NUNCA atribua atributos/territórios do concorrente à própria marca.',
  '- NÃO invente: baseie tudo nos sinais + no brand book. Seja conciso e de alto sinal. Preserve conhecimento anterior ainda válido (com sua confiança recalibrada).',
  'Responda APENAS com JSON estrito neste schema (sem markdown, sem comentário):',
  '{"posicionamento":{"valor":"","confianca":0,"fontes":[]},"voz":{"valor":"","confianca":0,"fontes":[]},"territorio":{"valor":"","confianca":0,"fontes":[]},"preferencias_visuais":{"aprovado":[{"padrao":"","confianca":0,"exemplos":[]}],"reprovado":[{"padrao":"","confianca":0}],"modelo_preferido":{"provider":"","win_rate":0}},"do_dont":{"do":[],"dont":[]},"conteudo":{"temas":[],"formatos":[],"angulos":[],"confianca":0},"fatos":[{"fato":"","confianca":0,"fontes":[]}]}',
].join('\n')

/**
 * Destila a próxima versão do modelo vivo de uma marca.
 * Lê brand_signals não-consumidos + versão atual → LLM → grava brand_intelligence
 * → marca sinais consumidos → re-deriva o RAG. Idempotente pelo consumido_em.
 * Retorna um resultado discriminado (sem HTTP — o caller mapeia):
 *   { status: 'ok', versao, sinais } | { status: 'not_found' | 'no_signals' | 'invalid' }
 *   | { status: 'llm_error' | 'insert_error', message }
 */
export async function distillBrand(supabase, brand_id) {
  // 1. sinais não-consumidos + versão atual + brand book (grounding)
  const [{ data: signals }, { data: brand }, { data: atual }] = await Promise.all([
    supabase.from('brand_signals').select('id, tipo, ref_id, payload, peso, created_at, workspace_id')
      .eq('brand_id', brand_id).is('consumido_em', null).order('created_at', { ascending: true }).limit(MAX_SIGNALS),
    supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single(),
    supabase.from('brand_intelligence').select('versao, modelo, created_at').eq('brand_id', brand_id).order('versao', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!brand) return { status: 'not_found' }
  if (!signals?.length) return { status: 'no_signals' }

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
      maxTokens: 6000, retries: 1, retryDelay: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    })
    modelo = extractJSON(text)
    if (!modelo || typeof modelo !== 'object')
      console.error('[distill] JSON inválido — fim da resposta:', (text || '').slice(-300))
  } catch (e) {
    console.error('[distill] LLM falhou:', e.message)
    return { status: 'llm_error', message: e.message }
  }
  if (!modelo || typeof modelo !== 'object') return { status: 'invalid' }
  modelo = normalizeModelo(modelo)   // taxonomia garantida por código, não pelo LLM

  // Métrica de assertividade: desempenho OBSERVADO sob a versão anterior —
  // approval das peças votadas desde a última destilação. É a série que prova
  // que o cérebro evolui (não só que muda). Não-fatal.
  let metricas = null
  try {
    let q = supabase.from('studio_generations').select('feedback')
      .eq('brand_id', brand_id).not('feedback', 'is', null)
    if (atual?.created_at) q = q.gte('feedback_at', atual.created_at)
    const { data: votos } = await q
    const total = votos?.length || 0
    const ups = (votos || []).filter(v => v.feedback === 'up').length
    metricas = {
      approval_sob_versao_anterior: total ? ups / total : null,
      votos_janela: total,
      janela_inicio: atual?.created_at || null,
    }
  } catch (e) { console.error('[distill] metricas falharam (não-fatal):', e.message) }

  // 3. grava nova versão
  const versao = (atual?.versao || 0) + 1
  const signalIds = signals.map(s => s.id)
  const { error: insErr } = await supabase.from('brand_intelligence').insert({
    brand_id, workspace_id: brand.workspace_id, versao, modelo,
    confianca_media: avgConfianca(modelo),
    gerado_de: { count: signals.length, tipos, signal_ids: signalIds },
    metricas,
  })
  if (insErr) { console.error('[distill] insert falhou:', insErr.message); return { status: 'insert_error', message: insErr.message } }

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
  return { status: 'ok', versao, sinais: signals.length }
}
