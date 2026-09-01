-- ════════════════════════════════════════════════════════════════════
-- 056 — PEÇA × VERSÃO, OS SETE ESTADOS E O JULGAMENTO COMO ENTIDADE
--
-- O E3. A spec chama C1 de "a migration mais cara do documento" e diz que
-- C1+C2+C3 são UMA release, não três: peça/versão sem estado novo, ou estado
-- novo sem julgamento, deixa o módulo lendo dois modelos ao mesmo tempo.
--
-- ── ADITIVA, E ISSO É DELIBERADO ────────────────────────────────────
-- `studio_generations` NÃO é tocada nem esvaziada. As tabelas novas nascem ao
-- lado, com backfill, e `peca_versao.generation_id` é a ponte entre os dois
-- modelos.
--
-- Por quê: o custo do C1 não é a migration, é o RAIO DE ALCANCE. Hoje 19
-- arquivos e 43 referências leem `studio_generations` — canvas, biblioteca,
-- campanhas, admin, webhook, poll, reaper, o cérebro. Trocar a fonte de todos
-- num commit é o tipo de mudança que ninguém consegue revisar nem reverter.
--
-- Então esta migration entrega o MODELO; a troca dos leitores vem depois, um a
-- um, cada um com a sua própria janela de erro. Enquanto isso os dois convivem,
-- e a ponte diz qual linha nova corresponde a qual linha velha.
--
-- ⚠️ O RISCO ASSUMIDO É DERIVA: duas fontes para o mesmo fato. Aceito porque a
-- alternativa (cutover) é pior, e porque enquanto os leitores não migrarem
-- ninguém DECIDE nada a partir das tabelas novas — elas são espelho, não
-- verdade. A release que migrar o primeiro leitor é a que precisa escolher qual
-- das duas manda.
--
-- ── OS SETE ESTADOS (§5, reescrito no E2) ───────────────────────────
--   gerando ──┬──▶ gerada ──▶ analisada ──┬──▶ aprovada ──▶ arquivada
--             │                           └──▶ recusada ──▶ arquivada
--             └──▶ falhou
-- `gerando` e `falhou` são do MOTOR; os cinco seguintes, do ciclo de vida.
-- `falhou` é terminal e NÃO é `recusada` — confundir as duas diluiria o sinal
-- mais forte de aprendizado da marca com erro de infraestrutura do provedor.
--
-- ── POR QUE O JULGAMENTO PRECISA DE `modo` ANTES DO BATCH ───────────
-- D21: aprovação em LOTE não treina o cérebro. Sem a coluna, o primeiro lote de
-- 200 peças aprovado num clique entra no dataset como 200 aprovações
-- individuais. Este repo JÁ FOI ENVENENADO por dado que entrou sem julgamento —
-- a escuta, jul/2026, 122 eventos inventados que seguem na memória de três
-- marcas. Por isso C3 entra ANTES do batch do §7.4, não depois.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · A peça: a linhagem (§6.1) ───────────────────────────────────
create table if not exists peca (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,

  -- §3.3 — campanha é OPCIONAL. Sem campanha, o escopo é a marca.
  campaign_id  uuid references studio_campaigns(id) on delete set null,
  -- §6.2 — peça pertence a ZERO ou uma execução; a criada à mão não tem.
  execucao_id  uuid references execucao(id) on delete set null,

  -- §3.2 — quatro formatos do MESMO objeto. `audio` entra no enum porque o
  -- documento o define; que não exista gerador é assunto de produto, não de
  -- esquema — e enum sem o valor obrigaria outra migration quando existir.
  formato      text not null check (formato in ('imagem', 'video', 'texto', 'audio')),
  criada_por   uuid references auth.users(id) on delete set null,

  -- De qual geração esta peça nasceu, no backfill. Não é enfeite: sem uma
  -- correlação EXPLÍCITA, ligar peça a versão exigiria casar por
  -- (brand_id, created_at) — e duas gerações no mesmo instante, coisa comum em
  -- lote, cruzariam errado em silêncio. Também serve de proveniência depois.
  origem_generation_id uuid references studio_generations(id) on delete set null
);

