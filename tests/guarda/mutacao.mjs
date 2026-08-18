// tests/guarda/mutacao.mjs — a prova de que a suíte não é teatro.
//
// Roda com `npm run guarda`. Reintroduz, um a um, defeitos que DE FATO
// chegaram ao cliente e verifica se a suíte fica vermelha. Teste que continua
// verde com o bug de volta não protege ninguém.
//
// Foi assim que descobri que meu próprio teste da guarda de identidade era
// teatro: trocando `if (!conferencia.ok)` por `if (false)`, tudo passava. O
// teste verificava que a guarda existia, não que ela bloqueia. Virou
// tests/ia-diagnostico-handler.test.js, que roda o handler e afere o EFEITO.
//
// REGRA: todo defeito que escapar para produção entra aqui como mutação, junto
// com o teste que o pega. A lista só cresce.
//
// Saída: 8/8 é o piso. Qualquer "PASSOU DESPERCEBIDA" bloqueia o deploy.

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

// Cada mutação reintroduz UM defeito real que chegou ao cliente.
// Teste que não fica vermelho aqui é teatro.
const MUTACOES = [
  { nome: 'volta a mandar só o nome ao modelo (caso Pixel)',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: 'alvoDoDiagnostico(alvo)', para: 'alvo.nome' },

  { nome: 'volta a gravar a empresa que o modelo devolveu',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: '...identidadeParaGravar(alvo, parsed),',
    para: 'empresa: parsed.empresa,\n    dominio: parsed.dominio,' },

  { nome: 'remove a guarda de identidade do diagnóstico',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: 'if (!conferencia.ok) {', para: 'if (false) {' },

  { nome: 'volta a ler só o primeiro bloco de texto',
    arq: 'netlify/functions/_ai.js',
    de: "const text = blocos.filter(b => b.type === 'text').map(b => b.text || '').join('')",
    para: "const text = data.content?.find(b => b.type === 'text')?.text || ''" },

  { nome: 'devolve a busca web ao classificador da escuta',
    arq: 'netlify/functions/listening-coletar-background.js',
    de: 'tools: undefined,', para: '' },

  { nome: 'busca que falhou vira snapshot zerado',
    arq: 'netlify/functions/listening-coletar-background.js',
    de: 'if (falhas.length && !resultados.length) {', para: 'if (false) {' },

  { nome: 'volta a ler a prosa em vez dos blocos da busca',
    arq: 'netlify/functions/_busca.js',
    de: "b.type === 'web_search_tool_result'", para: "b.type === 'nunca'" },

  { nome: 'guarda ingênua: .com.br com dois rótulos',
    arq: 'netlify/functions/_identidade.js',
    de: "const n = (p.length >= 3 && SLD.has(p[p.length - 2])) ? 3 : 2", para: 'const n = 2' },

  { nome: 'reserva de modelo implementada mas não ligada',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: 'model, modeloReserva, tools, maxTokens,', para: 'model, tools, maxTokens,' },

  { nome: 'reserva dispara em erro que ela não resolve (400)',
    arq: 'netlify/functions/_ai.js',
    de: 'export const valeTentarReserva = (status) => [429, 500, 502, 503, 504, 529, 408].includes(Number(status))',
    para: 'export const valeTentarReserva = () => true' },

  { nome: 'volta ao sonnet-5 como principal (2,6x o custo)',
    arq: 'netlify/functions/_ai.js',
    de: "  smart:  'claude-sonnet-4-6',", para: "  smart:  'claude-sonnet-5'," },

  { nome: 'e-mail do operador volta a vazar para o cliente',
    arq: 'netlify/functions/workspace-members.js',
    de: '.filter(m => vendoComoOperador || !ehOperador.has(m.user_id))', para: '.filter(() => true)' },

  { nome: 'relatório público volta a pedir tudo (select *)',
    arq: 'src/pages/RelatorioPublico.jsx',
    de: `    supabase.from('diagnosticos')
      .select('id, workspace_id, empresa, dominio, setor, porte, created_at, publico, status, tipo, '
            + 'score_singularidade, score_consistencia, score_posicionamento, frase_diagnostico, data')
      .eq('id', id).single()`,
    para: "    supabase.from('diagnosticos').select('*').eq('id', id).single()" },

  { nome: 'reabre a leitura anônima de diagnósticos',
    arq: 'supabase/migrations/049_diagnosticos_sem_leitura_anonima.sql',
    de: 'drop policy if exists "leitura publica diagnosticos" on diagnosticos;',
    para: '-- removido' },

  { nome: 'concorrente desativado volta a contar na síntese',
    arq: 'netlify/functions/_market.js',
    de: ".in('concorrente_id', ativos.map(c => c.id))", para: '' },

  { nome: 'a tela volta a mostrar movimento de desativado',
    arq: 'src/pages/app/IntelligencePages.jsx',
    de: ".eq('workspace_id', workspace.id).eq('ativo', true)",
    para: ".eq('workspace_id', workspace.id)" },

  { nome: 'guarda aprova qualquer coisa',
    arq: 'netlify/functions/_identidade.js',
    de: "  if (recebidos.some(d => d === esperado)) return { ok: true, verificado: true }",
    para: '  return { ok: true, verificado: true }' },
]

let pegos = 0
console.log('mutação'.padEnd(52), 'resultado')
console.log('-'.repeat(72))
for (const m of MUTACOES) {
  const orig = readFileSync(m.arq, 'utf8')
  if (!orig.includes(m.de)) { console.log(m.nome.padEnd(52), '⚠ alvo não encontrado'); continue }
  writeFileSync(m.arq, orig.replace(m.de, m.para))
  let vermelho = false, quantos = 0
  try {
    execSync('npx vitest run --reporter=json --outputFile=node_modules/.mut.json', { stdio: 'pipe' })
  } catch { vermelho = true }
  try {
    const r = JSON.parse(readFileSync('node_modules/.mut.json', 'utf8'))
    quantos = r.numFailedTests || 0
    if (quantos > 0) vermelho = true
  } catch { /* json pode faltar se o vitest morreu */ }
  writeFileSync(m.arq, orig)
  if (vermelho) pegos++
  console.log(m.nome.padEnd(52), vermelho ? `✓ PEGA (${quantos} teste(s) vermelho(s))` : '✗ PASSOU DESPERCEBIDA')
}
console.log('-'.repeat(72))
console.log(`${pegos}/${MUTACOES.length} defeitos reintroduzidos foram detectados`)
if (pegos < MUTACOES.length) {
  console.error('\nA suíte NÃO protege contra todos os defeitos conhecidos. Não faça deploy.')
  process.exit(1)
}
