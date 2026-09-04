-- Comportamento depois da 061. Sem retrato próprio: chega num banco pós-060.
--
-- O lote guarda o PEDIDO de uma peça — contexto, referências, vistas — para que
-- ele sobreviva ao F5 e possa ser regerado dias depois. O que precisa provar:
--   1. o isolamento por workspace (é dado de cliente);
--   2. duas rodadas do mesmo SKU no mesmo dia são UMA linha, não duas.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;
create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;
exception when others then return true; end $$;

reset role;

select caso('lote_peca existe', to_regclass('public.lote_peca') is not null);
select caso('RLS ligada',
  (select relrowsecurity from pg_class where oid = 'public.lote_peca'::regclass));

insert into lote_peca (workspace_id, brand_id, pasta, sku, linha)
values ('aaaaaaaa-0000-0000-0000-000000000001',
        (select id from brands where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),
        'Lote KH6V · 04/09/2026', 'KH6V', '{"contexto":"polo"}'::jsonb);

select caso('⭐ mesma pasta + mesmo SKU colide — a rodada é UMA, atualizada', tentou_e_falhou($$
  insert into lote_peca (workspace_id, brand_id, pasta, sku, linha)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          (select id from brands where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),
          'Lote KH6V · 04/09/2026', 'KH6V', '{}'::jsonb) $$));

-- ⚠️ instrução própria, não CTE dentro de expressão: CTE que modifica dado só
-- vale no TOPO, e dentro de argumento de função a asserção some em silêncio.
insert into lote_peca (workspace_id, brand_id, pasta, sku, linha)
values ('aaaaaaaa-0000-0000-0000-000000000001',
        (select id from brands where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),
        'Lote KH6V · 04/09/2026', 'KH7A', '{}'::jsonb);
select caso('outro SKU na mesma pasta convive',
  (select count(*) from lote_peca where pasta='Lote KH6V · 04/09/2026') = 2);

select caso('o contexto volta inteiro do jsonb',
  (select linha->>'contexto' from lote_peca where sku='KH6V') = 'polo');

-- ── isolamento ──
set teste.uid = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select caso('membro lê os lotes do PRÓPRIO workspace',
  (select count(*) from lote_peca where workspace_id='aaaaaaaa-0000-0000-0000-000000000001') = 2);

reset role;
insert into lote_peca (workspace_id, brand_id, pasta, sku, linha)
select 'aaaaaaaa-0000-0000-0000-000000000002',
       (select id from brands where workspace_id='aaaaaaaa-0000-0000-0000-000000000002' limit 1),
       'Lote X · 04/09/2026', 'X', '{}'::jsonb
where exists (select 1 from brands where workspace_id='aaaaaaaa-0000-0000-0000-000000000002');

set teste.uid = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select caso('⭐ membro NÃO lê lote de workspace alheio',
  (select count(*) from lote_peca where workspace_id='aaaaaaaa-0000-0000-0000-000000000002') = 0);
select caso('⭐ membro NÃO grava lote em workspace alheio', tentou_e_falhou($$
  insert into lote_peca (workspace_id, brand_id, pasta, sku, linha)
  values ('aaaaaaaa-0000-0000-0000-000000000002',
          (select id from brands limit 1), 'p', 's', '{}'::jsonb) $$));

reset role;
