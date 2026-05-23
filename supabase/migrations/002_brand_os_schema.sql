-- LOUDR Brand OS — Schema
-- Tabelas para Brand Engine, Brand Book, Assistant e Campanhas

-- Brands
create table if not exists brands (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id) on delete cascade,
  nome          text not null,
  slug          text not null,
  logo_url      text,
  status        text default 'draft',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(workspace_id, slug)
);

-- Brand books (um por brand)
create table if not exists brand_books (
  id              uuid default gen_random_uuid() primary key,
  brand_id        uuid unique references brands(id) on delete cascade,
  identity        jsonb,
  positioning     jsonb,
  design_system   jsonb,
  references      jsonb,
  version         int default 1,
  updated_at      timestamptz default now()
);

-- Histórico de edições
create table if not exists brand_book_history (
  id              uuid default gen_random_uuid() primary key,
  brand_book_id   uuid references brand_books(id) on delete cascade,
  section         text,
  snapshot        jsonb,
  changed_by      uuid references auth.users(id),
  changed_at      timestamptz default now(),
  note            text
);

-- Chunks para RAG (requer extensão vector habilitada no Supabase)
-- create extension if not exists vector;
-- create table if not exists brand_book_chunks (
--   id            uuid default gen_random_uuid() primary key,
--   created_at    timestamptz default now(),
--   brand_id      uuid references brands(id) on delete cascade,
--   section       text not null,
--   content       text not null,
--   embedding     vector(1536),
--   updated_at    timestamptz default now()
-- );

-- Conversas do Brand Assistant
create table if not exists conversations (
  id          uuid default gen_random_uuid() primary key,
  brand_id    uuid references brands(id) on delete cascade,
  user_id     uuid references auth.users(id),
  title       text,
  created_at  timestamptz default now()
);

-- Mensagens das conversas
create table if not exists messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  role            text,
  content         text,
  metadata        jsonb,
  created_at      timestamptz default now()
);

-- Campanhas para aprovação
create table if not exists campaigns (
  id            uuid default gen_random_uuid() primary key,
  brand_id      uuid references brands(id) on delete cascade,
  submitted_by  uuid references auth.users(id),
  title         text not null,
  content       jsonb,
  status        text default 'pending',
  verdict       jsonb,
  reviewed_at   timestamptz,
  created_at    timestamptz default now()
);

-- Identity Gap snapshots
create table if not exists identity_gap_snapshots (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  brand_id              uuid references brands(id) on delete cascade,
  workspace_id          uuid references workspaces(id),
  diagnostico_id        uuid references diagnosticos(id),
  gap_score             numeric,
  gap_narrativa         text,
  dimensoes             jsonb,
  declarado_scores      jsonb,
  percebido_scores      jsonb
);

-- ================================================================
-- RLS
-- ================================================================

alter table brands                enable row level security;
alter table brand_books           enable row level security;
alter table brand_book_history    enable row level security;
alter table conversations         enable row level security;
alter table messages              enable row level security;
alter table campaigns             enable row level security;
alter table identity_gap_snapshots enable row level security;

-- Brands: membro do workspace acessa
create policy "workspace acessa brands" on brands
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Brand books
create policy "workspace acessa brand_books" on brand_books
  for all using (
    brand_id in (
      select id from brands
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

-- Brand book history
create policy "workspace acessa brand_book_history" on brand_book_history
  for all using (
    brand_book_id in (
      select bb.id from brand_books bb
      join brands b on bb.brand_id = b.id
      where b.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

-- Conversations
create policy "workspace acessa conversations" on conversations
  for all using (
    brand_id in (
      select id from brands
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

-- Messages
create policy "workspace acessa messages" on messages
  for all using (
    conversation_id in (
      select c.id from conversations c
      join brands b on c.brand_id = b.id
      where b.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

-- Campaigns
create policy "workspace acessa campaigns" on campaigns
  for all using (
    brand_id in (
      select id from brands
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

-- Identity gap snapshots
create policy "workspace acessa identity_gap_snapshots" on identity_gap_snapshots
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- ================================================================
-- Índices
-- ================================================================

create index if not exists idx_brands_workspace_id on brands(workspace_id);
create index if not exists idx_brand_books_brand_id on brand_books(brand_id);
create index if not exists idx_conversations_brand_id on conversations(brand_id);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_campaigns_brand_id on campaigns(brand_id);
create index if not exists idx_identity_gap_workspace_id on identity_gap_snapshots(workspace_id);
create index if not exists idx_identity_gap_brand_id on identity_gap_snapshots(brand_id);
