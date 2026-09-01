-- ════════════════════════════════════════════════════════════════════
-- 055 — EXECUÇÃO, AGENTE E AS TRÊS CAMADAS DE VARIÁVEL DO FLUXO
--
-- Fecha o E1. Faixa B: tudo aditivo — nada gravado muda de sentido, e reverter
-- é `drop`. A 054 trouxe `parecer` e o escopo da campanha; esta traz o resto.
--
-- ── POR QUE AS TRÊS CAMADAS SÃO O CORAÇÃO DISTO ─────────────────────
-- §7.2: "a parte que decide se o fluxo escala. Se as três moram no mesmo campo,
-- cada rodada é um prompt novo, o aprendizado não acumula e não há como
-- atribuir acerto." Hoje elas moram no mesmo campo — o prompt do nó.
--
--   variaveis_produto  do CATÁLOGO, por SKU: still, categoria, cor, material
--   variaveis_fluxo    a RECEITA, fixas: cenário, enquadramento, luz, estilo
--   (as do LOTE)       mudam a cada rodada — moram na EXECUÇÃO, não no fluxo
--
-- A do lote fica em `execucao.variaveis_lote` de propósito: ela não é
-- propriedade da receita, é da rodada. Guardá-la no fluxo apagaria a pergunta
-- que o §7.2 existe para responder — foi a receita que funcionou, ou aquele
-- produto específico?
--
-- ⚠️ `variaveis_produto` nasce SEM catálogo para preenchê-la. Não há catálogo no
-- modelo de dados (o §3.4 "Do produto" esbarrou nisso). A coluna nasce porque a
-- receita precisa DECLARAR quais variáveis de produto ela espera; quem as
-- preenche por SKU entra quando o catálogo entrar.
--
-- ── CUSTO VIRA CRÉDITO, E ISSO É DECISÃO REGISTRADA ─────────────────
-- O §6.1 diz que a execução tem "custo". O Danilo decidiu em 31/ago que custo
-- NÃO se trata aqui: o sistema mantém a visão de CRÉDITO, e o custo em dólar é
-- visto em outro lugar. Por isso a coluna é `creditos`, não `custo` — e o teto
-- do agente (D25) é `teto_creditos_ciclo`, não teto em dólar. Nomear a coluna
-- de `custo` seria convidar alguém a gravar dólar nela seis meses depois.
--
-- ── O QUE NÃO ENTRA ─────────────────────────────────────────────────
-- · SEM suspensão automática (§8.3): "degradação gera alerta, nunca suspensão
--   automática". Não existe coluna de limiar nem job que suspenda.
-- · SEM critério de elegibilidade para promover fluxo a agente (§8.2): "o botão
--   está sempre habilitado; o histórico é informação, nunca condição". Régua
--   inventada antes de existir dado real trava fluxo bom.
-- · SEM idempotência de gatilho capturado (§8.4) — é pré-requisito do gatilho
--   EXTERNO, que é E6. Aqui só nasce a coluna que diz qual é o gatilho.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · As camadas de variável e a versão do fluxo (§7.2, D20, D5) ──
alter table studio_workflows
  add column if not exists versao             integer default 1,
  add column if not exists variaveis_fluxo    jsonb   default '{}'::jsonb,
  add column if not exists variaveis_produto  jsonb   default '{}'::jsonb,
  add column if not exists criterios_juiz     text;

comment on column studio_workflows.versao            is '§7 — a receita é versionada. Execução guarda a versão que rodou, senão não há como atribuir resultado.';
comment on column studio_workflows.variaveis_fluxo   is '§7.2 — a RECEITA, fixa: cenário, enquadramento, luz, estilo. "É isto que a Hering aprovou."';
comment on column studio_workflows.variaveis_produto is '§7.2 — o que a receita ESPERA do produto. Sem catálogo ainda para preencher por SKU.';
comment on column studio_workflows.criterios_juiz    is '§2.3 D5 — critério customizado do juiz neste fluxo. SOMA aos quatro eixos fixos, nunca os substitui.';

