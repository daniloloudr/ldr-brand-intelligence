-- 027_concorrente_clipping.sql
-- Clipping (menções/notícias recentes) dos concorrentes monitorados.
-- Alimentado por concorrente-clipping-background (on-demand) e -cron (semanal).

create table if not exists concorrente_clipping (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  workspace_id   uuid references workspaces(id) on delete cascade,
  concorrente_id uuid references concorrentes(id) on delete cascade,
  titulo         text,
  conteudo       text,
  fonte          text,
  sentiment      text,          -- positivo | neutro | negativo
  score_impacto  int,           -- 1..10
  url            text
);

alter table concorrente_clipping enable row level security;

create policy "acessa concorrente_clipping" on concorrente_clipping
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create index if not exists idx_conc_clipping      on concorrente_clipping (workspace_id, created_at desc);
create index if not exists idx_conc_clipping_conc on concorrente_clipping (concorrente_id, created_at desc);
