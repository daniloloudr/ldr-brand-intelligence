-- LOUDR Brand Intelligence — Schema Inicial
-- Rodar no Supabase SQL Editor

-- 1. Workspaces
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

-- 2. Membros
create table if not exists workspace_members (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          text default 'member',
  created_at    timestamptz default now(),
  unique(workspace_id, user_id)
);

-- 3. Diagnósticos
create table if not exists diagnosticos (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  workspace_id          uuid references workspaces(id),
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

-- 4. Solicitações (leads públicos)
create table if not exists solicitacoes (
  id                  uuid default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  nome                text not null,
  email               text not null,
  empresa             text not null,
  site                text,
  setor               text,
  porte               text,
  cargo               text,
  contexto            text,
  status              text default 'pendente',
  score_qualificacao  int,
  diagnostico_id      uuid references diagnosticos(id),
  workspace_id        uuid references workspaces(id)
);

-- 5. Listening events
create table if not exists listening_events (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  fonte         text,
  tipo          text,
  titulo        text,
  conteudo      text,
  sentiment     text,
  score_impacto int,
  url           text,
  lido          boolean default false
);

-- 6. Snapshots de sentiment
create table if not exists sentiment_snapshots (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  data          date,
  positivo_pct  numeric,
  neutro_pct    numeric,
  negativo_pct  numeric,
  volume_total  int
);

-- 7. Concorrentes
create table if not exists concorrentes (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  nome          text,
  dominio       text,
  ativo         boolean default true
);

-- 8. Diagnósticos de concorrentes
create table if not exists diagnosticos_concorrentes (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  concorrente_id        uuid references concorrentes(id),
  workspace_id          uuid references workspaces(id),
  score_singularidade   int,
  score_consistencia    int,
  score_posicionamento  int,
  dados                 jsonb
);

-- 9. Alertas
create table if not exists alertas (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  tipo          text,
  titulo        text,
  descricao     text,
  severidade    text,
  lido          boolean default false,
  dados         jsonb
);

-- ================================================================
-- RLS — Row Level Security
-- ================================================================

alter table workspaces              enable row level security;
alter table workspace_members       enable row level security;
alter table diagnosticos            enable row level security;
alter table solicitacoes            enable row level security;
alter table listening_events        enable row level security;
alter table sentiment_snapshots     enable row level security;
alter table concorrentes            enable row level security;
alter table diagnosticos_concorrentes enable row level security;
alter table alertas                 enable row level security;

-- Workspaces: membro acessa o próprio workspace
create policy "membro acessa workspace" on workspaces
  for all using (
    id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Workspace members: acessa apenas do próprio workspace
create policy "membro acessa workspace_members" on workspace_members
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Diagnósticos: leitura pública (relatório por link) + workspace próprio
create policy "leitura publica diagnosticos" on diagnosticos
  for select using (publico = true);

create policy "workspace acessa diagnosticos" on diagnosticos
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Solicitações: qualquer um pode inserir (leads públicos), apenas autenticado lê
create policy "publico pode solicitar" on solicitacoes
  for insert to anon, authenticated with check (true);

create policy "autenticado le solicitacoes" on solicitacoes
  for select to authenticated using (true);

create policy "autenticado atualiza solicitacoes" on solicitacoes
  for update to authenticated using (true);

-- Listening events
create policy "workspace acessa listening_events" on listening_events
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Sentiment snapshots
create policy "workspace acessa sentiment_snapshots" on sentiment_snapshots
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Concorrentes
create policy "workspace acessa concorrentes" on concorrentes
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Diagnósticos de concorrentes
create policy "workspace acessa diagnosticos_concorrentes" on diagnosticos_concorrentes
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- Alertas
create policy "workspace acessa alertas" on alertas
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- ================================================================
-- Índices de performance
-- ================================================================

create index if not exists idx_workspace_members_user_id on workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id on workspace_members(workspace_id);
create index if not exists idx_diagnosticos_workspace_id on diagnosticos(workspace_id);
create index if not exists idx_diagnosticos_publico on diagnosticos(publico) where publico = true;
create index if not exists idx_solicitacoes_status on solicitacoes(status);
create index if not exists idx_alertas_workspace_id on alertas(workspace_id);
create index if not exists idx_listening_workspace_id on listening_events(workspace_id);
