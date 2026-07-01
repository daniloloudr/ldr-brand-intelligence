-- 026_brand_intelligence.sql — Camada de Inteligência, Fase 1 (estado)
-- Modelo vivo da marca, versionado, destilado dos brand_signals.
-- Spec: specs/features/brand-intelligence.md §3.

create table if not exists brand_intelligence (
  id              uuid default gen_random_uuid() primary key,
  brand_id        uuid references brands(id) on delete cascade,
  workspace_id    uuid references workspaces(id) on delete cascade,
  versao          int not null,          -- incremental por marca
  modelo          jsonb not null,        -- conhecimento destilado (posicionamento, voz, preferencias_visuais, do_dont, fatos)
  confianca_media numeric,               -- métrica de assertividade
  gerado_de       jsonb,                 -- proveniência { count, tipos, signal_ids }
  created_at      timestamptz default now()
);
alter table brand_intelligence enable row level security;
create index if not exists idx_brand_intelligence_brand on brand_intelligence (brand_id, versao desc);

drop policy if exists "workspace acessa brand_intelligence" on brand_intelligence;
create policy "workspace acessa brand_intelligence" on brand_intelligence
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  );
