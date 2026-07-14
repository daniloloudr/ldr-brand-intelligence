-- 043: tudo que é GERADO aparece na Biblioteca automaticamente (Danilo 2026-07-14)
-- A Biblioteca lê studio_generations direto (sem duplicar em brand_assets);
-- a pasta permite organizar as gerações no repositório estilo Drive.
alter table studio_generations add column if not exists pasta text;
