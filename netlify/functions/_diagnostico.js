// _diagnostico.js — geração de diagnóstico reutilizável (concorrentes + futuros).
// Usa o MESMO caminho robusto do diagnostico-gerar-background: STREAMING + premium
// + retry. Streaming evita o hang da chamada longa com web_search na Lambda.
import { streamAI, aiConfig, extractJSON } from './_ai.js'
import { SYSTEM_PROMPT } from './_prompt.js'
import { emitSignal } from './_brain.js'
import { alvoDoDiagnostico, instrucaoDeIdentidade, conferirIdentidade } from './_identidade.js'

const MAX_ATTEMPTS = 2

// Gera o JSON do diagnóstico. `alvo` é {nome, dominio} — o domínio é o
// identificador definitivo e vai ao modelo junto com a instrução de identidade.
// Aceita string por compatibilidade com chamadas antigas.
// Lança em falha, inclusive em falha de IDENTIFICAÇÃO: concorrente trocado
// envenena o sinal competitivo do cérebro, que é permanente.
export async function gerarDiagnostico(alvo, contexto, rastreio = {}) {
  const sujeito = typeof alvo === 'string' ? { nome: alvo } : (alvo || {})
  const { model, modeloReserva, tools, maxTokens } = aiConfig('premium')
  const msg = `Diagnóstico Smart Branding para: "${alvoDoDiagnostico(sujeito)}".`
    + `${contexto ? `\nContexto: ${contexto}` : ''}`
    + instrucaoDeIdentidade(sujeito)
    + `\nGere o JSON completo.`
  let lastErr = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await streamAI({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: msg }],
        model, modeloReserva, tools, maxTokens,
        // `rastreio` carrega supabase/workspace_id de quem chamou. Diagnóstico
        // de concorrente é custo DO CLIENTE que pediu a comparação.
        ...rastreio,
        idleMs: 120000, // 2 min sem chunk = stream morto
      })
      const parsed = extractJSON(text)
      if (parsed) {
        // Mesma guarda do diagnóstico da própria marca. Aqui ela pesa ainda
        // mais: concorrente trocado vira `emitSignal` de tipo competitive, e
        // sinal do cérebro é permanente — o erro deixa de ser um relatório
        // ruim e passa a ser aprendizado errado sobre o mercado do cliente.
        const conf = conferirIdentidade(sujeito, parsed)
        if (!conf.ok) {
          lastErr = `identidade recusada — ${conf.motivo} (esperado ${conf.esperado || '?'}, recebido ${conf.recebido || '?'})`
          console.error(`[diagnostico] ${lastErr}`)
          continue   // nova tentativa; se insistir no erro, lança no fim
        }
        return parsed
      }
      lastErr = 'JSON não extraído do texto gerado.'
    } catch (e) {
      lastErr = e.message || 'Falha na geração.'
    }
    if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 4000))
  }
  throw new Error(`Falha após ${MAX_ATTEMPTS} tentativas — ${lastErr}`)
}

// Grava o diagnóstico de um concorrente no shape da tabela (scores + dados jsonb).
// dados = parsed completo (inclui territorios_possiveis, concorrentes[].ameaca, etc.).
export async function salvarConcorrenteDiag(supabase, concorrente, parsed) {
  return supabase.from('diagnosticos_concorrentes').insert({
    workspace_id:   concorrente.workspace_id,
    concorrente_id: concorrente.id,
    scores: {
      singularidade:  parsed.score_singularidade,
      consistencia:   parsed.score_consistencia,
      posicionamento: parsed.score_posicionamento,
    },
    dados: parsed,
  })
}

// Feed do cérebro (C): emite um brand_signal 'competitive' com o diagnóstico do
// concorrente. É CONTEXTO DE MERCADO — o distiller usa pra afiar a diferenciação
// da marca (territórios ocupados/livres, ameaças), nunca como atributo da marca.
// brand_id derivado do workspace (mesmo padrão do trigger de 'diagnostic').
async function emitCompetitiveSignal(supabase, concorrente, parsed) {
  const { data: brand } = await supabase
    .from('brands').select('id').eq('workspace_id', concorrente.workspace_id).limit(1).maybeSingle()
  if (!brand) return   // workspace sem marca ainda → nada pra alimentar
  const { error: sigErr } = await emitSignal(supabase, {
    brand_id:     brand.id,
    workspace_id: concorrente.workspace_id,
    tipo:         'competitive',
    fonte:        'concorrentes',
    ref_id:       concorrente.id,
    payload: {
      concorrente:          concorrente.nome,
      dominio:              concorrente.dominio || null,
      score_singularidade:  parsed.score_singularidade,
      score_consistencia:   parsed.score_consistencia,
      score_posicionamento: parsed.score_posicionamento,
      territorios: (parsed.territorios_possiveis || []).map(t => ({ nome: t.nome, confianca: t.confianca })),
      frase:                (parsed.frase_diagnostico || '').slice(0, 300),
    },
    peso: 0.6,   // contexto competitivo pesa menos que sinais da própria marca
  })
  if (sigErr) console.error('[competitive] signal do diagnóstico falhou:', sigErr.message)
}

// Gera + grava um concorrente. Usa dominio se houver, senão o nome.
export async function diagnosticarConcorrente(supabase, concorrente) {
  const parsed = await gerarDiagnostico({ nome: concorrente.nome, dominio: concorrente.dominio }, null, {
    supabase, tag: 'concorrente', workspace_id: concorrente.workspace_id,
    operacao: `concorrente:${concorrente.nome}`,
  })
  const { error } = await salvarConcorrenteDiag(supabase, concorrente, parsed)
  if (error) throw new Error(error.message)
  await emitCompetitiveSignal(supabase, concorrente, parsed)   // feed do cérebro (C)
  return parsed
}

// Concorrentes ATIVOS sem diagnóstico recente (a "fila"). Filtra por workspace se dado.
export async function concorrentesPendentes(supabase, { workspace_id, staleDays = 7 } = {}) {
  const cutoff = new Date(Date.now() - staleDays * 86400_000).toISOString()
  let q = supabase.from('concorrentes').select('id, workspace_id, nome, dominio').eq('ativo', true)
  if (workspace_id) q = q.eq('workspace_id', workspace_id)
  const [{ data: concs }, { data: diags }] = await Promise.all([
    q,
    supabase.from('diagnosticos_concorrentes').select('concorrente_id, created_at').order('created_at', { ascending: false }),
  ])
  const ultimo = new Map()
  for (const d of diags || []) if (!ultimo.has(d.concorrente_id)) ultimo.set(d.concorrente_id, d.created_at)
  return (concs || []).filter(c => { const u = ultimo.get(c.id); return !u || u < cutoff })
}

// Gera a fila em SÉRIE (não paralelo — o prompt cache do _ai.js só rende com reuso
// sequencial dentro do TTL). Cap p/ não estourar o teto de 15 min da function.
export async function diagnosticarEmSerie(supabase, concorrentes, { max = 6 } = {}) {
  const fila = concorrentes.slice(0, max)
  let ok = 0
  const erros = []
  for (const c of fila) {
    try { await diagnosticarConcorrente(supabase, c); ok++ }
    catch (e) { erros.push({ concorrente: c.nome, erro: e.message }) }
  }
  return { ok, tentados: fila.length, restantes: concorrentes.length - fila.length, erros }
}
