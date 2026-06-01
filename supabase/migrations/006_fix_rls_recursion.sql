-- Fix: infinite recursion na policy de workspace_members
-- A policy "for all using" consultava a própria tabela causando loop.
-- Solução: security definer function que quebra a recursão.

create or replace function get_my_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from workspace_members where user_id = auth.uid()
$$;

-- Recria a policy usando a função (sem auto-referência)
drop policy if exists "membro acessa workspace_members" on workspace_members;

create policy "membro acessa workspace_members" on workspace_members
  for all using (workspace_id in (select get_my_workspace_ids()));
