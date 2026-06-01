-- ============================================================
-- LOUDR OS — Setup completo idempotente
-- Funciona mesmo com banco parcialmente inicializado.
-- Rodar UMA VEZ no Supabase SQL Editor.
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. Workspaces ────────────────────────────────────────────
create table if not exists workspaces (
  id                      uuid default gen_random_uuid() primary key,
  created_at              timestamptz default now(),
  nome                    text not null,
  dominio                 text,
  setor                   text,
  porte                   text,
  plano                   text default 'trial',
  plano_status            text default 'active',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  trial_ends_at           timestamptz default (now() + interval '14 days'),
  diagnosticos_mes        int default 0,
  diagnosticos_reset_at   timestamptz default (date_trunc('month', now()) + interval '1 month')
);

-- ── 2. Membros ───────────────────────────────────────────────
create table if not exists workspace_members (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          text default 'member',
  created_at    timestamptz default now(),
  unique(workspace_id, user_id)
);

-- ── 3. Diagnósticos (cria ou completa colunas faltantes) ─────
create table if not exists diagnosticos (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  workspace_id          uuid,
  user_id               uuid references auth.users(id),
  user_name             text,
  user_email            text,
  empresa               text,
  dominio               text,
  setor                 text,
  porte                 text,
  score_singularidade   int,
  score_consistencia    int,
  score_posicionamento  int,
  frase_diagnostico     text,
  data                  jsonb,
  publico               boolean default true,
  tipo                  text default 'manual'
);

-- Adiciona colunas que podem estar faltando na tabela existente
alter table diagnosticos add column if not exists workspace_id          uuid;
alter table diagnosticos add column if not exists publico               boolean default true;
alter table diagnosticos add column if not exists tipo                  text default 'manual';
alter table diagnosticos add column if not exists frase_diagnostico     text;
alter table diagnosticos add column if not exists score_singularidade   int;
alter table diagnosticos add column if not exists score_consistencia    int;
alter table diagnosticos add column if not exists score_posicionamento  int;

-- FK para workspace (só adiciona se ainda não existir)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'diagnosticos_workspace_id_fkey'
      and table_name = 'diagnosticos'
  ) then
    alter table diagnosticos
      add constraint diagnosticos_workspace_id_fkey
      foreign key (workspace_id) references workspaces(id);
  end if;
end $$;

-- ── 4. Solicitações ──────────────────────────────────────────
create table if not exists solicitacoes (
  id                  uuid default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  nome                text not null,
  email               text not null,
  empresa             text not null,
  site                text,
  setor               text,
  porte               text,
  contexto            text,
  status              text default 'pendente',
  diagnostico_id      uuid references diagnosticos(id)
);

-- ── 5. Listening Events ──────────────────────────────────────
create table if not exists listening_events (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  fonte         text,
  conteudo      text,
  sentimento    text,
  score         float,
  url           text,
  dados         jsonb
);

-- ── 6. Sentiment Snapshots ───────────────────────────────────
create table if not exists sentiment_snapshots (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  workspace_id   uuid references workspaces(id),
  avg_positivo   float default 0,
  avg_neutro     float default 0,
  avg_negativo   float default 0,
  total_mencoes  int default 0,
  periodo        text
);

-- ── 7. Concorrentes ──────────────────────────────────────────
create table if not exists concorrentes (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  nome          text not null,
  dominio       text,
  ativo         boolean default true,
  dados         jsonb
);

-- ── 8. Diagnósticos de Concorrentes ─────────────────────────
create table if not exists diagnosticos_concorrentes (
  id               uuid default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  workspace_id     uuid references workspaces(id),
  concorrente_id   uuid references concorrentes(id),
  scores           jsonb,
  dados            jsonb
);

-- ── 9. Alertas ───────────────────────────────────────────────
create table if not exists alertas (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  tipo          text,
  titulo        text not null,
  descricao     text,
  severidade    text default 'info',
  lido          boolean default false,
  dados         jsonb
);

-- ── 10. Brand OS ─────────────────────────────────────────────
create table if not exists brands (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  nome          text not null,
  slug          text,
  logo_url      text,
  status        text default 'active'
);

create table if not exists brand_books (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  brand_id      uuid references brands(id) on delete cascade,
  identity      jsonb default '{}',
  positioning   jsonb default '{}',
  design_system jsonb default '{}',
  "references"  jsonb default '{}'
);

create table if not exists brand_book_history (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  brand_book_id uuid references brand_books(id) on delete cascade,
  section       text,
  changed_by    uuid references auth.users(id),
  snapshot      jsonb
);

create table if not exists conversations (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  brand_id      uuid references brands(id) on delete cascade,
  user_id       uuid references auth.users(id),
  titulo        text
);

create table if not exists messages (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  conversation_id uuid references conversations(id) on delete cascade,
  role            text not null,
  content         text not null
);

