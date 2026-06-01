-- ============================================================
-- LOUDR OS — RLS para platform_admins
-- Permite que admins da plataforma acessem qualquer workspace
-- para impersonation e gestão.
-- ============================================================

-- Função helper: retorna true se o usuário atual é platform_admin
-- security definer evita recursão e problemas de RLS na própria tabela
create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from platform_admins where user_id = auth.uid()
  )
$$;

-- workspaces: admin pode ler e atualizar qualquer workspace
create policy "platform_admin acessa workspaces" on workspaces
  for all using (is_platform_admin());

-- workspace_members: admin pode ler e inserir membros em qualquer workspace
create policy "platform_admin acessa workspace_members" on workspace_members
  for all using (is_platform_admin());

create policy "platform_admin insere membros" on workspace_members
  for insert with check (is_platform_admin());

-- diagnosticos: admin já consegue ler via "autenticado le" — sem necessidade extra

-- brands e brand_books: admin pode acessar qualquer marca
create policy "platform_admin acessa brands" on brands
  for all using (is_platform_admin());

create policy "platform_admin acessa brand_books" on brand_books
  for all using (is_platform_admin());

create policy "platform_admin acessa brand_book_history" on brand_book_history
  for all using (is_platform_admin());

create policy "platform_admin acessa conversations" on conversations
  for all using (is_platform_admin());

create policy "platform_admin acessa messages" on messages
  for all using (is_platform_admin());

create policy "platform_admin acessa campaigns" on campaigns
  for all using (is_platform_admin());

create policy "platform_admin acessa alertas" on alertas
  for all using (is_platform_admin());

create policy "platform_admin acessa listening_events" on listening_events
  for all using (is_platform_admin());

create policy "platform_admin acessa sentiment_snapshots" on sentiment_snapshots
  for all using (is_platform_admin());

create policy "platform_admin acessa concorrentes" on concorrentes
  for all using (is_platform_admin());

create policy "platform_admin acessa identity_gap_snapshots" on identity_gap_snapshots
  for all using (is_platform_admin());
