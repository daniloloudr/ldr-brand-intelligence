-- ════════════════════════════════════════════════════════════════════
-- 053 — SESSÃO DE SUPORTE: o bypass do operador passa a ter validade
--
-- Entrega S0, S3 e S4 da release de separação do super admin, numa migration
-- só. Estavam separados no backlog e a separação não se sustentou ao escrever:
-- o S0 é "dar o bypass a seis tabelas que ficaram de fora" e o S3 é "trocar o
-- que o bypass significa". Fazer o S0 com a semântica velha e reescrever as
-- mesmas seis policies horas depois é retrabalho puro. O S4 (trilha) não é
-- trabalho nenhum: é a tabela de sessões existir.
--
-- ── O PROBLEMA (levantado no código em 24/08) ───────────────────────
-- A migration 007 deu ao operador `for all using (is_platform_admin())` em 13
-- tabelas, e outras migrations repetiram o padrão inline. Não é "pode
-- impersonar": é acesso direto, permanente, com a sessão normal, sem cerimônia.
-- `is_platform_admin()` responde "sim" para sempre — não existe estado de
-- "agora estou operando" versus "agora não estou".
--
-- Some-se a isso que a mesma conta é membro (dona, depois da 052) dos
-- workspaces dos clientes: phishing nela entrega Hering, Worten e Pixel de uma
-- vez. O S1 tira o operador das participações; esta migration é o que precisa
-- estar de pé ANTES, senão tirá-lo das participações só troca um acesso
-- permanente por outro.
--
-- ── O QUE MUDA ──────────────────────────────────────────────────────
-- Nasce `platform_admin_sessions`: o operador declara em qual workspace vai
-- operar, por quê e até quando. `operador_pode(ws)` exige uma sessão ABERTA
-- para AQUELE workspace. Fora dela, o operador não enxerga conteúdo de cliente
-- nenhum — e a linha que autorizou fica gravada, que é a trilha de auditoria
-- que a Worten pede em due diligence (GDPR). A sessão de suporte JÁ É o
-- registro; não existe um segundo lugar para esquecer de escrever.
--
-- ── ONDE A LINHA FOI DESENHADA, e por quê ───────────────────────────
-- CONTINUAM com o bypass permanente por IDENTIDADE (`is_platform_admin()`):
--
--   · workspaces, workspace_members — é a lista de tenants e o time. O /admin
--     lê as duas do browser com o token do operador (`WorkspacesAdmin` faz
--     `supabase.from('workspaces')` direto), e sem elas não há de onde ESCOLHER
--     o workspace para abrir sessão. Também é dado nosso — plano, créditos,
--     slug, ativação —, não conteúdo do cliente.
--   · cron_runs, cron_alerts — infra da plataforma, sem tenant.
--
-- PASSAM A EXIGIR SESSÃO todas as tabelas de CONTEÚDO do cliente: o que ele
-- escreveu, o que geramos para ele, o que a marca aprendeu, o que a escuta
-- coletou. É o que vaza numa credencial comprometida, e é o que o cliente
-- entende por "os meus dados".
--
-- ⚠️ Esta linha é decisão de produto e está aqui para ser revista. Se a leitura
-- for que o operador também não deve ver a lista de tenants sem declarar
-- intenção, `workspaces` entra no grupo de baixo e o /admin passa a ler pelo
-- servidor (service key), como já fazem admin-list-members e admin-create-user.
--
-- ── AS SEIS DO S0 ───────────────────────────────────────────────────
-- concorrente_clipping, consumer_insights, diagnosticos_concorrentes,
-- market_sinteses, pecas_escritas e tendencias nunca tiveram bypass nenhum. O
-- operador só as enxergava por ser MEMBRO — então, no dia em que o S1 o tirasse
-- das participações, a impersonação abriria VAZIA em Tendências, Insights,
-- Mercado, Clipping, Diagnósticos de concorrentes e Peças. Achado pelo
-- `npm run guarda:isolamento`. Elas entram já na forma nova.
--
-- `ai_usage` estava na lista do backlog e NÃO entra: ela tem RLS ligada e
-- policy nenhuma (039), ou seja, ninguém a lê com token de usuário — nem o
-- operador, nem quando era membro. É visão interna por service key, e o painel
-- de custo do /admin vai por lá. A auditoria de isolamento a listou junto por
-- procurar "tabela com workspace_id sem bypass"; era falso positivo.
--
-- ── O QUE NÃO MUDA ──────────────────────────────────────────────────
-- `is_platform_admin()` fica INTACTA e continua sendo a pergunta de
-- identidade. Ela é usada por `admin_set_plan` (024), pelo faturamento (045) e
-- pelo `protege_campos_comerciais` (052) — lugares onde a pergunta certa é
-- mesmo "esta pessoa opera a plataforma?", sem tenant no meio. Reescrevê-la
-- para exigir sessão quebraria os três de um jeito silencioso.
--
-- Service key (`auth.uid()` nulo) não passa por nada disto: crons, workers e
-- background functions seguem como estão. RLS não se aplica a service role.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. A trilha (S4) ────────────────────────────────────────────────
-- Uma linha por vez que o operador entrou no ambiente de um cliente. `motivo`
-- é not null de propósito: sessão sem motivo declarado é o mesmo acesso
-- permanente de antes, só que com carimbo de hora.
create table if not exists platform_admin_sessions (
  id             uuid primary key default gen_random_uuid(),
  admin_user_id  uuid not null references auth.users(id) on delete cascade,
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  motivo         text not null check (length(btrim(motivo)) >= 3),
  criada_em      timestamptz not null default now(),
  expira_em      timestamptz not null,
  encerrada_em   timestamptz,
  origem         text        -- 'admin' | 'tenant-local' | o que criou a sessão
);

