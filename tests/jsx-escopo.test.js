// ════════════════════════════════════════════════════════════════════
// NENHUM IDENTIFICADOR USADO SEM DECLARAÇÃO — a tela branca, de novo.
//
// 21/08/2026, no meio da criação dos acessos da Hering: clicar em "Membros" no
// admin apagava a tela. `WorkspacesAdmin` lia `isDark`, que é estado do
// `AppInterno` — outro componente, outra closure. Em JS isso não é erro de
// build: é ReferenceError na hora de renderizar. Passou pelo `vite build`,
// pelos 315 testes e pelo deploy sem um sinal.
//
// O `jsx-imports.test.js` foi escrito para exatamente esta classe (a aba Saúde,
// 18/08) e não pegou, porque ele compara NOMES DE COMPONENTE em JSX contra os
// imports — e `isDark` é uma variável dentro de um `sx`. A varredura por regex
// não tem como saber o que está em escopo; ela nunca teria pego.
//
// Por isso esta guarda usa o parser de verdade (o mesmo Babel que o plugin do
// Vite já roda) e pergunta ao escopo, não ao texto. É a versão forte do
// jsx-imports: cobre componente, variável, helper, tudo. O outro continua vivo
// porque é barato e roda mesmo se o parser engasgar num arquivo.
//
// Bônus registrado na estreia: `src/pages/StreamingView.jsx` não parseia —
// tem um `<div>` fechado com `</Box>` (linha ~268). Nunca explodiu porque
// ninguém importa o arquivo; ele não entra no build. É código morto com uma
// bomba dentro, e o dia em que alguém importar, o build cai. Está na lista de
// exceções ABAIXO, com data — não é para ficar lá.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'

const traverse = _traverse.default || _traverse

// Globais do browser/node que não têm declaração nenhuma no arquivo.
const GLOBAIS = new Set([
  'window', 'document', 'navigator', 'console', 'fetch', 'localStorage', 'sessionStorage',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'queueMicrotask', 'structuredClone', 'AbortController',
  'Math', 'JSON', 'Date', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise',
  'Error', 'Map', 'Set', 'WeakMap', 'WeakSet', 'RegExp', 'Intl', 'Symbol', 'BigInt', 'Proxy', 'Reflect',
  'URL', 'URLSearchParams', 'Blob', 'File', 'FileReader', 'FormData', 'Image', 'atob', 'btoa',
  'TextDecoder', 'TextEncoder', 'ReadableStream', 'crypto',
  'Uint8Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'ArrayBuffer', 'DataView',
  'undefined', 'NaN', 'Infinity', 'isNaN', 'isFinite', 'parseInt', 'parseFloat',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'React', 'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'CSS',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver',
  'performance', 'history', 'location', 'screen', 'matchMedia', 'getComputedStyle',
  'alert', 'confirm', 'prompt', 'process', 'globalThis', 'global',
])

// Arquivos que a varredura ainda não consegue ler. Cada linha precisa de motivo
// e data — a lista existe para ENCOLHER. Um arquivo que não parseia é um
// arquivo que ninguém está checando.
const NAO_PARSEIA = {
  'src/pages/StreamingView.jsx':
    'JSX quebrado (<div> fechado com </Box>, ~linha 268). Órfão: nenhum arquivo importa, por isso o build passa. Anotado 21/08/2026 — some quando o arquivo for consertado ou apagado.',
}

const arquivos = []
const anda = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) anda(`${dir}/${f.name}`)
    else if (/\.jsx?$/.test(f.name)) arquivos.push(`${dir}/${f.name}`)
  }
}
anda('src')

/** Identificadores referenciados sem binding em nenhum escopo acima. */
function livres(src) {
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] })
  const achados = new Map()
  traverse(ast, {
    ReferencedIdentifier(path) {
      const nome = path.node.name
      if (GLOBAIS.has(nome)) return
      if (path.scope.hasBinding(nome, true)) return
      if (!achados.has(nome)) achados.set(nome, [])
      achados.get(nome).push(path.node.loc?.start.line)
    },
  })
  return achados
}

describe('nenhum identificador usado fora de escopo', () => {
  for (const arq of arquivos) {
    const motivo = NAO_PARSEIA[arq]

    it(arq.replace('src/', ''), () => {
      const src = readFileSync(arq, 'utf8')

      let achados
      try {
        achados = livres(src)
      } catch (e) {
        // Arquivo conhecidamente quebrado: passa, mas não em silêncio.
        if (motivo) return void console.warn(`⚠ ${arq} não parseia — ${motivo}`)
        throw new Error(`${arq} não parseou: ${e.message}`)
      }

      // Consertou e continua na lista? A exceção também apodrece.
      expect(motivo, `${arq} parseia agora — tire a entrada de NAO_PARSEIA`).toBeUndefined()

      const erros = [...achados].map(([nome, linhas]) => `${nome} (linha ${linhas.join(', ')})`)
      expect(erros, `${arq}: usado sem declaração — vira ReferenceError ao renderizar (tela branca)`).toEqual([])
    })
  }
})