-- ── 2 · O agente (§8) ───────────────────────────────────────────────
create table if not exists agente (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  brand_id      uuid not null references brands(id) on delete cascade,

  -- §8.6.2 "um agente, um fluxo". Não é uma lista: é uma referência única.
  workflow_id   uuid not null references studio_workflows(id) on delete cascade,
  nome          text not null,

  -- §8.4 — os três estágios. `capturado` existe no enum mas o E6 é que constrói
  -- os pré-requisitos dele (idempotência, teto por janela, detecção de silêncio).
  gatilho_tipo  text not null default 'manual' check (gatilho_tipo in ('manual', 'local', 'capturado')),
  gatilho_conf  jsonb default '{}'::jsonb,

  -- §8.6.5 "agente tem dono. Uma pessoa nomeada responde por ele, e a fila cai
  -- para ela." Sem dono não é agente — é processo órfão.
  dono_user_id  uuid not null references auth.users(id) on delete restrict,

  -- §8.6.4 "agente sem teto é conta inesperada". Os dois tetos são NOT NULL com
  -- default: criar agente sem teto teria que ser um ato deliberado, e não é.
  teto_execucoes_janela integer not null default 10,
  teto_janela_horas     integer not null default 24,
  teto_creditos_ciclo   integer not null default 100,   -- CRÉDITO, não dólar (ver cabeçalho)

  -- §8.3 — suspender é manual e não apaga. Sem estado 'morto'.
  estado        text not null default 'ativo' check (estado in ('ativo', 'suspenso')),
  suspenso_em   timestamptz,
  suspenso_por  uuid references auth.users(id) on delete set null,

  constraint agente_tetos_positivos check (
    teto_execucoes_janela > 0 and teto_janela_horas > 0 and teto_creditos_ciclo > 0)
);

comment on table  agente                      is '§8 — a camada autônoma. Um agente, um fluxo, um dono, um escopo, e sempre com teto.';
comment on column agente.teto_creditos_ciclo  is 'Em CRÉDITO, nunca dólar (decisão Danilo 31/ago: o sistema mantém a visão de crédito).';

-- ── 3 · A execução (§6.1, §8.6.7) ───────────────────────────────────
create table if not exists execucao (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  brand_id       uuid not null references brands(id) on delete cascade,

  workflow_id    uuid not null references studio_workflows(id) on delete cascade,
  -- A versão que ROSOU, copiada e não referenciada: a receita muda depois, e a
  -- execução precisa continuar dizendo com qual receita aquele resultado saiu.
  workflow_versao integer,
  agente_id      uuid references agente(id) on delete set null,

  -- §8.6.7 "toda execução é auditável: fluxo, versão, gatilho, peças,
  -- vereditos, custo". `disparada_por` é nulo quando quem disparou foi o agente.
  disparada_por  uuid references auth.users(id) on delete set null,
  gatilho        text not null default 'manual' check (gatilho in ('manual', 'local', 'capturado')),

  iniciada_em    timestamptz default now(),
  concluida_em   timestamptz,

  -- §7.2 — a camada do LOTE mora aqui, não no fluxo (ver cabeçalho).
  variaveis_lote jsonb default '{}'::jsonb,

  creditos       integer default 0,   -- CRÉDITO, não dólar (ver cabeçalho)

  -- §2.2 — a contagem por veredito é o que ordena a fila sem varrer as peças.
  n_aprovado     integer not null default 0,
  n_rechecar     integer not null default 0,
  n_reprovado    integer not null default 0,

  constraint execucao_contagens_nao_negativas check (
    n_aprovado >= 0 and n_rechecar >= 0 and n_reprovado >= 0 and creditos >= 0),
  constraint execucao_conclui_depois_de_iniciar check (
    concluida_em is null or iniciada_em is null or concluida_em >= iniciada_em)
);

comment on table  execucao                 is '§6.1 — a rodada. Uma execução tem muitas peças; peça criada à mão não tem execução (por isso a ligação é opcional do lado da peça).';
comment on column execucao.workflow_versao is 'COPIADA, não referenciada: a receita muda, e a execução tem que seguir dizendo com qual receita aquele resultado saiu.';
comment on column execucao.creditos        is 'Em CRÉDITO, nunca dólar (decisão Danilo 31/ago).';

-- §6.2 — "uma peça pertence a ZERO OU UMA execução". Aditivo e anulável: todo o
-- histórico fica legitimamente nulo, e o próprio documento diz que peça criada
-- à mão não tem execução.
alter table studio_generations
  add column if not exists execucao_id uuid references execucao(id) on delete set null;

-- ── 4 · RLS — o mesmo padrão das outras tabelas do Estúdio ──────────
alter table agente   enable row level security;
alter table execucao enable row level security;

create index if not exists idx_agente_brand_estado    on agente   (brand_id, estado);
create index if not exists idx_execucao_workflow      on execucao (workflow_id, iniciada_em desc);
create index if not exists idx_execucao_agente        on execucao (agente_id, iniciada_em desc);
create index if not exists idx_generations_execucao   on studio_generations (execucao_id);

drop policy if exists "workspace acessa agente" on agente;
create policy "workspace acessa agente" on agente
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace acessa execucao" on execucao;
create policy "workspace acessa execucao" on execucao
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

-- O agente é criado e suspenso POR PESSOA, na tela (§8.2, §8.3) — por isso o
-- cliente escreve aqui, ao contrário de `parecer`, que só o juiz escreve.
grant select, insert, update, delete on agente to authenticated;
-- A execução é escrita pelo SERVIDOR, que é quem roda o fluxo. O cliente lê a
-- prestação de contas; forjar contagem de veredito seria forjar a fila.
grant select on execucao to authenticated;
