-- ════════════════════════════════════════════════════════════════════
-- 062 — a RODADA existe (addon Catálogo, §7.5)
--
-- A 061 guardou o pedido por PEÇA, e isso bastava para regerar. Mas o histórico
-- ficou uma lista de peças soltas: uma importação de 2 SKUs aparecia como duas
-- entradas sem nada dizendo que foram o mesmo ato.
--
-- "Precisamos estruturar por histórico de USO. Ex.: importação em massa de 2
-- linhas geram…" (Danilo, 04/set). Uso é a RODADA — o clique em gerar —, não a
-- peça. Uma rodada tem origem (planilha ou peça única), quantas peças, quantas
-- imagens e quanto custou.
--
-- ⚠️ Sem tabela nova. A rodada é uma COLUNA em `lote_peca`, porque ela não tem
-- atributo próprio que não se derive das peças: totais são soma, e soma que se
-- guarda em duas casas diverge no primeiro conserto. O `id` é gerado no cliente
-- no momento do disparo — é o que amarra peças gravadas em requisições
-- separadas ao mesmo ato.
-- ════════════════════════════════════════════════════════════════════

alter table lote_peca add column if not exists rodada uuid;
alter table lote_peca add column if not exists origem text;

alter table lote_peca drop constraint if exists lote_peca_origem_valida;
alter table lote_peca add constraint lote_peca_origem_valida
  check (origem is null or origem in ('massa', 'peca'));

comment on column lote_peca.rodada is
  'O ato de gerar: todas as peças disparadas no mesmo clique compartilham este id. Nulo nas linhas gravadas antes da 062.';
comment on column lote_peca.origem is
  'De onde veio a rodada: `massa` (planilha) ou `peca` (formulário de uma peça só).';

-- O histórico pergunta "as rodadas desta marca, mais recentes primeiro".
create index if not exists idx_lote_peca_rodada on lote_peca (brand_id, rodada, created_at desc);

-- Backfill: cada peça já gravada vira uma rodada de uma peça só. É o que ela
-- foi de fato — antes da 062 não havia importação em massa registrada como ato,
-- e inventar agrupamento por data juntaria coisas que ninguém rodou junto.
update lote_peca
   set rodada = id, origem = coalesce(origem, 'peca')
 where rodada is null;