create table if not exists campaigns (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  brand_id      uuid references brands(id) on delete cascade,
  submitted_by  uuid references auth.users(id),
  title         text not null,
  content       jsonb default '{}',
  status        text default 'pending',
  verdict       jsonb,
  reviewed_at   timestamptz
);

create table if not exists identity_gap_snapshots (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  gap_score     float,
  narrativa     text,
  dimensoes     jsonb,
  dados         jsonb
);

-- ── 11. Platform Admins + Nurturing ──────────────────────────
create table if not exists platform_admins (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade unique,
  created_at timestamptz default now()
);

create table if not exists nurturing_emails (
  id              uuid default gen_random_uuid() primary key,
  solicitacao_id  uuid references solicitacoes(id) on delete cascade,
  dia             int not null,
  status          text default 'enviado',
  sent_at         timestamptz default now(),
  unique(solicitacao_id, dia)
);

-- ── RLS ──────────────────────────────────────────────────────
alter table workspaces               enable row level security;
alter table workspace_members        enable row level security;
alter table diagnosticos             enable row level security;
alter table solicitacoes             enable row level security;
alter table listening_events         enable row level security;
alter table sentiment_snapshots      enable row level security;
alter table concorrentes             enable row level security;
alter table diagnosticos_concorrentes enable row level security;
alter table alertas                  enable row level security;
alter table brands                   enable row level security;
alter table brand_books              enable row level security;
alter table brand_book_history       enable row level security;
alter table conversations            enable row level security;
alter table messages                 enable row level security;
alter table campaigns                enable row level security;
alter table identity_gap_snapshots   enable row level security;
alter table platform_admins          enable row level security;

-- ── Drop policies existentes (para recriar idempotente) ──────
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'workspaces','workspace_members','diagnosticos','solicitacoes',
        'listening_events','sentiment_snapshots','concorrentes',
        'diagnosticos_concorrentes','alertas','brands','brand_books',
        'brand_book_history','conversations','messages','campaigns',
        'identity_gap_snapshots','platform_admins'
      )
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── Policies ─────────────────────────────────────────────────
create policy "membro acessa workspace" on workspaces
  for all using (
    id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "autenticado cria workspace" on workspaces
  for insert to authenticated with check (true);

create policy "membro acessa workspace_members" on workspace_members
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "autenticado adiciona membro" on workspace_members
  for insert to authenticated with check (user_id = auth.uid());

create policy "leitura publica diagnosticos" on diagnosticos
  for select using (publico = true);

create policy "workspace acessa diagnosticos" on diagnosticos
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "publico pode solicitar" on solicitacoes
  for insert with check (true);

create policy "autenticado le solicitacoes" on solicitacoes
  for select to authenticated using (true);

create policy "autenticado atualiza solicitacoes" on solicitacoes
  for update to authenticated using (true);

create policy "workspace acessa listening_events" on listening_events
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace acessa sentiment_snapshots" on sentiment_snapshots
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace acessa concorrentes" on concorrentes
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace acessa diagnosticos_concorrentes" on diagnosticos_concorrentes
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace acessa alertas" on alertas
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace acessa brands" on brands
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace acessa brand_books" on brand_books
  for all using (
    brand_id in (
      select b.id from brands b
      join workspace_members wm on wm.workspace_id = b.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "workspace acessa brand_book_history" on brand_book_history
  for all using (
    brand_book_id in (
      select bb.id from brand_books bb
      join brands b on b.id = bb.brand_id
      join workspace_members wm on wm.workspace_id = b.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "workspace acessa conversations" on conversations
  for all using (
    brand_id in (
      select b.id from brands b
      join workspace_members wm on wm.workspace_id = b.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "workspace acessa messages" on messages
  for all using (
    conversation_id in (
      select c.id from conversations c
      join brands b on b.id = c.brand_id
      join workspace_members wm on wm.workspace_id = b.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "workspace acessa campaigns" on campaigns
  for all using (
    brand_id in (
      select b.id from brands b
      join workspace_members wm on wm.workspace_id = b.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "workspace acessa identity_gap_snapshots" on identity_gap_snapshots
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "admin le proprio registro" on platform_admins
  for select using (user_id = auth.uid());

-- ── Índices ──────────────────────────────────────────────────
create index if not exists idx_workspace_members_user_id       on workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id  on workspace_members(workspace_id);
create index if not exists idx_diagnosticos_workspace_id       on diagnosticos(workspace_id);
create index if not exists idx_diagnosticos_publico            on diagnosticos(publico) where publico = true;
create index if not exists idx_solicitacoes_status             on solicitacoes(status);
create index if not exists idx_alertas_workspace_id            on alertas(workspace_id);
create index if not exists idx_listening_workspace_id          on listening_events(workspace_id);
create index if not exists idx_brands_workspace_id             on brands(workspace_id);
create index if not exists idx_campaigns_brand_id              on campaigns(brand_id);
create index if not exists idx_messages_conversation_id        on messages(conversation_id);
