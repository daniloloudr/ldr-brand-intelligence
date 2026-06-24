-- ════════════════════════════════════════════════════════════════════
-- LOUDR Studio — geração visual on-brand (canvas nodal)
-- Spec: specs/features/studio.md v1.1
-- Fase A: workflows + gerações + campanhas, RLS por workspace.
-- ════════════════════════════════════════════════════════════════════

-- ── Workflow: o grafo nodal serializado ─────────────────────────────
create table if not exists studio_workflows (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  brand_id      uuid references brands(id) on delete cascade,
  nome          text not null,
  nodes         jsonb default '[]'::jsonb,   -- nós do React Flow
  edges         jsonb default '[]'::jsonb,   -- conexões
  thumbnail_url text,
  is_template   boolean default false        -- workflow reutilizável (futuro)
);

alter table studio_workflows enable row level security;
create index if not exists idx_studio_workflows_ws_brand on studio_workflows (workspace_id, brand_id);

drop policy if exists "workspace acessa studio_workflows" on studio_workflows;
create policy "workspace acessa studio_workflows" on studio_workflows
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  )
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  );

-- ── Campanha do Studio: AGRUPAMENTO de peças geradas ────────────────
-- NÃO confundir com a tabela `campaigns` do F15 (fluxo de aprovação).
-- Criada antes de studio_generations porque esta a referencia (FK).
create table if not exists studio_campaigns (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  brand_id      uuid references brands(id) on delete cascade,
  workflow_id   uuid references studio_workflows(id) on delete set null,
  nome          text not null,
  conceito      text,                          -- o brief da campanha
  formatos      jsonb default '[]'::jsonb,     -- formatos solicitados
  status        text default 'rascunho'        -- rascunho | gerando | concluida | aprovada
);

alter table studio_campaigns enable row level security;
create index if not exists idx_studio_campaigns_ws_status on studio_campaigns (workspace_id, status);

drop policy if exists "workspace acessa studio_campaigns" on studio_campaigns;
create policy "workspace acessa studio_campaigns" on studio_campaigns
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  )
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  );

-- ── Geração: cada imagem + registro do job ──────────────────────────
create table if not exists studio_generations (
  id                  uuid default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  workspace_id        uuid references workspaces(id) on delete cascade,
  brand_id            uuid references brands(id) on delete cascade,
  workflow_id         uuid references studio_workflows(id) on delete cascade,
  node_id             text,                       -- id do nó no grafo
  campaign_id         uuid references studio_campaigns(id) on delete set null,
  prompt_final        text,                       -- prompt completo enviado (com brand context)
  brand_context       jsonb,                      -- snapshot do contexto usado
  provider            text,                       -- ex. fal-ai/flux/dev | fal-ai/gemini-...
  provider_request_id text,                       -- id do job no fal — webhook + idempotência
  formato             text,                       -- 1:1 | 9:16 | 16:9 | etc.
  image_url           text,                       -- CDN do Cloudflare R2 (full-res)
  thumbnail_url       text,                       -- thumbnail p/ galeria (corta egress)
  status              text default 'processing',  -- processing | done | error
  error               text,
  custo_estimado      numeric                     -- alimenta dashboard de custos de IA (futuro)
);

alter table studio_generations enable row level security;
create index if not exists idx_studio_generations_ws_status on studio_generations (workspace_id, status);
create index if not exists idx_studio_generations_workflow_node on studio_generations (workflow_id, node_id);
create index if not exists idx_studio_generations_request on studio_generations (provider_request_id);

drop policy if exists "workspace acessa studio_generations" on studio_generations;
create policy "workspace acessa studio_generations" on studio_generations
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  )
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  );
