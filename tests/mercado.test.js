import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

// ── CONCORRENTE DESATIVADO NÃO É CONCORRENTE ────────────────────────────
// Caso real, Pixel Retail (18/08/2026): o diagnóstico da empresa errada
// ("Pixel Agência Digital") gerou três concorrentes de AGÊNCIA DIGITAL —
// Agência Mestre, Orgânica Digital, Go Biz — para uma empresa de retail media.
// O cliente desativou os três e cadastrou os certos (Eletromidia, The Led).
//
// A COLETA respeitava o `ativo`. A LEITURA não. Resultado: os 25 movimentos da
// tela e 100% da matéria-prima da síntese continuavam vindo dos desativados, e
// a recomendação estratégica saía calibrada contra o mercado errado — enquanto
// os concorrentes de verdade apareciam com zero movimento.
//
// Desativar não apaga: o histórico fica. O que muda é que ele para de alimentar
// a leitura do presente.

const market = readFileSync('netlify/functions/_market.js', 'utf8')
const tela   = readFileSync('src/pages/app/IntelligencePages.jsx', 'utf8')

describe('a síntese de mercado só lê concorrente ativo', () => {
  it('busca os ativos antes de buscar o clipping', () => {
    const bloco = market.slice(market.indexOf('export async function gerarSinteseMercado'), market.indexOf('const ctx ='))
    expect(bloco).toMatch(/from\('concorrentes'\)[\s\S]*?\.eq\('ativo', true\)/)
  })

  it('o clipping é restrito aos ativos, não ao workspace inteiro', () => {
    // Sem o `.in(...)`, o histórico dos desativados volta pela porta dos fundos.
    const bloco = market.slice(market.indexOf('export async function gerarSinteseMercado'), market.indexOf('const ctx ='))
    expect(bloco).toMatch(/\.in\('concorrente_id', ativos\.map\(c => c\.id\)\)/)
  })

  it('sem concorrente ativo, não inventa síntese', () => {
    expect(market).toMatch(/return \{ status: 'sem_concorrentes' \}/)
  })
})

describe('a tela de inteligência de mercado só conta movimento de ativo', () => {
  it('a lista de concorrentes filtra ativo', () => {
    const load = tela.slice(tela.indexOf('const load = useCallback'), tela.indexOf('useEffect(() => {'))
    expect(load).toMatch(/from\('concorrentes'\)[\s\S]*?\.eq\('ativo', true\)/)
  })

  it('o feed de movimentos é restrito aos ativos', () => {
    const load = tela.slice(tela.indexOf('const load = useCallback'), tela.indexOf('useEffect(() => {'))
    expect(load).toMatch(/\.in\('concorrente_id', ativos\)/)
  })

  it('workspace sem concorrente ativo mostra vazio, não tudo', () => {
    // O ramo `: { data: [] }` importa: sem ele, um `.in()` com lista vazia
    // devolveria erro ou — pior — a consulta sem filtro.
    const load = tela.slice(tela.indexOf('const load = useCallback'), tela.indexOf('useEffect(() => {'))
    expect(load).toMatch(/ativos\.length[\s\S]*?:\s*\{ data: \[\] \}/)
  })
})

describe('a coleta já estava certa — não pode regredir', () => {
  it('clipping coleta só de ativos', () => {
    expect(readFileSync('netlify/functions/_clipping.js', 'utf8')).toMatch(/from\('concorrentes'\)[\s\S]{0,120}\.eq\('ativo', true\)/)
  })

  it('diagnóstico de concorrente só roda para ativos', () => {
    expect(readFileSync('netlify/functions/_diagnostico.js', 'utf8')).toMatch(/from\('concorrentes'\)[\s\S]{0,120}\.eq\('ativo', true\)/)
  })
})