comment on column peca.origem_generation_id is 'A geração que originou esta peça no backfill do E3. Proveniência, e a chave que tornou o backfill determinístico.';

-- ── 2 · A versão: o arquivo, e onde vivem os estados (§5, §6.1) ─────
create table if not exists peca_versao (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,

  peca_id      uuid not null references peca(id) on delete cascade,
  numero       integer not null check (numero >= 1),
  arquivo_url  text,
  estado       text not null check (estado in
                 ('gerando', 'falhou', 'gerada', 'analisada', 'aprovada', 'recusada', 'arquivada')),
  o_que_mudou  text,
  criada_por   uuid references auth.users(id) on delete set null,

  -- A PONTE com o modelo antigo. Sai quando o último leitor migrar.
  generation_id uuid references studio_generations(id) on delete cascade,

  constraint peca_versao_numero_unico unique (peca_id, numero)
);

comment on column peca_versao.generation_id is 'Ponte com studio_generations enquanto os dois modelos convivem. Remover quando o último leitor migrar.';
comment on column peca_versao.estado        is '§5 — sete estados num eixo só: gerando|falhou do MOTOR, os cinco seguintes do ciclo de vida.';

-- ── 3 · O julgamento como entidade (§6.1, D21) ──────────────────────
create table if not exists julgamento (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,

  versao_id    uuid not null references peca_versao(id) on delete cascade,
  decisao      text not null check (decisao in ('aprovar', 'recusar')),

  usuario_id   uuid references auth.users(id) on delete set null,
  -- §4 — o papel NO MOMENTO do julgamento, copiado e não referenciado: o papel
  -- da pessoa muda, e o julgamento tem que continuar dizendo quem ela era.
  papel        text check (papel in ('dono', 'utilizador', 'desconhecido')),

  -- D21 — NULO é legítimo e significa "não se sabe" (o histórico não registrava
  -- modo). Quem lê para treinar precisa tratar nulo como "não treina", não como
  -- "treina": na dúvida, não se ensina a marca.
  treina       boolean,
  modo         text check (modo in ('individual', 'lote')),
  motivo       text
);

comment on column julgamento.treina is 'D21 — lote NÃO treina. NULO = desconhecido (histórico); quem lê deve tratar nulo como não-treina.';
comment on column julgamento.papel  is 'O papel NO MOMENTO do julgamento, copiado: o papel muda, o registro não pode mudar junto.';

-- O parecer (054) apontava para a geração porque a versão não existia. Agora
-- existe. A coluna nova é anulável e o backfill a preenche; `generation_id`
-- fica até o último leitor migrar.
alter table parecer add column if not exists versao_id uuid references peca_versao(id) on delete cascade;