-- O índice serve a `operador_pode`, que roda uma vez por policy por query —
-- é o caminho mais quente que esta migration cria.
create index if not exists idx_pas_aberta
  on platform_admin_sessions (admin_user_id, workspace_id, expira_em desc)
  where encerrada_em is null;

create index if not exists idx_pas_trilha
  on platform_admin_sessions (workspace_id, criada_em desc);

alter table platform_admin_sessions enable row level security;

-- O operador LÊ as próprias sessões (a tarja da tela mostra até quando vale).
-- Não há policy de escrita para `authenticated`: abrir sessão é ato de
-- servidor, atrás do segundo fator. Se o browser pudesse inserir, a sessão
-- viraria formalidade que o próprio token comprometido preenche sozinho.
drop policy if exists "operador le as proprias sessoes" on platform_admin_sessions;
create policy "operador le as proprias sessoes" on platform_admin_sessions
  for select to authenticated
  using (admin_user_id = auth.uid());

-- O Supabase concede isto sozinho (default privileges no schema public), mas
-- escrever aqui deixa a migration válida em qualquer Postgres — é o que o
-- ensaio de RLS roda, e um portão que só funciona no ambiente certo não é
-- portão. Só SELECT: escrever é ato de servidor (admin-support-session.js).
grant select on platform_admin_sessions to authenticated;

-- ── 2. A pergunta nova ──────────────────────────────────────────────
-- Identidade E sessão aberta para AQUELE workspace. As duas coisas: sessão de
-- alguém que saiu de `platform_admins` não vale, e ser operador sem sessão
-- também não. `security definer` porque lê `platform_admins` e a própria
-- tabela de sessões, as duas com RLS ligada — mesmo padrão de `eh_membro`
-- (052) e de `is_platform_admin` (007).
create or replace function public.operador_pode(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from platform_admin_sessions s
      join platform_admins p on p.user_id = s.admin_user_id
     where s.admin_user_id = auth.uid()
       and s.workspace_id  = ws
       and s.encerrada_em is null
       and s.expira_em > now()
  );
$$;

