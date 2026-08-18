import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

// ── TODA CHAMADA DE LLM CUSTA E PRECISA APARECER ────────────────────────
// A precificação é repasse a custo (1 crédito = R$ 0,33). Chamada que não
// registra não é "sem custo": é custo invisível saindo da margem.
//
// O buraco encontrado em 18/08: `streamAI` NUNCA chamou o logger, e é o caminho
// do diagnóstico — entre US$ 0,45 e US$ 1,29 por rodada. Os US$ 29,80/mês que a
// tabela mostrava estavam subestimados justamente na ponta mais cara. E não
// havia `workspace_id`: dava para saber o gasto por tag, nunca por marca.

const FUNCOES = 'netlify/functions'
const ler = (p) => readFileSync(p, 'utf8')
const semComentario = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

describe('os dois caminhos registram custo', () => {
  const ai = ler(`${FUNCOES}/_ai.js`)

  it('callAI registra', () => {
    const bloco = ai.slice(ai.indexOf('export async function callAI'), ai.indexOf('export async function streamAI'))
    expect(bloco).toMatch(/logAiUsage\(supabase, \{[^}]*workspace_id/)
  })

  it('streamAI registra — era o ponto cego', () => {
    const bloco = ai.slice(ai.indexOf('export async function streamAI'))
    expect(bloco).toMatch(/logAiUsage\(supabase, \{[^}]*workspace_id/)
  })

  it('streamAI soma os dois eventos de uso', () => {
    // Entrada vem no `message_start`, saída no `message_delta`. Olhar só um
    // registra metade da conta.
    const bloco = ai.slice(ai.indexOf('export async function streamAI'))
    expect(bloco).toMatch(/evt\.type === 'message_start'/)
    expect(bloco).toMatch(/evt\.usage.*usage = \{ \.\.\.usage/s)
  })

  it('o gasto é registrado ANTES das validações que lançam', () => {
    // A chamada da Pixel que estourou o teto gastou 169 mil tokens de entrada
    // para devolver zero caractere. Registrar só o sucesso esconde justamente o
    // desperdício, que é o que precisa aparecer.
    const bloco = ai.slice(ai.indexOf('export async function streamAI'))
    expect(bloco.indexOf('logAiUsage')).toBeLessThan(bloco.indexOf("stopReason === 'max_tokens'"))
  })

  it('o logger grava workspace e operação', () => {
    expect(ai).toMatch(/custo_usd: custo, tag, workspace_id, operacao/)
  })
})

describe('varredura — nenhuma chamada de LLM fica fora do custo', () => {
  const arquivos = readdirSync(FUNCOES)
    .filter(f => f.endsWith('.js') && f !== '_ai.js')
    .filter(f => /\b(callAI|streamAI)\(/.test(semComentario(ler(`${FUNCOES}/${f}`))))

  it('há chamadas para varrer', () => {
    expect(arquivos.length).toBeGreaterThan(10)
  })

  it('toda função que chama LLM passa tag', () => {
    const sem = arquivos.filter(f => !/tag:/.test(semComentario(ler(`${FUNCOES}/${f}`))))
    expect(sem).toEqual([])
  })

  it('toda função que chama LLM atribui a um workspace', () => {
    // `_diagnostico` e `_busca` recebem o rastreio de quem as chamou (spread),
    // por isso aceitam também `...rastreio`.
    const sem = arquivos.filter(f => {
      const s = semComentario(ler(`${FUNCOES}/${f}`))
      return !/workspace_id/.test(s) && !/\.\.\.rastreio/.test(s)
    })
    expect(sem).toEqual([])
  })
})

describe('a tabela de preço conhece os modelos em uso', () => {
  it('nenhum modelo cai no preço genérico', () => {
    // Modelo fora da tabela usa o fallback de US$ 3/15 — que para o Opus
    // subestima o custo em 40%.
    const ai = ler(`${FUNCOES}/_ai.js`)
    const emUso = [...ai.matchAll(/'(claude-[a-z0-9.-]+)'/g)].map(m => m[1])
    const tabela = ai.slice(ai.indexOf('const TOKEN_PRICE'), ai.indexOf('export async function logAiUsage'))
    const fora = [...new Set(emUso)].filter(m => !tabela.includes(m))
    expect(fora).toEqual([])
  })
})
