-- Habilita extensão pgvector (pode já estar ativa)
create extension if not exists vector;

-- Tabela de chunks do brand book com embeddings
create table if not exists brand_book_chunks (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  brand_id      uuid references brands(id) on delete cascade,
  brand_book_id uuid references brand_books(id) on delete cascade,
  section       text not null,
  chunk_text    text not null,
  embedding     vector(1024),
  metadata      jsonb default '{}'
);

-- Índice HNSW para busca por similaridade cosseno (melhor para datasets pequenos)
create index if not exists brand_book_chunks_embedding_idx
  on brand_book_chunks using hnsw (embedding vector_cosine_ops);

-- RLS
alter table brand_book_chunks enable row level security;

drop policy if exists "workspace acessa brand_book_chunks" on brand_book_chunks;
create policy "workspace acessa brand_book_chunks" on brand_book_chunks
  for all using (
    brand_id in (
      select br.id from brands br
      where br.workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
    or exists (select 1 from platform_admins where user_id = auth.uid())
  );

-- Função de busca por similaridade
create or replace function match_brand_book_chunks(
  p_brand_id  uuid,
  p_embedding vector(1024),
  p_limit     int default 5
)
returns table (
  id         uuid,
  section    text,
  chunk_text text,
  similarity float
)
language sql stable as $$
  select
    id,
    section,
    chunk_text,
    1 - (embedding <=> p_embedding) as similarity
  from brand_book_chunks
  where brand_id   = p_brand_id
    and embedding  is not null
  order by embedding <=> p_embedding
  limit p_limit;
$$;
