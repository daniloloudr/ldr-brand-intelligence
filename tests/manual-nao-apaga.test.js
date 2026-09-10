// ════════════════════════════════════════════════════════════════════
// Subir manual NÃO apaga o que a marca escreveu à mão.
//
// ZÉTONA, 09/set. A cliente escreveu o brand book pela tela durante semanas e
// subiu um manual de EXPRESSÃO. Manual de expressão cobre posicionamento, tom
// e visual; não carrega visão, missão, propósito, boilerplate nem narrativa de
// origem. O prompt manda o modelo devolver string vazia para campo sem lastro
// — e isso está CERTO, é o que impede brand book inventado. A escrita é que
// gravava esse vazio por cima do conteúdo real.
//
// Sete campos, 3837 caracteres dela, viraram "". A recuperação saiu de um dump
// do R2 porque não havia trilha: a extração nunca gravou `brand_book_history`,
// e a tela só fotografa as seções de `histSectionMap` — que não cobrem
// `visual_identity` nem `design_system`.
//
// ⚠️ O QUE FAZ ESTE DEFEITO PASSAR POR REVISÃO: no mesmo ato a coluna CRESCEU,
// de 4380 para 8498 chars, porque a extração acrescentou 18 chaves novas quase
// todas em branco. Qualquer conferência por tamanho de coluna — inclusive a
// que a gente faria de olho no log — lê destruição como crescimento. Por isso
// o teste central aqui não compara tamanho: compara CAMPO A CAMPO.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { mesclarColuna } from '../netlify/functions/brand-manual-extract-background.js'

const src = readFileSync('netlify/functions/brand-manual-extract-background.js', 'utf8')

// As quatro colunas de conteúdo do brand book. `smartbrand`/`smartbrand_gaps`
// ficam de fora de propósito — ver o último describe.
const COLUNAS = ['verbal_identity', 'visual_identity', 'design_system', 'strategy']

describe('o manual que CALA não apaga', () => {
  it('o caso da Zétona: campo que o manual não cobre sobrevive', () => {
    // O que ela tinha escrito.
    const dela = {
      visao:            'Ser a marca de azeite mais desejada do Brasil.',
      missao:           'Construir o Zétona como referência em gastronomia.',
      valores:          ['JEITINHO BRASILEIRO', 'NÓS NÃO CAGAMOS REGRA'],
      narrativa_origem: 'Nasceu em Tarragona, para desmistificar o azeite no Brasil.',
      posicionamento:   'azeite para quem cozinha de verdade',
    }
    // O que um manual de expressão devolve: fala de posicionamento, cala no resto.
    const doManual = {
      visao: '', missao: '', valores: [], narrativa_origem: '',
      posicionamento: 'O azeite que azeita o paladar brasileiro.',
    }

    const r = mesclarColuna(dela, doManual)

    expect(r.visao,            'a visão foi apagada por um manual que não fala de visão').toBe(dela.visao)
    expect(r.missao).toBe(dela.missao)
    expect(r.valores).toEqual(dela.valores)
    expect(r.narrativa_origem).toBe(dela.narrativa_origem)
    // E o manual vence onde ele DIZ algo — isso é doutrina, não defeito.
    expect(r.posicionamento).toBe(doManual.posicionamento)
  })

  it('a coluna pode crescer e AINDA assim ter apagado — o teste é campo a campo', () => {
    // Reprodução exata do que enganou a revisão: 18 chaves novas em branco
    // entram, uma cheia sai. Tamanho sobe, conteúdo some.
    const dela = { narrativa_origem: 'x'.repeat(1887) }
    const doManual = { narrativa_origem: '' }
    for (let i = 0; i < 18; i++) doManual[`campo_novo_${i}`] = ''

    const r = mesclarColuna(dela, doManual)
    expect(r.narrativa_origem, 'a narrativa sumiu enquanto a coluna engordava').toHaveLength(1887)
  })

  it('bloco que FALHA não zera a coluna', () => {
    // Bloco sem retorno deixa `extracted.<coluna>` undefined. Antes o `|| {}`
    // da escrita virava "a marca não tem identidade visual".
    const dela = { paleta: '#00FF55', tipo_principal_nome: 'Saira' }
    expect(mesclarColuna(dela, undefined), 'falha de um bloco apagou a coluna').toEqual(dela)
    expect(mesclarColuna(dela, {}), 'bloco vazio apagou a coluna').toEqual(dela)
  })

  it('esqueleto que o modelo devolve não conta como conteúdo', () => {
    // Recursivo: o objeto tem chaves, e todas vazias. `Object.keys().length`
    // leria isso como preenchido.
    const dela = { logos: [{ nome: 'principal', valor: 'https://…/logo.svg' }] }
    const doManual = { logos: [{ nome: '', valor: '' }] }
    expect(mesclarColuna(dela, doManual).logos).toEqual(dela.logos)
  })
})

