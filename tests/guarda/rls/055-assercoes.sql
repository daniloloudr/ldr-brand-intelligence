-- Comportamento depois da 055. Qualquer FALHOU reprova o deploy.
-- Chega num banco pós-054, que é como a migration encontra a produção.
--
-- O que este ensaio precisa provar:
--   1. Isolamento por workspace nas duas tabelas novas.
--   2. O operador só enxerga COM sessão aberta.
--   3. Quem escreve o quê: o CLIENTE cria e suspende AGENTE (é ato de pessoa,
--      §8.2/§8.3); o cliente NÃO escreve EXECUÇÃO (forjar contagem de veredito
--      seria forjar a fila que o §2.2 define).
--   4. As regras duras do §8.6 viraram CHECK: agente sem teto não existe,
--      agente sem dono não existe, e não há estado além de ativo/suspenso.
--   5. As três camadas de variável nasceram separadas (§7.2).
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;
create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;
exception when others then return true; end $$;

-- `reset role`, não `set role postgres` — ver 054-assercoes.sql: o SET ROLE que
-- falha não interrompe o arquivo e os comandos seguintes são barrados em silêncio.
reset role;
insert into studio_workflows (id, workspace_id, conteudo)
  values ('feedbeef-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'fluxo da Hering')
  on conflict do nothing;

insert into agente (id, workspace_id, brand_id, workflow_id, nome, dono_user_id)
  values ('a9e17e00-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
          'bbbbbbbb-0000-0000-0000-000000000001', 'feedbeef-0000-0000-0000-000000000001',
          'Foto de produto · e-commerce', '11111111-1111-1111-1111-111111111111');

insert into execucao (workspace_id, brand_id, workflow_id, workflow_versao, agente_id, gatilho, n_aprovado, n_rechecar, n_reprovado, creditos)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
          'feedbeef-0000-0000-0000-000000000001', 3, 'a9e17e00-0000-0000-0000-000000000001', 'local', 12, 3, 1, 47);

-- ── 1 · Isolamento ──────────────────────────────────────────────────
set role authenticated;
set teste.uid = '11111111-1111-1111-1111-111111111111';
select caso('dono da Hering lê o agente',   (select count(*) from agente)   = 1);
select caso('dono da Hering lê a execução', (select count(*) from execucao) = 1);

-- ── 2 · O operador e a sessão ───────────────────────────────────────
reset role;
update platform_admin_sessions set encerrada_em = now() where encerrada_em is null;
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';
select caso('SEM sessão: operador não lê agente',   (select count(*) from agente)   = 0);
select caso('SEM sessão: operador não lê execução', (select count(*) from execucao) = 0);

reset role;
insert into platform_admin_sessions (admin_user_id, workspace_id, motivo, expira_em)
  values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000001', 'suporte', now() + interval '1 hour');
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';
select caso('COM sessão: operador lê agente', (select count(*) from agente) = 1);

-- ── 3 · Quem escreve o quê ──────────────────────────────────────────
set teste.uid = '11111111-1111-1111-1111-111111111111';
-- §8.2/§8.3: criar e suspender agente é ato de PESSOA, na tela.
select caso('cliente SUSPENDE o agente (é ato de pessoa, §8.3)', not tentou_e_falhou($$
  update agente set estado = 'suspenso', suspenso_em = now() $$));
select caso('cliente CRIA agente (promoção é manual, §8.2)', not tentou_e_falhou($$
  insert into agente (workspace_id, brand_id, workflow_id, nome, dono_user_id)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'feedbeef-0000-0000-0000-000000000001','Segundo agente','11111111-1111-1111-1111-111111111111') $$));

-- A execução é prestação de contas: forjar contagem é forjar a fila do §2.2.
select caso('cliente NÃO escreve execução', tentou_e_falhou($$
  insert into execucao (workspace_id, brand_id, workflow_id)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','feedbeef-0000-0000-0000-000000000001') $$));
select caso('cliente NÃO altera contagem de veredito', tentou_e_falhou($$
  update execucao set n_aprovado = 999 $$));

-- ── 4 · As regras duras do §8.6 viraram CHECK ───────────────────────
reset role;
select caso('§8.6.4 agente SEM teto não existe (teto zero é barrado)', tentou_e_falhou($$
  insert into agente (workspace_id, brand_id, workflow_id, nome, dono_user_id, teto_creditos_ciclo)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'feedbeef-0000-0000-0000-000000000001','sem teto','11111111-1111-1111-1111-111111111111', 0) $$));

select caso('§8.6.5 agente SEM dono não existe', tentou_e_falhou($$
  insert into agente (workspace_id, brand_id, workflow_id, nome)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'feedbeef-0000-0000-0000-000000000001','orfao') $$));

select caso('§8.3 não existe estado além de ativo|suspenso', tentou_e_falhou($$
  update agente set estado = 'morto' $$));

select caso('contagem de veredito negativa é barrada', tentou_e_falhou($$
  update execucao set n_reprovado = -1 $$));

select caso('execução concluída ANTES de iniciar é barrada', tentou_e_falhou($$
  update execucao set concluida_em = iniciada_em - interval '1 hour' $$));

-- Custo virou CRÉDITO (decisão 31/ago). Coluna chamada `custo` convidaria
-- alguém a gravar dólar nela.
select caso('a execução guarda CRÉDITO, não custo em dólar',
  (select count(*) from information_schema.columns
    where table_name = 'execucao' and column_name = 'creditos') = 1
  and (select count(*) from information_schema.columns
    where table_name = 'execucao' and column_name = 'custo') = 0);

-- ── 5 · As três camadas de variável (§7.2) ──────────────────────────
select caso('o fluxo declara receita e produto em campos SEPARADOS',
  (select count(*) from information_schema.columns
    where table_name = 'studio_workflows'
      and column_name in ('versao','variaveis_fluxo','variaveis_produto','criterios_juiz')) = 4);

-- A do LOTE mora na execução, não no fluxo: é da rodada, não da receita.
select caso('a camada do LOTE mora na EXECUÇÃO, não no fluxo',
  (select count(*) from information_schema.columns
    where table_name = 'execucao' and column_name = 'variaveis_lote') = 1
  and (select count(*) from information_schema.columns
    where table_name = 'studio_workflows' and column_name = 'variaveis_lote') = 0);

-- §6.2 — peça pertence a ZERO ou uma execução; todo o histórico fica nulo.
select caso('peça pode não ter execução (a criada à mão não tem)', not tentou_e_falhou($$
  insert into studio_generations (workspace_id, conteudo) values ('aaaaaaaa-0000-0000-0000-000000000001','peça à mão') $$));
