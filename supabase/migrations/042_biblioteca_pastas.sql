-- 042: Biblioteca vira repositório estilo Drive (pedido do Danilo 2026-07-14)
-- Textos (pecas_escritas) ganham pasta — brand_assets já tinha (migration 032).
alter table pecas_escritas add column if not exists pasta text;
