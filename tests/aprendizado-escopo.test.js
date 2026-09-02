import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────
// §3.5: "o que a campanha aprendeu permanece NELA (…) não sobe para a marca".
// Essa frase não é um filtro de exibição — é a diferença entre uma decisão
// reversível e um estrago permanente. Se o sinal de campanha entrasse na
// destilação da marca, encerrar a campanha não desfaria nada: o aprendizado já
// estaria dentro do modelo, e reabrir não teria o que reativar. É o mesmo
// caminho que deixou os 24 sinais contaminados dentro de quatro marcas.
//
// Aqui as duas funções do núcleo rodam de verdade, com Supabase e IA dublados,
// e a asserção é sobre o EFEITO: o que foi LIDO e o que foi GRAVADO.

const consultas  = []   // toda leitura, com os filtros aplicados
const gravacoes  = []   // toda escrita
let modeloDoLLM  = { voz: { valor: 'a voz', confianca: 0.8 } }
let mundo = {}

vi.mock('../netlify/functions/_ai.js', () => ({
  callAI: vi.fn(async () => ({ text: JSON.stringify(modeloDoLLM) })),
  MODELS: { smart: 'm', medium: 'm' },
  isDev: () => false,
  extractJSON: (t) => { try { return JSON.parse(t) } catch { return null } },
}))
vi.mock('../netlify/functions/_embed.js', () => ({
  voyageEmbed: vi.fn(async () => [[0.1]]),
  embedIntelChunks: vi.fn(async (_s, brand_id, modelo) => {
    gravacoes.push({ op: 'embed', brand_id, modelo }); return 1
  }),
}))

// Cliente dublado: encadeável e THENABLE (o _brain.js aguarda a query direto,
// sem .single()), e registra os filtros — é neles que o escopo se prova.
function supa() {
  const from = (tabela) => {
    const filtros = {}
    const q = {
      select() { return q },
      order()  { return q },
      limit()  { return q },
      not()    { return q },
      gte()    { return q },
      eq(col, val) { filtros[col] = val; return q },
      is(col, val) { filtros[col] = val; return q },
      in(col, val) { filtros[col] = val; return q },
      insert(linha) { gravacoes.push({ op: 'insert', tabela, linha }); return Promise.resolve({ error: null }) },
      update(linha) { gravacoes.push({ op: 'update', tabela, linha }); return q },
      resolver() {
        consultas.push({ tabela, filtros: { ...filtros } })
        const fonte = mundo[tabela]
        return typeof fonte === 'function' ? fonte(filtros) : (fonte ?? null)
      },
      async maybeSingle() { const d = q.resolver(); if (d?.__erro) return { data: null, error: d.__erro }
                            return { data: Array.isArray(d) ? (d[0] ?? null) : d, error: null } },
      async single()      { const d = q.resolver(); if (d?.__erro) return { data: null, error: d.__erro }
                            return { data: Array.isArray(d) ? (d[0] ?? null) : d, error: null } },
      then(res, rej) {
        const d = q.resolver()
        const r = d?.__erro
          ? { data: null, error: d.__erro }
          : { data: Array.isArray(d) ? d : (d ? [d] : []), error: null }
        return Promise.resolve(r).then(res, rej)
      },
    }
    return q
  }
  return { from }
}

const { resolveBrandIntelligence, distillBrand } = await import('../netlify/functions/_brain.js')

const MARCA = 'marca-1'
const CAMP  = 'campanha-1'
const modeloMarca    = { voz: { valor: 'a marca fala assim' }, do_dont: { do: ['DA MARCA'], dont: [] } }
const modeloCampanha = { voz: { valor: 'a campanha fala assim' }, do_dont: { do: ['DA CAMPANHA'], dont: [] } }

const versoes = [
  { campanha_id: null,  versao: 7, modelo: modeloMarca,    created_at: '2026-08-01' },
  { campanha_id: CAMP,  versao: 2, modelo: modeloCampanha, created_at: '2026-08-20' },
]

