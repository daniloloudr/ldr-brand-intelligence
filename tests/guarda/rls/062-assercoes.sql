-- Comportamento depois da 062. A rodada é o ATO de gerar: várias peças, um id.
\set QUIET on
\pset tuples_only on
\pset format unaligned
create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;
create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
reset role;

select caso('lote_peca tem rodada e origem',
  (select count(*) from information_schema.columns
    where table_name='lote_peca' and column_name in ('rodada','origem')) = 2);

select caso('origem só aceita massa ou peca', tentou_e_falhou($$
  insert into lote_peca (workspace_id, brand_id, pasta, sku, linha, origem)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          (select id from brands where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),
          'p','s','{}'::jsonb,'planilha') $$));

select caso('⭐ backfill: peça gravada antes virou rodada de UMA peça',
  not exists (select 1 from lote_peca where rodada is null));

-- duas peças no mesmo ato compartilham a rodada
insert into lote_peca (workspace_id, brand_id, pasta, sku, linha, rodada, origem)
select 'aaaaaaaa-0000-0000-0000-000000000001', b.id, v.pasta, v.sku, '{}'::jsonb,
       '77777777-7777-7777-7777-777777777777', 'massa'
from brands b, (values ('Catálogo/A/20260904','A'), ('Catálogo/B/20260904','B')) as v(pasta, sku)
where b.workspace_id='aaaaaaaa-0000-0000-0000-000000000001' limit 2;

select caso('⭐ duas peças do mesmo ato compartilham a rodada',
  (select count(*) from lote_peca where rodada='77777777-7777-7777-7777-777777777777') = 2);
select caso('e a rodada sabe que veio de planilha',
  (select count(distinct origem) from lote_peca where rodada='77777777-7777-7777-7777-777777777777') = 1);

reset role;
