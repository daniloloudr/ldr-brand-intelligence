-- Ensaio da migration 052 num banco descartável.
-- Reproduz o mínimo do Supabase (schema auth, auth.uid(), RLS) e um retrato do
-- estado real: workspaces com admin+member, um workspace SEM dono nenhum, e
-- valores de role fora do esperado.
\set ON_ERROR_STOP on

create schema auth;
create table auth.users (id uuid primary key);

-- auth.uid() do Supabase, simulada por GUC: assim dá para "virar" cada usuário.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('teste.uid', true), '')::uuid
$$;

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  nome text, slug text, plano text default 'trial', ativo boolean default true,
  pais text not null default 'BR',
  creditos_saldo int, creditos_mes int, valor_mensal_centavos int,
  dados_alertas jsonb
);
create table platform_admins (id uuid default gen_random_uuid() primary key, user_id uuid);
create table workspace_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid,
  role text default 'member',
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

alter table workspaces        enable row level security;
alter table workspace_members enable row level security;

-- As policies ANTIGAS, para provar que o ensaio parte do estado real.
create policy "membro acessa workspace_members" on workspace_members
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "autenticado adiciona membro" on workspace_members
  for insert with check (user_id = auth.uid());
create policy "membro acessa workspace" on workspaces
  for all using (id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- ── O bypass do operador (migration 007) ────────────────────────────
-- Sem isto o retrato mente: em produção o platform_admin atravessa a RLS de ~15
-- tabelas por policy própria, e as policies são OR — o que a 052 fecha para o
-- cliente continua aberto para quem opera. Ficou de fora na primeira versão
-- deste ensaio, e a diferença apareceu quando o caso do operador reprovou por
-- um motivo que não era o real.
create or replace function is_platform_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create policy "platform_admin acessa workspaces" on workspaces
  for all using (is_platform_admin());
create policy "platform_admin acessa workspace_members" on workspace_members
  for all using (is_platform_admin());
create policy "platform_admin insere membros" on workspace_members
  for insert with check (is_platform_admin());

-- ── Retrato ────────────────────────────────────────────────────────
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),  -- dono
  ('22222222-2222-2222-2222-222222222222'),  -- membro comum
  ('33333333-3333-3333-3333-333333333333'),  -- operador da plataforma
  ('44444444-4444-4444-4444-444444444444');  -- membro do workspace órfão

insert into platform_admins (user_id) values ('33333333-3333-3333-3333-333333333333');

insert into workspaces (id, nome, slug, creditos_saldo, valor_mensal_centavos) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Hering', 'hering', 2500, 900000),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Orfao',  'orfao',   500,  10000);

insert into workspace_members (workspace_id, user_id, role, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin',  now() - interval '10 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'member', now() - interval '5 days'),
  -- valor fora do esperado: `role` nunca teve CHECK
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'member', now() - interval '9 days'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'editor', now() - interval '3 days');

-- Papel de aplicação: sem isto o superusuário ignora RLS e o ensaio mente.
-- `authenticated` é o papel que o Supabase usa para requisição de usuário
-- logado — é o mesmo nome que a migration referencia nos GRANT/policies.
do $$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on workspaces, workspace_members to authenticated;
grant select on platform_admins to authenticated;
grant execute on function is_platform_admin() to authenticated;
grant execute on function auth.uid() to authenticated;
