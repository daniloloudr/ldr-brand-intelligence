create table if not exists listening_terms (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  workspace_id uuid references workspaces(id) on delete cascade,
  termo        text not null
);

alter table listening_terms enable row level security;

create policy "acessa listening_terms" on listening_terms
  for all
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or exists (select 1 from platform_admins where user_id = auth.uid())
  )
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or exists (select 1 from platform_admins where user_id = auth.uid())
  );
