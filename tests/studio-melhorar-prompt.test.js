// ════════════════════════════════════════════════════════════════════
// studio-melhorar-prompt.test.js — o "Melhorar prompt" refina, não inventa
//
// Defeito relatado pelo Danilo (31/08/2026): o botão devolvia um parágrafo
// inventado por cima de um pedido de uma linha. Não era alucinação espontânea —
// era a INSTRUÇÃO: o system mandava "MELHORAR... vívido e específico...
// enriqueça", e o modelo obedecia.
//
// Somava-se a isso um limite opcional: `max_chars` só existia se quem chamava
// pedisse, e só o canvas pedia. A página Imagem e a de Vídeo chamavam sem teto.
// Limite que depende de o chamador lembrar não é limite.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PROMPT_TEMPLATES } from '../src/lib/studioModels.js'

const src = readFileSync('netlify/functions/studio-prompt.js', 'utf8')

// Só o BLOCO do system prompt — os comentários do arquivo citam a instrução
// velha para explicar o defeito, e a primeira versão deste teste reprovou por
// causa do próprio comentário. Lei 3 do núcleo: ancorar no ponto, não no arquivo.
const system = src.slice(src.indexOf('const system = ['), src.indexOf("].join(' ')"))

describe('o teto de caracteres é padrão, não opcional', () => {
  it('existe um limite padrão mesmo sem max_chars', () => {
    expect(src, 'o teto voltou a depender do chamador').toMatch(/LIMITE_PADRAO\s*=\s*300/)
    expect(src).toMatch(/:\s*LIMITE_PADRAO/)
  })

  it('o corte duro não depende mais de `limit` existir', () => {
    // Era `if (limit && promptOut.length > limit)`. Com o padrão, `limit` é
    // sempre número — mas voltar a condicionar reabriria o buraco.
    expect(src).toMatch(/if \(promptOut\.length > limit\)/)
  })
})

describe('o papel é revisor, não redator', () => {
  it('proíbe acrescentar o que não foi pedido', () => {
    expect(system).toMatch(/Não acrescente elemento/)
    expect(system).toMatch(/NÃO PODE/)
  })

  it('não manda mais "enriquecer" — que era a origem do problema', () => {
    expect(system, 'a instrução de enriquecer voltou ao system').not.toMatch(/enriqueç/i)
    expect(system).not.toMatch(/vívido/i)
  })

  it('texto curto ⇒ resposta curta está dito explicitamente', () => {
    expect(system).toMatch(/curto ⇒ resposta curta/)
  })

  // Lei do piloto Hering: modelo de imagem não obedece negação — "sem X"
  // injeta X. O refinador tem que escrever em positivo.
  it('instrui termos positivos, pela lei da negação', () => {
    expect(system).toMatch(/POSITIVOS/)
    expect(system).toMatch(/não obedece negação/)
  })
})

describe('base de casting — a etapa 0 do processo de catálogo', () => {
  const casting = PROMPT_TEMPLATES.find(t => t.label === 'Base de casting')

  it('existe e é vertical de corpo inteiro', () => {
    expect(casting).toBeTruthy()
    expect(casting.formato).toBe('9:16')
    expect(casting.prompt).toMatch(/corpo inteiro/i)
  })

  // A frase que corrigiu o piquê sutil da primeira base (KH6V, 19/08). Está
  // literal de propósito: foi reforço MEDIDO, não redação.
  it('carrega o reforço de malha que foi medido no KH6V', () => {
    expect(casting.prompt).toMatch(/malha lisa e uniforme/)
    expect(casting.prompt).toMatch(/sem trama visível/)
  })

  it('preserva identidade — a base gerada não pode virar outra pessoa', () => {
    expect(casting.prompt).toMatch(/traços do rosto e proporções do corpo preservados/)
  })
})
