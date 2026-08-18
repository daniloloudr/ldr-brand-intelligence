import { describe, it, expect } from 'vitest'
import { pendencias, resumoPendencias } from '../src/lib/pendencias'
import { TODOS } from '../src/pages/app/campos'

const idsDe = (estado) => pendencias(estado).map(p => p.id)
const arquivo = (over = {}) => ({ file_path: 'x/y.png', mime_type: 'image/png', tipo: 'logo', ...over })

describe('o que falta — a regra', () => {
  it('marca vazia acusa tudo', () => {
    const ids = idsDe({})
    expect(ids).toContain('manual')
    expect(ids).toContain('logo')
    expect(ids).toContain('fontes')
    expect(ids).toContain('referencias')
  })

  it('logo DESCRITO não conta como logo entregue', () => {
    // O caso da PES: 9 logos no brand book, nenhum arquivo. A marca parecia
    // completa e o Estúdio não tinha o que aplicar.
    const descritos = Array.from({ length: 9 }, () => ({ tipo: 'logo', valor: 'Assinatura principal…' }))
    const p = pendencias({ assets: descritos, temManual: true })
    const logo = p.find(x => x.id === 'logo')
    expect(logo).toBeTruthy()
    expect(logo.porque).toMatch(/9 versões/)
    expect(logo.porque).toMatch(/descrição não é arquivo/)
  })

  it('logo com arquivo encerra a pendência', () => {
    expect(idsDe({ assets: [arquivo()], temManual: true })).not.toContain('logo')
  })

  it('URL pública vale tanto quanto arquivo no storage', () => {
    const porUrl = { tipo: 'logo', valor: 'https://cdn.exemplo/logo.svg', mime_type: 'image/svg+xml' }
    expect(idsDe({ assets: [porUrl], temManual: true })).not.toContain('logo')
  })

  it('fonte é reconhecida por extensão, não só por mime', () => {
    const fonte = { file_path: 'x/Saira.woff2', nome: 'Saira.woff2', tipo: 'outro' }
    expect(idsDe({ assets: [fonte], temManual: true })).not.toContain('fontes')
  })

  it('imagens de referência têm piso — e o texto diz quantas faltam', () => {
    const oito = Array.from({ length: 8 }, (_, i) =>
      arquivo({ file_path: `x/${i}.png`, tipo: 'padrao' }))
    expect(idsDe({ assets: oito, temManual: true })).not.toContain('referencias')

    const p = pendencias({ assets: oito.slice(0, 3), temManual: true })
    expect(p.find(x => x.id === 'referencias').porque).toMatch(/3 de 8/)
  })

  it('cada campo vazio vira UMA notificação — não uma lista fechada', () => {
    // "19 campos não declarados" não era acionável: ninguém ataca uma lista
    // fechada por partes. Uma mensagem por campo, sim.
    const p = pendencias({ temManual: true, assets: [arquivo()], dados: {} })
    const campos = p.filter(x => x.id.startsWith('campo:'))
    expect(campos.length).toBe(TODOS.length)
    expect(campos.every(c => c.campo && c.destino?.secao)).toBe(true)
  })

  it('campo preenchido não vira pendência', () => {
    const p = pendencias({ temManual: true, dados: { verbal_identity: { visao: 'Ser a maior' } } })
    expect(p.some(x => x.id === 'campo:verbal_identity.visao')).toBe(false)
  })

  it('o vazio segue a mesma regra da tela — esqueleto não conta como preenchido', () => {
    const p = pendencias({ temManual: true, dados: {
      verbal_identity: { marcos: [{ ano: '', titulo: '', descricao: '' }], valores: ['  '] },
    } })
    expect(p.some(x => x.id === 'campo:verbal_identity.marcos')).toBe(true)
    expect(p.some(x => x.id === 'campo:verbal_identity.valores')).toBe(true)
  })

  it('campo da coluna strategy também é cobrado — era o furo', () => {
    // A jornada do cliente vive em `strategy` e não existe no smartbrand, então
    // nunca aparecia quando a fonte eram as lacunas da extração.
    const p = pendencias({ temManual: true, dados: {} })
    const jornada = p.find(x => x.id === 'campo:strategy.customer_journey')
    expect(jornada).toBeTruthy()
    expect(jornada.destino.secao).toBe('experiencia')
    expect(jornada.titulo).toBe('Jornada do cliente está em branco')
  })
})

describe('o que cada pendência diz', () => {
  it('toda pendência explica o que QUEBRA, não o que seria bom ter', () => {
    // A regra de escrita do arquivo: sem isto a notificação vira cobrança.
    for (const p of pendencias({})) {
      expect(p.porque.length).toBeGreaterThan(40)
      expect(p.porque).not.toMatch(/seria (bom|legal|interessante)|recomendamos que/i)
    }
  })

  it('nada aqui bloqueia — severidade mede a perda, não permissão', () => {
    const sev = pendencias({}).map(p => p.severidade)
    expect(sev.every(s => ['alta', 'media', 'baixa'].includes(s))).toBe(true)
    expect(sev).not.toContain('bloqueia')
  })
})

describe('cada pendência sabe para onde levar e o que dizer lá', () => {
  it('todas têm destino e instrução', () => {
    const todas = pendencias({ dados: {} })
    for (const p of todas) {
      expect(p.destino?.secao, p.id).toBeTruthy()
      expect(p.instrucao?.length, p.id).toBeGreaterThan(30)
    }
  })

  it('o que é arquivo vai para a biblioteca; o que é campo, para a aba dele', () => {
    const p = pendencias({ temManual: true, dados: {} })
    const dest = id => p.find(x => x.id === id).destino.secao
    expect(p.find(x => x.id === 'logo').destino)
      .toEqual({ secao: 'studio/biblioteca', bibliotecaRoot: 'referencias' })
    expect(dest('campo:verbal_identity.visao')).toBe('essencia')
    expect(dest('campo:verbal_identity.tom_voz')).toBe('personalidade')
    expect(dest('campo:strategy.ux')).toBe('experiencia')
    expect(dest('campo:verbal_identity.tagline')).toBe('expression')
    expect(dest('campo:strategy.portfolio')).toBe('negocio')
  })

  it('a instrução do campo autoriza deixar em branco', () => {
    // Sem isto a notificação empurra o cliente a inventar para calar o alerta —
    // exatamente o que o smartbrand existe para impedir.
    const p = pendencias({ temManual: true, dados: {} })
    expect(p.find(x => x.id.startsWith('campo:')).instrucao).toMatch(/em branco é honesto/)
  })
})

describe('resumo de uma linha', () => {
  it('marca completa não gera resumo', () => {
    expect(resumoPendencias([])).toBeNull()
  })
  it('destaca quantas travam o Estúdio', () => {
    expect(resumoPendencias(pendencias({}))).toMatch(/travam o Estúdio/)
  })
  it('sem pendência alta, fala em completude', () => {
    const so_media = pendencias({ temManual: true, assets: [arquivo()] })
    expect(resumoPendencias(so_media)).toMatch(/para a marca ficar completa/)
  })
})

describe('o campo viaja com o clique', () => {
  it('a pendência carrega o endereço para a tela ancorar nele', () => {
    const p = pendencias({ temManual: true, dados: {} })
    expect(p.find(x => x.id === 'campo:verbal_identity.proposta_valor').campo)
      .toBe('verbal_identity.proposta_valor')
  })
})
