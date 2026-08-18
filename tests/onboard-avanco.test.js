import { describe, it, expect, vi, beforeEach } from 'vitest'

// O alerta sai pelo watchdog, que abre a própria conexão com o Supabase.
// Aqui interessa SE ele foi chamado e com o quê, não o envio.
const alertas = []
vi.mock('../netlify/functions/_watchdog.js', () => ({
  sendAlert: async (cron, tipo, motivo) => { alertas.push({ cron, tipo, motivo }); return true },
}))

const { avancarOnboarding } = await import('../netlify/functions/_onboard.js')

/* ─── Arnês ──────────────────────────────────────────────────────────
   Supabase de mentira, chainável e thenable: as queries do _onboard.js são
   ora `await q`, ora `await q.single()`, ora com { count, head }. */
function fakeSupabase(cfg = {}) {
  const escritas = []
  const from = (table) => {
    let modo = 'select', querCount = false
    const resolver = () => {
      if (modo === 'update' && table === 'workspaces') return { data: [{ id: 'w1' }], error: null }
      if (modo !== 'select') return { data: null, error: null }
      if (querCount)                    return { count: cfg.counts?.[table] ?? 0, error: null }
      if (table === 'workspaces')       return { data: cfg.ws }
      if (table === 'brand_manual_jobs')return { data: cfg.jobs || [] }
      if (table === 'diagnosticos')     return { data: cfg.diag || null }
      return { data: cfg.rows?.[table] || [] }
    }
    const q = {
      select: (_c, opts) => { if (opts?.head) querCount = true; return q },
      eq: () => q, gte: () => q, lte: () => q, order: () => q, limit: () => q,
      is: () => q, not: () => q,
      update: (patch) => { modo = 'update'; escritas.push({ table, patch }); return q },
      insert: (rows)  => { modo = 'insert'; escritas.push({ table, rows });  return q },
      delete: ()      => { modo = 'delete'; return q },
      single:     async () => resolver(),
      maybeSingle: async () => resolver(),
      then: (ok, err) => Promise.resolve(resolver()).then(ok, err),
    }
    return q
  }
  return { from, escritas }
}

// Estado de onboarding com a inteligência na etapa pedida e a marca esperando.
const estado = (over = {}) => ({
  started_at: new Date().toISOString(),
  brand_id: 'b1',
  steps: { brand: 'waiting', diagnostico: 'pending', concorrentes: 'pending',
           mineracao: 'pending', sinteses: 'pending', destilacao: 'pending' },
  notas: {}, fases: {}, rev: 0,
  ...over,
})

const rodar = async (cfg) => {
  const supabase = fakeSupabase(cfg)
  const r = await avancarOnboarding(supabase, { workspaceId: 'w1' })
  return { ...r, escritas: supabase.escritas }
}

// fetch de mentira: registra o despacho e responde o que o teste mandar
let despachados = []
const stubFetch = (aceita = () => true) => {
  despachados = []
  globalThis.fetch = async (url) => {
    const fn = String(url).split('/').pop()
    despachados.push(fn)
    return { ok: aceita(fn), status: aceita(fn) ? 202 : 500 }
  }
}

beforeEach(() => { alertas.length = 0; despachados = [] })

