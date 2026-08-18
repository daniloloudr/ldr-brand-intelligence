import { describe, it, expect } from 'vitest'
import { pendencias, resumoPendencias } from '../src/lib/pendencias'

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

  it('cada lacuna vira UMA notificação — não uma lista fechada', () => {
    // "19 campos não declarados" não é acionável: ninguém ataca uma lista
    // fechada por partes. Dezenove mensagens, sim.
    const p = pendencias({
      temManual: true, assets: [arquivo()],
      lacunas: [
        { rotulo: 'Visão', secao: 'Essência', campo: 'verbal_identity.visao' },
        { rotulo: 'Movimento', secao: 'Sistema de design', campo: 'design_system.motion' },
      ],
    })
    const so_lacunas = p.filter(x => x.id.startsWith('lacuna:'))
    expect(so_lacunas).toHaveLength(2)
    expect(so_lacunas[0].titulo).toBe('Visão não está declarado')
    expect(so_lacunas[0].id).toBe('lacuna:verbal_identity.visao')
  })

  it('lacuna sem rótulo é ignorada em vez de virar notificação vazia', () => {
    const p = pendencias({ temManual: true, assets: [arquivo()], lacunas: [{}, { rotulo: '' }] })
    expect(p.filter(x => x.id.startsWith('lacuna:'))).toHaveLength(0)
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
    const todas = pendencias({ lacunas: [{ rotulo: 'Visão', secao: 'Essência' }] })
    for (const p of todas) {
      expect(p.destino?.secao, p.id).toBeTruthy()
      expect(p.instrucao?.length, p.id).toBeGreaterThan(30)
    }
  })

  it('o que é arquivo vai para a biblioteca; o que é texto, para a aba certa', () => {
    const p = pendencias({
      temManual: true,
      lacunas: [
        { rotulo: 'Visão', secao: 'Essência' },
        { rotulo: 'Tom de voz', secao: 'Voz' },
        { rotulo: 'Paleta', secao: 'Identidade visual' },
        { rotulo: 'Movimento', secao: 'Sistema de design' },
      ],
    })
    const dest = id => p.find(x => x.id === id).destino
    expect(dest('logo')).toEqual({ secao: 'studio/biblioteca', bibliotecaRoot: 'referencias' })
    expect(p.find(x => x.titulo.startsWith('Visão')).destino.secao).toBe('essencia')
    expect(p.find(x => x.titulo.startsWith('Tom de voz')).destino.secao).toBe('personalidade')
    expect(p.find(x => x.titulo.startsWith('Paleta')).destino.secao).toBe('expression')
    expect(p.find(x => x.titulo.startsWith('Movimento')).destino.secao).toBe('experiencia')
  })

  it('seção desconhecida cai em Essência em vez de quebrar a navegação', () => {
    const p = pendencias({ temManual: true, lacunas: [{ rotulo: 'X', secao: 'Seção Nova' }] })
    expect(p.find(x => x.id.startsWith('lacuna:')).destino.secao).toBe('essencia')
  })

  it('a instrução da lacuna autoriza deixar em branco', () => {
    // Sem isto a notificação empurra o cliente a inventar para calar o alerta —
    // exatamente o que o smartbrand existe para impedir.
    const p = pendencias({ temManual: true, lacunas: [{ rotulo: 'Visão', secao: 'Essência' }] })
    expect(p.find(x => x.id.startsWith('lacuna:')).instrucao).toMatch(/em branco é honesto/)
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
  it('a lacuna carrega o campo para a tela ancorar nele', () => {
    const p = pendencias({
      temManual: true,
      lacunas: [{ rotulo: 'Proposta de valor', secao: 'Posicionamento', campo: 'verbal_identity.proposta_valor' }],
    })
    expect(p.find(x => x.id.startsWith('lacuna:')).campo).toBe('verbal_identity.proposta_valor')
  })

  it('lacuna sem campo não quebra — a faixa do topo dá conta', () => {
    const p = pendencias({ temManual: true, lacunas: [{ rotulo: 'Visão', secao: 'Essência' }] })
    expect(p.find(x => x.id.startsWith('lacuna:')).campo).toBeNull()
  })
})
