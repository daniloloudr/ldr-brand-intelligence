import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────
// O studio-baixar roda com a service key — a RLS não o alcança. As três
// travas do cabeçalho dele (token, origem da URL, participação no workspace)
// são código comum de função, e a varredura de mutação mostrou que duas não
// tinham teste nenhum: dava para virar buscador de URL arbitrária no nosso
// domínio, e entregador de peça de cliente alheio, sem um vermelho sequer.

let usuario, geracao, membro, admin

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => usuario },
    from: (tabela) => {
      const q = {
        select() { return q }, eq() { return q },
        maybeSingle: async () => ({
          data: tabela === 'studio_generations' ? geracao
              : tabela === 'workspace_members'  ? membro
              : tabela === 'platform_admins'    ? admin
              : null,
        }),
      }
      return q
    },
  }),
}))

globalThis.fetch = vi.fn(async () => ({
  ok: true, status: 200,
  headers: { get: () => 'image/png' },
  arrayBuffer: async () => new ArrayBuffer(4),
}))

const { handler } = await import('../netlify/functions/studio-baixar.js')

const pedir = () => handler({
  httpMethod: 'GET',
  headers: { authorization: 'Bearer token-de-teste' },
  queryStringParameters: { generation_id: 'g1' },
})

beforeEach(() => {
  process.env.R2_PUBLIC_URL = 'https://pub-abc.r2.dev'
  process.env.SUPABASE_URL  = 'https://xyz.supabase.co'
  usuario = { data: { user: { id: 'u1' } }, error: null }
  geracao = { image_url: 'https://pub-abc.r2.dev/pecas/p.png', workspace_id: 'w1' }
  membro  = { user_id: 'u1' }
  admin   = null
  globalThis.fetch.mockClear()
})

describe('as três travas do proxy de download', () => {
  it('membro do workspace baixa a própria peça', async () => {
    const r = await pedir()
    expect(r.statusCode).toBe(200)
    expect(r.isBase64Encoded).toBe(true)
  })

  it('⭐ URL fora do nosso bucket é recusada SEM fetch — não somos buscador de URL', async () => {
    geracao = { ...geracao, image_url: 'https://alvo-interno.example.com/segredo.png' }
    const r = await pedir()
    expect(r.statusCode).toBe(400)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('host que só COMEÇA com o nosso não passa — pub-abc.r2.dev.evil.com', async () => {
    geracao = { ...geracao, image_url: 'https://pub-abc.r2.dev.evil.com/p.png' }
    expect((await pedir()).statusCode).toBe(400)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('⭐ quem não participa do workspace recebe 403 — peça de cliente não vaza', async () => {
    membro = null
    const r = await pedir()
    expect(r.statusCode).toBe(403)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('operador da plataforma baixa sem participação — é o bypass declarado', async () => {
    membro = null; admin = { id: 'a1' }
    expect((await pedir()).statusCode).toBe(200)
  })

  it('sem token é 401 antes de qualquer consulta', async () => {
    const r = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { generation_id: 'g1' } })
    expect(r.statusCode).toBe(401)
  })
})
