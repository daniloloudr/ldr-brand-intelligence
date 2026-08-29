-- Comportamento depois da 053. Cada caso diz PASSOU/FALHOU; qualquer FALHOU
-- reprova o deploy. Roda como `authenticated` (RLS vale) trocando auth.uid().
--
-- O que este ensaio precisa provar, e nesta ordem:
--   1. SEM sessão, o operador não vê conteúdo de cliente NENHUM — nem o que já
--      tinha bypass, nem as seis que nunca tiveram.
--   2. COM sessão, ele vê tudo que a impersonação precisa. Fechar demais é o
--      outro defeito, e o mais provável: a tela abre vazia e o operador conclui
--      que o cliente perdeu os dados (foi a forma da falha da Zétona).
--   3. A sessão é ESCOPADA: sessão na Hering não abre o Órfão.
--   4. A sessão EXPIRA, e encerrada não vale.
--   5. O cliente não perdeu nada, e o servidor (service key) segue passando.
\set QUIET on
\pset tuples_only on
\pset format unaligned

-- Os mesmos auxiliares da 052. Redefinidos aqui de propósito: o runner roda os
-- dois arquivos no mesmo banco, mas depender disso deixaria este ensaio
-- impossível de rodar sozinho — e ensaio que só funciona na ordem certa é o
-- primeiro a ser pulado quando alguém tem pressa.
create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;

create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;          -- passou quando deveria barrar
exception when others then return true;   -- barrou: é o esperado
end $$;

create or replace function linhas(sql text) returns int language plpgsql as $$
declare n int; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;

-- ── 1. SEM sessão: o operador não enxerga conteúdo de cliente ───────
-- Nenhuma sessão foi aberta ainda. A ordem aqui é o próprio ensaio: abrir a
-- sessão antes deste bloco faria os nove casos abaixo passarem pelo motivo
-- errado — e foi exatamente o que aconteceu na primeira versão deste arquivo.
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';   -- operador, já FORA dos membros

