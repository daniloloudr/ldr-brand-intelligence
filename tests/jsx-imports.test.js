import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

// ── COMPONENTE USADO PRECISA ESTAR IMPORTADO ────────────────────────────
// A aba Saúde deu TELA BRANCA: usei <TableContainer> e <Paper> sem importar.
// Identificador indefinido em JSX não é erro de build — é ReferenceError na
// hora de renderizar. Passou pelo `npm run build`, pelos 212 testes e pelo
// deploy sem um sinal, e quem descobriu foi o Danilo clicando no menu.
//
// Esta varredura fecha a classe: para cada arquivo, compara os componentes
// usados em JSX com o que o arquivo importa ou define. É estática e barata —
// não substitui teste de renderização, mas pega o erro que de fato acontece.

const ARQUIVOS = []
const anda = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) anda(`${dir}/${f.name}`)
    else if (/\.jsx$/.test(f.name)) ARQUIVOS.push(`${dir}/${f.name}`)
  }
}
anda('src')

// Tags que o React resolve sozinho ou que são do próprio HTML em maiúscula.
const NATIVOS = new Set(['Fragment', 'Suspense', 'StrictMode', 'Profiler'])

function usados(src) {
  // <Componente ...> — só PascalCase; minúsculo é tag HTML.
  return new Set([...src.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map(m => m[1])
    .filter(n => !NATIVOS.has(n)))
}

function disponiveis(src) {
  const nomes = new Set()
  // import X from ... | import { A, B as C } from ... | import * as X
  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]/g)) {
    const clausula = m[1]
    const def = clausula.match(/^([A-Za-z0-9_$]+)/)
    if (def) nomes.add(def[1])
    const chaves = clausula.match(/\{([\s\S]*?)\}/)
    if (chaves) for (const p of chaves[1].split(',')) {
      const t = p.trim(); if (!t) continue
      nomes.add((t.split(/\s+as\s+/).pop() || t).trim())
    }
    const ns = clausula.match(/\*\s+as\s+([A-Za-z0-9_$]+)/)
    if (ns) nomes.add(ns[1])
  }
  // definidos no próprio arquivo
  for (const m of src.matchAll(/(?:function|const|let|class)\s+([A-Z][A-Za-z0-9_]*)/g)) nomes.add(m[1])
  // DESESTRUTURAÇÃO: componente também chega como prop — `({ Icon }) => <Icon/>`
  // é padrão comum aqui (o menu do admin passa o ícone assim). Sem isto a
  // varredura acusa quatro arquivos saudáveis e vira ruído que se aprende a
  // ignorar — o pior destino de um teste.
  for (const m of src.matchAll(/\{([^{}]*)\}\s*(?:=[^=]|\)|,)/g)) {
    for (const p of m[1].split(',')) {
      const t = (p.split(':').pop() || '').trim().replace(/\s*=.*$/, '')
      if (/^[A-Z][A-Za-z0-9_]*$/.test(t)) nomes.add(t)
    }
  }
  // X.Y — o membro é resolvido pelo objeto
  return nomes
}

describe('nenhum componente JSX usado sem estar disponível', () => {
  for (const arq of ARQUIVOS) {
    it(arq.replace('src/', ''), () => {
      const src = readFileSync(arq, 'utf8')
      const disp = disponiveis(src)
      const faltando = [...usados(src)].filter(n => !disp.has(n) && !n.includes('.'))
      expect(faltando, `${arq}: usado em JSX mas não importado nem definido`).toEqual([])
    })
  }
})
