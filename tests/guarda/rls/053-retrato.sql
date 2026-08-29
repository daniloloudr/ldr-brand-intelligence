-- Retrato do que a 053 vai encontrar. Roda DEPOIS do 052-retrato e da própria
-- migration 052 — este arquivo só acrescenta as tabelas de CONTEÚDO do cliente,
-- que é onde a 053 mexe.
--
-- Por que o retrato precisa ser fiel aqui: a 053 apaga policies pelo NOME. Se o
-- ensaio inventar um nome, o `drop policy if exists` não acha nada, a policy
-- velha continua de pé em produção — e o ensaio passa verde, provando o
-- contrário do que aconteceria. Os nomes e as cláusulas abaixo foram copiados
-- do `pg_policies` do banco real, não da leitura das migrations.
\set ON_ERROR_STOP on

-- ── As tabelas com workspace_id na própria linha ─────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    -- grupo A: bypass do operador em policy SEPARADA (007)
    'brands','alertas','concorrentes','listening_events','sentiment_snapshots',
    'identity_gap_snapshots','diagnosticos',
    -- grupo B: bypass INLINE, dentro da policy do membro
    'brand_signals','brand_intelligence','brand_dataset','credit_transactions',
    'studio_workflows','studio_generations','studio_campaigns',
    -- grupo C: SEM bypass nenhum — as seis do S0
    'tendencias','consumer_insights','market_sinteses','concorrente_clipping',
    'pecas_escritas','diagnosticos_concorrentes'
  ] loop
    execute format(
      'create table %I (id uuid primary key default gen_random_uuid(),
                        workspace_id uuid references workspaces(id) on delete cascade,
                        conteudo text)', t);
    execute format('alter table %I enable row level security', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- Grupo A — a policy do membro e, ao lado, a do operador (nomes do 007).
do $$
declare t text;
begin
  foreach t in array array['brands','alertas','concorrentes','listening_events',
                           'sentiment_snapshots','identity_gap_snapshots','diagnosticos'] loop
    execute format(
      'create policy "workspace acessa %s" on %I for all using (
         workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))', t, t);
    execute format(
      'create policy "platform_admin acessa %s" on %I for all using (is_platform_admin())', t, t);
  end loop;
end $$;

-- Grupo B — bypass inline. Os nomes divergem entre si no banco real; por isso
-- não dá para gerar em laço, e cada um vai literal.
create policy "workspace acessa brand_signals" on brand_signals
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin())
          with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin());
create policy "workspace acessa brand_intelligence" on brand_intelligence
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin())
          with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin());
create policy "workspace le brand_dataset" on brand_dataset
  for select using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin());
create policy "workspace lê suas transações" on credit_transactions
  for select using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin());
create policy "workspace acessa studio_workflows" on studio_workflows
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin())
          with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin());
create policy "workspace acessa studio_generations" on studio_generations
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin())
          with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin());
create policy "workspace acessa studio_campaigns" on studio_campaigns
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin())
          with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or is_platform_admin());

-- Grupo C — as seis do S0: só participação, nenhum bypass. É este estado que
-- deixaria a impersonação VAZIA no dia em que o operador saísse dos membros.
do $$
declare t text; nome text;
begin
  foreach t in array array['tendencias','consumer_insights','market_sinteses',
                           'concorrente_clipping','pecas_escritas','diagnosticos_concorrentes'] loop
    -- diagnosticos_concorrentes nasceu na 005 com outro prefixo de nome
    nome := case when t = 'diagnosticos_concorrentes' then 'workspace acessa ' || t else 'acessa ' || t end;
    execute format(
      'create policy %I on %I for all
         using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
         with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))', nome, t);
  end loop;
end $$;

-- ── As encadeadas: conteúdo sem workspace_id na linha ────────────────
create table brand_books (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  verbal_identity jsonb
);
create table brand_book_history (
  id uuid primary key default gen_random_uuid(),
  brand_book_id uuid references brand_books(id) on delete cascade,
  snapshot jsonb
);
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  titulo text
);
create table conversations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  titulo text
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  content text
);

