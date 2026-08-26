// ════════════════════════════════════════════════════════════════════
// Onde o `_redirects` mora decide se o dev funciona — e se o deploy funciona.
//
// A regra `/*  /index.html  200` é o fallback do SPA: sem ela, qualquer
// deep-link em produção (/app/brands/<id>/studio/workflow) vira 404, porque o
// Netlify procura um arquivo naquele caminho. Com ela no lugar errado, o
// `netlify dev` serve tela branca. As duas falhas têm a mesma causa e sentidos
// opostos, então valem um teste só.
//
// Medido em 21/08, contando os erros de parse do Vite em cada arranjo:
//   _redirects na raiz do projeto  → 3 erros → tela branca
//   _redirects dentro do dist/     → 9 erros → tela branca
//   _redirects só em public/       → 0 erros → funciona
//
// O motivo: o Netlify Dev lê o `_redirects` da raiz E do publish dir, e aplica
// a regra a TODO pedido — inclusive /src/main.jsx e /@vite/client, que voltam
// como text/html onde o browser espera text/javascript. O módulo não carrega e
// a página não pinta. `public/` é o único lugar que o Dev não lê e que o build
// copia sozinho (publicDir do Vite), então serve produção sem atrapalhar o dev.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

const REGRA_SPA = /^\s*\/\*\s+\/index\.html\s+200\s*$/m
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

describe('o fallback do SPA vive em public/ — e só lá', () => {
  it('public/_redirects existe e tem a regra', () => {
    expect(existsSync('public/_redirects'), 'sem public/_redirects o dist sai sem fallback').toBe(true)
    expect(readFileSync('public/_redirects', 'utf8'),
      'o arquivo existe mas não tem a regra /*  /index.html  200').toMatch(REGRA_SPA)
  })

  it('e NÃO na raiz do projeto — de lá o Netlify Dev serve HTML no lugar dos módulos', () => {
    expect(existsSync('_redirects'),
      '_redirects na raiz: o netlify dev vai reescrever /src/main.jsx para /index.html e a tela fica branca').toBe(false)
  })

  it('o build confere o dist em vez de confiar num cp solto no fim do script', () => {
    // Era `vite build && cp _redirects dist/_redirects`: um passo fora do Vite,
    // que some se o build for interrompido — e some calado, com o build verde.
    expect(pkg.scripts.build, 'o build precisa terminar na guarda do dist').toContain('tests/guarda/dist.mjs')
    expect(pkg.scripts.build, 'o cp voltou: use public/_redirects (o Vite copia publicDir sozinho)')
      .not.toContain('cp _redirects')
  })

  it('e o dev limpa o dist antes de subir — dist local trava o netlify dev', () => {
    // O publish dir do netlify.toml é `dist`. Se existir um build local ali, o
    // Netlify Dev serve aquele estático (com os redirects dentro) em vez de dar
    // passagem para o Vite: o app roda velho, ou não roda.
    expect(pkg.scripts.dev, 'npm run dev precisa apagar o dist antes do vite').toMatch(/rm -rf dist/)
  })
})
