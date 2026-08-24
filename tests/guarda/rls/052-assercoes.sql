-- Comportamento depois da 052. Cada caso diz PASSOU/FALHOU; qualquer FALHOU
-- reprova o deploy. Roda como `authenticated` (RLS vale) trocando auth.uid().
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;

create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;          -- passou quando deveria barrar
exception when others then return true;   -- barrou: é o esperado
end $$;

-- Quantas linhas o comando tocou. -1 = foi barrado com exceção.
-- SECURITY INVOKER (o padrão): a RLS vale com o papel de quem chama.
create or replace function linhas(sql text) returns int language plpgsql as $$
declare n int; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;

-- ── 1. O CHECK ──────────────────────────────────────────────────────
select caso('CHECK recusa o valor pré-052 (admin)',
  tentou_e_falhou($$insert into workspace_members (workspace_id, user_id, role)
    values ('aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','admin')$$));

-- ── 2. Membro comum não manda no time ───────────────────────────────
set role authenticated;
set teste.uid = '22222222-2222-2222-2222-222222222222';   -- membro comum da Hering

select caso('membro comum LÊ o time (não pode ser fechado demais)',
  (select count(*) from workspace_members
    where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 3);

select caso('membro comum NÃO se promove a dono',
  linhas($$update workspace_members set role = 'owner' where user_id = '22222222-2222-2222-2222-222222222222'$$) = 0);

select caso('membro comum NÃO rebaixa o dono',
  linhas($$update workspace_members set role = 'member' where user_id = '11111111-1111-1111-1111-111111111111'$$) = 0);

select caso('membro comum NÃO remove colega',
  linhas($$delete from workspace_members where user_id = '11111111-1111-1111-1111-111111111111'$$) = 0);

-- ── 3. O bypass de tenant ───────────────────────────────────────────
-- Era o furo maior: `with check (user_id = auth.uid())`, sem workspace_id.
select caso('BYPASS FECHADO: não entra sozinho em tenant alheio',
  tentou_e_falhou($$insert into workspace_members (workspace_id, user_id, role)
    values ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','member')$$));

-- ── 4. O saldo ──────────────────────────────────────────────────────
select caso('membro NÃO se dá crédito',
  tentou_e_falhou($$update workspaces set creditos_saldo = 999999
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$));

select caso('membro NÃO muda o valor do contrato',
  tentou_e_falhou($$update workspaces set valor_mensal_centavos = 1
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$));

-- ── 5. O dono faz o trabalho dele ───────────────────────────────────
set teste.uid = '11111111-1111-1111-1111-111111111111';   -- dono da Hering

select caso('dono promove membro',
  linhas($$update workspace_members set role = 'member', pode_aprovar_pecas = true where user_id = '22222222-2222-2222-2222-222222222222'$$) = 1);

select caso('dono edita o nome da empresa (não foi fechado demais)',
  linhas($$update workspaces set nome = 'Hering Brasil' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 1);

select caso('dono também NÃO mexe no próprio saldo',
  tentou_e_falhou($$update workspaces set creditos_saldo = 999999
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$));

select caso('ÚLTIMO DONO não pode se rebaixar',
  tentou_e_falhou($$update workspace_members set role = 'member'
    where user_id = '11111111-1111-1111-1111-111111111111'
      and workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$));

select caso('ÚLTIMO DONO não pode ser removido',
  tentou_e_falhou($$delete from workspace_members
    where user_id = '11111111-1111-1111-1111-111111111111'
      and workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$));

-- ── 6. Operador da plataforma ───────────────────────────────────────
set teste.uid = '33333333-3333-3333-3333-333333333333';   -- platform_admin, NÃO é membro
select caso('operador ajusta plano/crédito (é o suporte)',
  linhas($$update workspaces set creditos_saldo = 3000 where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 1);

-- ── 7. O servidor (service key: auth.uid() nulo) ────────────────────
reset role;
set teste.uid = '';
select caso('servidor debita crédito normalmente',
  linhas($$update workspaces set creditos_saldo = creditos_saldo - 1 where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 1);
