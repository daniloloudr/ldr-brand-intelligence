-- ── Status de execução de diagnósticos ─────────────────────────────
-- running | done | error
alter table diagnosticos
  add column if not exists status text default 'done';

-- Backfill: linhas que vieram do background com _job_error devem ser 'error'
update diagnosticos
   set status = 'error'
 where status is distinct from 'error'
   and (data->>'_job_error')::text = 'true';

-- Tudo que não está em erro vira 'done' (segurança caso default não tenha pegado)
update diagnosticos
   set status = 'done'
 where status is null;

create index if not exists idx_diagnosticos_status on diagnosticos(status);
