// ════════════════════════════════════════════════════════════════════
// ensaio-esquema-real.mjs — a 053 aplicada sobre o ESQUEMA DE PRODUÇÃO.
//
// POR QUE ISTO EXISTE, SEPARADO DO ENSAIO DE COMPORTAMENTO
// O `guarda:rls` prova o que as policies FAZEM, num retrato mínimo escrito à
// mão. Ele não pode provar que os NOMES batem com os do banco real — e a 053
// apaga policies pelo nome.
//
// `drop policy if exists "nome errado"` não falha. Não faz nada. A policy velha
// — o bypass PERMANENTE do 007 — fica de pé ao lado da nova, as policies são
// OR, e a proteção vira zero. Com a migration aplicada sem um erro sequer e o
// ensaio de comportamento verde, porque lá o nome existia.
//
// Este ensaio fecha essa fresta: baixa o esquema real (só DDL, sem uma linha de
// dado), aplica a 053 em cima e confere o catálogo de policies depois.
//
// SOMENTE LEITURA sobre produção: `pg_dump --schema-only`. A migration roda num
// banco local descartável.
// ════════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DB = 'ensaio_esquema_real_brandcode'
const DUMP = join(tmpdir(), 'brandcode-esquema-prod.sql')
const sh = (cmd) => execFileSync('sh', ['-c', cmd], { encoding: 'utf8' })
const tenta = (cmd) => { try { return sh(cmd) } catch { return '' } }
// Via arquivo, não `-c`: consulta multilinha passada por -c faz o psql tratar a
// quebra como meta-comando ("invalid command \n") e o ensaio morre no meio,
// depois de a migration já ter rodado — parecendo defeito da migration.
const CONSULTA = join(tmpdir(), 'brandcode-ensaio-consulta.sql')
const psql = (sql) => {
  writeFileSync(CONSULTA, sql)
  return sh(`psql -d ${DB} -A -t -f ${CONSULTA}`).trim()
}

if (!process.env.SUPABASE_DB_URL) {
  console.error('✖ SUPABASE_DB_URL ausente. Rode com o .env carregado:')
  console.error('  set -a && . ./.env && set +a && node tests/guarda/rls/ensaio-esquema-real.mjs')
  process.exit(1)
}

// As tabelas cujo bypass PERMANENTE a 053 tem que ter matado. Se sobrar aqui
// uma policy que chame `is_platform_admin()` sem passar por sessão, a migration
// não fez o que promete.
const FECHADAS = [
  'brands', 'alertas', 'concorrentes', 'listening_events', 'sentiment_snapshots',
  'identity_gap_snapshots', 'brand_books', 'brand_book_history', 'campaigns',
  'conversations', 'messages', 'brand_signals', 'brand_intelligence',
  'brand_dataset', 'credit_transactions', 'studio_workflows', 'studio_generations',
  'studio_campaigns', 'tendencias', 'consumer_insights', 'market_sinteses',
  'concorrente_clipping', 'pecas_escritas', 'diagnosticos_concorrentes',
  // As seis achadas por este ensaio em 29/08, depois de a migration já estar
  // escrita: escrevem o bypass à mão em vez de chamar `is_platform_admin()`.
  'brand_assets', 'brand_book_chunks', 'brand_manual_jobs', 'design_tokens',
  'content_hub_analyses', 'listening_terms',
]

// O BYPASS TEM DUAS GRAFIAS, e ignorar a segunda foi o defeito.
// `is_platform_admin()` é a chamada da função; `platform_admins` pega também
// quem escreveu o `exists (select 1 from platform_admins …)` na mão. Procurar
// só a primeira devolveu "nada a corrigir" com seis tabelas abertas.
const BYPASS = `(coalesce(qual,'') || coalesce(with_check,'')) like '%platform_admins%'`

// Onde o bypass por IDENTIDADE continua valendo, de propósito (ver o cabeçalho
// da 053). Listadas para o ensaio não as confundir com sobra.
const IDENTIDADE_OK = ['workspaces', 'workspace_members', 'cron_runs', 'cron_alerts', 'diagnosticos']

const falhas = []
const exige = (cond, msg) => { if (!cond) falhas.push(msg) }

