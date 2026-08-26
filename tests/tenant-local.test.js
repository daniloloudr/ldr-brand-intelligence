// ════════════════════════════════════════════════════════════════════
// `?tenant=<slug>` em localhost, para quem opera a plataforma.
//
// Pedido do Danilo (26/08): em ambiente local ele precisa abrir qualquer marca
// para acompanhar setup, testar e implementar. O caso que motivou foi a Zétona,
// que nasceu sem ele na lista de membros — e o caminho do subdomínio exige
// participação, então respondia "Sem acesso a esta marca". Corretamente.
//
// A alternativa seria adicioná-lo como membro dos tenants dos clientes, que é
// exatamente o que a separação do super admin (S1) quer desfazer.
//
// O RISCO deste atalho, e por que os testes abaixo existem: `getTenantSlug`
// aceita `?tenant=` em QUALQUER host, inclusive produção — ele nunca conferiu
// o host porque, enquanto o acesso exigia participação, não precisava. Abrir
// exceção sem travar o host transformaria isso num trocador de tenant por URL
// em produção, sem sequer a tarja de impersonação na tela.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { ehAmbienteLocal } from '../src/lib/helpers.js'

const src = readFileSync('src/lib/WorkspaceContext.jsx', 'utf8')
const semComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// A função lê `window` a cada chamada, então basta trocar o stub — não há
// estado de módulo para reimportar.
const comHost = (hostname) => {
  globalThis.window = { location: { hostname, search: '' } }
  return ehAmbienteLocal()
}

afterEach(() => { delete globalThis.window })

describe('a trava de host', () => {
  it('reconhece a máquina de quem desenvolve', () => {
    expect(comHost('localhost')).toBe(true)
    expect(comHost('127.0.0.1')).toBe(true)
  })

  it('NÃO reconhece produção — nem o domínio de sistema, nem um tenant', () => {
    expect(comHost('app.br4ndcode.com')).toBe(false)
    expect(comHost('zetona.br4ndcode.com')).toBe(false)
    expect(comHost('br4ndcode.com')).toBe(false)
  })

  it('não cai em host que apenas CONTÉM "localhost"', () => {
    // `localhost.atacante.com` resolve para o servidor do atacante. Se a
    // checagem fosse por `includes`, ele passaria.
    expect(comHost('localhost.atacante.com')).toBe(false)
    expect(comHost('meu-localhost.com')).toBe(false)
  })
})

describe('o atalho exige as DUAS travas', () => {
  it('confere o host antes de perguntar qualquer coisa ao banco', () => {
    expect(semComentarios, 'o atalho perdeu a trava de host — vale em produção')
      .toMatch(/ehAmbienteLocal\(\)/)
  })

  it('confere platform_admins — não basta estar logado', () => {
    expect(semComentarios).toMatch(/from\('platform_admins'\)/)
  })

  it('a leitura do workspace só acontece se o operador foi confirmado', () => {
    // `operador ? consulta : { data: null }` — se isto virar uma consulta
    // incondicional, qualquer usuário logado abre qualquer marca em localhost.
    // E localhost aponta para o banco de PRODUÇÃO (Supabase único).
    expect(semComentarios, 'a busca do workspace deixou de depender do operador')
      .toMatch(/operador\s*\n?\s*\?\s*await supabase[\s\S]{0,120}from\('workspaces'\)/)
  })

  it('o operador NÃO vira membro — o papel é de tela', () => {
    // O atalho existe justamente para ele não entrar em workspace_members.
    // Um insert aqui desfaria o S1 pela porta dos fundos.
    expect(semComentarios).not.toMatch(/from\('workspace_members'\)[\s\S]{0,80}\.insert/)
  })

  it('o caminho normal continua exigindo participação', () => {
    // O atalho é o ELSE de "não é membro". Se ele passar na frente, todo
    // cliente entraria como dono em qualquer marca.
    const iMembro = semComentarios.indexOf("from('workspace_members')")
    const iAtalho = semComentarios.indexOf('ehAmbienteLocal()')
    expect(iMembro).toBeGreaterThan(-1)
    expect(iAtalho, 'o atalho passou na frente da checagem de participação').toBeGreaterThan(iMembro)
  })
})
