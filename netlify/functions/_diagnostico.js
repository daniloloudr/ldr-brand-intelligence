// _diagnostico.js — geração de diagnóstico reutilizável (concorrentes + futuros).
// Usa o MESMO caminho robusto do diagnostico-gerar-background: STREAMING + premium
// + retry. Streaming evita o hang da chamada longa com web_search na Lambda.
import { streamAI, aiConfig, extractJSON } from './_ai.js'
import { SYSTEM_PROMPT } from './_prompt.js'

const MAX_ATTEMPTS = 2

// Gera o JSON do diagnóstico para uma empresa (nome ou domínio). Lança em falha.
export async function gerarDiagnostico(empresa, contexto) {
  const { model, tools, maxTokens } = aiConfig('premium')
  const msg = `Diagnóstico Smart Branding para: "${empresa}".${contexto ? `\nContexto: ${contexto}` : ''}\nGere o JSON completo.`
  let lastErr = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await streamAI({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: msg }],
        model, tools, maxTokens,
        idleMs: 120000, // 2 min sem chunk = stream morto
      })
      const parsed = extractJSON(text)
      if (parsed) return parsed
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

// Gera + grava um concorrente. Usa dominio se houver, senão o nome.
export async function diagnosticarConcorrente(supabase, concorrente) {
  const empresa = concorrente.dominio || concorrente.nome
  const parsed = await gerarDiagnostico(empresa, null)
  const { error } = await salvarConcorrenteDiag(supabase, concorrente, parsed)
  if (error) throw new Error(error.message)
  return parsed
}
