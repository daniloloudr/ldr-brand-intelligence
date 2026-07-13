-- 039_ai_usage.sql — rastreio de custo de LLM/embeddings (visão da DONA).
-- Decisão 2026-07-12: crédito = repasse de custo (sem margem); o ganho está
-- no contrato. Para precificar, o Danilo precisa do custo TOTAL do sistema —
-- fal já é rastreada (studio_generations.provider); LLM/embeddings eram cegos.
-- Gravado na borda (_ai.js / _embed.js): 1 linha por chamada.

create table if not exists ai_usage (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  provider       text,          -- anthropic | voyage
  model          text,
  input_tokens   int,
  output_tokens  int,
  custo_usd      numeric(10,6), -- estimado pela tabela de preços do provider
  tag            text           -- quem chamou (distill, diagnostico, chat, sintese…)
);

alter table ai_usage enable row level security;
-- sem policy de leitura para membros: é visão interna (service key/admin)

create index if not exists idx_ai_usage_created on ai_usage (created_at desc);
create index if not exists idx_ai_usage_tag on ai_usage (tag, created_at desc);