try {
  console.log('[1/4] baixando o esquema de produção (somente DDL)…')
  sh(`pg_dump "$SUPABASE_DB_URL" --schema-only --schema=public --schema=auth --no-owner --no-privileges -f ${DUMP}`)

  console.log('[2/4] restaurando num banco descartável…')
  tenta(`dropdb --if-exists ${DB}`)
  sh(`createdb ${DB}`)
  // O dump do Supabase carrega extensões e papéis que não existem aqui; erro
  // nessas linhas é esperado e não invalida o ensaio. O que importa é o
  // catálogo de policies, conferido logo abaixo.
  tenta(`psql -q -d ${DB} -f ${DUMP} 2>/dev/null`)
  tenta(`psql -q -d ${DB} -c "do \\$\\$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end \\$\\$"`)

  // `brand_book_chunks` guarda embeddings (`vector`), e a extensão pgvector não
  // costuma existir na máquina de quem roda isto — a tabela não restaura, e a
  // 053 morre com "relation does not exist". Um dublê com as colunas que a
  // POLICY usa basta: este ensaio confere catálogo de policy, não vetores.
  // Sem o dublê, a tabela mais sensível do banco ficaria fora justamente do
  // ensaio criado para achar tabela fora do radar.
  tenta(`psql -q -d ${DB} -c "create table if not exists brand_book_chunks (id uuid primary key default gen_random_uuid(), brand_id uuid, chunk_text text)"`)
  tenta(`psql -q -d ${DB} -c "alter table brand_book_chunks enable row level security"`)
  tenta(`psql -q -d ${DB} -c "create policy \\"workspace acessa brand_book_chunks\\" on brand_book_chunks for all using (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or exists (select 1 from platform_admins where user_id = auth.uid()))"`)

  const antes = Number(psql(`select count(*) from pg_policies where schemaname='public'`))
  exige(antes > 40, `o esquema não restaurou direito: só ${antes} policies (produção tem 59)`)
  console.log(`      ${antes} policies restauradas`)

  console.log('[3/4] aplicando a 053…')
  sh(`psql -q -v ON_ERROR_STOP=1 -d ${DB} -f supabase/migrations/053_sessao_de_suporte.sql`)

  console.log('[4/4] conferindo o catálogo depois…')

  // (a) A tabela e as funções nasceram.
  exige(psql(`select to_regclass('public.platform_admin_sessions') is not null`) === 't',
    'platform_admin_sessions não foi criada')
  for (const fn of ['operador_pode', 'ws_da_brand', 'ws_do_brand_book', 'ws_da_conversa']) {
    exige(psql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${fn}'`) === '1',
      `função ${fn} não foi criada`)
  }

  // (b) O QUE ESTE ENSAIO EXISTE PARA PEGAR: sobra de bypass permanente.
  // Uma policy que chame is_platform_admin() numa tabela fechada significa que
  // o `drop policy if exists` não achou o alvo — nome divergente.
  const sobras = psql(`
    select coalesce(string_agg(tablename || ' :: ' || policyname, ' | '), '')
      from pg_policies
     where schemaname = 'public'
       and tablename in (${FECHADAS.map(t => `'${t}'`).join(',')})
       and ${BYPASS}`)
  exige(sobras === '',
    `SOBROU BYPASS PERMANENTE — o drop não achou o alvo, ou a policy escreve o bypass à mão:\n     ${sobras}`)

  // (b2) E a varredura larga: QUALQUER tabela do banco que ainda carregue o
  // bypass permanente e não esteja na lista de exceções declaradas. É o que
  // pega a tabela NOVA que alguém criar amanhã copiando o padrão velho — o
  // ensaio passa a reclamar sozinho, em vez de esperar a próxima revisão.
  const foraDoRadar = psql(`
    select coalesce(string_agg(distinct tablename, ', '), '')
      from pg_policies
     where schemaname = 'public'
       and ${BYPASS}
       and tablename not in (${IDENTIDADE_OK.map(t => `'${t}'`).join(',')})`)
  exige(foraDoRadar === '',
    `tabela com bypass permanente fora da lista de exceções: ${foraDoRadar}\n     Ou ela entra na 053, ou entra em IDENTIDADE_OK com o motivo escrito.`)

  // (c) E o inverso: toda tabela fechada tem que ter ganhado a regra de sessão.
  // Sem isto, um `drop` que acertou o alvo mas um `create` que errou o nome da
  // tabela passaria como "sem sobra" — e a tela do operador abriria vazia.
  const semSessao = psql(`
    select coalesce(string_agg(t, ', '), '')
      from unnest(array[${FECHADAS.map(t => `'${t}'`).join(',')}]) as t
     where not exists (
       select 1 from pg_policies p
        where p.schemaname='public' and p.tablename = t
          and (coalesce(p.qual,'') like '%operador_pode%' or coalesce(p.with_check,'') like '%operador_pode%'))`)
  exige(semSessao === '', `tabelas fechadas que NÃO ganharam a regra de sessão: ${semSessao}`)

  // (d) O bypass por identidade que fica, fica. Se sumiu, o /admin quebra.
  for (const t of IDENTIDADE_OK) {
    const tem = psql(`select count(*) from pg_policies where schemaname='public' and tablename='${t}' and (coalesce(qual,'') like '%is_platform_admin%' or coalesce(with_check,'') like '%is_platform_admin%')`)
    exige(Number(tem) > 0, `${t} perdeu o bypass por identidade — o /admin depende dele`)
  }

  const depois = Number(psql(`select count(*) from pg_policies where schemaname='public'`))
  console.log(`      ${depois} policies depois (${depois - antes >= 0 ? '+' : ''}${depois - antes})`)
} finally {
  tenta(`dropdb --if-exists ${DB}`)
  for (const f of [DUMP, CONSULTA]) { try { unlinkSync(f) } catch { /* já foi */ } }
}

if (falhas.length) {
  console.error('\n✖ A 053 não se comporta assim sobre o esquema REAL. NÃO aplique:\n')
  for (const f of falhas) console.error(`  · ${f}`)
  console.error('')
  process.exit(1)
}
console.log('\n✓ A 053 aplica limpo sobre o esquema de produção, sem sobra de bypass permanente.')
