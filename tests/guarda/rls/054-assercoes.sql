-- Comportamento depois da 054. Cada caso diz PASSOU/FALHOU; qualquer FALHOU
-- reprova o deploy. Roda como `authenticated` (RLS vale) trocando auth.uid().
--
-- Chega num banco pós-053 de propósito: é assim que a migration encontra a
-- produção. Reutiliza o retrato da 053 (Hering = workspace aaaa…1, dono
-- 1111…, membro 2222…, operador 3333… já fora das participações).
--
-- O que este ensaio precisa provar:
--   1. O parecer é ISOLADO por workspace, como todo o resto do Estúdio.
--   2. O operador só enxerga parecer COM sessão aberta para aquele workspace.
--   3. O CLIENTE NÃO ESCREVE PARECER. É o portão que impede alguém de forjar a
--      aprovação da própria peça — e o julgamento da máquina alimenta a
--      destilação, então parecer forjado vira memória permanente da marca.
--   4. Os CHECKs barram o que a §2.2 proíbe: vocabulário velho, texto acima de
--      300, parecer sem alvo.
--   5. A campanha ganhou o escopo, e vigência invertida não passa.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function caso(nome text, ok boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when ok then 'PASSOU' else '✖ FALHOU' end, nome; end $$;

create or replace function tentou_e_falhou(sql text) returns boolean language plpgsql as $$
begin execute sql; return false;          -- passou quando deveria barrar
exception when others then return true;   -- barrou: é o esperado
end $$;

-- ── Semeia como servidor (service key: sem RLS) ─────────────────────
-- `reset role`, não `set role postgres`: é o idioma da 053, e o SET ROLE que
-- falha não interrompe o arquivo — deixa a sessão como `authenticated` e os
-- inserts seguintes são barrados pela RLS EM SILÊNCIO. Foi o que fez dois casos
-- reprovarem na primeira execução deste ensaio.
reset role;
insert into studio_generations (id, workspace_id, conteudo)
  values ('deadbeef-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'peça da Hering')
  on conflict do nothing;

insert into parecer (workspace_id, brand_id, generation_id, veredito, texto, fonte)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
          'deadbeef-0000-0000-0000-000000000001', 'rechecar', 'O azul do fundo foge do primário.', 'workflow');

-- Parecer de peça VINDA DE FORA: sem geração, identificada pela URL.
insert into parecer (workspace_id, brand_id, image_url, veredito, texto, fonte)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
          'https://cdn/peca-da-agencia.jpg', 'reprovado', 'Logo redesenhada.', 'copiloto');

-- ── 1 · Isolamento por workspace ────────────────────────────────────
set role authenticated;
set teste.uid = '11111111-1111-1111-1111-111111111111';   -- dono da Hering
select caso('dono da Hering lê os pareceres da Hering',
  (select count(*) from parecer where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 2);

select caso('parecer de peça de FORA (sem generation_id) também é lido',
  (select count(*) from parecer where generation_id is null) = 1);

set teste.uid = '22222222-2222-2222-2222-222222222222';   -- membro comum da Hering
select caso('membro comum da Hering também lê',
  (select count(*) from parecer) = 2);

-- ── 2 · O operador, e a sessão ──────────────────────────────────────
-- A 053 deixou uma sessão ABERTA na Hering ao fim do arquivo dela. Fecho aqui
-- para provar o estado "sem sessão" primeiro — a ordem é o próprio ensaio.
reset role;
update platform_admin_sessions set encerrada_em = now() where encerrada_em is null;
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';   -- operador, fora dos membros
select caso('SEM sessão: operador não lê parecer', (select count(*) from parecer) = 0);

reset role;
insert into platform_admin_sessions (admin_user_id, workspace_id, motivo, expira_em)
  values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000001',
          'suporte ao piloto', now() + interval '1 hour');
set role authenticated;
set teste.uid = '33333333-3333-3333-3333-333333333333';
select caso('COM sessão: operador lê parecer da Hering', (select count(*) from parecer) = 2);

-- ── 3 · O cliente NÃO escreve parecer ───────────────────────────────
-- Só SELECT foi concedido. Sem isto, qualquer membro poderia inserir um
-- 'aprovado' na própria peça — e o parecer alimenta a destilação.
set teste.uid = '11111111-1111-1111-1111-111111111111';
select caso('cliente NÃO insere parecer (forjar aprovação é o risco)', tentou_e_falhou($$
  insert into parecer (workspace_id, brand_id, image_url, veredito, texto)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'https://cdn/x.jpg','aprovado','forjado') $$));

select caso('cliente NÃO altera parecer existente', tentou_e_falhou($$
  update parecer set veredito = 'aprovado' $$));

select caso('cliente NÃO apaga parecer', tentou_e_falhou($$ delete from parecer $$));

-- ── 4 · Os CHECKs da §2.2 ───────────────────────────────────────────
reset role;
select caso('veredito do vocabulário VELHO é barrado', tentou_e_falhou($$
  insert into parecer (workspace_id, brand_id, image_url, veredito, texto)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'https://cdn/y.jpg','aprovada_com_ressalvas','vocabulário anterior ao E0b') $$));

select caso('texto acima de 300 caracteres é barrado', tentou_e_falhou(format($$
  insert into parecer (workspace_id, brand_id, image_url, veredito, texto)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'https://cdn/z.jpg','aprovado','%s') $$, repeat('x', 301))));

select caso('texto de exatamente 300 passa', not tentou_e_falhou(format($$
  insert into parecer (workspace_id, brand_id, image_url, veredito, texto)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'https://cdn/300.jpg','aprovado','%s') $$, repeat('x', 300))));

select caso('parecer SEM alvo (nem geração nem url) é barrado', tentou_e_falhou($$
  insert into parecer (workspace_id, brand_id, veredito, texto)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'aprovado','parecer sobre coisa nenhuma') $$));

select caso('modo fora de marca|fidelidade é barrado', tentou_e_falhou($$
  insert into parecer (workspace_id, brand_id, image_url, veredito, texto, modo)
  values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
          'https://cdn/w.jpg','aprovado','ok','estetico') $$));

select caso('NÃO existe coluna de score (a §2.2 proíbe nota)',
  (select count(*) from information_schema.columns
    where table_name = 'parecer' and column_name in ('score','nota','pontuacao')) = 0);

-- ── 5 · A campanha virou escopo ─────────────────────────────────────
select caso('studio_campaigns ganhou as cinco colunas de escopo',
  (select count(*) from information_schema.columns
    where table_name = 'studio_campaigns'
      and column_name in ('objetivo','proposta_valor','vigencia_inicio','vigencia_fim','direcional')) = 5);

select caso('vigência invertida é barrada', tentou_e_falhou($$
  insert into studio_campaigns (workspace_id, vigencia_inicio, vigencia_fim)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-12-01', '2026-01-01') $$));

select caso('vigência coerente passa', not tentou_e_falhou($$
  insert into studio_campaigns (workspace_id, vigencia_inicio, vigencia_fim)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-01-01', '2026-12-01') $$));

select caso('campanha SEM vigência segue válida (as que já existem)', not tentou_e_falhou($$
  insert into studio_campaigns (workspace_id) values ('aaaaaaaa-0000-0000-0000-000000000001') $$));
