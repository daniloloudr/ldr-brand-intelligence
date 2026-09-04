// ════════════════════════════════════════════════════════════════════
// USO ANTES DA DECLARAÇÃO — a tela branca, terceira variação.
//
// 04/09/2026, no addon de Lote: a página caiu inteira com "Cannot access
// 'prontasParaVer' before initialization". A constante ESTAVA declarada — só
// que abaixo de um `useEffect` que a citava no array de dependências. Deps são
// avaliadas DURANTE o render, no ponto da chamada, e ali a constante ainda está
// na zona morta temporal do `const`.
//
// O `jsx-escopo` não pega: para ele o identificador está em escopo, e está
// mesmo. O `vite build` também não — é erro de execução, não de sintaxe. Só
// aparece quando alguém abre a tela.
//
// A regra aqui: dentro do corpo de uma função, referência a um `const`/`let`
// que aparece ANTES da linha em que ele é declarado, e que NÃO está dentro de
// outra função (essa roda depois, e aí a variável já existe).
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
const traverse = _traverse.default || _traverse

const arquivos = []
const varrer = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) varrer(p)
    else if (/\.jsx?$/.test(e.name)) arquivos.push(p)
  }
}
varrer('src')

function usosAntesDaDeclaracao(src) {
  const achados = []
  let ast
  try { ast = parse(src, { sourceType: 'module', plugins: ['jsx'] }) } catch { return achados }

  traverse(ast, {
    VariableDeclarator(path) {
      const decl = path.parent
      if (decl.kind !== 'const' && decl.kind !== 'let') return
      if (path.node.id.type !== 'Identifier') return
      const nome = path.node.id.name
      const linhaDecl = path.node.loc?.start.line
      const bind = path.scope.getBinding(nome)
      if (!bind || !linhaDecl) return

      for (const ref of bind.referencePaths) {
        const linhaRef = ref.node.loc?.start.line
        if (!linhaRef || linhaRef >= linhaDecl) continue
        // Referência dentro de OUTRA função roda depois: não é zona morta.
        const dentroDeFuncao = ref.findParent(p =>
          p.isFunction() && p.node.loc?.start.line > (bind.path.getFunctionParent()?.node.loc?.start.line ?? -1)
          && p.node !== bind.path.getFunctionParent()?.node)
        if (dentroDeFuncao) continue
        achados.push(`${nome} usado na linha ${linhaRef}, declarado na ${linhaDecl}`)
      }
    },
  })
  return achados
}

describe('nada é usado antes de ser declarado', () => {
  for (const arq of arquivos) {
    const src = readFileSync(arq, 'utf8')
    it(arq.replace('src/', ''), () => {
      expect(usosAntesDaDeclaracao(src)).toEqual([])
    })
  }
})

describe('a guarda pega o caso real', () => {
  it('⭐ const citada no array de dependências acima da declaração', () => {
    const ruim = `
      function C() {
        useEffect(() => { faz() }, [lista.length])
        const lista = [1, 2]
        return lista
      }`
    expect(usosAntesDaDeclaracao(ruim)).toHaveLength(1)
    expect(usosAntesDaDeclaracao(ruim)[0]).toContain('lista')
  })
  it('a mesma const DENTRO do callback é legítima — roda depois', () => {
    const ok = `
      function C() {
        useEffect(() => { usa(lista) }, [])
        const lista = [1, 2]
        return lista
      }`
    expect(usosAntesDaDeclaracao(ok)).toEqual([])
  })
  it('declarada antes, usada depois: sem alarme', () => {
    const ok = `
      function C() {
        const lista = [1, 2]
        useEffect(() => {}, [lista.length])
        return lista
      }`
    expect(usosAntesDaDeclaracao(ok)).toEqual([])
  })
})
