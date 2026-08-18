// tests/guarda/nucleo.mjs — o porteiro do núcleo de inteligência.
//
// POR QUE EXISTE (Danilo, 18/08/2026)
// "não dá pra todas as operações atuarem nos arquivos que tem llm plugada."
//
// Em um único dia, mudanças feitas de passagem em arquivos com LLM plugada
// produziram: um relatório da empresa errada entregue a um cliente, o `callAI`
// devolvendo um fragmento como se fosse a resposta inteira, o diagnóstico
// estourando o teto sem escrever nada, e a busca perdendo as citações. Nenhuma
// dessas mudanças foi imprudente isoladamente — todas foram "só um ajuste".
//
// A doutrina em `.spec/nucleo-ia.md` descreve as leis. Este arquivo é o que as
// faz doer: roda no pre-commit e BLOQUEIA quando o núcleo foi tocado sem a
// verificação correspondente.
//
// Instalar: npm run guarda:instalar   (uma vez por clone)
// Pular numa emergência: git commit --no-verify — e o commit fica marcado,
// porque o CI/revisão vai ver que a guarda não rodou.

import { execSync } from 'child_process'
import { readFileSync, existsSync, writeFileSync, mkdirSync, chmodSync } from 'fs'

// ── O NÚCLEO ────────────────────────────────────────────────────────────
// Arquivos onde um descuido vira afirmação falsa sobre a marca de um cliente,
// ou custo invisível. Mexer aqui exige mais do que "os testes passaram".
export const NUCLEO = {
  'netlify/functions/_ai.js':            'toda chamada de LLM · modelos, reserva, leitura da resposta, custo',
  'netlify/functions/_identidade.js':    'quem está sendo analisado · a guarda',
  'netlify/functions/_prompt.js':        'o system prompt do diagnóstico',
  'netlify/functions/_diagnostico.js':   'geração compartilhada (marca + concorrentes)',
  'netlify/functions/_brain.js':         'a destilação — o que entra aqui é permanente',
  'netlify/functions/_busca.js':         'a camada de busca · de onde vem a URL',
  'netlify/functions/_google.js':        'adaptador de busca',
  'netlify/functions/diagnostico-gerar-background.js': 'caminho principal do diagnóstico',
  'netlify/functions/diagnostico-gerar.js':            'caminho síncrono do diagnóstico',
  'netlify/functions/cron-monitor.js':                 'regenera diagnóstico toda segunda',
  'netlify/functions/listening-coletar-background.js': 'coleta de percepção',
}

const PRE_COMMIT = `#!/bin/sh
# Instalado por npm run guarda:instalar. Não editar à mão.
exec node tests/guarda/nucleo.mjs --pre-commit
`

function instalar() {
  const dir = '.git/hooks'
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/pre-commit`, PRE_COMMIT)
  chmodSync(`${dir}/pre-commit`, 0o755)
  console.log('Guarda do núcleo instalada em .git/hooks/pre-commit.')
  console.log('Arquivos protegidos:', Object.keys(NUCLEO).length)
}

function tocados() {
  const saida = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  return saida.split('\n').map(s => s.trim()).filter(f => f in NUCLEO)
}

function verificar() {
  const arquivos = tocados()
  if (!arquivos.length) process.exit(0)   // não tocou no núcleo: segue a vida

  console.log('\n\x1b[33m━━ O NÚCLEO DE INTELIGÊNCIA FOI TOCADO ━━\x1b[0m\n')
  for (const f of arquivos) console.log(`  ${f}\n    ${NUCLEO[f]}`)

  console.log('\nRodando a guarda (suíte + varredura de mutação)...\n')
  try {
    execSync('npx vitest run --silent', { stdio: 'pipe' })
  } catch {
    console.error('\x1b[31mA suíte falhou. Commit bloqueado.\x1b[0m')
    console.error('Rode `npm test` para ver o quê.\n')
    process.exit(1)
  }
  try {
    execSync('node tests/guarda/mutacao.mjs', { stdio: 'inherit' })
  } catch {
    console.error('\n\x1b[31mA varredura de mutação reprovou. Commit bloqueado.\x1b[0m')
    console.error('Algum defeito conhecido voltaria sem a suíte perceber.\n')
    process.exit(1)
  }

  // A suíte trava o arredor. O comportamento do modelo só a avaliação ao vivo
  // mostra — e ela custa dinheiro e minutos, então não roda no pre-commit.
  // Mas o lembrete precisa aparecer no momento em que a decisão é tomada.
  console.log('\n\x1b[33m━━ ANTES DE SUBIR ISTO PARA PRODUÇÃO ━━\x1b[0m')
  console.log('  npm run guarda:ao-vivo    (chama a API de verdade · ~US$ 0,20 · ~10 min)\n')
  console.log('  A suíte prova que o ARREDOR está certo. Só a avaliação ao vivo diz')
  console.log('  se o modelo está alucinando — foi ela que pegou o caso Pixel, que')
  console.log('  nenhum teste offline pegaria.\n')
  console.log('  E se algum defeito escapar: ele vira mutação nova em')
  console.log('  tests/guarda/mutacao.mjs, junto com o teste que o pega. A lista só cresce.\n')
  process.exit(0)
}

if (process.argv.includes('--instalar')) instalar()
else if (process.argv.includes('--pre-commit')) verificar()
else {
  // Sem argumento: relatório do que é protegido e se o hook está instalado.
  const instalado = existsSync('.git/hooks/pre-commit')
    && readFileSync('.git/hooks/pre-commit', 'utf8').includes('nucleo.mjs')
  console.log(`Núcleo de inteligência — ${Object.keys(NUCLEO).length} arquivos protegidos\n`)
  for (const [f, p] of Object.entries(NUCLEO)) console.log(`  ${f.padEnd(52)} ${p}`)
  console.log(`\nHook de pre-commit: ${instalado ? 'instalado' : 'NÃO instalado — rode npm run guarda:instalar'}`)
}
