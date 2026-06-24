-- ════════════════════════════════════════════════════════════════════
-- Studio Format Adapter — modo de campanha
-- independent: N peças independentes do mesmo conceito (Fase B)
-- adapt:       1 peça "hero" gerada primeiro; as demais são adaptações
--              reenquadradas usando o hero como imagem de referência
-- ════════════════════════════════════════════════════════════════════
alter table studio_campaigns
  add column if not exists mode               text default 'independent',  -- independent | adapt
  add column if not exists hero_generation_id uuid references studio_generations(id) on delete set null,
  add column if not exists adapt_started      boolean default false;
