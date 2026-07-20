-- 045_workspace_billing.sql — cobrança POR WORKSPACE (fim dos tiers)
-- Decisão (Danilo, 2026-07-20): sem starter/pro/enterprise; cada contrato é
-- configurado na mão no admin — créditos/mês e valor mensal são inseridos.
-- O `plano` continua no banco só como flag interna de acesso (gates legados);
-- workspace criado pelo admin nasce full-access. Créditos passam a sair de
-- creditos_mes (fallback: plano_creditos do tier, p/ não quebrar o legado).

alter table workspaces
  add column if not exists creditos_mes           integer,   -- pool mensal do contrato
  add column if not exists valor_mensal_centavos  integer;   -- preço/mês em centavos (R$)

-- ── debit_credits: refill lazy agora usa creditos_mes (fallback ao tier) ──
-- Idêntico à 023, só muda a origem de v_mes.
create or replace function debit_credits(
  p_workspace uuid, p_amount integer, p_tipo text, p_operacao text,
  p_modelo text, p_generation uuid, p_user uuid
) returns integer
language plpgsql security definer as $$
declare
  v_saldo integer;
  v_reset timestamptz;
  v_plano text;
  v_mes   integer;
begin
  select creditos_saldo, creditos_ciclo_reset, plano,
         coalesce(creditos_mes, plano_creditos(plano))
    into v_saldo, v_reset, v_plano, v_mes
    from workspaces where id = p_workspace for update;
  if not found then return -1; end if;

  -- refill lazy: nunca inicializado (null) ou ciclo vencido → recompõe o pool
  if v_reset is null or now() >= v_reset then
    v_saldo := v_mes;
    v_reset := date_trunc('month', now()) + interval '1 month';
    insert into credit_transactions(workspace_id, delta, saldo_after, tipo, operacao)
      values (p_workspace, v_mes, v_saldo, 'refill', 'ciclo');
  end if;

  if v_saldo < p_amount then
    update workspaces set creditos_saldo = v_saldo, creditos_ciclo_reset = v_reset where id = p_workspace;
    return -1;  -- insuficiente
  end if;

  v_saldo := v_saldo - p_amount;
  update workspaces set creditos_saldo = v_saldo, creditos_ciclo_reset = v_reset where id = p_workspace;
  insert into credit_transactions(workspace_id, delta, saldo_after, tipo, operacao, modelo, generation_id, created_by)
    values (p_workspace, -p_amount, v_saldo, p_tipo, p_operacao, p_modelo, p_generation, p_user);
  return v_saldo;
end;
$$;

-- ── set_workspace_billing: admin configura créditos/mês + valor ──
-- Espelha set_workspace_plan (024): ao salvar, recompõe o saldo do mês para o
-- novo pool e zera o ciclo (o cliente passa a ter o valor configurado agora).
create or replace function set_workspace_billing(
  p_workspace uuid, p_creditos_mes integer, p_valor_centavos integer
) returns integer
language plpgsql security definer as $$
declare
  v_pool  integer;
  v_reset timestamptz;
begin
  if not is_platform_admin() then
    raise exception 'apenas platform admin pode configurar a cobrança';
  end if;

  v_pool  := greatest(coalesce(p_creditos_mes, 0), 0);
  v_reset := date_trunc('month', now()) + interval '1 month';

  update workspaces
    set creditos_mes          = p_creditos_mes,
        valor_mensal_centavos = p_valor_centavos,
        creditos_saldo        = v_pool,
        creditos_ciclo_reset  = v_reset,
        plano_status          = 'active'
    where id = p_workspace;

  insert into credit_transactions(workspace_id, delta, saldo_after, tipo, operacao)
    values (p_workspace, v_pool, v_pool, 'grant', 'admin');

  return v_pool;
end;
$$;