alter table brand_books        enable row level security;
alter table brand_book_history enable row level security;
alter table campaigns          enable row level security;
alter table conversations      enable row level security;
alter table messages           enable row level security;
grant select, insert, update, delete on brand_books, brand_book_history, campaigns, conversations, messages to authenticated;

create policy "workspace acessa brand_books" on brand_books for all using (
  brand_id in (select b.id from brands b join workspace_members wm on wm.workspace_id = b.workspace_id where wm.user_id = auth.uid()));
create policy "platform_admin acessa brand_books" on brand_books for all using (is_platform_admin());

create policy "workspace acessa brand_book_history" on brand_book_history for all using (
  brand_book_id in (select bb.id from brand_books bb join brands b on b.id = bb.brand_id
                    join workspace_members wm on wm.workspace_id = b.workspace_id where wm.user_id = auth.uid()));
create policy "platform_admin acessa brand_book_history" on brand_book_history for all using (is_platform_admin());

create policy "workspace acessa campaigns" on campaigns for all using (
  brand_id in (select b.id from brands b join workspace_members wm on wm.workspace_id = b.workspace_id where wm.user_id = auth.uid()));
create policy "platform_admin acessa campaigns" on campaigns for all using (is_platform_admin());

create policy "workspace acessa conversations" on conversations for all using (
  brand_id in (select b.id from brands b join workspace_members wm on wm.workspace_id = b.workspace_id where wm.user_id = auth.uid()));
create policy "platform_admin acessa conversations" on conversations for all using (is_platform_admin());

create policy "workspace acessa messages" on messages for all using (
  conversation_id in (select c.id from conversations c join brands b on b.id = c.brand_id
                      join workspace_members wm on wm.workspace_id = b.workspace_id where wm.user_id = auth.uid()));
create policy "platform_admin acessa messages" on messages for all using (is_platform_admin());

-- ── O estado que a release persegue (S1) ────────────────────────────
-- O operador sai das participações. É a razão de a 053 existir: a partir daqui
-- ele não enxerga NADA por ser membro, só pela sessão declarada. Sem tirá-lo
-- aqui, todo caso abaixo passaria pelo motivo errado — a participação —, e o
-- ensaio provaria a coisa errada com a cara de quem provou a certa.
--
-- Vem depois das asserções da 052 de propósito: lá ele ainda conta como membro
-- do time da Hering, que é o estado de hoje em produção.
delete from workspace_members
 where user_id = '33333333-3333-3333-3333-333333333333';

-- ── Dados ───────────────────────────────────────────────────────────
-- Uma linha de cada tabela na Hering, para o operador tentar ler.
do $$
declare t text;
begin
  foreach t in array array[
    'brands','alertas','concorrentes','listening_events','sentiment_snapshots',
    'identity_gap_snapshots','diagnosticos','brand_signals','brand_intelligence',
    'brand_dataset','credit_transactions','studio_workflows','studio_generations',
    'studio_campaigns','tendencias','consumer_insights','market_sinteses',
    'concorrente_clipping','pecas_escritas','diagnosticos_concorrentes'
  ] loop
    execute format(
      'insert into %I (workspace_id, conteudo) values (''aaaaaaaa-0000-0000-0000-000000000001'', ''conteudo da Hering'')', t);
  end loop;
end $$;

-- A marca precisa de id fixo para as encadeadas pendurarem nela.
update brands set id = 'bbbbbbbb-0000-0000-0000-000000000001'
 where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- O diagnóstico de LEAD: sem workspace_id, porque veio do funil público e não
-- pertence a tenant nenhum. São 124 das 139 linhas em produção (medido 27/08).
-- Sem esta linha no retrato, o ensaio não exercita o caso que quase derrubou o
-- Histórico do /admin.
insert into diagnosticos (workspace_id, conteudo) values (null, 'diagnóstico de lead do funil');

insert into brand_books (id, brand_id) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001');
insert into brand_book_history (brand_book_id) values ('cccccccc-0000-0000-0000-000000000001');
insert into campaigns (brand_id) values ('bbbbbbbb-0000-0000-0000-000000000001');
insert into conversations (id, brand_id) values
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001');
insert into messages (conversation_id, content) values
  ('dddddddd-0000-0000-0000-000000000001', 'conversa do cliente com o Copiloto');
