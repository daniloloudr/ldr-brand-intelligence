create table if not exists content_hub_analyses (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  workspace_id uuid references workspaces(id) on delete cascade,
  dados        jsonb not null
);

alter table content_hub_analyses enable row level security;

create policy "acessa content_hub_analyses" on content_hub_analyses
  for all
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or exists (select 1 from platform_admins where user_id = auth.uid())
  )
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or exists (select 1 from platform_admins where user_id = auth.uid())
  );
