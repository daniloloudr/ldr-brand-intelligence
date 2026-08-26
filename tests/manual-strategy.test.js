// ════════════════════════════════════════════════════════════════════
// F11 — a extração de manual aprende a coluna `strategy`.
//
// A coluna existe desde a migration 035 (Onda 2) e nunca teve caminho de
// entrada: nenhuma passada perguntava por ela, e a escrita não a mencionava
// uma única vez. Enquanto isso o smartbrand JÁ cobrava esses campos — ele lê o
// mesmo mapa da tela (`SECOES_DA_MARCA`) — então o produto pedia um dado que
// não tinha porta por onde entrar.
//
// Achado no manual da Worten (26/08): 41 lacunas, e as seções Função e
// Experiência inteiras em branco. Duas causas empilhadas, e só uma é nossa —
// aquele manual é de EXPRESSÃO e realmente não traz modelo de negócio nem
// jornada do cliente. Mas, se trouxesse, não haveria onde gravar.
//
// O risco que estes testes guardam é o da MESCLA. `strategy` é a única coluna
// do brand book onde outra mão escreve: o Copiloto grava `goals_kpis` ali, e
// `personas` de marcas antigas ainda vive lá como legado. Substituir a coluna
// — que é o que as outras três colunas fazem — apagaria isso em silêncio, num
// reimport, que é exatamente quando o cliente acha que está ACRESCENTANDO.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { mesclarStrategy } from '../netlify/functions/brand-manual-extract-background.js'
import { TODOS } from '../src/lib/campos.js'

const src = readFileSync('netlify/functions/brand-manual-extract-background.js', 'utf8')

describe('a mescla protege o que o manual não disse', () => {
  it('preserva o que o Copiloto gravou quando o manual cala', () => {
    const atual = { goals_kpis: [{ objetivo: 'ser referência', kpi: 'share of search', meta: 'top-3' }] }
    const novo  = { goals_kpis: [], business_model: 'varejo omnicanal' }
    const r = mesclarStrategy(atual, novo)
    expect(r.goals_kpis, 'a extração apagou os objetivos do Copiloto').toEqual(atual.goals_kpis)
    expect(r.business_model).toBe('varejo omnicanal')
  })

  it('preserva personas legadas — elas ainda vivem em strategy', () => {
    const atual = { personas: [{ nome: 'Ana', dores: 'preço' }] }
    expect(mesclarStrategy(atual, { ux: 'simples' }).personas).toEqual(atual.personas)
  })

  it('NÃO se deixa enganar pelo esqueleto vazio que o modelo devolve', () => {
    // O prompt mostra `[{ "objetivo": "", "kpi": "", "meta": "" }]` e o modelo
    // às vezes devolve o esqueleto de volta. Um `.length` ingênuo leria isso
    // como conteúdo e apagaria o dado bom com uma casca.
    const atual = { goals_kpis: [{ objetivo: 'real', kpi: 'real', meta: 'real' }] }
    const novo  = { goals_kpis: [{ objetivo: '', kpi: '', meta: '' }] }
    expect(mesclarStrategy(atual, novo).goals_kpis).toEqual(atual.goals_kpis)
  })

  it('o manual vence quando ele DIZ algo', () => {
    const r = mesclarStrategy({ business_model: 'antigo' }, { business_model: 'novo' })
    expect(r.business_model).toBe('novo')
  })

  it('aguenta ausência dos dois lados sem explodir', () => {
    expect(mesclarStrategy(null, null)).toEqual({})
    expect(mesclarStrategy(undefined, { ux: 'x' })).toEqual({ ux: 'x' })
    expect(mesclarStrategy({ ux: 'x' }, undefined)).toEqual({ ux: 'x' })
  })
})

describe('a passada de estratégia existe e fala o vocabulário da tela', () => {
  const bloco = src.slice(src.indexOf("chave: 'strategy'"), src.indexOf("chave: 'visual_identity'"))

  it('a extração tem uma passada própria para estratégia', () => {
    expect(bloco.length, 'a passada de estratégia sumiu').toBeGreaterThan(200)
    expect(bloco).toMatch(/tag: 'estrategia'/)
  })

  it('pergunta exatamente pelos campos que a tela e o smartbrand cobram', () => {
    // Se a tela ganhar um campo de `strategy` e o prompt não acompanhar, ele
    // vira lacuna permanente: cobrado no smartbrand, impossível de preencher
    // pela extração. Este teste é o que amarra os dois lados.
    const naTela = TODOS.filter(c => c.col === 'strategy').map(c => c.k)

    // TRAVA CONTRA TEATRO: a primeira versão deste teste lia `s.campos`, e a
    // chave é `s.mapa`. Resultado: zero campos, `faltando` vazio por acidente,
    // teste verde que não guardava nada. Se a lista vier vazia de novo, é a
    // ferramenta que quebrou — não a ausência de campos.
    expect(naTela.length, 'o mapa não foi lido — o teste estaria passando à toa')
      .toBeGreaterThan(10)

    // Fora do alcance de um manual, de propósito:
    //  · storybook_url e territorio_notas são do TIME, não do documento;
    //  · seasons/territorio só entram se o manual declarar (o prompt avisa).
    const foraDoManual = ['storybook_url', 'territorio_notas']
    const esperados = [...new Set(naTela)].filter(k => !foraDoManual.includes(k))

    const faltando = esperados.filter(k => !bloco.includes(`"${k}"`))
    expect(faltando, `campo da tela que o prompt não pede: ${faltando.join(', ')}`).toEqual([])
  })

  it('proíbe inventar território — isso envenenaria o modelo vivo', () => {
    // Território é conclusão da destilação. Um território afirmado sem lastro
    // entra no cérebro como se fosse declaração da marca.
    expect(bloco).toMatch(/Só se o manual DECLARAR/)
  })
})

describe('a escrita persiste a estratégia', () => {
  it('`strategy` entra no conjunto salvo', () => {
    expect(src, 'strategy voltou a ficar de fora da escrita')
      .toMatch(/strategy:\s+strategyMesclada/)
  })

  it('a mescla usa o que está NO BANCO, não um objeto vazio', () => {
    expect(src).toMatch(/mesclarStrategy\(existingBook\?\.strategy, extracted\.strategy\)/)
    // Sem ler a coluna, `existingBook.strategy` é undefined e a "mescla" vira
    // substituição silenciosa — o pior dos dois mundos, porque parece protegida.
    expect(src, 'a coluna strategy não é lida do banco antes de mesclar')
      .toMatch(/select\('id, version, strategy'\)/)
  })

  it('coluna ausente derruba um degrau por vez, não a extração inteira', () => {
    // Extração já paga não pode ser perdida por causa de um banco velho.
    expect(src).toMatch(/semColuna\(error, 'smartbrand'\)/)
    expect(src).toMatch(/semColuna\(error, 'strategy'\)/)
  })
})
