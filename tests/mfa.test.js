// ════════════════════════════════════════════════════════════════════
// SEGUNDO FATOR NO OPERADOR — o degrau existe e ele BLOQUEIA.
//
// A conta com `platform_admins` atravessa a RLS de 15 tabelas: com a sessão
// normal ela lê e escreve o dado de todos os clientes. Uma credencial concentra
// Hering, Worten e Pixel.
//
// O que estes testes seguram, e por quê:
//   · o gate de TELA não é a proteção. Quem tem token roubado não abre o painel
//     — chama a function direto com curl. Por isso cada endpoint de operador
//     confere o `aal` por conta própria;
//   · a leitura do `aal` acontece DEPOIS da validação da assinatura. Ler a
//     claim antes de `getUser` seria confiar em texto escrito pelo cliente;
//   · token ilegível vale aal1. Formato desconhecido não pode virar permissão.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { nivelDoToken, temSegundoFator, exigirSegundoFator } from '../netlify/functions/_mfa.js'

const soCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** JWT de mentira — só o payload importa, a assinatura não é lida aqui. */
const jwt = (payload) =>
  'cabecalho.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.assinatura'

const OPERADOR = [
  'netlify/functions/admin-create-user.js',
  'netlify/functions/admin-create-workspace.js',
  'netlify/functions/admin-invite.js',
  'netlify/functions/admin-list-members.js',
  'netlify/functions/admin-reset-password.js',
]

describe('nivelDoToken — falha fechada', () => {
  it('lê aal2 do payload', () => {
    expect(nivelDoToken(jwt({ aal: 'aal2' }))).toBe('aal2')
    expect(temSegundoFator(jwt({ aal: 'aal2' }))).toBe(true)
  })

  it('aal1 é aal1', () => {
    expect(temSegundoFator(jwt({ aal: 'aal1' }))).toBe(false)
  })

  it('token sem a claim vale aal1 — ausência não é permissão', () => {
    expect(nivelDoToken(jwt({ sub: 'alguem' }))).toBe('aal1')
  })

  for (const [rotulo, valor] of [
    ['vazio', ''], ['nulo', null], ['sem pontos', 'abcdef'],
    ['payload não-base64', 'a.!!!!.c'], ['payload não-JSON', 'a.' + Buffer.from('nada').toString('base64url') + '.c'],
  ]) {
    it(`token ${rotulo} vale aal1`, () => {
      expect(nivelDoToken(valor)).toBe('aal1')
      expect(temSegundoFator(valor)).toBe(false)
    })
  }

  it('aal2 escrito de outro jeito não passa', () => {
    // Nada de comparação frouxa: só a string exata libera.
    for (const v of ['AAL2', 'aal2 ', 'aal3', true, 2]) {
      expect(temSegundoFator(jwt({ aal: v })), `"${v}" não deveria liberar`).toBe(false)
    }
  })
})

describe('exigirSegundoFator — a resposta', () => {
  it('deixa passar quem tem o degrau', () => {
    expect(exigirSegundoFator(jwt({ aal: 'aal2' }), {})).toBeNull()
  })

  it('barra com 403 e diz que é MFA, não login', () => {
    const r = exigirSegundoFator(jwt({ aal: 'aal1' }), {})
    expect(r.statusCode).toBe(403)          // credencial válida, falta o degrau
    expect(JSON.parse(r.body).precisa_mfa).toBe(true)
  })
})