revoke all on function public.operador_pode(uuid) from public;
grant execute on function public.operador_pode(uuid) to authenticated;

-- ── 3. Resolvedores de workspace ────────────────────────────────────
-- Seis tabelas guardam conteúdo de cliente sem `workspace_id` na linha: elas
-- pendem de `brand_id`, de `brand_book_id` ou de `conversation_id`. Sem estes
-- helpers, cada policy repetiria o join — e a chance de escrever um deles
-- errado, num arquivo com vinte policies, é alta demais para o que está em
-- jogo. `stable`, então o planejador os avalia uma vez por linha no máximo.
create or replace function public.ws_da_brand(b uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from brands where id = b;
$$;

create or replace function public.ws_do_brand_book(bb uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select b.workspace_id from brand_books k join brands b on b.id = k.brand_id where k.id = bb;
$$;

create or replace function public.ws_da_conversa(c uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select b.workspace_id from conversations v join brands b on b.id = v.brand_id where v.id = c;
$$;

revoke all on function public.ws_da_brand(uuid)      from public;
revoke all on function public.ws_do_brand_book(uuid) from public;
revoke all on function public.ws_da_conversa(uuid)   from public;
grant execute on function public.ws_da_brand(uuid)      to authenticated;
grant execute on function public.ws_do_brand_book(uuid) to authenticated;
grant execute on function public.ws_da_conversa(uuid)   to authenticated;

-- ── 4. As policies do 007 que viram sessão ──────────────────────────
-- Cada uma era `for all using (is_platform_admin())`, ao lado da policy de
-- membro. Só a cláusula do operador muda; a do cliente fica onde está.
drop policy if exists "platform_admin acessa brands" on brands;
create policy "operador em sessao acessa brands" on brands
  for all to authenticated using (public.operador_pode(workspace_id))
                     with check (public.operador_pode(workspace_id));

drop policy if exists "platform_admin acessa alertas" on alertas;
create policy "operador em sessao acessa alertas" on alertas
  for all to authenticated using (public.operador_pode(workspace_id))
                     with check (public.operador_pode(workspace_id));

drop policy if exists "platform_admin acessa concorrentes" on concorrentes;
create policy "operador em sessao acessa concorrentes" on concorrentes
  for all to authenticated using (public.operador_pode(workspace_id))
                     with check (public.operador_pode(workspace_id));

drop policy if exists "platform_admin acessa listening_events" on listening_events;
create policy "operador em sessao acessa listening_events" on listening_events
  for all to authenticated using (public.operador_pode(workspace_id))
                     with check (public.operador_pode(workspace_id));

drop policy if exists "platform_admin acessa sentiment_snapshots" on sentiment_snapshots;
create policy "operador em sessao acessa sentiment_snapshots" on sentiment_snapshots
  for all to authenticated using (public.operador_pode(workspace_id))
                     with check (public.operador_pode(workspace_id));

drop policy if exists "platform_admin acessa identity_gap_snapshots" on identity_gap_snapshots;
create policy "operador em sessao acessa identity_gap_snapshots" on identity_gap_snapshots
  for all to authenticated using (public.operador_pode(workspace_id))
                     with check (public.operador_pode(workspace_id));

-- `diagnosticos` é a exceção, e a exceção tem número: **124 das 139 linhas não
-- têm `workspace_id`**. São os diagnósticos do funil público — leads, não
-- clientes. Não existe tenant a que amarrar uma sessão, então a regra de sessão
-- as tornaria invisíveis para TODO MUNDO, o operador inclusive, e o Histórico
-- de diagnósticos do /admin abriria vazio. Descoberto na revisão de 27/08,
-- antes de aplicar.
--
-- O corte é por natureza do dado, não por conveniência: linha SEM workspace é
-- do nosso funil e continua com o operador; linha COM workspace é do cliente e
-- exige sessão. Consequência aceita: os 15 diagnósticos de cliente saem do
-- Histórico do /admin — para vê-los, entra-se no ambiente da marca, que é
-- exatamente a doutrina desta release.
drop policy if exists "platform_admin acessa diagnosticos" on diagnosticos;
create policy "operador em sessao acessa diagnosticos" on diagnosticos
  for all to authenticated
  using (
    case when workspace_id is null then is_platform_admin()
         else public.operador_pode(workspace_id) end
  )
  with check (
    case when workspace_id is null then is_platform_admin()
         else public.operador_pode(workspace_id) end
  );

-- As sem `workspace_id` na linha — pendem de brand/book/conversa.
drop policy if exists "platform_admin acessa brand_books" on brand_books;
create policy "operador em sessao acessa brand_books" on brand_books
  for all to authenticated using (public.operador_pode(public.ws_da_brand(brand_id)))
                     with check (public.operador_pode(public.ws_da_brand(brand_id)));

drop policy if exists "platform_admin acessa brand_book_history" on brand_book_history;
create policy "operador em sessao acessa brand_book_history" on brand_book_history
  for all to authenticated using (public.operador_pode(public.ws_do_brand_book(brand_book_id)))
                     with check (public.operador_pode(public.ws_do_brand_book(brand_book_id)));

drop policy if exists "platform_admin acessa campaigns" on campaigns;
create policy "operador em sessao acessa campaigns" on campaigns
  for all to authenticated using (public.operador_pode(public.ws_da_brand(brand_id)))
                     with check (public.operador_pode(public.ws_da_brand(brand_id)));

drop policy if exists "platform_admin acessa conversations" on conversations;
create policy "operador em sessao acessa conversations" on conversations
  for all to authenticated using (public.operador_pode(public.ws_da_brand(brand_id)))
                     with check (public.operador_pode(public.ws_da_brand(brand_id)));

drop policy if exists "platform_admin acessa messages" on messages;
create policy "operador em sessao acessa messages" on messages
  for all to authenticated using (public.operador_pode(public.ws_da_conversa(conversation_id)))
                     with check (public.operador_pode(public.ws_da_conversa(conversation_id)));

-- ── 5. As policies com o bypass INLINE ──────────────────────────────
-- Aqui o operador não tinha policy própria: o `or is_platform_admin()` mora
-- dentro da policy do membro. Recriadas inteiras, trocando só esse termo — a
-- cláusula de participação é copiada literalmente da migration de origem.
--
-- ANOTADO, não consertado aqui: estas policies (e as seis do bloco 6) não têm
-- cláusula `to`, então valem para o papel `public`, que inclui `anon`. Hoje
-- isso é inofensivo — todos os termos dependem de `auth.uid()`, que é nulo no
-- anônimo, e o conjunto sai vazio. Mas é a MESMA forma do defeito que a
-- migration 049 consertou (`for select using (publico = true)` sem `to`,
-- valendo para `anon`). Um OR futuro que não dependa de auth.uid() abriria
-- leitura anônima sem ninguém notar. Fechar isso é uma varredura sobre as ~40
-- policies do banco, não um efeito colateral desta migration — entra no
-- backlog. As policies NOVAS deste arquivo já nascem `to authenticated`.
drop policy if exists "workspace acessa brand_signals" on brand_signals;
create policy "workspace acessa brand_signals" on brand_signals
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace acessa brand_intelligence" on brand_intelligence;
create policy "workspace acessa brand_intelligence" on brand_intelligence
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace le brand_dataset" on brand_dataset;
create policy "workspace le brand_dataset" on brand_dataset
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace lê suas transações" on credit_transactions;
create policy "workspace lê suas transações" on credit_transactions
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace acessa studio_workflows" on studio_workflows;
create policy "workspace acessa studio_workflows" on studio_workflows
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace acessa studio_generations" on studio_generations;
create policy "workspace acessa studio_generations" on studio_generations
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

drop policy if exists "workspace acessa studio_campaigns" on studio_campaigns;
create policy "workspace acessa studio_campaigns" on studio_campaigns
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

-- ── 6. As seis que nunca tiveram bypass (S0) ────────────────────────
-- Entram já na forma nova. Sem isto, o S1 abre a impersonação vazia nas telas
-- de Tendências, Insights, Mercado, Clipping, Diagnósticos de concorrentes e
-- Peças — e o defeito só apareceria depois de o operador já ter saído das
-- participações, que é o pior momento possível para descobrir.
drop policy if exists "acessa tendencias" on tendencias;
create policy "acessa tendencias" on tendencias
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));

drop policy if exists "acessa consumer_insights" on consumer_insights;
create policy "acessa consumer_insights" on consumer_insights
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));

