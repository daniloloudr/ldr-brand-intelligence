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

  it('lacunas do manual aparecem nomeadas', () => {
    const p = pendencias({
      temManual: true, assets: [arquivo()],
      lacunas: [{ rotulo: 'Visão' }, { rotulo: 'Hierarquia tipográfica' }, { rotulo: 'Movimento' }, { rotulo: 'Componentes' }],
    })
    const l = p.find(x => x.id === 'lacunas')
    expect(l.titulo).toBe('4 campos não declarados')
    expect(l.porque).toContain('Visão')
    expect(l.porque).toContain('e outros')
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
