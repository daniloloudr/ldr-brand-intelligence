-- Comportamento depois da 057. Chega num banco pós-056.
--
-- O que precisa provar:
--   1. Os dois eixos existem e não se confundem.
--   2. As campanhas existentes viraram escopo `encerrada` sem perder a produção.
--   3. O CHECK do escopo barra vocabulário de produção — e vice-versa.
--   4. O fan-out continua podendo escrever seu estado (é o que a D1 teme).
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;
create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;
exception when others then return true; end $$;

reset role;

-- ── 1 · Os dois eixos ───────────────────────────────────────────────
select caso('nasceu a coluna `producao`, separada do `status`',
  (select count(*) from information_schema.columns
    where table_name='studio_campaigns' and column_name in ('producao','status')) = 2);

-- ── 1b · O DE-PARA sobre a semente do retrato (o que a D1 exige) ───
select caso('concluida → escopo encerrada, produção preservada',
  (select status from studio_campaigns where id='babe0000-0000-0000-0000-000000000001')='encerrada'
  and (select producao from studio_campaigns where id='babe0000-0000-0000-0000-000000000001')='concluida');
select caso('aprovada → escopo encerrada, produção preservada',
  (select status from studio_campaigns where id='babe0000-0000-0000-0000-000000000002')='encerrada'
  and (select producao from studio_campaigns where id='babe0000-0000-0000-0000-000000000002')='aprovada');
select caso('gerando → escopo ATIVA (está produzindo, logo vigente)',
  (select status from studio_campaigns where id='babe0000-0000-0000-0000-000000000003')='ativa'
  and (select producao from studio_campaigns where id='babe0000-0000-0000-0000-000000000003')='gerando');
select caso('rascunho continua rascunho nos dois eixos',
  (select status from studio_campaigns where id='babe0000-0000-0000-0000-000000000004')='rascunho'
  and (select producao from studio_campaigns where id='babe0000-0000-0000-0000-000000000004')='rascunho');

-- ── 2 · O de-para preservou a produção ──────────────────────────────
-- Semeia como a produção estava ANTES da 057 e reaplica o de-para, para provar
-- que 'concluida' vira escopo 'encerrada' SEM perder que a produção concluiu.
insert into studio_campaigns (id, workspace_id, nome, status, producao) values
  ('cafe0000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','concluída','encerrada','concluida'),
  ('cafe0000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','em produção','ativa','gerando');

select caso('escopo encerrado NÃO apaga que a produção concluiu',
  (select producao from studio_campaigns where id='cafe0000-0000-0000-0000-000000000001') = 'concluida');
select caso('os dois eixos coexistem no mesmo registro',
  (select status from studio_campaigns where id='cafe0000-0000-0000-0000-000000000002') = 'ativa'
  and (select producao from studio_campaigns where id='cafe0000-0000-0000-0000-000000000002') = 'gerando');

-- ── 3 · Os CHECKs não deixam os vocabulários se misturarem ──────────
select caso('§3.5: `status` recusa vocabulário de PRODUÇÃO', tentou_e_falhou($$
  update studio_campaigns set status='gerando' where id='cafe0000-0000-0000-0000-000000000002' $$));
select caso('`status` recusa "concluida" (era o valor antigo)', tentou_e_falhou($$
  update studio_campaigns set status='concluida' where id='cafe0000-0000-0000-0000-000000000002' $$));
select caso('`producao` recusa vocabulário de ESCOPO', tentou_e_falhou($$
  update studio_campaigns set producao='encerrada' where id='cafe0000-0000-0000-0000-000000000002' $$));

-- ── 4 · O fan-out continua funcionando — é o que a D1 teme ──────────
-- Estas são exatamente as três escritas de _studio.js e studio-campaign.js.
select caso('fan-out grava producao=gerando', not tentou_e_falhou($$
  update studio_campaigns set producao='gerando' where id='cafe0000-0000-0000-0000-000000000002' $$));
select caso('fan-out grava producao=concluida', not tentou_e_falhou($$
  update studio_campaigns set producao='concluida' where id='cafe0000-0000-0000-0000-000000000002' $$));
select caso('fan-out grava producao=rascunho na falha', not tentou_e_falhou($$
  update studio_campaigns set producao='rascunho' where id='cafe0000-0000-0000-0000-000000000002' $$));
select caso('a tela grava producao=aprovada', not tentou_e_falhou($$
  update studio_campaigns set producao='aprovada' where id='cafe0000-0000-0000-0000-000000000002' $$));

-- ── 5 · O ciclo de vida do escopo (§3.5) ────────────────────────────
select caso('escopo aceita rascunho → ativa → encerrada', not tentou_e_falhou($$
  update studio_campaigns set status='ativa' where id='cafe0000-0000-0000-0000-000000000001';
  update studio_campaigns set status='encerrada' where id='cafe0000-0000-0000-0000-000000000001' $$));
select caso('campanha nova nasce em rascunho', not tentou_e_falhou($$
  insert into studio_campaigns (workspace_id, nome) values ('aaaaaaaa-0000-0000-0000-000000000001','nova') $$));
select caso('o default do escopo é rascunho',
  (select status from studio_campaigns where nome='nova') = 'rascunho');
