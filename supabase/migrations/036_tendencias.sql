-- 036_tendencias.sql — Radar de tendências do setor (Onda 3).
-- Alimentado por trends-coletar-background (on-demand) e trends-cron (semanal).
-- "como_surfar" nasce já no tom da marca (o coletor recebe o brand context).

create table if not exists tendencias (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  titulo        text,
  conteudo      text,
  categoria     text,          -- comportamento | tecnologia | estetica | mercado | conteudo
  relevancia    int,           -- 1..10 para ESTA marca
  horizonte     text,          -- agora | 6m | 1a+
  como_surfar   text,          -- "como a sua marca surfa isso", no tom aprendido
  fonte         text,
  url           text
);

alter table tendencias enable row level security;

create policy "acessa tendencias" on tendencias
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create index if not exists idx_tendencias on tendencias (workspace_id, created_at desc);
