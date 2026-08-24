// ════════════════════════════════════════════════════════════════════
// O dist tem que sair inteiro — ou o build para aqui.
//
// 21/08: o dist ficou sem `_redirects`. O `vite build` passou, o deploy passou,
// e o que quebrou foi só o deep-link: qualquer URL que não fosse a raiz
// (/app/brands/<id>/studio/workflow) caía em 404 do Netlify, porque sem o
// fallback do SPA o servidor procura um arquivo com aquele caminho. Um build
// verde entregando tela branca é o pior modo de falhar: ninguém vai olhar o
// build.
//
// A causa era o `cp _redirects dist/_redirects` grudado no fim do script: um
// passo fora do Vite, que some se o build for interrompido no meio. O arquivo
// agora mora em public/ (o Vite copia publicDir inteiro, é o mesmo caminho do
// favicon e do manifest) e esta guarda confere o resultado — porque o jeito de
// não repetir o erro não é lembrar dele, é o build reclamar sozinho.
// ════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const falhas = []
const exige = (cond, msg) => { if (!cond) falhas.push(msg) }

// 1. A página existe e tem conteúdo.
exige(existsSync('dist/index.html'), 'dist/index.html não foi gerado')
if (existsSync('dist/index.html')) {
  const html = readFileSync('dist/index.html', 'utf8')
  exige(html.includes('<div id="root"'), 'dist/index.html saiu sem a raiz do React')
  exige(/<script[^>]+src="[^"]*assets\//.test(html), 'dist/index.html não referencia nenhum bundle de assets')
}

// 2. O fallback do SPA — o que faltava em 21/08.
exige(existsSync('dist/_redirects'), 'dist/_redirects não foi gerado: sem ele todo deep-link vira 404 (o arquivo mora em public/_redirects)')
if (existsSync('dist/_redirects')) {
  const rules = readFileSync('dist/_redirects', 'utf8')
  exige(/^\s*\/\*\s+\/index\.html\s+200\s*$/m.test(rules),
    'dist/_redirects existe mas não tem a regra de fallback do SPA (/*  /index.html  200)')
}

// 3. Os bundles saíram de fato (dist parcial de um build interrompido).
const assets = existsSync('dist/assets') ? readdirSync('dist/assets') : []
exige(assets.some(f => f.endsWith('.js')), 'dist/assets saiu sem nenhum .js — build interrompido no meio')

if (falhas.length) {
  console.error('\n✖ dist incompleto — o deploy deste build serviria tela branca:\n')
  for (const f of falhas) console.error(`  · ${f}`)
  console.error('')
  process.exit(1)
}
console.log(`✓ dist íntegro (${assets.length} assets, fallback do SPA presente)`)