describe('todo endpoint de operador exige o degrau', () => {
  for (const arq of OPERADOR) {
    it(arq.replace('netlify/functions/', ''), () => {
      const src = soCodigo(readFileSync(arq, 'utf8'))
      expect(src, `${arq} não exige segundo fator`).toMatch(/exigirSegundoFator\(/)
      expect(src, `${arq} não retorna a recusa`).toMatch(/if \(semFator\) return semFator/)

      // Ordem: a assinatura é validada (getUser) ANTES de a claim ser lida.
      const posGetUser = src.indexOf('getUser(')
      const posMfa     = src.indexOf('exigirSegundoFator(')
      expect(posGetUser, `${arq}: sem getUser`).toBeGreaterThan(-1)
      expect(posMfa, `${arq}: aal lido antes de validar a assinatura`).toBeGreaterThan(posGetUser)
    })
  }
})

describe('o gate de tela existe — mas é o complemento, não a proteção', () => {
  it('/admin não monta sem aal2', () => {
    const app = soCodigo(readFileSync('src/App.jsx', 'utf8'))
    const bloco = app.slice(app.indexOf('ADMIN_ROUTES.includes(route)'))
    expect(bloco).toMatch(/if \(!mfaOk\)/)
    expect(bloco).toMatch(/MfaGate/)
    // O gate vem DEPOIS de confirmar que é operador: pedir MFA a quem nem é
    // admin revelaria quem é.
    expect(bloco.indexOf('!isAdmin')).toBeLessThan(bloco.indexOf('!mfaOk'))
  })

  it('o segundo fator não se herda entre usuários', () => {
    const app = soCodigo(readFileSync('src/App.jsx', 'utf8'))
    expect(app).toMatch(/setMfaOk\(false\)/)
  })
})

// ── MFA é OPCIONAL para o cliente (decisão do Danilo, 24/ago) ────────
// A única conta em que é obrigatório é a de operador. Forçar o cliente seria
// mudar o contrato de acesso de gente que já está usando — e no meio de uma
// semana de setup de três clientes.
describe('para o cliente o segundo fator é opcional', () => {
  const app  = soCodigo(readFileSync('src/App.jsx', 'utf8'))
  const gate = soCodigo(readFileSync('src/pages/auth/MfaGate.jsx', 'utf8'))
  const conta = soCodigo(readFileSync('src/pages/app/WorkspacePage.jsx', 'utf8'))

  it('sem fator inscrito e sem obrigatoriedade, o gate libera na hora', () => {
    // Esta linha é a diferença entre "opcional" e "obrigatório para todos".
    expect(gate).toMatch(/if \(!obrigatorio\) return onLiberado\(\)/)
    // E ela vem ANTES de qualquer inscrição.
    expect(gate.indexOf('if (!obrigatorio) return onLiberado()'))
      .toBeLessThan(gate.indexOf('await inscrever()'))
  })

  it('só a rota de admin passa `obrigatorio`', () => {
    const admin = app.slice(app.indexOf('ADMIN_ROUTES.includes(route)'))
    const cliente = app.slice(app.indexOf('WORKSPACE_ROUTES.includes(route)'),
                              app.indexOf('ADMIN_ROUTES.includes(route)'))
    expect(admin, 'o /admin deixou de exigir').toMatch(/<MfaGate obrigatorio/)
    expect(cliente, 'o app do cliente passou a EXIGIR segundo fator').not.toMatch(/obrigatorio/)
  })

  it('o cliente tem como ligar por conta própria', () => {
    expect(conta).toMatch(/function SegundoFator/)
    expect(conta).toMatch(/mfa\.inscrever\(\)/)
    expect(conta).toMatch(/mfa\.desligar\(\)/)
  })

  it('quem LIGOU é verificado — senão a sessão dele cai em 15 min', () => {
    // "Limit duration of AAL1 sessions" está ativo no Supabase: sessão com
    // fator inscrito e não verificada é encerrada. Sem o gate na rota do
    // cliente, ligar o MFA viraria queda de sessão a cada quarto de hora.
    const cliente = app.slice(app.indexOf('WORKSPACE_ROUTES.includes(route)'),
                              app.indexOf('ADMIN_ROUTES.includes(route)'))
    expect(cliente).toMatch(/if \(!mfaOk\)/)
    expect(cliente).toMatch(/MfaGate/)
  })
})