describe('partida — o que não depende de concorrentes sai na frente', () => {
  it('tendências e escuta saem JUNTO com o diagnóstico', async () => {
    stubFetch()
    const r = await rodar({ ws: { id: 'w1', nome: 'Vhita', onboarding: estado() } })

    expect(despachados).toContain('diagnostico-gerar-background')
    expect(despachados).toContain('trends-workspace-background')
    expect(despachados).toContain('listening-coletar-background')
    // clipping e rivais NÃO: eles precisam da lista de concorrentes, que ainda
    // não existe — despachá-los aqui seria minerar o vazio.
    expect(despachados).not.toContain('clipping-workspace-background')
    expect(r.onboarding.livres).toBe(true)
  })

  it('a mineração não repete o que já saiu na partida', async () => {
    stubFetch()
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        livres: true,
        steps: { ...estado().steps, diagnostico: 'done', concorrentes: 'done' },
      }) },
    })
    expect(despachados).toContain('clipping-workspace-background')
    expect(despachados).toContain('diagnostico-concorrentes-workspace-background')
    expect(despachados).not.toContain('trends-workspace-background')
    expect(r.onboarding.steps.mineracao).toBe('running')
  })

  it('se os livres foram recusados na partida, a mineração reenvia', async () => {
    // Sem isto a mineração esperaria para sempre um sinal que ninguém pediu.
    stubFetch()
    await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        livres: false,
        steps: { ...estado().steps, diagnostico: 'done', concorrentes: 'done' },
      }) },
    })
    expect(despachados).toContain('trends-workspace-background')
    expect(despachados).toContain('listening-coletar-background')
  })

  it('recusa parcial na partida não marca os livres como despachados', async () => {
    stubFetch(fn => fn === 'diagnostico-gerar-background')
    const r = await rodar({ ws: { id: 'w1', nome: 'Vhita', onboarding: estado() } })
    expect(r.onboarding.steps.diagnostico).toBe('running')
    expect(r.onboarding.livres).toBe(false)
  })
})

describe('relógio da marca — o manual chega quando chega', () => {
  const horasAtras = (h) => new Date(Date.now() - h * 3600_000).toISOString()

  it('extração que acabou de começar NÃO expira, mesmo com a inteligência antiga', async () => {
    // O bug: `fases.marca` nunca era carimbado enquanto a trilha esperava, e o
    // relógio caía no `phase_at`, que a inteligência sobrescreve. Manual que
    // chegasse horas depois era declarado expirado no primeiro tick.
    stubFetch()
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        steps: { ...estado().steps, brand: 'waiting' },
        phase_at: horasAtras(5),        // última transição da inteligência
        fases: { inteligencia: horasAtras(5) },
      }) },
      jobs: [{ status: 'processing' }],
    })

    expect(r.onboarding.steps.brand).toBe('waiting')
    expect(r.onboarding.fases.marca).toBeTruthy()   // relógio começou agora
    expect(alertas).toHaveLength(0)
  })

  it('extração parada além do teto expira — o relógio existe para isso', async () => {
    stubFetch()
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        steps: { ...estado().steps, brand: 'waiting' },
        fases: { marca: horasAtras(2) },   // começou há 2h e nada voltou
      }) },
      jobs: [{ status: 'processing' }],
    })
    expect(r.onboarding.steps.brand).toBe('expired')
    expect(r.onboarding.notas.brand).toMatch(/não terminou a tempo/)
  })

  it('esperar o manual não faz o relógio andar', async () => {
    stubFetch()
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        steps: { ...estado().steps, brand: 'waiting' },
        phase_at: horasAtras(48),
      }) },
      jobs: [],                            // nenhum manual ainda
    })
    expect(r.onboarding.steps.brand).toBe('waiting')
    expect(r.onboarding.fases.marca).toBeUndefined()
  })
})

describe('retentativa — um "não" não é o fim', () => {
  it('primeiro despacho recusado deixa a etapa pendente, não falha', async () => {
    stubFetch(() => false)
    const r = await rodar({ ws: { id: 'w1', nome: 'Vhita', onboarding: estado() } })

    expect(r.onboarding.steps.diagnostico).toBe('pending')
    expect(r.onboarding.tentativas.diagnostico).toBe(1)
    expect(r.onboarding.notas.diagnostico).toMatch(/tentativa 1 de 3/)
    expect(alertas).toHaveLength(0)   // ainda não é notícia
  })

  it('no teto de tentativas a etapa falha de vez', async () => {
    stubFetch(() => false)
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({ tentativas: { diagnostico: 2 } }) },
    })

    expect(r.onboarding.steps.diagnostico).toBe('failed')
    expect(r.onboarding.notas.diagnostico).toMatch(/3 tentativas/)
    expect(r.ok).toBe(false)
  })

  it('a contagem é por etapa — uma não gasta a chance da outra', async () => {
    stubFetch(() => false)
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        tentativas: { mineracao: 2 },
        steps: { ...estado().steps, diagnostico: 'pending' },
      }) },
    })
    expect(r.onboarding.steps.diagnostico).toBe('pending')
    expect(r.onboarding.tentativas.diagnostico).toBe(1)
    expect(r.onboarding.tentativas.mineracao).toBe(2)
  })
})

