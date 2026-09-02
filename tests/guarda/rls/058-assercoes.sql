-- Comportamento depois da 058. Chega num banco pós-057, com os gatilhos VELHOS
-- instalados pelo retrato.
--
-- O que precisa provar:
--   1. O gatilho velho estava mesmo morto — a 057 tirou do `status` os valores
--      que ele esperava, e o CHECK torna esse caminho impossível.
--   2. Os dois gatilhos voltaram a capturar, agora em `producao`.
--   3. O escopo existe nas três tabelas do aprendizado e foi backfillado.
--   4. Sinal sem campanha continua sendo da MARCA (null), não vira órfão.
--   5. A versão do modelo vivo é única POR ESCOPO — marca e campanha podem
--      ter v1 cada uma sem colidir, e a mesma não pode ter duas v1.
--   6. RLS: o escopo não abriu porta lateral entre workspaces.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;
create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;
exception when others then return true; end $$;

reset role;

-- ── 1 · O gatilho velho não tinha como disparar ─────────────────────
-- Ele esperava status in ('concluida','aprovada'); a 057 proíbe os dois.
-- Isto é o defeito, reproduzido: não havia erro, só captura que sumiu.
select caso('o caminho do gatilho velho é impossível: `status`=concluida é barrado', tentou_e_falhou($$
  update studio_campaigns set status='concluida' where id='babe0000-0000-0000-0000-000000000001' $$));
select caso('nenhum gatilho de aprendizado escuta `status` ainda',
  not exists (
    select 1 from information_schema.triggered_update_columns
     where trigger_name in ('trg_signal_campaign_verdict','trg_dataset_campaign')
       and event_object_table = 'studio_campaigns' and event_object_column = 'status'));
select caso('os dois passaram a escutar `producao`',
  (select count(distinct trigger_name) from information_schema.triggered_update_columns
    where trigger_name in ('trg_signal_campaign_verdict','trg_dataset_campaign')
      and event_object_table = 'studio_campaigns' and event_object_column = 'producao') = 2);

-- ── 2 · A captura voltou, e agora com escopo ────────────────────────
insert into studio_campaigns (id, workspace_id, brand_id, nome, status, producao, conceito)
values ('babe0000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001','a que vai produzir','ativa','gerando','conceito da nova');

update studio_campaigns set producao='aprovada' where id='babe0000-0000-0000-0000-00000000000a';

select caso('produção aprovada volta a emitir campaign_verdict',
  (select count(*) from brand_signals
    where tipo='campaign_verdict' and ref_id='babe0000-0000-0000-0000-00000000000a') = 1);
select caso('o veredicto nasce com peso 3 (aprovada), como antes da 057',
  (select peso from brand_signals
    where tipo='campaign_verdict' and ref_id='babe0000-0000-0000-0000-00000000000a') = 3);
select caso('o veredicto nasce COM escopo — é aprendizado da campanha',
  (select campanha_id from brand_signals
    where tipo='campaign_verdict' and ref_id='babe0000-0000-0000-0000-00000000000a')
  = 'babe0000-0000-0000-0000-00000000000a');
select caso('o exemplo do dataset voltou a ser capturado, com escopo',
  (select campanha_id from brand_dataset
    where fonte_tabela='studio_campaigns' and fonte_id='babe0000-0000-0000-0000-00000000000a')
  = 'babe0000-0000-0000-0000-00000000000a');
select caso('o payload registra o valor de PRODUÇÃO, não o de escopo',
  (select payload->>'status' from brand_signals
    where tipo='campaign_verdict' and ref_id='babe0000-0000-0000-0000-00000000000a') = 'aprovada');

-- Encerrar o ESCOPO não é veredicto de produção: não pode emitir sinal novo.
update studio_campaigns set status='encerrada' where id='babe0000-0000-0000-0000-00000000000a';
select caso('encerrar o escopo NÃO emite veredicto (não é ato de produção)',
  (select count(*) from brand_signals
    where tipo='campaign_verdict' and ref_id='babe0000-0000-0000-0000-00000000000a') = 1);

-- ── 3 · O voto na peça herda o escopo da geração ────────────────────
update studio_generations set feedback='down' where id='11110000-0000-0000-0000-000000000003';
select caso('voto em peça de campanha nasce com o escopo dela',
  (select campanha_id from brand_signals
    where tipo='image_vote' and fonte='studio' and ref_id='11110000-0000-0000-0000-000000000003')
  = 'babe0000-0000-0000-0000-000000000001');

