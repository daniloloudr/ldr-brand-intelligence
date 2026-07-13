-- 040_pecas_escritas.sql — a CASA dos textos criados (Casa do Conteúdo, passo 1).
-- Antes: a Redação gerava e não persistia; peças escritas do Copiloto viviam só
-- na conversa. Agora todo texto tem endereço — e a Biblioteca vira o hub.

create table if not exists pecas_escritas (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  brand_id      uuid references brands(id) on delete cascade,
  campaign_id   uuid references studio_campaigns(id) on delete set null,
  titulo        text not null,
  formato       text,          -- carrossel | post | blog | roteiro-ugc | email | outro
  conteudo      text,          -- markdown
  origem        text           -- redacao | copiloto | campanha
);

alter table pecas_escritas enable row level security;

create policy "acessa pecas_escritas" on pecas_escritas
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create index if not exists idx_pecas_escritas on pecas_escritas (brand_id, created_at desc);
