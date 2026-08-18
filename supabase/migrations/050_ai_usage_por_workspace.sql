-- ── Custo de IA por workspace ───────────────────────────────────────────
--
-- Pedido do Danilo, 18/08/2026: "preciso ver por workspace."
--
-- O QUE FALTAVA
-- `ai_usage` registrava provider/model/tokens/custo/tag, mas não DE QUEM era a
-- operação. Dava para saber quanto gastamos em "tendencias"; não dava para
-- saber quanto custa a Hering.
--
-- Isso importa porque a precificação é repasse a custo (1 crédito = R$ 0,33):
-- sem custo por marca, a fórmula de manutenção por cliente é chute.
--
-- O PONTO CEGO MAIOR
-- Além da coluna, o `streamAI` nunca chamou o logger. Ele é o caminho do
-- DIAGNÓSTICO — a operação mais cara do produto, entre US$ 0,45 e US$ 1,29 por
-- rodada (medido em 18/08 num A/B de 4 rodadas). Nenhuma delas aparecia aqui.
-- O total de US$ 29,80/mês que a tabela mostrava estava subestimado justamente
-- na ponta mais pesada.

alter table ai_usage
  add column if not exists workspace_id uuid references workspaces(id) on delete set null,
  -- Qual chamada dentro da operação. `tag` diz "diagnostico"; `operacao` diz
  -- "diagnostico:pixel-retail" ou "manual:bloco-visual" — para achar a rodada
  -- cara dentro de uma tag que parece barata na média.
  add column if not exists operacao text;

-- Custo por marca e custo por período são as duas perguntas reais.
create index if not exists ai_usage_workspace_idx on ai_usage (workspace_id, created_at desc);
create index if not exists ai_usage_created_idx   on ai_usage (created_at desc);

comment on column ai_usage.workspace_id is
  'De qual marca é a operação. NULL = operação de plataforma (diagnóstico de '
  'prospecção, cron global) — não pertence a nenhum cliente.';
comment on column ai_usage.operacao is
  'Sub-identificação dentro da tag, para achar a rodada cara dentro da média.';
