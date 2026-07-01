-- 024_admin_set_plan.sql — C7: admin troca o plano de um workspace e o crédito
-- é recarregado junto (pool do plano + reset do ciclo + registro no extrato).
-- Só platform_admin pode chamar. Retorna o novo saldo.

create or replace function set_workspace_plan(p_workspace uuid, p_plano text)
returns integer
language plpgsql security definer as $$
declare
  v_pool  integer;
  v_reset timestamptz;
begin
  if not is_platform_admin() then
    raise exception 'apenas platform admin pode trocar o plano';
  end if;

  v_pool  := plano_creditos(p_plano);
  v_reset := date_trunc('month', now()) + interval '1 month';

  update workspaces
    set plano = p_plano,
        plano_status = 'active',
        creditos_saldo = v_pool,
        creditos_ciclo_reset = v_reset
    where id = p_workspace;

  insert into credit_transactions(workspace_id, delta, saldo_after, tipo, operacao)
    values (p_workspace, v_pool, v_pool, 'grant', 'admin');

  return v_pool;
end;
$$;
