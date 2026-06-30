-- 023_credits.sql — ledger de créditos (saldo + transações + débito atômico)
-- Substitui o STUDIO_MONTHLY_LIMIT (contagem de gerações) por crédito de verdade.
-- Regra de crédito por operação em src/lib/credits.js + _credits.js.

-- Saldo + ciclo no workspace (refill mensal lazy, sem cron)
alter table workspaces
  add column if not exists creditos_saldo        integer,
  add column if not exists creditos_ciclo_reset  timestamptz;

-- Ledger append-only (auditoria de consumo)
create table if not exists credit_transactions (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  delta         integer not null,        -- negativo = débito; positivo = refill/refund/grant
  saldo_after   integer not null,
  tipo          text    not null,        -- 'debit' | 'refill' | 'refund' | 'grant'
  operacao      text,                    -- 'image' | 'video' | 'content' | 'campaign' | 'upscale' | 'ciclo'
  modelo        text,                    -- id/key do modelo (auditoria)
  generation_id uuid,
  created_by    uuid
);
alter table credit_transactions enable row level security;
create index if not exists idx_credit_tx_ws on credit_transactions (workspace_id, created_at desc);

drop policy if exists "workspace lê suas transações" on credit_transactions;
create policy "workspace lê suas transações" on credit_transactions
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or is_platform_admin()
  );
-- Escrita só via service key (RPC nas functions) — sem policy de insert p/ usuário.

-- Créditos mensais por plano (ESPELHA constants.js PLANOS.creditos_mes — sincronizar)
create or replace function plano_creditos(p_plano text) returns integer
language sql immutable as $$
  select case p_plano
    when 'starter'    then 750
    when 'pro'        then 2000
    when 'enterprise' then 5000
    when 'trial'      then 30
    else 0 end;
$$;

-- Débito atômico com refill mensal lazy. Retorna o novo saldo, ou -1 se insuficiente.
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
  select creditos_saldo, creditos_ciclo_reset, plano
    into v_saldo, v_reset, v_plano
    from workspaces where id = p_workspace for update;
  if not found then return -1; end if;

  v_mes := plano_creditos(v_plano);

  -- refill lazy: nunca inicializado (null) ou ciclo vencido → recompõe o pool do plano
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

-- Estorno (ex. fal falhou após o débito)
create or replace function refund_credits(
  p_workspace uuid, p_amount integer, p_operacao text, p_generation uuid
) returns integer
language plpgsql security definer as $$
declare v_saldo integer;
begin
  update workspaces set creditos_saldo = coalesce(creditos_saldo, 0) + p_amount
    where id = p_workspace returning creditos_saldo into v_saldo;
  insert into credit_transactions(workspace_id, delta, saldo_after, tipo, operacao, generation_id)
    values (p_workspace, p_amount, v_saldo, 'refund', p_operacao, p_generation);
  return v_saldo;
end;
$$;
