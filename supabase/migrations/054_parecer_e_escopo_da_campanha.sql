-- ════════════════════════════════════════════════════════════════════
-- 054 — O PARECER GANHA LUGAR, E A CAMPANHA GANHA ESCOPO
--
-- Primeira fatia do E1 do Estúdio v2. Faixa B: tudo aditivo — nada que já está
-- gravado muda de sentido, e reverter é `drop`.
--
-- ── O PROBLEMA ──────────────────────────────────────────────────────
-- Duas coisas que o E0b entregou pela metade porque o banco não tinha onde:
--
-- 1. O PARECER NÃO É PERSISTIDO EM LUGAR NENHUM. O `art-review.js` julga a
--    peça, devolve o veredito ao chamador e emite um sinal `art_review` para a
--    destilação. Não faz `insert`. O veredito existe por alguns segundos na
--    tela e some. A §2.2 diz que "a função real do juiz é ORDENAR A FILA, não
--    cortá-la" — e não existe fila: não há de onde ler.
--
-- 2. O EIXO ESCOPO DO JUIZ ESTÁ CEGO. A §2.3 manda verificar se a peça "atende
--    ao direcional e ao objetivo do escopo". O E0b nomeou o eixo no prompt, mas
--    `studio_campaigns` só tem `conceito` (migration 018): não há objetivo, nem
--    proposta de valor, nem vigência, nem direcional. O juiz recebe a ordem de
--    verificar algo que ninguém consegue lhe contar.
--
-- ── A DECISÃO QUE ESTA MIGRATION TOMA ───────────────────────────────
-- A §6.1 diz que o parecer pertence à VERSÃO DA PEÇA. Essa entidade não existe:
-- peça × versão é a C1, que é a migration mais cara do documento e está atrás
-- do E2, que é decisão em aberto. Esperar por ela deixaria o veredito se
-- perdendo por mais três releases.
--
-- Então o parecer aponta para o que existe hoje — `studio_generations`, que é a
-- peça e a versão ao mesmo tempo — e o E3 REAPONTA a coluna. É por isso que a
-- referência se chama `generation_id` e não `peca_versao_id`: o nome diz a que
-- ele se prende HOJE, e renomear na hora certa é mais honesto que fingir desde
-- já uma ligação que não existe.
--
-- `generation_id` é ANULÁVEL porque o juiz também julga peça que veio de fora:
-- imagem enviada no chat pela agência ou pelo freela nunca foi uma geração
-- nossa. Nesses casos o que identifica a peça é a `image_url`. O CHECK exige
-- que ao menos um dos dois exista — parecer sobre coisa nenhuma é lixo.
--
-- ── O QUE NÃO ENTRA, E POR QUÊ ──────────────────────────────────────
-- · SEM coluna de score. A §2.2 é explícita: "não existe constructo validado
--   para converter análise de peça em nota, e inventar um seria precisão
--   falsa". Coluna que existe acaba preenchida.
-- · SEM tornar o parecer OBRIGATÓRIO (D6). A tabela é barata; a obrigação não
--   é — é uma chamada multimodal síncrona por peça, em todo lote. O backlog
--   chama isso de "o item não precificado do documento". Medir antes de
--   prometer.
-- · SEM `execucao` e `agente`. São do E6; nascer agora é tabela que nada
--   escreve nem lê.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · A campanha vira ESCOPO de verdade (§3.5, §6.1) ──────────────
-- Todas anuláveis: as campanhas que já existem continuam válidas sem nenhuma
-- delas. `conceito` (o brief) fica onde está — não é o mesmo que objetivo.
alter table studio_campaigns
  add column if not exists objetivo        text,
  add column if not exists proposta_valor  text,
  add column if not exists vigencia_inicio date,
  add column if not exists vigencia_fim    date,
  add column if not exists direcional      text;

-- Vigência invertida é erro de digitação que ninguém percebe até a campanha
-- não aparecer em lugar nenhum. Barrar no banco custa nada.
alter table studio_campaigns drop constraint if exists studio_campaigns_vigencia_coerente;
alter table studio_campaigns add constraint studio_campaigns_vigencia_coerente
  check (vigencia_inicio is null or vigencia_fim is null or vigencia_fim >= vigencia_inicio);

comment on column studio_campaigns.objetivo       is '§3.5 — o que a campanha quer. Entra no eixo ESCOPO do juiz (§2.3).';
comment on column studio_campaigns.direcional     is '§3.5 — direcional visual próprio. A campanha pode divergir da estética da marca; o que NÃO pode divergir é a informação.';
comment on column studio_campaigns.proposta_valor is '§3.5 — a proposta de valor da campanha, que precisa estar alinhada com a da marca.';

-- ── 2 · O parecer (§2.2, §6.1) ──────────────────────────────────────
create table if not exists parecer (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  brand_id      uuid not null references brands(id) on delete cascade,

  -- O QUE FOI JULGADO. Hoje a geração; no E3 a versão da peça (ver cabeçalho).
  generation_id uuid references studio_generations(id) on delete cascade,
  image_url     text,

  -- §2.2 — três valores, sem nota. O vocabulário é o do E0b; os sinais
  -- `art_review` antigos ficam onde estão, e quem os lê traduz (`_parecer.js`).
  veredito      text not null check (veredito in ('aprovado', 'rechecar', 'reprovado')),
  texto         text not null check (char_length(texto) <= 300),

  -- §2.3 — quais eixos foram verificados e o que cada um disse. jsonb porque os
  -- quatro são fixos mas os customizados por fluxo (D5) são abertos.
  eixos         jsonb default '{}'::jsonb,

  modo          text default 'marca' check (modo in ('marca', 'fidelidade')),
  criterio      text,   -- o critério customizado do portão, quando houve
  fonte         text default 'workflow' check (fonte in ('workflow', 'copiloto', 'agente')),

  constraint parecer_tem_alvo check (generation_id is not null or image_url is not null)
);

comment on table  parecer               is 'O parecer do juiz (§2.2). Uma linha por julgamento de máquina. Sem score, de propósito.';
comment on column parecer.generation_id is 'Aponta para a GERAÇÃO hoje; o E3 reaponta para a versão da peça, quando peça × versão existir.';
comment on column parecer.image_url     is 'Peça vinda de fora (enviada no chat) nunca foi geração nossa — é o que a identifica.';

alter table parecer enable row level security;

-- A fila da §2.2 lê por marca e ordena por atenção necessária.
create index if not exists idx_parecer_brand_veredito on parecer (brand_id, veredito, created_at desc);
-- A certidão da peça lê pelo alvo.
create index if not exists idx_parecer_generation     on parecer (generation_id);

-- Mesma policy das outras tabelas do Estúdio depois da 053: membro do workspace
-- OU operador COM SESSÃO ABERTA para aquele workspace. `is_platform_admin()`
-- não entra aqui — foi exatamente o que a 053 tirou das outras seis.
drop policy if exists "workspace acessa parecer" on parecer;
create policy "workspace acessa parecer" on parecer
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

-- Só SELECT: quem escreve parecer é o juiz, no servidor (`art-review.js`, com
-- service key). Cliente que pudesse inserir parecer poderia forjar aprovação da
-- própria peça — e o julgamento da máquina é o que alimenta a destilação.
-- Escrito aqui, e não deixado para o default do Supabase, porque é isto que o
-- ensaio de RLS roda num Postgres pelado (mesma razão da 053).
grant select on parecer to authenticated;