function mundoBase({ statusDaCampanha = 'ativa', sinais = [] } = {}) {
  return {
    brand_books:   [],
    design_tokens: [],
    brands:        { id: MARCA, nome: 'Hering', workspace_id: 'ws-1' },
    brand_intelligence: (f) => versoes.filter(v =>
      v.campanha_id === (f.campanha_id === undefined ? v.campanha_id : f.campanha_id)),
    studio_campaigns: { status: statusDaCampanha, vigencia_inicio: '2026-09-01', vigencia_fim: '2026-09-30' },
    studio_generations: [],
    brand_signals: (f) => sinais.filter(s => (s.campanha_id ?? null) === (f.campanha_id ?? null)),
  }
}

const filtrosDe = (tabela) => consultas.filter(c => c.tabela === tabela).map(c => c.filtros)

beforeEach(() => { consultas.length = 0; gravacoes.length = 0 })

describe('resolveBrandIntelligence — o escopo é portão de LEITURA', () => {
  it('sem campanha: entra só o modelo da marca, e ele é buscado com escopo null', async () => {
    mundo = mundoBase()
    const { prefix, snapshot } = await resolveBrandIntelligence(supa(), MARCA, 'Hering')
    expect(prefix).toContain('DA MARCA')
    expect(prefix).not.toContain('DA CAMPANHA')
    expect(snapshot.intelligence_versao).toBe(7)
    // O filtro é o que impede a versão de campanha de ser lida como "a última".
    expect(filtrosDe('brand_intelligence')[0].campanha_id).toBeNull()
  })

  it('campanha ATIVA: os dois modelos entram, e o da campanha vem rotulado', async () => {
    mundo = mundoBase({ statusDaCampanha: 'ativa' })
    const { prefix, snapshot } = await resolveBrandIntelligence(supa(), MARCA, 'Hering', undefined, { campanha_id: CAMP })
    expect(prefix).toContain('DA MARCA')
    expect(prefix).toContain('DA CAMPANHA')
    expect(prefix).toContain('vale enquanto o escopo estiver ativo')
    expect(snapshot.campanha_intelligence_versao).toBe(2)
  })

  it('campanha ENCERRADA: o aprendizado dela NÃO alimenta peça nova (§3.5)', async () => {
    mundo = mundoBase({ statusDaCampanha: 'encerrada' })
    const { prefix, snapshot } = await resolveBrandIntelligence(supa(), MARCA, 'Hering', undefined, { campanha_id: CAMP })
    expect(prefix).toContain('DA MARCA')
    expect(prefix).not.toContain('DA CAMPANHA')
    expect(snapshot.campanha_intelligence_versao).toBeUndefined()
    // e nem chegou a buscar a versão da campanha — encerrada é encerrada
    expect(filtrosDe('brand_intelligence').some(f => f.campanha_id === CAMP)).toBe(false)
  })

  it('campanha em RASCUNHO também não entra — só `ativa` liga', async () => {
    mundo = mundoBase({ statusDaCampanha: 'rascunho' })
    const { prefix } = await resolveBrandIntelligence(supa(), MARCA, 'Hering', undefined, { campanha_id: CAMP })
    expect(prefix).not.toContain('DA CAMPANHA')
  })

  it('reabrir REATIVA — é o mesmo escopo, e o portão é de leitura', async () => {
    mundo = mundoBase({ statusDaCampanha: 'encerrada' })
    const fechada = await resolveBrandIntelligence(supa(), MARCA, 'Hering', undefined, { campanha_id: CAMP })
    mundo = mundoBase({ statusDaCampanha: 'ativa' })
    const reaberta = await resolveBrandIntelligence(supa(), MARCA, 'Hering', undefined, { campanha_id: CAMP })
    expect(fechada.prefix).not.toContain('DA CAMPANHA')
    expect(reaberta.prefix).toContain('DA CAMPANHA')
  })
})

