-- ════════════════════════════════════════════════════════════════════
-- Deduplica brand_books (1 linha por brand_id) + unique(brand_id)
-- Causa da dívida: load antigo usava .maybeSingle() (null com duplicatas) →
-- editor inseria nova linha em vez de atualizar. Corrigido no código (load
-- pega a mais recente + save vira upsert); esta migration limpa o legado e
-- impede que volte a acontecer.
-- Sem temp table: CTEs inline em cada statement (compatível com pooler
-- em modo transação do Supabase SQL Editor).
-- ════════════════════════════════════════════════════════════════════

-- 1. Preserva o histórico das duplicatas, repontando para o sobrevivente
--    (a linha mais recente por brand_id).
with ranked as (
  select id, brand_id,
         first_value(id) over (
           partition by brand_id
           order by updated_at desc nulls last, created_at desc nulls last
         ) as keep_id
  from brand_books
),
dupes as (select id as dup_id, keep_id from ranked where id <> keep_id)
update brand_book_history h
   set brand_book_id = d.keep_id
  from dupes d
 where h.brand_book_id = d.dup_id;

-- 2. Remove as duplicatas (mantém só a mais recente por brand_id).
--    brand_book_chunks cascateia (on delete cascade) e é re-embedado no
--    próximo save do brand book.
with ranked as (
  select id, brand_id,
         first_value(id) over (
           partition by brand_id
           order by updated_at desc nulls last, created_at desc nulls last
         ) as keep_id
  from brand_books
)
delete from brand_books
 where id in (select id from ranked where id <> keep_id);

-- 3. Impede futuras duplicatas e habilita upsert onConflict=brand_id no editor.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'brand_books_brand_id_key') then
    alter table brand_books add constraint brand_books_brand_id_key unique (brand_id);
  end if;
end $$;
