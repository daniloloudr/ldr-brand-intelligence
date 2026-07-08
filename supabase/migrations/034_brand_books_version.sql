-- 034_brand_books_version.sql — coluna que o save do Brand Book sempre enviou
-- mas nunca existiu no schema (o upsert falhava com "Could not find the
-- 'version' column"). Contador simples de revisões do brand book.
alter table brand_books
  add column if not exists version int default 1;
