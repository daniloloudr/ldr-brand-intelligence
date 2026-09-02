-- Retrato para a 058. Chega num banco pós-057 e precisa de duas coisas que o
-- retrato mínimo não tem:
--
--   1. As três tabelas do aprendizado com as colunas REAIS (o stub da 053 tem
--      só id/workspace_id/conteudo).
--   2. Os gatilhos DE ANTES — os das migrations 025 e 029, escutando `status`.
--      Sem eles o ensaio não prova nada: a 058 existe para SUBSTITUIR esses
--      gatilhos, e provar a substituição exige que o gatilho velho esteja lá.
--      Instalá-los aqui é o que faz o ensaio reproduzir o defeito que a 057
--      introduziu, em vez de descrevê-lo.

alter table brand_signals add column if not exists brand_id     uuid;
alter table brand_signals add column if not exists tipo         text;
alter table brand_signals add column if not exists fonte        text;
alter table brand_signals add column if not exists ref_id       uuid;
alter table brand_signals add column if not exists payload      jsonb;
alter table brand_signals add column if not exists peso         numeric default 1;
alter table brand_signals add column if not exists created_at   timestamptz default now();
alter table brand_signals add column if not exists consumido_em timestamptz;

alter table brand_dataset add column if not exists brand_id      uuid;
alter table brand_dataset add column if not exists created_at    timestamptz default now();
alter table brand_dataset add column if not exists superficie    text;
alter table brand_dataset add column if not exists contexto      jsonb;
alter table brand_dataset add column if not exists output        jsonb;
alter table brand_dataset add column if not exists avaliacao     jsonb;
alter table brand_dataset add column if not exists fonte_tabela  text;
alter table brand_dataset add column if not exists fonte_id      uuid;
alter table brand_dataset add column if not exists schema_versao int default 1;
create unique index if not exists uq_brand_dataset_fonte on brand_dataset (fonte_tabela, fonte_id);

alter table brand_intelligence add column if not exists brand_id        uuid;
alter table brand_intelligence add column if not exists versao          int;
alter table brand_intelligence add column if not exists modelo          jsonb;
alter table brand_intelligence add column if not exists confianca_media numeric;
alter table brand_intelligence add column if not exists gerado_de       jsonb;
alter table brand_intelligence add column if not exists metricas        jsonb;
alter table brand_intelligence add column if not exists created_at      timestamptz default now();

alter table studio_campaigns   add column if not exists mode      text;
alter table studio_campaigns   add column if not exists formatos  jsonb;
alter table studio_campaigns   add column if not exists conceito  text;
alter table studio_generations add column if not exists provider  text;
alter table studio_generations add column if not exists formato   text;
alter table studio_generations add column if not exists prompt_final  text;
alter table studio_generations add column if not exists brand_context text;

-- ── Os gatilhos DE ANTES, cópias literais das migrations 025 e 029 ──
create or replace function emit_signal_campaign_verdict() returns trigger
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.status in ('concluida', 'aprovada') then
    insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso)
    values (new.brand_id, new.workspace_id, 'campaign_verdict', 'studio', new.id,
      jsonb_build_object('status', new.status, 'mode', new.mode,
        'formatos', new.formatos, 'conceito', left(coalesce(new.conceito, ''), 2000)),
      case when new.status = 'aprovada' then 3 else 1 end);
  end if;
  return new;
end; $$;
drop trigger if exists trg_signal_campaign_verdict on studio_campaigns;
create trigger trg_signal_campaign_verdict after update of status on studio_campaigns
  for each row execute function emit_signal_campaign_verdict();

create or replace function dataset_capture_campaign() returns trigger
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.status in ('concluida', 'aprovada') then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, 'campaign',
      jsonb_build_object('conceito', new.conceito, 'formatos', new.formatos, 'mode', new.mode),
      '[]'::jsonb,
      jsonb_build_object('tipo', 'verdict', 'valor', new.status, 'em', now()),
      'studio_campaigns', new.id)
    on conflict (fonte_tabela, fonte_id) do update
      set avaliacao = excluded.avaliacao, output = excluded.output;
  end if;
  return new;
end; $$;
drop trigger if exists trg_dataset_campaign on studio_campaigns;
create trigger trg_dataset_campaign after update of status on studio_campaigns
  for each row execute function dataset_capture_campaign();

create or replace function emit_signal_image_vote() returns trigger
language plpgsql security definer as $$
begin
  if new.feedback is not null and new.feedback is distinct from old.feedback then
    insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso)
    values (new.brand_id, new.workspace_id, 'image_vote', 'studio', new.id,
      jsonb_build_object('voto', new.feedback, 'provider', new.provider,
        'formato', new.formato, 'media_type', new.media_type,
        'prompt', left(coalesce(new.prompt_final, ''), 2000)),
      2);
  end if;
  return new;
end; $$;
drop trigger if exists trg_signal_image_vote on studio_generations;
create trigger trg_signal_image_vote after update of feedback on studio_generations
  for each row execute function emit_signal_image_vote();

-- ── O mundo de antes: sinais e exemplos SEM escopo, para o backfill ─
-- A g3 (votada, da 056) ganha campanha: é o caso que o backfill tem que rotular.
update studio_generations set campaign_id = 'babe0000-0000-0000-0000-000000000001',
                              provider = 'openai', formato = '1:1'
 where id = '11110000-0000-0000-0000-000000000003';

insert into brand_signals (id, workspace_id, brand_id, tipo, fonte, ref_id, payload, peso, consumido_em) values
  ('5161a100-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'campaign_verdict','studio-backfill','babe0000-0000-0000-0000-000000000001','{"status":"concluida"}'::jsonb, 1, now()),
  ('5161a100-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'image_vote','studio-backfill','11110000-0000-0000-0000-000000000003','{"voto":"up"}'::jsonb, 2, null),
  ('5161a100-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'listening_sentiment','listening',null,'{"total_mencoes":10}'::jsonb, 1, null);

insert into brand_dataset (id, workspace_id, brand_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id) values
  ('da7a0000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'campaign','{}'::jsonb,'[]'::jsonb,'{"tipo":"verdict"}'::jsonb,'studio_campaigns','babe0000-0000-0000-0000-000000000001'),
  ('da7a0000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
   'studio_image','{}'::jsonb,'{}'::jsonb,'{"tipo":"vote"}'::jsonb,'studio_generations','11110000-0000-0000-0000-000000000003');

insert into brand_intelligence (id, workspace_id, brand_id, versao, modelo) values
  ('b4a10000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001', 1, '{"voz":{"valor":"a marca"}}'::jsonb);
