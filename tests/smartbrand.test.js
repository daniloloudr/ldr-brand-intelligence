import { describe, it, expect } from 'vitest'
import { renderSmartbrand, vazio, SECOES } from '../netlify/functions/_smartbrand.js'

describe('vazio — o que conta como lacuna', () => {
  it('string em branco e espaço em branco são vazios', () => {
    expect(vazio('')).toBe(true)
    expect(vazio('   ')).toBe(true)
    expect(vazio('Propósito real')).toBe(false)
  })

  it('array só de strings vazias é vazio', () => {
    expect(vazio([])).toBe(true)
    expect(vazio(['', '  '])).toBe(true)
    expect(vazio(['coragem'])).toBe(false)
  })

  it('o esqueleto que o modelo devolve NÃO conta como preenchido', () => {
    // Este é o caso que motivou a checagem recursiva: o prompt mostra o
    // formato [{ ano: "", titulo: "" }] e o modelo às vezes ecoa de volta.
    expect(vazio([{ ano: '', titulo: '', descricao: '' }])).toBe(true)
    expect(vazio([{ ano: '2019', titulo: 'Fundação', descricao: '' }])).toBe(false)
  })

  it('objeto com todos os valores vazios é vazio', () => {
    expect(vazio({ primary: '', secondary: '' })).toBe(true)
    expect(vazio({ primary: '#000000', secondary: '' })).toBe(false)
  })
})

describe('renderSmartbrand — só o que o manual disse', () => {
  it('manual vazio vira documento inteiro em branco, sem inventar nada', () => {
    const r = renderSmartbrand({}, { marca: 'Vhita', data: '2026-08-17' })
    expect(r.preenchidos).toBe(0)
    expect(r.lacunas.length).toBe(r.total)
    expect(r.markdown).toContain('— em branco —')
    // O documento não pode conter texto de exemplo nem placeholder plausível
    expect(r.markdown).not.toMatch(/lorem|exemplo de propósito|sua marca é/i)
  })

  it('campo preenchido aparece; campo ausente vira lacuna nomeada', () => {
    const r = renderSmartbrand({
      verbal_identity: { proposito: 'Nutrir com verdade.', missao: '' },
    }, { marca: 'Vhita' })

    expect(r.markdown).toContain('Nutrir com verdade.')
    expect(r.preenchidos).toBe(1)
    expect(r.lacunas.some(l => l.campo === 'verbal_identity.missao')).toBe(true)
    expect(r.lacunas.some(l => l.campo === 'verbal_identity.proposito')).toBe(false)
  })

  it('a lacuna aparece no corpo do documento, não só no rodapé', () => {
    // Se o buraco só existisse na lista final, o documento pareceria completo
    // para quem lê de cima a baixo.
    const r = renderSmartbrand({ verbal_identity: { proposito: 'X' } })
    const corpo = r.markdown.split('## Lacunas')[0]
    expect(corpo).toContain('### Missão\n\n_— em branco —_')
  })

  it('lista de strings e lista de objetos rendem legível', () => {
    const r = renderSmartbrand({
      verbal_identity: {
        valores: ['Coragem', 'Clareza'],
        marcos: [{ ano: '2019', titulo: 'Fundação', descricao: '' }],
      },
    })
    expect(r.markdown).toContain('- Coragem')
    expect(r.markdown).toContain('**Ano:** 2019')
    // chave vazia do objeto não vira "Descricao: undefined"
    expect(r.markdown).not.toContain('undefined')
  })

  it('textos de referência entram integrais — é deles que o RAG tira a voz', () => {
    const texto = 'Oi, tudo bem? '.repeat(40).trim()
    const r = renderSmartbrand({
      verbal_identity: {
        textos_referencia: [{ tipo: 'e-mail', titulo: 'Boas-vindas', texto }],
      },
    })
    expect(r.markdown).toContain(texto)
    expect(r.markdown).toContain('### Boas-vindas (e-mail)')
  })

  it('manual completo não deixa lacuna', () => {
    const cheio = {}
    for (const s of SECOES) {
      cheio[s.de] = cheio[s.de] || {}
      for (const [chave] of s.campos) cheio[s.de][chave] = 'conteúdo real'
    }
    cheio.verbal_identity.textos_referencia = [{ tipo: 'blog', titulo: 'T', texto: 'corpo' }]

    const r = renderSmartbrand(cheio)
    expect(r.lacunas).toEqual([])
    expect(r.preenchidos).toBe(r.total)
    expect(r.markdown).toContain('Nenhuma')
  })

  it('null e undefined não quebram a renderização', () => {
    expect(() => renderSmartbrand(null)).not.toThrow()
    expect(() => renderSmartbrand(undefined)).not.toThrow()
    expect(renderSmartbrand(null).lacunas.length).toBeGreaterThan(0)
  })
})
