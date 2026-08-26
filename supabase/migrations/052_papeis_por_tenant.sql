-- ════════════════════════════════════════════════════════════════════
-- 052 — PAPÉIS POR TENANT (e o fechamento de workspace_members)
--
-- Escrita em 24/08/2026, com clientes ativos no banco. Três defeitos reais,
-- encontrados ao criar os acessos do time da Hering:
--
--  1. O PAPEL ERA DECORATIVO. `role` não aparecia em nenhuma policy. As ~40
--     policies gateiam por participação. `admin` vs `member` só mudava a cor
--     de um Chip na tela.
--
--  2. QUALQUER MEMBRO MANDAVA EM TODOS. A policy era
--     `for all using (workspace_id in (select ... where user_id = auth.uid()))`.
--     `for all` inclui UPDATE e DELETE: qualquer pessoa do tenant podia se
--     promover, rebaixar o dono ou remover um colega. A tela /app/time já
--     escrevia direto pelo client, sem passar por function nenhuma.
--
--  3. QUALQUER AUTENTICADO ENTRAVA EM QUALQUER TENANT. A policy de insert era
--     `with check (user_id = auth.uid())` — sem NENHUMA restrição de
--     workspace_id. Bastava ter conta e saber o UUID do workspace para virar
--     membro e passar a enxergar os dados daquele cliente. O convite dependia
--     desse buraco: o Invite.jsx inseria a própria participação pelo browser.
--     Por isso o fechamento vem junto com o substituto (workspace-join), senão
--     esta migration derruba quem for convidado.
--
-- MODELO ESCOLHIDO (Danilo, 24/08): papel + capacidades, não escada de papéis.
-- Aprovar peça e aprovar aprendizado são independentes — quem faz as duas
-- coisas não deve obrigar a inventar um papel novo (e uma migration nova).
-- A UI compõe os presets: Dono · Curador · Aprovador · Criador · Leitor.
--
-- Nota sobre o valor gravado: `admin` vira `owner` porque `admin` colidia com
-- `platform_admins` (o admin da LOUDR) — a mesma palavra para duas coisas
-- diferentes no mesmo arquivo é origem de defeito. `member` FICA como está:
-- renomear para "membro" churnaria toda linha viva sem ganho nenhum, e
-- misturar idioma em enum é pior que o inglês inteiro.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Capacidades ──────────────────────────────────────────────────
alter table workspace_members add column if not exists pode_aprovar_pecas       boolean not null default false;
alter table workspace_members add column if not exists pode_aprovar_aprendizado boolean not null default false;

-- ── 2. Backfill ANTES do CHECK ──────────────────────────────────────
-- Ordem importa: o CHECK abaixo rejeitaria as linhas atuais ('admin').
update workspace_members set role = 'owner'  where role = 'admin';
update workspace_members set role = 'member' where role is null or role not in ('owner', 'member');

-- Quem mandava no workspace continua mandando: nada de tirar poder de quem já
-- opera. Uma migration que rebaixa usuário ativo é um incidente, não um deploy.
update workspace_members
   set pode_aprovar_pecas = true, pode_aprovar_aprendizado = true
 where role = 'owner';

-- Workspace sem NENHUM owner fica ingovernável (ninguém pode gerenciar o time).
-- Promove o membro mais antigo — é quem entrou junto com o workspace.
with orfaos as (
  select distinct workspace_id from workspace_members
  except
  select workspace_id from workspace_members where role = 'owner'
), primeiro as (
  select distinct on (m.workspace_id) m.id
    from workspace_members m
    join orfaos o on o.workspace_id = m.workspace_id
   order by m.workspace_id, m.created_at asc
)
update workspace_members
   set role = 'owner', pode_aprovar_pecas = true, pode_aprovar_aprendizado = true
 where id in (select id from primeiro);

-- ── 3. O CHECK que faltava ──────────────────────────────────────────
-- `role text default 'member'` aceitava qualquer string, e os valores válidos
-- moravam em dois arquivos de front. Agora o banco é a fonte.
alter table workspace_members alter column role set default 'member';
alter table workspace_members alter column role set not null;
alter table workspace_members drop constraint if exists workspace_members_role_check;
alter table workspace_members add  constraint workspace_members_role_check check (role in ('owner', 'member'));

