-- Comportamento depois da 059. Sem retrato próprio: chega num banco pós-058,
-- que é como encontra a produção (mesmo raciocínio da 054 e da 055).
--
-- O que precisa provar — e o item 2 é a razão de a tabela existir:
--   1. O cliente LÊ e PEDE.
--   2. O cliente NÃO LIBERA. Se um membro conseguisse dar update no estado, o
--      portão comercial seria decoração e o addon seria de graça na prática.
--   3. Pedido nasce `pedido`. Ninguém nasce `ativo`.
--   4. `nulls not distinct` no índice único: "todas as marcas" é UMA linha, não N.
--   5. Cancelar o próprio pedido é permitido; desinstalar o que está ativo, não.
--   6. `e_admin_plataforma()` não depende de sessão de suporte aberta — é a
--      diferença dela para o `operador_pode(ws)` da 053.
--   7. Isolamento: workspace não pede nem enxerga pelo outro.
--
-- ⚠️ Nada de `with x as (insert …) select` dentro de expressão: CTE que modifica
-- dado só vale no TOPO da instrução, e dentro de argumento de função a
-- instrução estoura calada — sem ON_ERROR_STOP, a asserção simplesmente não
-- emite, e bloco que não emite parece aprovado. Aqui a escrita é uma instrução
-- própria e a asserção lê o ESTADO que ela deixou.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;
create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;
exception when others then return true; end $$;

reset role;

-- ── 1 · A forma da tabela ───────────────────────────────────────────
select caso('addon_instalacao existe',
  to_regclass('public.addon_instalacao') is not null);
select caso('estado só aceita os quatro do §13.10', tentou_e_falhou($$
  insert into addon_instalacao (workspace_id, addon, estado)
  values ('aaaaaaaa-0000-0000-0000-000000000001','catalogo','instalado') $$));
select caso('RLS está LIGADA — sem isso as policies abaixo não valem nada',
  (select relrowsecurity from pg_class where oid = 'public.addon_instalacao'::regclass));

-- ── 2 · "todas as marcas" é UMA linha (nulls not distinct) ──────────
-- Sem esse recurso, N pedidos com brand_id nulo conviveriam para o mesmo
-- (workspace, addon), e "instalado para todas as marcas" viraria N instalações
-- silenciosas — cada uma com um estado próprio, possivelmente divergente.
insert into addon_instalacao (workspace_id, addon, brand_id, estado)
values ('aaaaaaaa-0000-0000-0000-000000000001','catalogo', null, 'pedido');

select caso('segundo pedido do mesmo addon com marca NULA colide', tentou_e_falhou($$
  insert into addon_instalacao (workspace_id, addon, brand_id, estado)
  values ('aaaaaaaa-0000-0000-0000-000000000001','catalogo', null, 'pedido') $$));