drop policy if exists "acessa market_sinteses" on market_sinteses;
create policy "acessa market_sinteses" on market_sinteses
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));

drop policy if exists "acessa concorrente_clipping" on concorrente_clipping;
create policy "acessa concorrente_clipping" on concorrente_clipping
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));

drop policy if exists "acessa pecas_escritas" on pecas_escritas;
create policy "acessa pecas_escritas" on pecas_escritas
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));

drop policy if exists "workspace acessa diagnosticos_concorrentes" on diagnosticos_concorrentes;
create policy "workspace acessa diagnosticos_concorrentes" on diagnosticos_concorrentes
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));

-- ── 7. As SEIS que o primeiro levantamento não viu ──────────────────
-- Achadas no ensaio contra o esquema REAL (29/08), depois de a migration já
-- estar escrita, testada e commitada.
--
-- POR QUE ESCAPARAM, e vale mais que o conserto: a busca que montou a lista
-- procurava `is_platform_admin` no `pg_policies`. Estas seis escrevem o mesmo
-- bypass À MÃO — `exists (select 1 from platform_admins where user_id =
-- auth.uid())` — em vez de chamar a função. Mesmo efeito, texto diferente, e a
-- consulta não as viu. O backlog até dizia ("mais listening_terms e
-- content_hub_analyses inline nas 010–013") e eu montei a lista da consulta, não
-- do texto.
--
-- Sem este bloco a release AFIRMARIA que o operador não vê conteúdo de cliente
-- enquanto seis tabelas seguiam abertas em caráter permanente — entre elas a
-- biblioteca de ativos e o brand book EMBEDDADO, que é o cérebro em texto, o
-- dado mais sensível que guardamos.
--
-- A lição, terceira vez em três dias: busca incompleta não devolve "quase
-- tudo", devolve "nada a corrigir".
drop policy if exists "workspace acessa brand_assets" on brand_assets;
create policy "workspace acessa brand_assets" on brand_assets
  for all
  using      (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)))
  with check (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)));

drop policy if exists "workspace acessa brand_book_chunks" on brand_book_chunks;
create policy "workspace acessa brand_book_chunks" on brand_book_chunks
  for all
  using      (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)))
  with check (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)));

drop policy if exists "workspace acessa brand_manual_jobs" on brand_manual_jobs;
create policy "workspace acessa brand_manual_jobs" on brand_manual_jobs
  for all
  using      (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)))
  with check (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)));

drop policy if exists "workspace acessa design_tokens" on design_tokens;
create policy "workspace acessa design_tokens" on design_tokens
  for all
  using      (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)))
  with check (brand_id in (select br.id from brands br where br.workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())) or public.operador_pode(public.ws_da_brand(brand_id)));

drop policy if exists "acessa content_hub_analyses" on content_hub_analyses;
create policy "acessa content_hub_analyses" on content_hub_analyses
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));

-- `listening_terms` tem DUAS policies e só uma carrega o bypass. A segunda
-- ("membro acessa listening_terms") é só participação e fica como está — mexer
-- nela seria alterar o acesso do cliente, que não é o assunto desta migration.
drop policy if exists "acessa listening_terms" on listening_terms;
create policy "acessa listening_terms" on listening_terms
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id));
