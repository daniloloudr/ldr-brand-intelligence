-- 035_brand_strategy.sql — Onda 2 da nova arquitetura (Strategy).
-- Campos NOVOS da árvore (Brand Meaning, Business Model, Portfolio,
-- Brand Architecture, Stakeholders, Personas, Goals&KPIs, UX/UI/Journey,
-- Storytelling/Seasons) vivem em coluna própria — os campos existentes
-- seguem canônicos em verbal_identity/visual_identity (zero de-para no banco).
alter table brand_books
  add column if not exists strategy jsonb default '{}';
