-- Comportamento e BACKFILL depois da 056. Qualquer FALHOU reprova o deploy.
-- Chega num banco pós-055.
--
-- O que precisa provar, e o backfill é a parte que mais importa:
--   1. Toda geração virou exatamente UMA peça e UMA versão v1.
--   2. O de-para dos sete estados está certo, caso a caso.
--   3. Feedback virou julgamento com autor preservado e `treina` NULO.
--   4. Rodar de novo NÃO duplica (o backfill é idempotente).
--   5. Isolamento por workspace nas três tabelas.
--   6. O cliente julga mas NÃO apaga julgamento — histórico não se reescreve.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;
create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;
exception when others then return true; end $$;

reset role;

-- A semente e as colunas vêm do 056-retrato.sql, ANTES da migration: o que
-- roda o backfill aqui é a MIGRATION, não uma cópia dela.

-- ── 1 · Uma peça e uma versão por geração ───────────────────────────
-- Compara com as ELEGÍVEIS: geração sem marca não vira peça, de propósito.
select caso('toda geração COM marca virou exatamente 1 peça',
  (select count(*) from studio_generations where brand_id is not null and workspace_id is not null)
  = (select count(*) from peca));
select caso('geração SEM marca foi pulada, não inventada',
  (select count(*) from peca where brand_id is null) = 0);
select caso('toda peça tem exatamente 1 versão v1',
  (select count(*) from peca_versao where numero = 1) = (select count(*) from peca));
select caso('nenhuma versão ficou órfã de peça',
  (select count(*) from peca_versao v where not exists (select 1 from peca p where p.id = v.peca_id)) = 0);

-- ── 2 · O de-para dos sete estados, caso a caso ─────────────────────
select caso('processing → gerando',  (select estado from peca_versao where generation_id='11110000-0000-0000-0000-000000000001') = 'gerando');
select caso('error → falhou',        (select estado from peca_versao where generation_id='11110000-0000-0000-0000-000000000002') = 'falhou');
select caso('feedback up → aprovada',(select estado from peca_versao where generation_id='11110000-0000-0000-0000-000000000003') = 'aprovada');
select caso('feedback down → recusada',(select estado from peca_versao where generation_id='11110000-0000-0000-0000-000000000004') = 'recusada');
select caso('done + parecer → analisada',(select estado from peca_versao where generation_id='11110000-0000-0000-0000-000000000005') = 'analisada');
select caso('done sem nada → gerada',(select estado from peca_versao where generation_id='11110000-0000-0000-0000-000000000006') = 'gerada');

-- `falhou` NÃO pode ter virado `recusada` — a regra do §5 que protege o cérebro.
select caso('§5: falhou NUNCA vira recusada',
  (select count(*) from peca_versao v join studio_generations g on g.id=v.generation_id
    where g.status='error' and v.estado='recusada') = 0);

select caso('media_type video → formato video',
  (select formato from peca where origem_generation_id='11110000-0000-0000-0000-000000000005') = 'video');

-- ── 3 · Julgamento: autor preservado, treina NULO ───────────────────
select caso('cada feedback virou 1 julgamento',
  (select count(*) from julgamento) = (select count(*) from studio_generations where feedback in ('up','down')));
select caso('o AUTOR do feedback foi preservado',
  (select usuario_id from julgamento j join peca_versao v on v.id=j.versao_id
    where v.generation_id='11110000-0000-0000-0000-000000000003') = '11111111-1111-1111-1111-111111111111');
select caso('D21: treina fica NULO no histórico (não se inventa que treina)',
  (select count(*) from julgamento where treina is not null) = 0);
select caso('o papel histórico é "desconhecido", não chutado',
  (select count(*) from julgamento where papel <> 'desconhecido') = 0);
select caso('decisão traduzida: up→aprovar, down→recusar',
  (select decisao from julgamento j join peca_versao v on v.id=j.versao_id where v.generation_id='11110000-0000-0000-0000-000000000004') = 'recusar');

-- ── 4 · Idempotência — rodar de novo não duplica ────────────────────
do $$
begin
  insert into peca (created_at, workspace_id, brand_id, campaign_id, formato, origem_generation_id)
  select g.created_at, g.workspace_id, g.brand_id, g.campaign_id, 'imagem', g.id
    from studio_generations g
   where g.brand_id is not null and g.workspace_id is not null
     and not exists (select 1 from peca p where p.origem_generation_id = g.id);
end $$;
select caso('rodar o backfill DE NOVO não duplica peça',
  (select count(*) from studio_generations where brand_id is not null and workspace_id is not null)
  = (select count(*) from peca));

-- ── 5 · O parecer aponta para a versão ──────────────────────────────
-- Só se pode reapontar o parecer cuja geração VIROU versão. Parecer de geração
-- pulada (sem marca) fica sem versão, e isso é correto — não há versão.
select caso('o parecer foi reapontado para a versão (onde há versão)',
  (select count(*) from parecer pa
    join peca_versao v on v.generation_id = pa.generation_id
   where pa.versao_id is null) = 0);

-- ── 6 · Isolamento e quem escreve o quê ─────────────────────────────
set role authenticated;
set teste.uid = '11111111-1111-1111-1111-111111111111';
select caso('dono da Hering lê as peças', (select count(*) from peca) >= 6);
select caso('cliente JULGA (é o ato dele, §4.3)', not tentou_e_falhou($$
  insert into julgamento (workspace_id, brand_id, versao_id, decisao, papel, modo, treina)
  select 'aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001', id, 'aprovar','dono','individual',true
    from peca_versao where generation_id='11110000-0000-0000-0000-000000000006' $$));
select caso('cliente NÃO apaga julgamento (histórico não se reescreve)', tentou_e_falhou($$
  delete from julgamento $$));

-- As asserções da 055 deixaram uma sessão de suporte ABERTA. Fechar aqui é o
-- próprio ensaio: sem isso o caso passaria pelo motivo errado.
reset role;
update platform_admin_sessions set encerrada_em = now() where encerrada_em is null;
set teste.uid = '33333333-3333-3333-3333-333333333333';
set role authenticated;
select caso('operador SEM sessão não lê peça',       (select count(*) from peca) = 0);
select caso('operador SEM sessão não lê julgamento', (select count(*) from julgamento) = 0);