describe('a escrita mescla as QUATRO colunas', () => {
  it('nenhuma coluna de conteúdo é substituída', () => {
    for (const col of COLUNAS) {
      expect(src, `${col} voltou a ser gravada por substituição`)
        .toMatch(new RegExp(`${col}:\\s+mesclarColuna\\(existingBook\\?\\.${col},`))
    }
  })

  it('o `|| {}` que apagava não voltou para nenhuma coluna', () => {
    for (const col of COLUNAS) {
      expect(src, `${col}: \`extracted.${col} || {}\` grava vazio por cima do conteúdo`)
        .not.toMatch(new RegExp(`${col}:\\s+extracted\\.${col}\\s*\\|\\|\\s*\\{\\}`))
    }
  })

  it('as quatro colunas são LIDAS do banco antes de mesclar', () => {
    // Sem ler, `atual` chega undefined e a mescla vira substituição silenciosa
    // — pior que o defeito original, porque o código parece protegido.
    const select = src.match(/\.select\('id, version,[^']*'\)/)
    expect(select, 'o select do brand book existente sumiu').not.toBeNull()
    for (const col of COLUNAS) {
      expect(select[0], `${col} não é lida antes da mescla`).toContain(col)
    }
  })
})

describe('a trilha existe antes da escrita', () => {
  it('a extração fotografa o estado anterior em brand_book_history', () => {
    expect(src, 'a extração voltou a escrever sem deixar trilha')
      .toMatch(/from\('brand_book_history'\)\.insert\(/)
  })

  it('a foto sai ANTES do update, não depois', () => {
    const foto   = src.indexOf("from('brand_book_history').insert(")
    const escrita = src.indexOf("from('brand_books').update(")
    expect(foto, 'não achei a gravação do histórico').toBeGreaterThan(-1)
    expect(escrita, 'não achei o update do brand book').toBeGreaterThan(-1)
    expect(foto, 'o histórico é gravado depois da escrita — fotografa o estado novo')
      .toBeLessThan(escrita)
  })

  it('falha na trilha não derruba a extração — ela já foi paga', () => {
    const bloco = src.slice(src.indexOf('const fotos ='), src.indexOf('const patch ='))
    expect(bloco).toMatch(/histórico NÃO gravado/)
    // Um `throw`/`return` aqui jogaria fora uma extração já cobrada do cliente.
    expect(bloco, 'a falha do histórico interrompe a extração').not.toMatch(/\breturn\b|\bthrow\b/)
  })
})

describe('o smartbrand continua sendo o retrato DESTE manual', () => {
  it('smartbrand é substituído, não mesclado', () => {
    // Não é conteúdo da marca: é o que o manual disse, e é dele que
    // `pendencias.js` tira "o que o manual não declarou". Mesclar faria a
    // lacuna nunca fechar — e nunca abrir.
    expect(src).toMatch(/smartbrand:\s+smart\.markdown/)
    expect(src).toMatch(/smartbrand_gaps:\s+smart\.lacunas/)
    expect(src, 'o smartbrand passou a ser mesclado — a lacuna vira permanente')
      .not.toMatch(/smartbrand:\s+mesclarColuna/)
  })
})
