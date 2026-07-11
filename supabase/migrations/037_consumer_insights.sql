-- 037_consumer_insights.sql — Insights nomeados do consumidor (Onda 3).
-- O cérebro destila a escuta social bruta em afirmações acionáveis.
-- Gerados em lote (batch_id agrupa uma geração); a página mostra o lote mais recente.

create table if not exists consumer_insights (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  batch_id      uuid not null,
  tipo          text,          -- elogio | atrito | oportunidade | tema | alerta
  titulo        text,
  insight       text,          -- a afirmação acionável, com evidência citada
  acao          text,          -- o que fazer com isso
  persona       text,          -- persona da Strategy relacionada (quando houver)
  evidencias    int            -- nº de menções que sustentam
);

alter table consumer_insights enable row level security;

create policy "acessa consumer_insights" on consumer_insights
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create index if not exists idx_consumer_insights on consumer_insights (workspace_id, created_at desc);
