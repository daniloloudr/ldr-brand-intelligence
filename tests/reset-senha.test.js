// ════════════════════════════════════════════════════════════════════
// REDEFINIR SENHA — quem pode, em quem, e com que gerador.
//
// A capacidade já existia escondida: o `admin-create-user` redefine a senha
// quando o e-mail informado já existe. Ou seja, "criar acesso" com um caractere
// a mais num endereço real trocava a credencial de uma pessoa de verdade, sem
// intenção e sem aviso. Virou ação com nome próprio (24/08).
//
// O que estes testes seguram:
//   · só o operador da plataforma chega lá — dono de tenant não redefine senha
//     de ninguém (isso seria tomada de conta, ver workspace-create-user);
//   · um operador não redefine a senha de OUTRO operador (takeover lateral);
//   · a senha nasce transitória (must_change_password);
//   · o gerador é criptográfico. Era `Math.random()`, que é previsível — dá para
//     reconstruir o estado interno observando saídas. Para embaralhar lista
//     tanto faz; para credencial de cliente, não.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const soCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const fn    = readFileSync('netlify/functions/admin-reset-password.js', 'utf8')
const admin = readFileSync('src/pages/AppInterno.jsx', 'utf8')
const time  = readFileSync('src/pages/app/WorkspacePage.jsx', 'utf8')
const help  = readFileSync('src/lib/helpers.js', 'utf8')

function trecho(src, de, ate) {
  const i = src.indexOf(de)
  expect(i, `marcador sumiu: "${de}"`).toBeGreaterThan(-1)
  const j = src.indexOf(ate, i + de.length)
  return src.slice(i, j === -1 ? undefined : j)
}

describe('admin-reset-password — o porteiro', () => {
  it('exige operador da plataforma antes de qualquer coisa', () => {
    const antes = trecho(fn, 'export const handler', 'let body')
    expect(antes).toMatch(/from\('platform_admins'\)[\s\S]{0,120}?maybeSingle\(\)/)
    expect(antes).toMatch(/if \(!operador\) return erro\(403/)
  })

  it('recusa redefinir a senha de OUTRO operador da plataforma', () => {
    // Com mais de um operador, permitir isso é um administrar o outro sem que
    // ele saiba. A própria conta é liberada (esquecer a senha acontece).
    // Marcador de fim específico: `const { data: alvo` casaria antes, dentro do
    // próprio bloco (`alvoOperador`), e o recorte sairia vazio.
    const guarda = trecho(fn, 'if (user_id !== quemChama.id)', 'const { data: alvo, error: buscaErr }')
    expect(guarda).toMatch(/platform_admins/)
    expect(guarda).toMatch(/return erro\(403/)
  })

  it('a senha nasce transitória', () => {
    expect(soCodigo(fn)).toMatch(/must_change_password: true/)
  })

  it('exige 8 caracteres, como o resto do produto', () => {
    expect(soCodigo(fn)).toMatch(/password\.length < 8/)
  })

  it('não devolve nada além do e-mail do alvo', () => {
    const resposta = trecho(fn, 'body: JSON.stringify({ email', '}')
    expect(resposta).not.toMatch(/user_id|password|user_metadata/)
  })
})

describe('o dono do tenant NÃO redefine senha', () => {
  it('a tela do time não chama o endpoint de redefinição', () => {
    // O caminho do tenant é criar acesso novo; e-mail já cadastrado é recusado
    // justamente para não virar tomada de conta.
    expect(soCodigo(time)).not.toMatch(/admin-reset-password/)
  })
})

describe('o gerador de senha', () => {
  it('é criptográfico, não Math.random', () => {
    const gerador = trecho(help, 'export function novaSenha', '\n}')
    expect(gerador).toMatch(/crypto\.getRandomValues/)
    expect(gerador).not.toMatch(/Math\.random/)
  })

  it('vive num lugar só — senha gerada de dois jeitos é duas superfícies', () => {
    for (const [nome, src] of [['AppInterno', admin], ['WorkspacePage', time]]) {
      expect(soCodigo(src), `${nome} voltou a gerar senha por conta própria`)
        .not.toMatch(/Math\.random/)
    }
    expect(soCodigo(admin)).toMatch(/novaSenha/)
    expect(soCodigo(time)).toMatch(/novaSenha/)
  })

  it('evita caracteres ambíguos (a senha é lida em voz alta)', () => {
    const gerador = trecho(help, 'export function novaSenha', '\n}')
    const alfabeto = gerador.match(/'([a-zA-Z0-9]+)'/)?.[1] || ''
    expect(alfabeto.length).toBeGreaterThan(30)
    for (const c of ['l', 'I', 'O', '0', '1']) {
      expect(alfabeto, `caractere ambíguo "${c}" no alfabeto`).not.toContain(c)
    }
  })
})
