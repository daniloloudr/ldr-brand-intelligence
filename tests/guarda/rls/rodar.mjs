// Roda o ensaio de RLS da 052 num banco descartável. Ver README.md.
// Sai != 0 se qualquer asserção reprovar — é portão de deploy, não relatório.
import { execFileSync } from 'node:child_process'

const DB = 'ensaio_rls_brandcode'
const psql = (args, opts = {}) => execFileSync('psql', args, { encoding: 'utf8', ...opts })

function tenta(cmd, args) {
  try { execFileSync(cmd, args, { stdio: 'pipe' }) } catch { /* ok */ }
}

try {
  execFileSync('pg_isready', [], { stdio: 'pipe' })
} catch {
  console.error('✖ Nenhum Postgres local respondendo. Este ensaio NÃO usa o Supabase de propósito:')
  console.error('  a instância é única, e testar nela seria aplicar em produção.')
  process.exit(1)
}

tenta('dropdb', ['--if-exists', DB])
execFileSync('createdb', [DB], { stdio: 'pipe' })

try {
  psql(['-q', '-v', 'ON_ERROR_STOP=1', '-d', DB, '-f', 'tests/guarda/rls/052-retrato.sql'], { stdio: 'pipe' })
  psql(['-q', '-v', 'ON_ERROR_STOP=1', '-d', DB, '-f', 'supabase/migrations/052_papeis_por_tenant.sql'], { stdio: 'pipe' })

  // As asserções falam por `raise notice`, que o psql manda para o STDERR —
  // por isso o 2>&1: sem ele o resultado do ensaio some e o runner conclui,
  // alegremente, que nada falhou.
  const tudo = execFileSync('sh',
    ['-c', 'psql -d ' + DB + ' -f tests/guarda/rls/052-assercoes.sql 2>&1'],
    { encoding: 'utf8' })

  const linhas = tudo.split('\n').filter(l => /PASSOU|FALHOU/.test(l))
  for (const l of linhas) console.log(l.replace(/^.*NOTICE:\s+/, '  '))

  const falhas = linhas.filter(l => /FALHOU/.test(l)).length
  const passou = linhas.filter(l => /PASSOU/.test(l)).length
  console.log(`\n${passou} asserção(ões) passaram, ${falhas} falharam`)
  if (falhas || !passou) {
    console.error('\n✖ A RLS não se comporta como a migration promete. NÃO faça deploy.')
    process.exit(1)
  }
  console.log('✓ RLS conforme — pode seguir para o deploy')
} finally {
  tenta('dropdb', ['--if-exists', DB])
}
