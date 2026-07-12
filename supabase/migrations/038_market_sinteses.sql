-- 038_market_sinteses.sql — Síntese do ciclo de mercado (fase 1 da Inteligência
-- de Mercado). O cérebro lê o clipping da janela e escreve o briefing:
-- 3 bullets do que importa + "o que isso significa para a sua marca".
-- Gerada on-demand (botão) e após o clipping semanal (cron de segunda).

create table if not exists market_sinteses (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  bullets       jsonb,         -- ["o que importa 1", "2", "3"]
  para_marca    text,          -- a leitura: o que fazer com isso
  janela_dias   int,
  mencoes       int            -- nº de itens de clipping lidos
);

alter table market_sinteses enable row level security;

create policy "acessa market_sinteses" on market_sinteses
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create index if not exists idx_market_sinteses on market_sinteses (workspace_id, created_at desc);
