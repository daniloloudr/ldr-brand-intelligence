-- Retrato para a 056: dá ao stub de `studio_generations` as colunas REAIS que o
-- backfill usa, e semeia gerações cobrindo TODOS os ramos do de-para.
--
-- Semeado ANTES da migration de propósito: assim o ensaio exercita o backfill
-- QUE ESTÁ NA MIGRATION, não uma cópia dele escrita nas asserções. Cópia de
-- backfill em teste é o defeito clássico deste tipo de ensaio — ela passa
-- enquanto a migration real diverge.
alter table studio_generations add column if not exists brand_id    uuid;
alter table studio_generations add column if not exists status      text;
alter table studio_generations add column if not exists feedback    text;
alter table studio_generations add column if not exists feedback_by uuid;
alter table studio_generations add column if not exists feedback_at timestamptz;
alter table studio_generations add column if not exists image_url   text;
alter table studio_generations add column if not exists media_type  text;
alter table studio_generations add column if not exists campaign_id uuid;
alter table studio_generations add column if not exists created_at  timestamptz default now();

insert into studio_generations (id, workspace_id, brand_id, status, feedback, feedback_by, media_type, image_url) values
  ('11110000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','processing', null, null, null, null),
  ('11110000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','error',      null, null, null, null),
  ('11110000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','done', 'up',   '11111111-1111-1111-1111-111111111111', null, 'https://cdn/3.png'),
  ('11110000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','done', 'down', '22222222-2222-2222-2222-222222222222', null, 'https://cdn/4.png'),
  ('11110000-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','done', null, null, 'video', 'https://cdn/5.mp4'),
  ('11110000-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','done', null, null, null, 'https://cdn/6.png');

-- A g5 tem parecer → o de-para tem que levá-la a 'analisada', não a 'gerada'.
insert into parecer (workspace_id, brand_id, generation_id, veredito, texto)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          '11110000-0000-0000-0000-000000000005','rechecar','peça com parecer, para o de-para');

-- Duas gerações no MESMO instante, na mesma marca: é o caso que quebraria um
-- backfill que correlacionasse por (brand_id, created_at) em vez de por id.
insert into studio_generations (id, workspace_id, brand_id, status, created_at) values
  ('11110000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','done','2026-08-01 10:00:00+00'),
  ('11110000-0000-0000-0000-0000000000a2','aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','done','2026-08-01 10:00:00+00');