insert into addon_instalacao (workspace_id, addon, brand_id, estado)
values ('aaaaaaaa-0000-0000-0000-000000000001','formatos', null, 'pedido');
select caso('outro addon no mesmo workspace convive',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001') = 2);

-- ── 3 · O cliente pede, e só consegue pedir ─────────────────────────
set teste.uid = '22222222-2222-2222-2222-222222222222';   -- membro comum do ws Hering
set role authenticated;

select caso('membro ENXERGA os pedidos do próprio workspace',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001') = 2);

insert into addon_instalacao (workspace_id, addon, estado, pedido_por)
values ('aaaaaaaa-0000-0000-0000-000000000001','editor','pedido',
        '22222222-2222-2222-2222-222222222222');
select caso('membro consegue PEDIR um addon novo',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='editor') = 1);

-- O coração do portão comercial.
select caso('⭐ membro NÃO consegue nascer ATIVO', tentou_e_falhou($$
  insert into addon_instalacao (workspace_id, addon, estado)
  values ('aaaaaaaa-0000-0000-0000-000000000001','lote','ativo') $$));

-- Update sem policy que autorize não estoura: afeta ZERO linha, calado. Por
-- isso a asserção lê o estado depois, em vez de contar linhas afetadas.
update addon_instalacao set estado='ativo'
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo';
select caso('⭐ membro NÃO consegue se AUTO-LIBERAR',
  (select estado from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo') = 'pedido');

-- ── 4 · Isolamento entre workspaces ─────────────────────────────────
select caso('membro NÃO pede para workspace alheio', tentou_e_falhou($$
  insert into addon_instalacao (workspace_id, addon, estado)
  values ('aaaaaaaa-0000-0000-0000-000000000002','catalogo','pedido') $$));

select caso('membro NÃO enxerga instalação de workspace alheio',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000002') = 0);

-- ── 5 · O admin decide ──────────────────────────────────────────────
reset role;
set teste.uid = '33333333-3333-3333-3333-333333333333';   -- platform_admin, SEM sessão de suporte
set role authenticated;

select caso('⭐ e_admin_plataforma() vale sem sessão de suporte aberta',
  public.e_admin_plataforma());
select caso('e o operador_pode() NÃO vale — é outra pergunta (053)',
  not public.operador_pode('aaaaaaaa-0000-0000-0000-000000000001'));

update addon_instalacao
   set estado='ativo', decidido_por='33333333-3333-3333-3333-333333333333', decidido_em=now()
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo';
select caso('admin LIBERA o pedido',
  (select estado from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo') = 'ativo');

update addon_instalacao
   set estado='recusado', motivo='fora do contrato atual',
       decidido_por='33333333-3333-3333-3333-333333333333', decidido_em=now()
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='editor';
select caso('admin RECUSA com motivo',
  (select estado||'|'||coalesce(motivo,'') from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='editor')
  = 'recusado|fora do contrato atual');

update addon_instalacao set estado='suspenso'
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo';
select caso('admin SUSPENDE sem apagar — §8.3 vale para addon também',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001'
      and addon='catalogo' and estado='suspenso') = 1);

update addon_instalacao set estado='ativo'
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo';

-- ── 6 · Cancelar o pedido, mas não desinstalar sozinho ──────────────
reset role;
set teste.uid = '22222222-2222-2222-2222-222222222222';
set role authenticated;

delete from addon_instalacao
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo';
select caso('⭐ membro NÃO apaga instalação ATIVA — sair é ato de contrato',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo') = 1);

delete from addon_instalacao
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='editor';
select caso('membro APAGA pedido RECUSADO — é o que permite pedir de novo',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='editor') = 0);

-- E o índice único fica livre: o mesmo addon pode ser pedido outra vez.
insert into addon_instalacao (workspace_id, addon, estado, pedido_por)
values ('aaaaaaaa-0000-0000-0000-000000000001','editor','pedido',
        '22222222-2222-2222-2222-222222222222');
select caso('e o addon recusado pode ser PEDIDO DE NOVO',
  (select estado from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='editor') = 'pedido');

delete from addon_instalacao
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='formatos';
select caso('membro apaga o PRÓPRIO pedido em aberto',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='formatos') = 0);

-- ── 7 · A receita (060) é de quem LIBERA, não de quem usa ───────────
reset role;
set teste.uid = '33333333-3333-3333-3333-333333333333';
set role authenticated;
update addon_instalacao set workflow_id = null
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo';
select caso('admin define a receita da instalação',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo') = 1);

reset role;
set teste.uid = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select caso('cliente LÊ a coluna da receita',
  (select count(*) from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001'
      and addon='catalogo' and workflow_id is null) = 1);
-- update sem policy que autorize afeta ZERO linha, calado — a asserção lê o
-- estado depois, e não o número de linhas.
update addon_instalacao set estado='suspenso'
 where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo';
select caso('⭐ cliente NÃO troca nada da instalação — nem a receita',
  (select estado from addon_instalacao
    where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' and addon='catalogo') = 'ativo');

reset role;