update studio_generations set feedback='up' where id='11110000-0000-0000-0000-000000000006';
select caso('voto em peça SEM campanha é aprendizado da MARCA (escopo null)',
  (select campanha_id from brand_signals
    where tipo='image_vote' and fonte='studio' and ref_id='11110000-0000-0000-0000-000000000006') is null);

-- ── 4 · O backfill rotulou o que já existia ─────────────────────────
select caso('backfill: veredicto antigo ganhou o escopo do ref_id',
  (select campanha_id from brand_signals where id='5161a100-0000-0000-0000-000000000001')
  = 'babe0000-0000-0000-0000-000000000001');
select caso('backfill: voto antigo ganhou o escopo pela geração',
  (select campanha_id from brand_signals where id='5161a100-0000-0000-0000-000000000002')
  = 'babe0000-0000-0000-0000-000000000001');
select caso('backfill: sinal que não é de campanha continua da marca',
  (select campanha_id from brand_signals where id='5161a100-0000-0000-0000-000000000003') is null);
select caso('backfill: o já-consumido continua consumido (rotular não reabre)',
  (select consumido_em from brand_signals where id='5161a100-0000-0000-0000-000000000001') is not null);
select caso('backfill: exemplo de campanha no dataset ganhou escopo',
  (select campanha_id from brand_dataset where id='da7a0000-0000-0000-0000-000000000001')
  = 'babe0000-0000-0000-0000-000000000001');
select caso('backfill: exemplo de geração no dataset ganhou escopo',
  (select campanha_id from brand_dataset where id='da7a0000-0000-0000-0000-000000000002')
  = 'babe0000-0000-0000-0000-000000000001');
select caso('as versões que já existiam continuam sendo da MARCA (escopo null)',
  (select campanha_id from brand_intelligence where id='b4a10000-0000-0000-0000-000000000001') is null);

-- ── 5 · Uma linha de versões POR ESCOPO ─────────────────────────────
select caso('marca e campanha podem ter v1 cada uma, lado a lado', not tentou_e_falhou($$
  insert into brand_intelligence (workspace_id, brand_id, campanha_id, versao, modelo)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'babe0000-0000-0000-0000-000000000001', 1, '{}'::jsonb) $$));
select caso('a MESMA campanha não pode ter duas v1', tentou_e_falhou($$
  insert into brand_intelligence (workspace_id, brand_id, campanha_id, versao, modelo)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'babe0000-0000-0000-0000-000000000001', 1, '{}'::jsonb) $$));
select caso('a MARCA não pode ter duas v1 (nulls not distinct)', tentou_e_falhou($$
  insert into brand_intelligence (workspace_id, brand_id, campanha_id, versao, modelo)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          null, 1, '{}'::jsonb) $$));
select caso('vigência é gravável na versão da campanha (proveniência)', not tentou_e_falhou($$
  update brand_intelligence set vigencia_inicio='2026-09-01', vigencia_fim='2026-09-30'
   where campanha_id='babe0000-0000-0000-0000-000000000001' $$));

-- ── 6 · O escopo não abriu porta entre workspaces ───────────────────
-- Um membro do ws 1 não pode enxergar sinal do ws 2 nem "puxando pelo escopo".
insert into studio_campaigns (id, workspace_id, nome, status)
values ('babe0000-0000-0000-0000-0000000000ff','aaaaaaaa-0000-0000-0000-000000000002','campanha do outro ws','ativa');
insert into brand_signals (id, workspace_id, brand_id, campanha_id, tipo, fonte, payload)
values ('5161a100-0000-0000-0000-0000000000ff','aaaaaaaa-0000-0000-0000-000000000002',
        'bbbbbbbb-0000-0000-0000-000000000002','babe0000-0000-0000-0000-0000000000ff',
        'image_vote','studio','{}'::jsonb);

set teste.uid = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select caso('membro do ws 1 NÃO lê sinal escopado do ws 2',
  (select count(*) from brand_signals where id='5161a100-0000-0000-0000-0000000000ff') = 0);
select caso('membro do ws 1 lê os sinais escopados do PRÓPRIO ws',
  (select count(*) from brand_signals where campanha_id='babe0000-0000-0000-0000-000000000001') > 0);
select caso('membro NÃO escreve sinal escopado em ws alheio', tentou_e_falhou($$
  insert into brand_signals (workspace_id, brand_id, campanha_id, tipo, fonte, payload)
  values ('aaaaaaaa-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002',
          'babe0000-0000-0000-0000-0000000000ff','image_vote','studio','{}'::jsonb) $$));
reset role;
