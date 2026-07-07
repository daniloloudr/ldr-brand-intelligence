-- 032_assets_biblioteca.sql — Biblioteca de assets (E4): organização.
-- Pastas e tags no brand_assets para a página Biblioteca (Brand Studio).
alter table brand_assets
  add column if not exists pasta text,                 -- null = "Sem pasta"
  add column if not exists tags  text[] default '{}';
