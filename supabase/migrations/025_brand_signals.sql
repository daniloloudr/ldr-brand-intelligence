-- 025_brand_signals.sql — Camada de Inteligência da Marca, Fase 0 (espinha dorsal)
-- Tabela append-only de sinais + emissão automática via triggers (sem tocar em
-- nenhuma feature) + backfill dos votos/campanhas que já existem.
-- Spec: specs/features/brand-intelligence.md. SEM cérebro ainda (só captura).

-- ── Tabela de sinais (append-only) ───────────────────────────────────
create table if not exists brand_signals (
  id            uuid default gen_random_uuid() primary key,
  brand_id      uuid references brands(id) on delete cascade,
  workspace_id  uuid references workspaces(id) on delete cascade,
  tipo          text not null,   -- image_vote | campaign_verdict | diagnostic | listening_sentiment | brandbook_edit | assistant_correction
  fonte         text,            -- feature de origem
  ref_id        uuid,            -- id do registro de origem
  payload       jsonb,
  peso          numeric default 1,
  created_at    timestamptz default now(),
  consumido_em  timestamptz      -- marca quando o destilador (Fase 1) já incorporou
);
alter table brand_signals enable row level security;
create index if not exists idx_brand_signals_brand      on brand_signals (brand_id, tipo, created_at desc);
create index if not exists idx_brand_signals_unconsumed on brand_signals (consumido_em) where consumido_em is null;

drop policy if exists "workspace acessa brand_signals" on brand_signals;
create policy "workspace acessa brand_signals" on brand_signals
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  );
-- Triggers inserem via SECURITY DEFINER (bypassam RLS).

-- ── Emissores (triggers) ─────────────────────────────────────────────

-- 1. image_vote — voto 👍/👎 numa peça do Studio
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

-- 2. campaign_verdict — campanha concluída/aprovada
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

-- 3. diagnostic — novo diagnóstico de posicionamento (marca derivada do workspace)
create or replace function emit_signal_diagnostic() returns trigger
language plpgsql security definer as $$
declare v_brand uuid;
begin
  select id into v_brand from brands where workspace_id = new.workspace_id limit 1;
  insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso)
  values (v_brand, new.workspace_id, 'diagnostic', 'posicionamento', new.id,
    jsonb_build_object('tipo', new.tipo,
      'score_singularidade', new.score_singularidade,
      'score_consistencia', new.score_consistencia,
      'score_posicionamento', new.score_posicionamento,
      'frase', left(coalesce(new.frase_diagnostico, ''), 500)),
    1);
  return new;
end; $$;
drop trigger if exists trg_signal_diagnostic on diagnosticos;
create trigger trg_signal_diagnostic after insert on diagnosticos
  for each row execute function emit_signal_diagnostic();

-- 4. listening_sentiment — snapshot agregado de sentimento
create or replace function emit_signal_listening() returns trigger
language plpgsql security definer as $$
declare v_brand uuid;
begin
  select id into v_brand from brands where workspace_id = new.workspace_id limit 1;
  insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso)
  values (v_brand, new.workspace_id, 'listening_sentiment', 'listening', new.id,
    jsonb_build_object('avg_positivo', new.avg_positivo, 'avg_neutro', new.avg_neutro,
      'avg_negativo', new.avg_negativo, 'total_mencoes', new.total_mencoes, 'periodo', new.periodo),
    1);
  return new;
end; $$;
drop trigger if exists trg_signal_listening on sentiment_snapshots;
create trigger trg_signal_listening after insert on sentiment_snapshots
  for each row execute function emit_signal_listening();

-- 5. brandbook_edit — definição/edição humana da marca (workspace derivado da marca)
create or replace function emit_signal_brandbook() returns trigger
language plpgsql security definer as $$
declare v_ws uuid;
begin
  select workspace_id into v_ws from brands where id = new.brand_id;
  insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso)
  values (new.brand_id, v_ws, 'brandbook_edit', 'brandbook', new.id,
    jsonb_build_object('acao', tg_op), 2);
  return new;
end; $$;
drop trigger if exists trg_signal_brandbook on brand_books;
create trigger trg_signal_brandbook after insert or update on brand_books
  for each row execute function emit_signal_brandbook();

-- ── Backfill: semeia sinais do que já existe ─────────────────────────
-- Votos já dados no Studio
insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso, created_at)
select brand_id, workspace_id, 'image_vote', 'studio-backfill', id,
  jsonb_build_object('voto', feedback, 'provider', provider, 'formato', formato,
    'media_type', media_type, 'prompt', left(coalesce(prompt_final, ''), 2000)),
  2, coalesce(feedback_at, created_at)
from studio_generations
where feedback is not null
  and not exists (select 1 from brand_signals bs where bs.ref_id = studio_generations.id and bs.tipo = 'image_vote');

-- Campanhas já concluídas/aprovadas
insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso, created_at)
select brand_id, workspace_id, 'campaign_verdict', 'studio-backfill', id,
  jsonb_build_object('status', status, 'mode', mode, 'formatos', formatos,
    'conceito', left(coalesce(conceito, ''), 2000)),
  case when status = 'aprovada' then 3 else 1 end, created_at
from studio_campaigns
where status in ('concluida', 'aprovada')
  and not exists (select 1 from brand_signals bs where bs.ref_id = studio_campaigns.id and bs.tipo = 'campaign_verdict');
