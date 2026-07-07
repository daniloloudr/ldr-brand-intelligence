-- 030_intelligence_metricas.sql — enriquecimento do modelo vivo.
-- Métricas de assertividade POR VERSÃO: a cada destilação, gravamos o
-- desempenho observado sob a versão anterior (approval das peças votadas
-- desde a última destilação). É a série que PROVA que o cérebro evolui —
-- não só que muda. Preenchida pelo distillBrand (_brain.js).
alter table brand_intelligence
  add column if not exists metricas jsonb;
  -- shape: { approval_sob_versao_anterior: 0..1|null, votos_janela: n, janela_inicio: timestamptz|null }
