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
//
// 01/09: a MESMA falha, por outro caminho. O build do Netlify saiu sem
// `VITE_SUPABASE_URL` e sem `VITE_SUPABASE_KEY` — o Vite embute essas duas no
// bundle, e sem elas o cliente Supabase sobe com "Invalid supabaseUrl" e a
// aplicação inteira fica em branco. O build ficou VERDE, o deploy publicou, e
// produção caiu. Aconteceu duas vezes: no deploy manual e no build automático
// disparado por push na main.
//
// Por que a guarda e não o conserto da causa: a causa está no ambiente do
// Netlify, que não repassa as duas variáveis, e isso pode voltar a acontecer
// por configuração que ninguém lembra de conferir. Já a ausência da chave no
// bundle é observável AQUI, no artefato, antes de qualquer deploy.
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

// 3. Os cabeçalhos de segurança (C3, 27/08). Mesma família do `_redirects`: um
// arquivo em public/ que o build copia, e cuja ausência NÃO quebra nada visível
// — o app funciona igual sem HSTS. Por isso a guarda: defeito que não aparece
// na tela some do radar até a varredura de procurement do cliente.
exige(existsSync('dist/_headers'), 'dist/_headers não foi gerado: o app subiria sem HSTS, X-Frame-Options nem nosniff (o arquivo mora em public/_headers)')
if (existsSync('dist/_headers')) {
  const h = readFileSync('dist/_headers', 'utf8')
  for (const cab of ['Strict-Transport-Security', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']) {
    exige(h.includes(cab), `dist/_headers saiu sem ${cab}`)
  }
  // A CSP entrou em Report-Only de propósito (ver o cabeçalho de public/_headers).
  // Se um dia virar bloqueante, é aqui que se troca — e o comentário de lá
  // explica o que conferir antes.
  exige(/Content-Security-Policy(-Report-Only)?:/.test(h), 'dist/_headers saiu sem nenhuma CSP')
}

// 4. Os bundles saíram de fato (dist parcial de um build interrompido).
const assets = existsSync('dist/assets') ? readdirSync('dist/assets') : []
exige(assets.some(f => f.endsWith('.js')), 'dist/assets saiu sem nenhum .js — build interrompido no meio')

// 4. O cliente Supabase precisa nascer configurado (01/09).
// Sem a URL o construtor lança e o React não monta: tela branca, build verde.
// Procura-se em TODOS os chunks porque `src/lib/supabase.js` pode cair em
// qualquer um conforme o code-splitting muda — casar com o nome do arquivo
// apodreceria no primeiro rearranjo de chunks.
{
  const dirAssets = 'dist/assets'
  const chunks = existsSync(dirAssets)
    ? readdirSync(dirAssets).filter(f => f.endsWith('.js')).map(f => readFileSync(`${dirAssets}/${f}`, 'utf8'))
    : []
  const juntos = chunks.join('\n')
  exige(chunks.length > 0, 'dist/assets não tem nenhum .js')
  exige(/https:\/\/[a-z0-9]+\.supabase\.co/.test(juntos),
    'o bundle saiu SEM a URL do Supabase (VITE_SUPABASE_URL vazia no build) — o app abriria em branco')
  exige(/sb_publishable_[A-Za-z0-9_-]{10}|eyJhbGciOiJIUzI1Ni/.test(juntos),
    'o bundle saiu SEM a chave do Supabase (VITE_SUPABASE_KEY vazia no build) — o app não autenticaria')
  // O contrário também é defeito: chave de servidor no bundle do navegador.
  exige(!/sb_secret_[A-Za-z0-9_-]{10}/.test(juntos),
    '⚠️ SEGREDO NO BUNDLE: uma secret key do Supabase foi embutida no cliente')
  exige(!/sk-ant-[A-Za-z0-9_-]{20}/.test(juntos),
    '⚠️ SEGREDO NO BUNDLE: uma chave da Anthropic foi embutida no cliente')
}

if (falhas.length) {
  console.error('\n✖ dist incompleto — o deploy deste build serviria tela branca:\n')
  for (const f of falhas) console.error(`  · ${f}`)
  console.error('')
  process.exit(1)
}
console.log(`✓ dist íntegro (${assets.length} assets, fallback do SPA presente)`)
