-- Align listening_events with frontend expectations
alter table listening_events add column if not exists titulo       text;
alter table listening_events add column if not exists sentiment    text;
alter table listening_events add column if not exists score_impacto float;

-- Align sentiment_snapshots with frontend expectations
alter table sentiment_snapshots add column if not exists data         date;
alter table sentiment_snapshots add column if not exists positivo_pct float default 0;
alter table sentiment_snapshots add column if not exists neutro_pct   float default 0;
alter table sentiment_snapshots add column if not exists negativo_pct float default 0;
