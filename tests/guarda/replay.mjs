// ════════════════════════════════════════════════════════════════════
// replay.mjs — as migrations aplicam DO ZERO?
//
// POR QUE ISTO EXISTE
// As migrations desta casa só foram aplicadas INCREMENTALMENTE, num banco de
// produção que vive há meses. Ninguém nunca as rodou da 001 à última numa base
// vazia. Enquanto o Supabase era um só, isso não importava.
//
// Com Supabase Branching passa a importar muito: cada branch nasce de um banco
// VAZIO e replica `supabase/migrations` do começo. Uma migration que dependa de
// estado que só existe em produção — uma coluna criada à mão no painel, uma
// tabela que alguém criou fora do versionamento — faz o branch nascer quebrado,
// e o erro aparece no CI do Supabase, longe daqui.
//
// Este ensaio antecipa isso num Postgres descartável.
//
// O QUE ELE NÃO PROVA: que o dado se comporta. Ele confere ORDEM e DEPENDÊNCIA
// — se cada migration encontra o que precisa. Comportamento é `guarda:rls`.
//
// O DUBLÊ DO SUPABASE é deliberadamente mínimo: `auth.uid()`, `auth.users`, o
// schema `storage` com as colunas reais de buckets/objects, e os três papéis.
// `vector` vira um domínio de texto porque o pgvector raramente está na máquina
// de quem roda isto — e a alternativa seria pular a migration 012, que é
// justamente uma das que encadeiam.
// ════════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process'
import { readdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DB = 'replay_migrations_brandcode'
const sh = (cmd) => execFileSync('sh', ['-c', cmd], { encoding: 'utf8' })
const tenta = (cmd) => { try { return sh(cmd) } catch { return '' } }

try { execFileSync('pg_isready', [], { stdio: 'pipe' }) } catch {
  console.error('✖ Nenhum Postgres local respondendo. Este ensaio roda num banco descartável,')
  console.error('  nunca no Supabase — a instância de lá é a mesma da produção.')
  process.exit(1)
}

const DUBLE = `
create extension if not exists "uuid-ossp";
create schema if not exists auth;
create schema if not exists storage;
create domain public.vector as text;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('teste.uid', true), '')::uuid $$;
create table if not exists storage.buckets (
  id text primary key, name text, owner uuid, created_at timestamptz default now(),
  updated_at timestamptz default now(), public boolean default false,
  avif_autodetection boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(), metadata jsonb, path_tokens text[], version text);
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role anon;          exception when duplicate_object then null; end $$;
do $$ begin create role service_role;  exception when duplicate_object then null; end $$;
`

tenta(`dropdb --if-exists ${DB}`)
sh(`createdb ${DB}`)
// Via arquivo, não `-c`: SQL multilinha passado por -c faz o psql tratar a
// quebra como meta-comando ("invalid command \\n"). É a mesma pedra que o
// ensaio-esquema-real.mjs já documenta — e na qual eu tropecei de novo.
const DUBLE_SQL = join(tmpdir(), 'brandcode-replay-duble.sql')
writeFileSync(DUBLE_SQL, DUBLE)
sh(`psql -q -v ON_ERROR_STOP=1 -d ${DB} -f ${DUBLE_SQL}`)
unlinkSync(DUBLE_SQL)

// `vector` como domínio de texto faz a 012 aplicar, mas o `create extension`
// dela ainda falha. Sem pgvector local, essa migration e as que dependem de
// `brand_book_chunks` são REPORTADAS À PARTE — não são defeito das migrations.
const TEM_VECTOR = tenta(`psql -d postgres -Atc "select 1 from pg_available_extensions where name='vector'"`).trim() === '1'

const arquivos = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
const reais = [], porFaltarVector = []

for (const f of arquivos) {
  try {
    sh(`psql -q -v ON_ERROR_STOP=1 -d ${DB} -f supabase/migrations/${f} 2>&1 >/dev/null`)
  } catch (e) {
    const saida = String(e.stdout || '') + String(e.stderr || '')
    const erro = (saida.match(/ERROR:.*/g) || ['(sem ERROR na saída)'])[0]
    const ehVector = !TEM_VECTOR && /extension "vector"|brand_book_chunks/.test(erro)
    ;(ehVector ? porFaltarVector : reais).push({ f, erro })
  }
}

console.log(`\n${arquivos.length} migrations, aplicadas da primeira à última num banco vazio\n`)
if (porFaltarVector.length) {
  console.log(`⚠ ${porFaltarVector.length} dependem de pgvector, que não existe nesta máquina (no Supabase existe):`)
  for (const { f } of porFaltarVector) console.log(`    ${f}`)
  console.log('')
}
if (reais.length) {
  console.error(`✖ ${reais.length} migration(s) NÃO aplicam do zero — o branch nasceria quebrado:\n`)
  for (const { f, erro } of reais) console.error(`  ${f}\n    ${erro}`)
  tenta(`dropdb --if-exists ${DB}`)
  process.exit(1)
}
console.log('✓ Todas aplicam do zero. Um branch novo do Supabase replica sem erro.')
tenta(`dropdb --if-exists ${DB}`)
