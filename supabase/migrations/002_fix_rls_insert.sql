-- Fix: adiciona policies de INSERT que faltavam na migration inicial
-- As policies FOR ALL USING (...) não cobrem INSERT corretamente quando não
-- há registro em workspace_members ainda (ex: criação de novo workspace).

-- Permite que usuário autenticado crie um novo workspace
create policy "autenticado cria workspace" on workspaces
  for insert to authenticated with check (true);

-- Permite que usuário autenticado adicione a si mesmo como membro
create policy "autenticado adiciona membro" on workspace_members
  for insert to authenticated with check (user_id = auth.uid());
