-- ── platform_admin precisa INSERT/UPDATE em diagnosticos ───────────
-- (admin cria a linha "running" antes de chamar a background function e
-- pode reabrir um job pra retry — ambos via auth token, não service key)
drop policy if exists "platform_admin acessa diagnosticos" on diagnosticos;
create policy "platform_admin acessa diagnosticos" on diagnosticos
  for all using (is_platform_admin()) with check (is_platform_admin());
