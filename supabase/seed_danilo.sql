-- ============================================================
-- LOUDR OS — Setup de acesso completo para danilo@loudr.com.br
-- Rodar no Supabase Dashboard → SQL Editor
-- ============================================================

do $$
declare
  v_user_id   uuid;
  v_ws_id     uuid;
begin

  -- 1. Busca o user_id pelo e-mail
  select id into v_user_id
  from auth.users
  where email = 'danilo@loudr.com.br'
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário danilo@loudr.com.br não encontrado. Faça o cadastro primeiro em /register.';
  end if;

  -- 2. Verifica se já existe workspace vinculado
  select w.id into v_ws_id
  from workspaces w
  join workspace_members wm on wm.workspace_id = w.id
  where wm.user_id = v_user_id
  limit 1;

  -- 3. Cria workspace se não existir
  if v_ws_id is null then
    insert into workspaces (nome, dominio, plano, plano_status, diagnosticos_mes)
    values ('LOUDR — Danilo', 'loudr.com.br', 'enterprise', 'active', 0)
    returning id into v_ws_id;

    raise notice 'Workspace criado: %', v_ws_id;
  else
    raise notice 'Workspace existente: %', v_ws_id;
  end if;

  -- 4. Garante plano enterprise + status active
  update workspaces
  set
    plano        = 'enterprise',
    plano_status = 'active',
    diagnosticos_mes = 0,
    diagnosticos_reset_at = date_trunc('month', now()) + interval '1 month'
  where id = v_ws_id;

  -- 5. Garante membro com role owner
  insert into workspace_members (workspace_id, user_id, role)
  values (v_ws_id, v_user_id, 'owner')
  on conflict (workspace_id, user_id)
  do update set role = 'owner';

  -- 6. Garante entrada em platform_admins (acesso ao /admin)
  insert into platform_admins (user_id)
  values (v_user_id)
  on conflict do nothing;

  raise notice '✅ danilo@loudr.com.br configurado com acesso total.';
  raise notice '   workspace_id : %', v_ws_id;
  raise notice '   plano        : enterprise';
  raise notice '   role         : owner';
  raise notice '   /admin       : sim (platform_admin)';

end $$;