-- ── 4. Quem é quem (SECURITY DEFINER) ───────────────────────────────
-- Policy em workspace_members que consulta workspace_members se auto-aplica.
-- A versão antiga escapava por sorte; com policies separadas por comando o
-- risco de recursão é real. Estas funções leem a tabela FORA da RLS — é o
-- padrão para este caso, e concentra a definição de "é membro"/"é dono" num
-- lugar só, em vez de repetir subquery em cada policy.
create or replace function public.eh_membro(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
     where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.eh_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
     where workspace_id = ws and user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.eh_membro(uuid) from public;
revoke all on function public.eh_owner(uuid)  from public;
grant execute on function public.eh_membro(uuid) to authenticated;
grant execute on function public.eh_owner(uuid)  to authenticated;

-- ── 5. As policies novas ────────────────────────────────────────────
drop policy if exists "membro acessa workspace_members" on workspace_members;
drop policy if exists "autenticado adiciona membro"     on workspace_members;

-- Ler o time: qualquer membro. Saber com quem se trabalha não é privilégio.
create policy "membro le o time" on workspace_members
  for select using (public.eh_membro(workspace_id));

-- Escrever no time: só o dono. As três operações separadas de propósito —
-- `for all` foi exatamente o que deixou UPDATE e DELETE abertos por descuido.
--
-- Não há policy de INSERT para `authenticated`: entrar num workspace deixou de
-- ser algo que o browser faz. Convite passa por workspace-join (service key,
-- lendo o convite de app_metadata, que o usuário não consegue reescrever).
create policy "owner adiciona no time" on workspace_members
  for insert to authenticated with check (public.eh_owner(workspace_id));

create policy "owner atualiza o time" on workspace_members
  for update using (public.eh_owner(workspace_id))
              with check (public.eh_owner(workspace_id));

create policy "owner remove do time" on workspace_members
  for delete using (public.eh_owner(workspace_id));

-- ── 6. O último dono não cai ────────────────────────────────────────
-- Sem isto, o dono se rebaixa por engano e o workspace fica sem ninguém que
-- possa gerenciar o time — só recuperável por suporte nosso, com service key.
create or replace function public.protege_ultimo_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare restantes int;
begin
  -- Só interessa quando um owner deixa de ser owner (removido ou rebaixado).
  if tg_op = 'UPDATE' and (old.role <> 'owner' or new.role = 'owner') then
    return new;
  end if;
  if tg_op = 'DELETE' and old.role <> 'owner' then
    return old;
  end if;

  select count(*) into restantes
    from workspace_members
   where workspace_id = old.workspace_id and role = 'owner' and id <> old.id;

  if restantes = 0 then
    raise exception 'O workspace precisa de pelo menos um dono. Promova outra pessoa antes de sair.'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_protege_ultimo_owner on workspace_members;
create trigger trg_protege_ultimo_owner
  before update or delete on workspace_members
  for each row execute function public.protege_ultimo_owner();

-- ── 7. O saldo não é editável pelo cliente ──────────────────────────
-- Achado no mesmo levantamento: `workspaces` tem a MESMA policy `for all using
-- (é membro)`, e é nessa tabela que moram `creditos_saldo`, `creditos_mes` e
-- `valor_mensal_centavos`. Ou seja, qualquer membro de qualquer tenant podia
--
--     update workspaces set creditos_saldo = 999999 where id = <o dele>
--
-- direto do browser. Crédito vira chamada paga na fal e na Anthropic: isso é
-- dinheiro nosso, não número de tela.
--
-- Restringir o UPDATE inteiro ao dono quebraria o que o cliente legitimamente
-- edita (nome da empresa, configuração de alertas). Então o corte é por COLUNA,
-- via trigger: campos comerciais e de infra só mudam pelo servidor (service
-- key, `auth.uid()` nulo) ou por quem opera a plataforma.
--
-- LISTA-BRANCA, e não lista de proibidos — a primeira versão desta guarda
-- enumerava o que proteger e ESQUECEU `creditos_ciclo_reset`. Essa coluna é a
-- chave do refill preguiçoso do `debit_credits` (045:32):
--
--     if v_reset is null or now() >= v_reset then v_saldo := v_mes;
--
-- ou seja, um membro comum que escrevesse `creditos_ciclo_reset = null` na
-- própria linha recompunha o pool mensal INTEIRO na geração seguinte — e a
-- transação saía gravada como `refill/ciclo`, com cara de legítima. Repetindo
-- antes de cada peça, gasto ilimitado na fal e na Anthropic, faturado para nós,
-- direto do browser. `plano_status` tinha o mesmo problema: é ele que decide
-- quais workspaces os crons varrem.
--
-- Enumerar o que se protege exige acertar hoje E lembrar amanhã. Enumerar o que
-- se libera erra para o lado seguro: coluna comercial nova nasce protegida, e
-- quem adicionar uma coluna que o cliente deva editar precisa dizer isso aqui,
-- que é onde a decisão pertence.
create or replace function public.protege_campos_comerciais()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  -- O que o cliente edita, e só: cadastro da empresa (TabEmpresa) e a
  -- configuração de alertas (TabAlertas). Todo o resto é servidor ou operador.
  editaveis text[] := array['nome', 'dominio', 'setor', 'porte', 'dados_alertas'];
begin
  -- Servidor (service key) passa: é ele quem debita crédito e fecha contrato.
  if auth.uid() is null then return new; end if;
  -- Operador da plataforma passa: é quem configura plano, slug e ativação.
  if exists (select 1 from platform_admins where user_id = auth.uid()) then return new; end if;

  -- Tira as colunas liberadas dos dois lados e compara o RESTO. Se sobrou
  -- diferença, mexeram em algo que não lhes pertence.
  if (to_jsonb(new) - editaveis) is distinct from (to_jsonb(old) - editaveis) then
    raise exception 'Plano, créditos, domínio e ativação são definidos pelo brandcode. Fale com o suporte.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protege_campos_comerciais on workspaces;
create trigger trg_protege_campos_comerciais
  before update on workspaces
  for each row execute function public.protege_campos_comerciais();
