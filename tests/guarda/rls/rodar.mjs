// Roda os ensaios de RLS num banco descartável. Ver README.md.
// Sai != 0 se qualquer asserção reprovar — é portão de deploy, não relatório.
//
// A ordem NÃO é decorativa. Cada ensaio parte do mundo que o anterior deixou,
// porque é assim que as migrations chegam ao banco real: a 053 nunca vai
// encontrar um banco pré-052. Rodar a 053 sobre um retrato limpo provaria um
// caminho que não existe.
//
// As asserções da 052 rodam ANTES do retrato da 053 de propósito: é o retrato
// da 053 que tira o operador das participações (o estado que o S1 persegue), e
// a 052 ainda conta com ele no time da Hering — que é a produção de hoje.
import { execFileSync } from 'node:child_process'

const DB = 'ensaio_rls_brandcode'
const psql = (args, opts = {}) => execFileSync('psql', args, { encoding: 'utf8', ...opts })

function tenta(cmd, args) {
  try { execFileSync(cmd, args, { stdio: 'pipe' }) } catch { /* ok */ }
}

// Cada passo é um arquivo a aplicar ('sql') ou um bloco de asserções ('casos').
const PASSOS = [
  { sql:   'tests/guarda/rls/052-retrato.sql' },
  { sql:   'supabase/migrations/052_papeis_por_tenant.sql' },
  { casos: 'tests/guarda/rls/052-assercoes.sql', titulo: '052 · papéis por tenant' },
  { sql:   'tests/guarda/rls/053-retrato.sql' },
  { sql:   'supabase/migrations/053_sessao_de_suporte.sql' },
  { casos: 'tests/guarda/rls/053-assercoes.sql', titulo: '053 · sessão de suporte' },
  // A 054 não tem retrato próprio: ela chega num banco pós-053, que é como
  // encontra a produção. Retrato novo provaria a migration num mundo que não
  // existe — foi o mesmo raciocínio que fez a 053 herdar o da 052.
  { sql:   'supabase/migrations/054_parecer_e_escopo_da_campanha.sql' },
  { casos: 'tests/guarda/rls/054-assercoes.sql', titulo: '054 · parecer e escopo da campanha' },
  { sql:   'supabase/migrations/055_execucao_agente_e_camadas_do_fluxo.sql' },
  { casos: 'tests/guarda/rls/055-assercoes.sql', titulo: '055 · execução, agente e camadas do fluxo' },
  { sql:   'tests/guarda/rls/056-retrato.sql' },
  { sql:   'supabase/migrations/056_peca_versao_estado_julgamento.sql' },
  { casos: 'tests/guarda/rls/056-assercoes.sql', titulo: '056 · peça × versão, estados e julgamento' },
  { sql:   'tests/guarda/rls/057-retrato.sql' },
  { sql:   'supabase/migrations/057_campanha_vira_escopo.sql' },
  { casos: 'tests/guarda/rls/057-assercoes.sql', titulo: '057 · campanha vira escopo' },
]

try {
  execFileSync('pg_isready', [], { stdio: 'pipe' })
} catch {
  console.error('✖ Nenhum Postgres local respondendo. Este ensaio NÃO usa o Supabase de propósito:')
  console.error('  a instância é única, e testar nela seria aplicar em produção.')
  process.exit(1)
}

tenta('dropdb', ['--if-exists', DB])
execFileSync('createdb', [DB], { stdio: 'pipe' })

let passou = 0, falhas = 0

try {
  for (const passo of PASSOS) {
    if (passo.sql) {
      psql(['-q', '-v', 'ON_ERROR_STOP=1', '-d', DB, '-f', passo.sql], { stdio: 'pipe' })
      continue
    }

    // As asserções falam por `raise notice`, que o psql manda para o STDERR —
    // por isso o 2>&1: sem ele o resultado do ensaio some e o runner conclui,
    // alegremente, que nada falhou.
    const tudo = execFileSync('sh',
      ['-c', 'psql -d ' + DB + ' -f ' + passo.casos + ' 2>&1'],
      { encoding: 'utf8' })

    const linhas = tudo.split('\n').filter(l => /PASSOU|FALHOU/.test(l))
    console.log(`\n${passo.titulo}`)
    for (const l of linhas) console.log(l.replace(/^.*NOTICE:\s+/, '  '))

    // Bloco de asserções que não emite nada é falha, não silêncio bem-sucedido:
    // significa que o arquivo estourou antes do primeiro caso.
    if (!linhas.length) {
      console.error(`\n✖ ${passo.casos} não produziu asserção nenhuma. Provavelmente estourou antes do primeiro caso:\n`)
      console.error(tudo.split('\n').slice(-15).join('\n'))
      falhas++
      continue
    }

    passou += linhas.filter(l => /PASSOU/.test(l)).length
    falhas += linhas.filter(l => /FALHOU/.test(l)).length
  }

  console.log(`\n${passou} asserção(ões) passaram, ${falhas} falharam`)
  if (falhas || !passou) {
    console.error('\n✖ A RLS não se comporta como as migrations prometem. NÃO faça deploy.')
    process.exit(1)
  }
  console.log('✓ RLS conforme — pode seguir para o deploy')
} finally {
  tenta('dropdb', ['--if-exists', DB])
}