-- ── 4 · BACKFILL ────────────────────────────────────────────────────
-- Idempotente: só cria o que ainda não tem ponte. Rodar duas vezes não duplica.
do $$
declare n_peca int; n_versao int; n_julg int; n_pulado int;
begin
  -- Geração SEM marca ou SEM workspace não pode virar peça: peça pertence a uma
  -- marca, e inventar uma seria pior que não migrar a linha. As colunas são
  -- anuláveis em `studio_generations` (migration 018), então isso é possível
  -- mesmo que hoje não haja nenhuma — conferido em produção: zero.
  --
  -- Pular em SILÊNCIO seria o defeito: a conta bateria e ninguém saberia que
  -- faltam linhas. Por isso o `raise notice` conta quantas ficaram de fora.
  select count(*) into n_pulado
    from studio_generations g
   where (g.brand_id is null or g.workspace_id is null)
     and not exists (select 1 from peca p where p.origem_generation_id = g.id);
  if n_pulado > 0 then
    raise notice 'backfill 056: % geração(ões) PULADAS por não ter marca ou workspace', n_pulado;
  end if;

  -- 4.1 · uma peça por geração, guardando de qual geração veio
  insert into peca (created_at, workspace_id, brand_id, campaign_id, formato, origem_generation_id)
  select g.created_at, g.workspace_id, g.brand_id, g.campaign_id,
         case when g.media_type = 'video' then 'video' else 'imagem' end,
         g.id
    from studio_generations g
   where g.brand_id is not null and g.workspace_id is not null
     and not exists (select 1 from peca p where p.origem_generation_id = g.id);
  get diagnostics n_peca = row_count;

  -- 4.2 · uma versão v1 por peça, ligada pela correlação explícita e com o
  -- estado traduzido pelo de-para do E2 (§5).
  insert into peca_versao (workspace_id, brand_id, peca_id, numero, arquivo_url, estado, generation_id, created_at)
  select g.workspace_id, g.brand_id, p.id, 1, g.image_url,
         case
           when g.status = 'processing' then 'gerando'
           when g.status = 'error'      then 'falhou'
           when g.feedback = 'up'       then 'aprovada'
           when g.feedback = 'down'     then 'recusada'
           when exists (select 1 from parecer pa where pa.generation_id = g.id) then 'analisada'
           else 'gerada'
         end,
         g.id, g.created_at
    from peca p
    join studio_generations g on g.id = p.origem_generation_id
   where not exists (select 1 from peca_versao v where v.generation_id = g.id);
  get diagnostics n_versao = row_count;

  -- 4.3 · cada feedback vira julgamento. `treina` fica NULO de propósito: o
  -- histórico não registrava modo, e inventar 'individual' seria afirmar que
  -- 81 julgamentos podem treinar o cérebro sem ninguém ter decidido isso.
  insert into julgamento (workspace_id, brand_id, versao_id, decisao, usuario_id, papel, treina, modo, created_at)
  select g.workspace_id, g.brand_id, v.id,
         case when g.feedback = 'up' then 'aprovar' else 'recusar' end,
         g.feedback_by, 'desconhecido', null, null,
         coalesce(g.feedback_at, g.created_at)
    from studio_generations g
    join peca_versao v on v.generation_id = g.id
   where g.feedback in ('up', 'down')
     and not exists (select 1 from julgamento j where j.versao_id = v.id);
  get diagnostics n_julg = row_count;

  -- 4.4 · o parecer passa a apontar para a versão
  update parecer pa set versao_id = v.id
    from peca_versao v
   where v.generation_id = pa.generation_id and pa.versao_id is null;

  raise notice 'backfill 056: % peças, % versões, % julgamentos', n_peca, n_versao, n_julg;
end $$;

-- ── 5 · Índices e RLS ───────────────────────────────────────────────
create index if not exists idx_peca_brand            on peca (brand_id, created_at desc);
create index if not exists idx_peca_campanha         on peca (campaign_id);
create unique index if not exists idx_peca_origem     on peca (origem_generation_id) where origem_generation_id is not null;
create index if not exists idx_versao_peca           on peca_versao (peca_id, numero);
create index if not exists idx_versao_estado         on peca_versao (brand_id, estado, created_at desc);
create index if not exists idx_versao_generation     on peca_versao (generation_id);
create index if not exists idx_julgamento_versao     on julgamento (versao_id);
create index if not exists idx_parecer_versao        on parecer (versao_id);

alter table peca        enable row level security;
alter table peca_versao enable row level security;
alter table julgamento  enable row level security;

drop policy if exists "workspace acessa peca" on peca;
create policy "workspace acessa peca" on peca
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace acessa peca_versao" on peca_versao;
create policy "workspace acessa peca_versao" on peca_versao
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace acessa julgamento" on julgamento;
create policy "workspace acessa julgamento" on julgamento
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

-- Peça e versão: o cliente cria e edita (gerar e versionar são atos dele).
grant select, insert, update, delete on peca        to authenticated;
grant select, insert, update, delete on peca_versao to authenticated;
-- JULGAMENTO o cliente escreve — é literalmente o ato dele (§4.3, aprovar ou
-- recusar). O que ele NÃO pode é apagar: julgamento apagado é histórico
-- reescrito, e `recusada` é o sinal mais forte que a marca tem (§5).
grant select, insert, update on julgamento to authenticated;