describe('alerta — falha de setup deixa de ser invisível', () => {
  it('etapa que falha de vez dispara alerta com nome do workspace', async () => {
    stubFetch(() => false)
    await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({ tentativas: { diagnostico: 2 } }) },
    })

    expect(alertas).toHaveLength(1)
    expect(alertas[0].cron).toBe('onboard')
    expect(alertas[0].tipo).toContain('etapa-falhou')
    expect(alertas[0].tipo).toContain('w1')      // dedup é por workspace
    expect(alertas[0].motivo).toContain('Vhita')
    expect(alertas[0].motivo).toContain('diagnostico')
  })

  it('manual que falhou na extração também alerta', async () => {
    stubFetch()
    await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({ steps: { ...estado().steps, brand: 'pending' } }) },
      jobs: [{ status: 'error' }],
    })
    expect(alertas.some(a => a.motivo.includes('brand'))).toBe(true)
  })

  it('esperar o manual NÃO alerta — é o combinado, não uma falha', async () => {
    stubFetch()
    await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({ steps: { ...estado().steps, brand: 'pending' } }) },
      jobs: [],
    })
    expect(alertas).toHaveLength(0)
  })

  it('ambiente que termina com pendência avisa uma vez só', async () => {
    stubFetch()
    // Tudo terminal, com uma expiração: nada novo falhou nesta chamada, mas o
    // conjunto terminou torto — é a hora de alguém olhar antes de liberar.
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        steps: { brand: 'done', diagnostico: 'done', concorrentes: 'done',
                 mineracao: 'expired', sinteses: 'done', destilacao: 'running' },
      }) },
      counts: { brand_intelligence: 1 },
    })

    expect(r.complete).toBe(true)
    expect(r.ok).toBe(false)
    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toContain('ambiente-com-pendencia')
    expect(alertas[0].motivo).toContain('mineracao')
  })

  it('ambiente que termina limpo não alerta nada', async () => {
    stubFetch()
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        steps: { brand: 'done', diagnostico: 'done', concorrentes: 'done',
                 mineracao: 'done', sinteses: 'done', destilacao: 'running' },
      }) },
      counts: { brand_intelligence: 1 },
    })
    expect(r.complete).toBe(true)
    expect(r.ok).toBe(true)
    expect(alertas).toHaveLength(0)
  })
})

describe('a semeadura não pode adiantar o relógio da marca', () => {
  // O bug que a revisão do setup encontrou: a criação do workspace carimbava
  // `fases.marca`, e a guarda que faz o relógio começar na extração
  // (`!onb.fases.marca`) nunca disparava. Um manual chegando dias depois
  // nascia com o teto de 20 min já estourado.
  const semeadoNaCriacao = { inteligencia: '2026-08-01T10:00:00Z' }

  it('workspace novo sem manual não tem relógio de marca', () => {
    expect(semeadoNaCriacao.marca).toBeUndefined()
  })

  it('e por isso a extração que começa depois é que carimba', async () => {
    stubFetch()
    const r = await rodar({
      ws: { id: 'w1', nome: 'Vhita', onboarding: estado({
        steps: { ...estado().steps, brand: 'waiting' },
        fases: semeadoNaCriacao,                       // como a criação deixa
        phase_at: new Date(Date.now() - 72 * 3600_000).toISOString(),  // 3 dias
      }) },
      jobs: [{ status: 'processing' }],
    })
    expect(r.onboarding.steps.brand).toBe('waiting')   // não expirou
    expect(r.onboarding.fases.marca).toBeTruthy()      // relógio começou agora
  })
})
