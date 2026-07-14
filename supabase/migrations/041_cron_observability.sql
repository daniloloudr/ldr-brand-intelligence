-- 041: observabilidade dos crons (Gap 1) — heartbeats + alertas do watchdog
-- O bug de 06-08/jul (cron sem destilar) e o de 13/jul (teto síncrono) ficaram
-- dias invisíveis. cron_runs = batida de cada scheduled; cron_alerts = o que o
-- watchdog acusou (com dedup de 24h por cron+tipo).

create table if not exists cron_runs (
  id          uuid primary key default gen_random_uuid(),
  cron        text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,
  detalhe     jsonb
);
create index if not exists cron_runs_cron_started_idx on cron_runs (cron, started_at desc);

create table if not exists cron_alerts (
  id        uuid primary key default gen_random_uuid(),
  cron      text not null,
  tipo      text not null,          -- 'silencio' | 'morte' | 'erro'
  motivo    text not null,
  criado_em timestamptz not null default now()
);
create index if not exists cron_alerts_dedup_idx on cron_alerts (cron, tipo, criado_em desc);

-- Service key opera; platform_admin lê (painel admin futuro)
alter table cron_runs   enable row level security;
alter table cron_alerts enable row level security;

drop policy if exists cron_runs_admin_read on cron_runs;
create policy cron_runs_admin_read on cron_runs
  for select using (is_platform_admin());

drop policy if exists cron_alerts_admin_read on cron_alerts;
create policy cron_alerts_admin_read on cron_alerts
  for select using (is_platform_admin());
