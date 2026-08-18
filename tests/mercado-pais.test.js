import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { mercado, contextoDeMercado, idiomaDe, MERCADOS, PADRAO } from '../netlify/functions/_mercado.js'
import { montarQueries, canalDoHost } from '../netlify/functions/listening-coletar-background.js'

// ── O MERCADO É DADO, NÃO PREMISSA DO CÓDIGO ────────────────────────────
// Véspera do setup da Worten (Portugal). O produto nasceu brasileiro e o Brasil
// estava ESCRITO NO CÓDIGO: o prompt do diagnóstico mandava pesquisar "Reclame
// Aqui", as tendências pediam "o setor no Brasil", o conteúdo saía em
// "português brasileiro" e a escuta tinha o Reclame Aqui como canal fixo.
//
// Para uma marca portuguesa isso não é imprecisão. O Reclame Aqui não existe em
// Portugal — procurar lá devolve vazio, e modelo que procura o que não existe
// costuma preencher o vazio. E texto em português brasileiro entregue a uma
// marca de Portugal se denuncia na primeira linha.
//
// Mesma classe do bug da Pixel: premissa errada entrando no prompt e saindo
// como análise. A diferença é que essa foi pega antes do cliente.

const ler = (p) => readFileSync(p, 'utf8')
const FUNCOES = 'netlify/functions'

describe('cada mercado tem as suas praças', () => {
  it('Portugal não procura no Reclame Aqui', () => {
    expect(mercado('PT').reputacao.join(' ')).not.toMatch(/Reclame Aqui/)
    expect(mercado('PT').reputacao).toContain('Portal da Queixa')
  })

  it('Brasil segue com as praças de sempre', () => {
    expect(mercado('BR').reputacao).toContain('Reclame Aqui')
  })

  it('país desconhecido cai no Brasil, sem quebrar', () => {
    // Todas as marcas de hoje são BR; um código errado não pode derrubar a
    // análise, mas também não pode virar outro mercado por acidente.
    expect(mercado('XX').nome).toBe(MERCADOS[PADRAO].nome)
    expect(mercado(null).nome).toBe('Brasil')
    expect(mercado(undefined).nome).toBe('Brasil')
  })
})

describe('o idioma acompanha o mercado', () => {
  it('Portugal recebe instrução de português europeu', () => {
    const i = idiomaDe('PT')
    expect(i).toMatch(/português europeu/)
    expect(i).toMatch(/NUNCA use português brasileiro/)
    expect(i).toMatch(/telemóvel/)   // vocabulário concreto, não instrução vaga
  })

  it('Brasil não ganha nota de língua — é o padrão', () => {
    expect(idiomaDe('BR')).toBe('português do Brasil')
  })
})

describe('o contexto entra no prompt do diagnóstico', () => {
  it('manda analisar o mercado certo e ignorar praça inexistente', () => {
    const pt = contextoDeMercado('PT')
    expect(pt).toMatch(/opera em Portugal/)
    expect(pt).toMatch(/não de outros países/)
    expect(pt).toMatch(/se uma não existir em Portugal, ignore-a/)
  })

  it('os dois caminhos de diagnóstico usam o contexto', () => {
    for (const f of ['diagnostico-gerar-background.js', 'diagnostico-gerar.js']) {
      const s = ler(`${FUNCOES}/${f}`)
      expect(s, f).toMatch(/contextoDeMercado\(/)
      expect(s, f).toMatch(/select\('id, nome, dominio, pais/)   // sem isto vira undefined → BR
    }
  })
})

describe('o Brasil saiu de dentro do código', () => {
  it('o system prompt não cita praça de um país só', () => {
    expect(ler(`${FUNCOES}/_prompt.js`)).not.toMatch(/Reclame Aqui/)
  })

  it('o system prompt não sugere TLD brasileiro no exemplo', () => {
    expect(ler(`${FUNCOES}/_prompt.js`)).not.toMatch(/dominio\.com\.br/)
  })

  it('tendências não fixa "no Brasil"', () => {
    const s = ler(`${FUNCOES}/_trends.js`)
    expect(s).not.toMatch(/setor de "\$\{setor\}" no Brasil/)
    expect(s).toMatch(/em \$\{m\.nome\}/)
  })

  it('conteúdo não fixa "português brasileiro"', () => {
    for (const f of ['content-hub-gerar-background.js', 'content-hub-gerar.js']) {
      expect(ler(`${FUNCOES}/${f}`), f).not.toMatch(/português brasileiro/)
      expect(ler(`${FUNCOES}/${f}`), f).toMatch(/idiomaDe\(pais\)/)
    }
  })

  it('varredura: nenhuma função nova pode fixar o Brasil no prompt', () => {
    const infratoras = readdirSync(FUNCOES)
      .filter(f => f.endsWith('.js') && f !== '_mercado.js')
      .filter(f => /português brasileiro|Reclame Aqui/.test(
        ler(`${FUNCOES}/${f}`).replace(/\/\*[\s\S]*?\*\//g, '')
          .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')))
    expect(infratoras).toEqual([])
  })
})

describe('a escuta procura na praça do país', () => {
  it('Portugal busca no Portal da Queixa, não no Reclame Aqui', () => {
    const qs = montarQueries('Worten', [], 'PT').join(' ')
    expect(qs).toMatch(/site:portaldaqueixa\.com/)
    expect(qs).not.toMatch(/reclameaqui/)
  })

  it('Brasil segue no Reclame Aqui', () => {
    expect(montarQueries('Hering', [], 'BR').join(' ')).toMatch(/site:reclameaqui\.com\.br/)
  })

  it('o canal é nomeado conforme o mercado', () => {
    expect(canalDoHost('portaldaqueixa.com', '', 'PT')).toBe('Portal da Queixa')
    expect(canalDoHost('reclameaqui.com.br', '', 'BR')).toBe('Reclame Aqui')
    // Reclamação brasileira aparecendo num monitoramento português é ruído,
    // não a praça de reputação daquele mercado.
    expect(canalDoHost('reclameaqui.com.br', '', 'PT')).toBe('Web')
  })
})

describe('o cadastro do workspace pergunta o país', () => {
  it('o admin envia o país e o backend valida contra os mercados conhecidos', () => {
    expect(ler('src/pages/AppInterno.jsx')).toMatch(/pais: form\.pais/)
    const bk = ler(`${FUNCOES}/admin-create-workspace.js`)
    expect(bk).toMatch(/MERCADOS\[String\(pais \|\| ''\)\.toUpperCase\(\)\]/)
    expect(bk).toMatch(/: PADRAO/)   // país desconhecido não entra cru no banco
  })

  it('a lista da tela só oferece país que o _mercado sabe tratar', () => {
    // Oferecer na tela sem tratar no módulo faz a marca cair no Brasil em
    // silêncio — o pior desfecho, porque parece configurado.
    const ui = ler('src/pages/AppInterno.jsx')
    const bloco = ui.slice(ui.indexOf('const WS_PAISES'), ui.indexOf('];', ui.indexOf('const WS_PAISES')))
    const oferecidos = [...bloco.matchAll(/cod: '([A-Z]{2})'/g)].map(m => m[1])
    expect(oferecidos.length).toBeGreaterThan(0)
    expect(oferecidos.filter(c => !MERCADOS[c])).toEqual([])
  })
})
