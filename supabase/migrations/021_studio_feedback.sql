-- 021_studio_feedback.sql
-- Votação/aprovação de imagens geradas no Studio.
-- O feedback alimenta o entendimento de "o que funciona" por modelo/marca/prompt
-- (provider, prompt_final e formato já existem na própria linha).
alter table studio_generations
  add column if not exists feedback     text,        -- 'up' | 'down' | null
  add column if not exists feedback_at  timestamptz,
  add column if not exists feedback_by  uuid references auth.users(id) on delete set null;

-- Índice p/ futuras análises agregadas (o que funciona por modelo).
create index if not exists idx_studio_generations_feedback
  on studio_generations (brand_id, provider, feedback)
  where feedback is not null;
