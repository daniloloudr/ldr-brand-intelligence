import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────
// A varredura de mutação reprovou meu primeiro teste da guarda: trocando
// `if (!conferencia.ok)` por `if (false)`, a suíte continuou verde. O teste
// verificava que a guarda ESTAVA LÁ, não que ela BLOQUEIA — e essa diferença é
// exatamente a que separa teste de teatro.
//
// Aqui o handler roda de verdade, com Supabase e IA dublados, e a asserção é
// sobre o EFEITO: o diagnóstico errado não pode virar registro `done`.

const gravacoes = []                    // tudo que o handler tentou escrever
let respostaDoModelo = ''

vi.mock('../netlify/functions/_ai.js', () => ({
  streamAI:   vi.fn(async () => respostaDoModelo),
  callAI:     vi.fn(),
  aiConfig:   () => ({ model: 'x', tools: [], maxTokens: 100 }),
  extractJSON: (t) => { try { const i = t.indexOf('{'), j = t.lastIndexOf('}'); return JSON.parse(t.slice(i, j + 1)) } catch { return null } },
  MODELS: {}, TOOLS: {}, isDev: () => false,
}))

vi.mock('../netlify/functions/_prompt.js', () => ({ SYSTEM_PROMPT: 'sistema' }))

// Cliente Supabase dublado: encadeável como o de verdade, e registra as escritas.
const WORKSPACE = { id: 'ws-pixel', nome: 'Pixel', dominio: 'www.pixelretail.com.br', diagnosticos_mes: 0 }
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'danilo@loudr.com.br', user_metadata: {} } }, error: null }) },
    from(tabela) {
      const q = {
        _tabela: tabela,
        select() { return q }, eq() { return q }, limit() { return q },
        maybeSingle: async () => ({ data: tabela === 'workspace_members' ? { role: 'admin' } : null }),
        single:      async () => ({ data: tabela === 'workspaces' ? WORKSPACE : null }),
        insert(linha) { gravacoes.push({ op: 'insert', tabela, linha }); return { ...q, catch: () => {}, select: () => ({ single: async () => ({ data: { id: 'd1' }, error: null }) }) } },
        update(linha) { gravacoes.push({ op: 'update', tabela, linha }); return { ...q, eq: async () => ({ error: null }), catch: () => {} } },
      }
      return q
    },
  }),
}))

const { handler } = await import('../netlify/functions/diagnostico-gerar-background.js')

const chamar = () => handler({
  httpMethod: 'POST',
  headers: { authorization: 'Bearer t' },
  body: JSON.stringify({ workspace_id: 'ws-pixel' }),
})

const gravadosComoProntos = () => gravacoes.filter(g =>
  g.tabela === 'diagnosticos' && g.linha?.status === 'done')

beforeEach(() => { gravacoes.length = 0 })

describe('a guarda BLOQUEIA — não apenas existe', () => {
  it('diagnóstico de outra empresa não vira registro pronto', async () => {
    // Resposta literal do modelo no caso Pixel, de produção.
    respostaDoModelo = JSON.stringify({
      empresa: 'Pixel Agência Digital',
      dominio: 'agenciapx.com / agenciapixel.digital',
      setor: 'Marketing Digital', porte: 'PME',
      score_singularidade: 3, score_consistencia: 4, score_posicionamento: 3,
      frase_diagnostico: 'Uma marca com nome genérico…',
    })
    await chamar()

    expect(gravadosComoProntos()).toEqual([])          // nada entregue ao cliente
    const erro = gravacoes.find(g => g.linha?.status === 'error')
    expect(erro).toBeTruthy()
    // A mensagem precisa dizer QUAL das duas recusas foi: "achei outra empresa"
    // some quando se informa o domínio; "não achei material" não some com
    // contexto nenhum (caso costclarity.com, 19/08). Confundir as duas manda o
    // usuário para o lado errado.
    expect(erro.linha.data.error).toMatch(/voltou sobre OUTRA empresa/)
    expect(erro.linha.data.error).toMatch(/agenciapx\.com/)
    expect(erro.linha.data.error).toMatch(/informe o domínio junto/)
  })

  it('diagnóstico da empresa certa é gravado normalmente', async () => {
    respostaDoModelo = JSON.stringify({
      empresa: 'Pixel Retail', dominio: 'pixelretail.com.br',
      setor: 'Retail Media', porte: 'PME',
      score_singularidade: 6, score_consistencia: 7, score_posicionamento: 6,
      frase_diagnostico: 'Uma marca com território definido…',
    })
    await chamar()

    const prontos = gravadosComoProntos()
    expect(prontos).toHaveLength(1)
    // E a identidade gravada é a da ENTRADA, não a que o modelo escreveu.
    expect(prontos[0].linha.empresa).toBe('Pixel')
    expect(prontos[0].linha.dominio).toBe('pixelretail.com.br')
    expect(prontos[0].linha.data._identidade).toMatchObject({ ok: true, verificado: true })
  })

  it('o registro diz se a identidade foi conferida de fato', async () => {
    // Sem prova de conferência, um `done` não distingue "verificado" de
    // "passou porque não deu para verificar".
    respostaDoModelo = JSON.stringify({ empresa: 'Pixel Retail', setor: 'x', porte: 'PME' })
    await chamar()
    const p = gravadosComoProntos()[0]
    expect(p.linha.data._identidade.verificado).toBe(false)
  })
})