describe('distillBrand — o escopo é portão de LEITURA DO SINAL', () => {
  const sinalDaMarca    = { id: 's1', tipo: 'image_vote', ref_id: 'g1', payload: { voto: 'up' }, peso: 2, created_at: '2026-08-30', workspace_id: 'ws-1', campanha_id: null }
  const sinalDaCampanha = { id: 's2', tipo: 'image_vote', ref_id: 'g2', payload: { voto: 'up' }, peso: 2, created_at: '2026-08-30', workspace_id: 'ws-1', campanha_id: CAMP }

  it('a destilação da MARCA não lê nem consome sinal de campanha', async () => {
    mundo = mundoBase({ sinais: [sinalDaMarca, sinalDaCampanha] })
    const r = await distillBrand(supa(), MARCA)
    expect(r.status).toBe('ok')

    expect(filtrosDe('brand_signals')[0].campanha_id).toBeNull()
    const consumo = gravacoes.find(g => g.op === 'update' && g.tabela === 'brand_signals')
    expect(consumo).toBeTruthy()
    const versaoNova = gravacoes.find(g => g.op === 'insert' && g.tabela === 'brand_intelligence')
    expect(versaoNova.linha.gerado_de.signal_ids).toEqual(['s1'])   // s2 ficou de fora
    expect(versaoNova.linha.campanha_id).toBeUndefined()
  })

  it('a destilação da CAMPANHA grava numa linha de versões própria, com vigência', async () => {
    mundo = mundoBase({ sinais: [sinalDaMarca, sinalDaCampanha] })
    const r = await distillBrand(supa(), MARCA, { campanha_id: CAMP })
    expect(r.status).toBe('ok')

    const versaoNova = gravacoes.find(g => g.op === 'insert' && g.tabela === 'brand_intelligence')
    expect(versaoNova.linha.campanha_id).toBe(CAMP)
    expect(versaoNova.linha.gerado_de.signal_ids).toEqual(['s2'])
    expect(versaoNova.linha.versao).toBe(3)             // continua a linha DA CAMPANHA (v2 → v3)
    expect(versaoNova.linha.vigencia_fim).toBe('2026-09-30')
  })

  it('modelo de campanha NÃO reescreve o RAG semântico da marca', async () => {
    mundo = mundoBase({ sinais: [sinalDaCampanha] })
    await distillBrand(supa(), MARCA, { campanha_id: CAMP })
    expect(gravacoes.some(g => g.op === 'embed')).toBe(false)

    gravacoes.length = 0
    mundo = mundoBase({ sinais: [sinalDaMarca] })
    await distillBrand(supa(), MARCA)
    expect(gravacoes.some(g => g.op === 'embed')).toBe(true)
  })

  it('o destilador é AVISADO de que o escopo é de campanha', async () => {
    const { callAI } = await import('../netlify/functions/_ai.js')
    callAI.mockClear()
    mundo = mundoBase({ sinais: [sinalDaCampanha] })
    await distillBrand(supa(), MARCA, { campanha_id: CAMP })
    const conteudo = callAI.mock.calls[0][0].messages[0].content
    expect(conteudo).toContain('ESCOPO')
    expect(conteudo).toContain('sem generalizar para regra de marca')
    // a instrução de formato não pode ter sido perdida no caminho
    expect(conteudo).toContain('JSON estrito')
  })

  // A coluna `campanha_id` só existe depois da 058. Entre subir o código e
  // aplicar a migration, a leitura de sinais falha — e responder 'no_signals'
  // aí seria silêncio IDÊNTICO ao de uma marca sem novidade. O cron acharia que
  // está tudo bem, a destilação pararia, e ninguém teria como notar.
  it('falha ao LER sinais não pode se passar por "sem sinais novos"', async () => {
    mundo = mundoBase({ sinais: [sinalDaMarca] })
    mundo.brand_signals = () => ({ __erro: { message: 'column brand_signals.campanha_id does not exist' } })
    const r = await distillBrand(supa(), MARCA)
    expect(r.status).not.toBe('no_signals')
    expect(r.status).not.toBe('ok')
    expect(r.message).toContain('campanha_id')
    expect(gravacoes.some(g => g.op === 'insert')).toBe(false)
  })

  it('escopo sem sinal novo não inventa versão', async () => {
    mundo = mundoBase({ sinais: [sinalDaMarca] })
    const r = await distillBrand(supa(), MARCA, { campanha_id: CAMP })
    expect(r.status).toBe('no_signals')
    expect(gravacoes.some(g => g.op === 'insert')).toBe(false)
  })
})
