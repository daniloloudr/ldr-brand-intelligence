import { describe, it, expect } from 'vitest'
import {
  host, dominioRaiz, dominiosEm, mesmoDominio,
  alvoDoDiagnostico, instrucaoDeIdentidade, conferirIdentidade, identidadeParaGravar,
} from '../netlify/functions/_identidade.js'

// ── O CASO REAL ─────────────────────────────────────────────────────────
// Copiado literalmente do que está gravado em produção no diagnóstico
// 61a699d9-3322-4528-9db2-5ee9a790112c, gerado em 18/08/2026. Não é exemplo
// inventado: é o relatório que chegou ao Danilo falando de outra empresa.
const PIXEL_ENTRADA = { nome: 'Pixel', dominio: 'www.pixelretail.com.br' }
const PIXEL_SAIDA_ERRADA = {
  empresa: 'Pixel Agência Digital',
  dominio: 'agenciapx.com / agenciapixel.digital',
  frase_diagnostico: 'Uma marca com nome genérico, serviços amplos e presença fragmentada…',
}

describe('o caso Pixel — a regressão que este módulo existe para impedir', () => {
  it('a guarda REPROVA o diagnóstico que foi entregue ao cliente', () => {
    const v = conferirIdentidade(PIXEL_ENTRADA, PIXEL_SAIDA_ERRADA)
    expect(v.ok).toBe(false)
    expect(v.verificado).toBe(true)
    expect(v.esperado).toBe('pixelretail.com.br')
    expect(v.recebido).toContain('agenciapx.com')
  })

  it('o modelo passa a receber o domínio, que antes era descartado', () => {
    // Ia só "Pixel" — nome de dezenas de agências. O domínio era carregado na
    // linha seguinte do handler e nunca chegava ao prompt.
    expect(alvoDoDiagnostico(PIXEL_ENTRADA)).toBe('Pixel (pixelretail.com.br)')
    expect(instrucaoDeIdentidade(PIXEL_ENTRADA)).toContain('pixelretail.com.br')
    expect(instrucaoDeIdentidade(PIXEL_ENTRADA)).toMatch(/ELAS NÃO SÃO/)
  })

  it('a identidade gravada é a da ENTRADA, não a resposta do modelo', () => {
    // Era `empresa: parsed.empresa` — o modelo sobrescrevia quem era o cliente,
    // e não sobrava nada no dado dizendo que deveria ser outra empresa.
    expect(identidadeParaGravar(PIXEL_ENTRADA, PIXEL_SAIDA_ERRADA))
      .toEqual({ empresa: 'Pixel', dominio: 'pixelretail.com.br' })
  })

  it('o diagnóstico CERTO da mesma marca passa', () => {
    const bom = { empresa: 'Pixel Retail', dominio: 'https://www.pixelretail.com.br/' }
    expect(conferirIdentidade(PIXEL_ENTRADA, bom)).toEqual({ ok: true, verificado: true })
  })
})

describe('o domínio registrável — onde uma guarda ingênua falharia', () => {
  it('.com.br precisa de três rótulos', () => {
    // Com a regra ingênua de "dois últimos rótulos", "com.br" viraria o domínio
    // e QUALQUER par de sites .com.br passaria como a mesma empresa — a guarda
    // aprovaria justamente o erro que existe para pegar.
    expect(dominioRaiz('www.pixelretail.com.br')).toBe('pixelretail.com.br')
    expect(mesmoDominio('a.com.br', 'b.com.br')).toBe(false)
    expect(mesmoDominio('loja.hering.com.br', 'hering.com.br')).toBe(true)
  })

  it('normaliza as formas que um domínio aparece escrito', () => {
    for (const v of ['https://www.pixelretail.com.br/', 'HTTP://PixelRetail.com.br',
                     'www.pixelretail.com.br:443', 'pixelretail.com.br/sobre?x=1']) {
      expect(host(v)).toBe('pixelretail.com.br')
    }
  })

  it('extrai os vários domínios que o modelo enfia num campo só', () => {
    expect(dominiosEm('agenciapx.com / agenciapixel.digital'))
      .toEqual(['agenciapx.com', 'agenciapixel.digital'])
  })

  it('domínio parecido não é o mesmo domínio', () => {
    expect(mesmoDominio('pixelretail.com.br', 'pixel-retail.com.br')).toBe(false)
    expect(mesmoDominio('hering.com.br', 'hering.com')).toBe(false)
  })
})

describe('a guarda não pode fingir que verificou', () => {
  it('sem domínio na entrada, aprova mas marca como NÃO verificado', () => {
    // O fluxo do admin passa só o nome. Não dá para conferir — e é exatamente
    // por isso que o registro precisa saber que passou sem prova.
    const v = conferirIdentidade({ nome: 'Vhita' }, { empresa: 'Vhita', dominio: 'vhita.com.br' })
    expect(v).toMatchObject({ ok: true, verificado: false })
  })

  it('modelo que não declara domínio passa como NÃO verificado', () => {
    const v = conferirIdentidade(PIXEL_ENTRADA, { empresa: 'Pixel' })
    expect(v).toMatchObject({ ok: true, verificado: false })
  })

  it('"não achei o sujeito" é recusa, não diagnóstico', () => {
    // A saída que o prompt oferece quando não há material: melhor devolver nada
    // do que diagnosticar o homônimo com mais conteúdo indexado.
    const v = conferirIdentidade(PIXEL_ENTRADA, { erro_identificacao: 'não encontrei material sobre pixelretail.com.br' })
    expect(v.ok).toBe(false)
  })

  it('entrada vazia não explode e não aprova verificado', () => {
    expect(conferirIdentidade(null, null)).toMatchObject({ ok: true, verificado: false })
    expect(conferirIdentidade({}, {})).toMatchObject({ verificado: false })
  })
})
