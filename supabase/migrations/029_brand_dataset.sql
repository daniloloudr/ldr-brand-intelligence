-- 029_brand_dataset.sql — Workstream do DATASET (plano-de-melhoria §4)
-- O fio central da estratégia de modelo: exemplos canônicos e versionados de
--   (contexto de marca → output → avaliação humana), por marca.
-- Valor duplo: melhora o RAG/contexto AGORA e destrava fine-tune por tenant
-- DEPOIS, sem retrabalho. Captura 100% automática via triggers (padrão da 025);
-- nenhuma feature precisa mudar. Só entram exemplos JULGADOS por humano.
-- Spec: specs/features/brand-intelligence.md §Dataset.

-- ── Tabela canônica (append-only; 1 linha = 1 exemplo julgado) ────────
create table if not exists brand_dataset (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  brand_id      uuid references brands(id) on delete cascade,
  workspace_id  uuid references workspaces(id) on delete cascade,
  superficie    text not null,       -- studio_image | studio_video | campaign | assistant | content_hub
  contexto      jsonb not null,      -- o que a IA recebeu (brand context injetado, prompt, params)
  output        jsonb not null,      -- o que foi produzido (mídia/texto + provider)
  avaliacao     jsonb not null,      -- o julgamento humano: {tipo, valor|correcao, em}
  fonte_tabela  text not null,       -- rastreabilidade até a origem
  fonte_id      uuid not null,
  schema_versao int  not null default 1,
  unique (fonte_tabela, fonte_id)    -- re-julgamento ATUALIZA o exemplo (upsert)
);
alter table brand_dataset enable row level security;
create index if not exists idx_brand_dataset_brand on brand_dataset (brand_id, superficie, created_at desc);

-- Membros LEEM o dataset da própria marca; escrita só via triggers (security
-- definer) — mantém a integridade do exemplo (ninguém edita julgamento à mão).
drop policy if exists "workspace le brand_dataset" on brand_dataset;
create policy "workspace le brand_dataset" on brand_dataset
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  );

-- ── Captura 1: voto numa peça do Studio (imagem/vídeo) ────────────────
-- studio_generations já guarda contexto (brand_context + prompt_final) e output;
-- o voto completa o exemplo. Re-voto atualiza a avaliação do mesmo exemplo.
create or replace function dataset_capture_vote() returns trigger
language plpgsql security definer as $$
begin
  if new.feedback is not null and new.feedback is distinct from old.feedback then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id,
      case when new.media_type = 'video' then 'studio_video' else 'studio_image' end,
      jsonb_build_object('brand_context', new.brand_context,
        'prompt_final', new.prompt_final, 'formato', new.formato),
      jsonb_build_object('provider', new.provider, 'media_type', new.media_type,
        'url', new.image_url),
      jsonb_build_object('tipo', 'vote', 'valor', new.feedback,
        'em', coalesce(new.feedback_at, now())),
      'studio_generations', new.id)
    on conflict (fonte_tabela, fonte_id) do update
      set avaliacao = excluded.avaliacao, output = excluded.output;
  end if;
  return new;
end; $$;
drop trigger if exists trg_dataset_vote on studio_generations;
create trigger trg_dataset_vote after update of feedback on studio_generations
  for each row execute function dataset_capture_vote();

-- ── Captura 2: veredicto de campanha ──────────────────────────────────
-- contexto = brief; output = as peças geradas; avaliação = status final.
create or replace function dataset_capture_campaign() returns trigger
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.status in ('concluida', 'aprovada') then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, 'campaign',
      jsonb_build_object('conceito', new.conceito, 'formatos', new.formatos, 'mode', new.mode),
      coalesce((select jsonb_agg(jsonb_build_object('provider', g.provider,
          'formato', g.formato, 'url', g.image_url, 'voto', g.feedback))
        from studio_generations g where g.campaign_id = new.id and g.status = 'done'), '[]'::jsonb),
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

-- ── Captura 3: ensino no Assistant + conteúdo adotado ────────────────
-- Esses dois já nascem como brand_signals (insert do membro via RLS) com o
-- payload completo — a correção humana é o rótulo mais valioso do dataset.
create or replace function dataset_capture_signal() returns trigger
language plpgsql security definer as $$
begin
  if new.tipo = 'assistant_correction' then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, 'assistant',
      jsonb_build_object('pergunta', new.payload->>'pergunta'),
      jsonb_build_object('resposta', new.payload->>'resposta'),
      jsonb_build_object('tipo', 'correction', 'correcao', new.payload->>'correcao', 'em', new.created_at),
      'brand_signals', new.id)
    on conflict (fonte_tabela, fonte_id) do nothing;
  elsif new.tipo = 'content_used' then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, 'content_hub',
      new.payload - 'briefing',
      jsonb_build_object('briefing', new.payload->>'briefing'),
      jsonb_build_object('tipo', 'adoption', 'valor', true, 'em', new.created_at),
      'brand_signals', new.id)
    on conflict (fonte_tabela, fonte_id) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists trg_dataset_signal on brand_signals;
create trigger trg_dataset_signal after insert on brand_signals
  for each row execute function dataset_capture_signal();

-- ── Backfill: converte o histórico em exemplos ────────────────────────
-- Votos já dados
insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id, created_at)
select brand_id, workspace_id,
  case when media_type = 'video' then 'studio_video' else 'studio_image' end,
  jsonb_build_object('brand_context', brand_context, 'prompt_final', prompt_final, 'formato', formato),
  jsonb_build_object('provider', provider, 'media_type', media_type, 'url', image_url),
  jsonb_build_object('tipo', 'vote', 'valor', feedback, 'em', coalesce(feedback_at, created_at)),
  'studio_generations', id, coalesce(feedback_at, created_at)
from studio_generations where feedback is not null
on conflict (fonte_tabela, fonte_id) do nothing;

-- Campanhas já concluídas/aprovadas
insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id, created_at)
select c.brand_id, c.workspace_id, 'campaign',
  jsonb_build_object('conceito', c.conceito, 'formatos', c.formatos, 'mode', c.mode),
  coalesce((select jsonb_agg(jsonb_build_object('provider', g.provider,
      'formato', g.formato, 'url', g.image_url, 'voto', g.feedback))
    from studio_generations g where g.campaign_id = c.id and g.status = 'done'), '[]'::jsonb),
  jsonb_build_object('tipo', 'verdict', 'valor', c.status, 'em', c.created_at),
  'studio_campaigns', c.id, c.created_at
from studio_campaigns c where c.status in ('concluida', 'aprovada')
on conflict (fonte_tabela, fonte_id) do nothing;

-- Ensinos e adoções já registrados como sinais
insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id, created_at)
select brand_id, workspace_id, 'assistant',
  jsonb_build_object('pergunta', payload->>'pergunta'),
  jsonb_build_object('resposta', payload->>'resposta'),
  jsonb_build_object('tipo', 'correction', 'correcao', payload->>'correcao', 'em', created_at),
  'brand_signals', id, created_at
from brand_signals where tipo = 'assistant_correction'
on conflict (fonte_tabela, fonte_id) do nothing;

insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id, created_at)
select brand_id, workspace_id, 'content_hub',
  payload - 'briefing',
  jsonb_build_object('briefing', payload->>'briefing'),
  jsonb_build_object('tipo', 'adoption', 'valor', true, 'em', created_at),
  'brand_signals', id, created_at
from brand_signals where tipo = 'content_used'
on conflict (fonte_tabela, fonte_id) do nothing;
