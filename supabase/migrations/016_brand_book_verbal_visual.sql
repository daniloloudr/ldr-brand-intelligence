-- Brand book: Identidade Verbal e Identidade Visual
-- Novas colunas jsonb. Backfill copia dados existentes:
--   identity   -> verbal_identity
--   "references" -> visual_identity
alter table brand_books
  add column if not exists verbal_identity jsonb default '{}'::jsonb,
  add column if not exists visual_identity jsonb default '{}'::jsonb;

update brand_books
   set verbal_identity = coalesce(identity, '{}'::jsonb)
 where verbal_identity is null or verbal_identity = '{}'::jsonb;

update brand_books
   set visual_identity = coalesce("references", '{}'::jsonb)
 where visual_identity is null or visual_identity = '{}'::jsonb;

create index if not exists idx_brand_books_verbal_identity on brand_books using gin (verbal_identity);
create index if not exists idx_brand_books_visual_identity on brand_books using gin (visual_identity);