-- Antes da 053 estas cinco respondiam 1 pelo bypass permanente do 007.
select caso('SEM sessão: operador não lê brands',       (select count(*) from brands       where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0);
select caso('SEM sessão: operador não lê diagnosticos', (select count(*) from diagnosticos where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0);
select caso('SEM sessão: operador não lê listening_events', (select count(*) from listening_events where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0);
select caso('SEM sessão: operador não lê brand_signals',    (select count(*) from brand_signals    where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0);
select caso('SEM sessão: operador não lê studio_generations', (select count(*) from studio_generations where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0);

-- ── 1b. O diagnóstico de LEAD é a exceção, e continua com o operador ────
-- Sem workspace, não há sessão a que amarrar. Se isto reprovar, o Histórico de
-- diagnósticos do /admin abre vazio — 124 das 139 linhas em produção.
select caso('LEAD: operador lê diagnóstico sem workspace mesmo SEM sessão',
  (select count(*) from diagnosticos where workspace_id is null) = 1);

select caso('LEAD: operador cria diagnóstico de lead SEM sessão',
  linhas($$insert into diagnosticos (workspace_id, conteudo) values (null, 'novo lead')$$) = 1);

select caso('LEAD: operador reprocessa o diagnóstico de lead (retry)',
  linhas($$update diagnosticos set conteudo = 'running' where workspace_id is null$$) >= 1);

-- E o diagnóstico DE CLIENTE continua fechado sem sessão — a exceção é do
-- funil, não uma porta para o dado do tenant.
select caso('SEM sessão: operador não lê diagnóstico DE CLIENTE',
  (select count(*) from diagnosticos where workspace_id is not null) = 0);

-- As encadeadas — é onde um join escrito errado abriria o acesso sem ninguém ver.
select caso('SEM sessão: operador não lê brand_books', (select count(*) from brand_books) = 0);
select caso('SEM sessão: operador não lê messages',    (select count(*) from messages)    = 0);
select caso('SEM sessão: operador não lê campaigns',   (select count(*) from campaigns)   = 0);

-- E o operador também não ESCREVE no ambiente do cliente sem declarar.
select caso('SEM sessão: operador não escreve em brand_signals',
  linhas($$update brand_signals set conteudo = 'alterado pelo operador' where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 0);

-- ── 2. COM sessão: a impersonação funciona inteira ──────────────────
-- Agora sim a sessão é aberta. Como superusuário de propósito: em produção quem
-- escreve aqui é o `admin-support-session.js` com service key, atrás do segundo
-- fator — o browser não tem policy de INSERT, e o bloco 5 prova isso.
reset role;
insert into platform_admin_sessions (id, admin_user_id, workspace_id, motivo, expira_em) values
  ('eeeeeeee-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-0000-0000-0000-000000000001', 'suporte: conferir onboarding', now() + interval '1 hour'),
  -- do OUTRO tenant e já vencida — serve aos casos de escopo e de validade
  ('eeeeeeee-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-0000-0000-0000-000000000002', 'suporte: expirada', now() - interval '1 minute');
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';
select caso('COM sessão: operador lê brands',              (select count(*) from brands              where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê diagnosticos',        (select count(*) from diagnosticos        where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê alertas',             (select count(*) from alertas             where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê concorrentes',        (select count(*) from concorrentes        where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê sentiment_snapshots', (select count(*) from sentiment_snapshots where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê identity_gap_snapshots', (select count(*) from identity_gap_snapshots where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê brand_intelligence',  (select count(*) from brand_intelligence  where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê brand_dataset',       (select count(*) from brand_dataset       where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê credit_transactions', (select count(*) from credit_transactions where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê studio_workflows',    (select count(*) from studio_workflows    where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('COM sessão: operador lê studio_campaigns',    (select count(*) from studio_campaigns    where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);

-- AS SEIS DO S0 — o motivo de esta migration existir antes do S1. Sem elas, a
-- impersonação abriria vazia em Tendências, Insights, Mercado, Clipping,
-- Diagnósticos de concorrentes e Peças, e só se descobriria depois de o
-- operador já ter saído das participações.
select caso('S0 · COM sessão: operador lê tendencias',                (select count(*) from tendencias                where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('S0 · COM sessão: operador lê consumer_insights',         (select count(*) from consumer_insights         where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('S0 · COM sessão: operador lê market_sinteses',           (select count(*) from market_sinteses           where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('S0 · COM sessão: operador lê concorrente_clipping',      (select count(*) from concorrente_clipping      where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('S0 · COM sessão: operador lê pecas_escritas',            (select count(*) from pecas_escritas            where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('S0 · COM sessão: operador lê diagnosticos_concorrentes', (select count(*) from diagnosticos_concorrentes where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);

-- As encadeadas, com a sessão aberta: os três saltos precisam resolver.
select caso('COM sessão: operador lê brand_books',        (select count(*) from brand_books)        = 1);
select caso('COM sessão: operador lê brand_book_history', (select count(*) from brand_book_history) = 1);
select caso('COM sessão: operador lê campaigns',          (select count(*) from campaigns)          = 1);
select caso('COM sessão: operador lê conversations',      (select count(*) from conversations)      = 1);
select caso('COM sessão: operador lê messages',           (select count(*) from messages)           = 1);

-- Suporte que só lê não conserta nada: a impersonação precisa escrever.
select caso('COM sessão: operador escreve em brand_signals',
  linhas($$update brand_signals set conteudo = 'corrigido no suporte' where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 1);

-- ── 3. A sessão é ESCOPADA por tenant ───────────────────────────────
-- Sessão aberta na Hering não pode abrir o workspace Órfão. É a diferença
-- entre "acesso declarado" e "acesso permanente com um formulário na frente".
select caso('ESCOPO: sessão na Hering não abre outro tenant',
  (select count(*) from brands where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 0);

-- ── 4. Sessão vencida e sessão encerrada não valem ──────────────────
-- A eeee…02 é do Órfão e já venceu (o caso 3 acima também depende disso).
reset role;
insert into platform_admin_sessions (admin_user_id, workspace_id, motivo, expira_em, encerrada_em)
  values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000002',
          'suporte: encerrada na mão', now() + interval '1 hour', now());
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';

select caso('VALIDADE: sessão encerrada não dá acesso',
  (select count(*) from brands where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 0);

-- Vencer no meio do uso derruba o acesso: é o que impede a aba esquecida aberta
-- de virar o mesmo acesso permanente de antes.
reset role;
update platform_admin_sessions set expira_em = now() - interval '1 second'
 where id = 'eeeeeeee-0000-0000-0000-000000000001';
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';

select caso('VALIDADE: sessão vencida fecha o acesso no meio do uso',
  (select count(*) from brands where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0);

reset role;
update platform_admin_sessions set expira_em = now() + interval '1 hour'
 where id = 'eeeeeeee-0000-0000-0000-000000000001';
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';

-- ── 5. O operador não abre a própria sessão pelo browser ────────────
-- Se abrisse, um token roubado abriria a sessão antes de ler e a proteção seria
-- formalidade. Só o servidor escreve aqui (service key).
select caso('SESSÃO: operador não a insere pelo browser',
  tentou_e_falhou($$insert into platform_admin_sessions (admin_user_id, workspace_id, motivo, expira_em)
    values ('33333333-3333-3333-3333-333333333333','aaaaaaaa-0000-0000-0000-000000000002','me deixa entrar', now() + interval '1 hour')$$));

select caso('SESSÃO: operador não estende o próprio prazo',
  linhas($$update platform_admin_sessions set expira_em = now() + interval '30 days'
    where id = 'eeeeeeee-0000-0000-0000-000000000001'$$) <= 0);

select caso('SESSÃO: operador LÊ as próprias (a tarja mostra até quando vale)',
  (select count(*) from platform_admin_sessions where admin_user_id = '33333333-3333-3333-3333-333333333333') >= 1);

-- ── 6. Um operador não vê a sessão do outro ─────────────────────────
set teste.uid = '11111111-1111-1111-1111-111111111111';   -- dono da Hering, não é operador
select caso('SESSÃO: cliente não lê a trilha de suporte',
  (select count(*) from platform_admin_sessions) = 0);

-- ── 7. O cliente não perdeu nada ────────────────────────────────────
-- A metade que ninguém lembra de testar: fechar demais também é defeito.
select caso('CLIENTE: dono continua lendo o próprio conteúdo',
  (select count(*) from brand_signals where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('CLIENTE: dono continua lendo as seis do S0',
  (select count(*) from tendencias where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select caso('CLIENTE: dono continua lendo brand_books (encadeada)',
  (select count(*) from brand_books) = 1);
select caso('CLIENTE: dono continua escrevendo peça',
  linhas($$update pecas_escritas set conteudo = 'texto do cliente' where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 1);

set teste.uid = '22222222-2222-2222-2222-222222222222';   -- membro comum
select caso('CLIENTE: membro comum continua lendo tendencias',
  (select count(*) from tendencias where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);

-- Isolamento entre tenants segue de pé — é o que a 053 não pode ter afrouxado.
select caso('ISOLAMENTO: membro da Hering não lê conteúdo de outro tenant',
  (select count(*) from brands where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 0);

-- ── 8. O servidor (service key: auth.uid() nulo) ────────────────────
-- Crons, workers e background functions não passam por sessão nenhuma.
reset role;
set teste.uid = '';
select caso('SERVIDOR: cron continua escrevendo em tendencias',
  linhas($$update tendencias set conteudo = 'coletado pelo cron' where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 1);
select caso('SERVIDOR: cron continua lendo o cérebro',
  (select count(*) from brand_intelligence) >= 1);
