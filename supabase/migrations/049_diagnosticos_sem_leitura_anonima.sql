-- ── Fecha a leitura anônima de diagnósticos ─────────────────────────────
--
-- Decisão do Danilo, 18/08/2026: "sem view público, pode fechar tudo,
-- garantir a segurança dos dados."
--
-- O QUE ESTAVA ABERTO
-- A política de 005 era:
--
--   create policy "leitura publica diagnosticos" on diagnosticos
--     for select using (publico = true);
--
-- Sem cláusula `to`, ela vale para o papel `public` — o que inclui `anon`.
-- Qualquer pessoa com a chave anônima (que é pública por definição, vai no
-- bundle do front) lia QUALQUER diagnóstico marcado como público, com todas as
-- colunas. Medido: 111 dos 118 diagnósticos estavam públicos, e o `select('*')`
-- da página do relatório trazia `user_email` junto — dava para ler
-- "danilo@loudr.com.br" sem login nenhum, em qualquer link compartilhado.
--
-- Auditei as outras 19 tabelas com a chave anônima: só esta vazava. As demais
-- já exigiam autenticação.
--
-- O QUE MUDA
-- Depois desta migration, leem diagnósticos:
--   · membros do workspace, autenticados  (política "workspace acessa")
--   · admins da plataforma                (política de 015)
--   · anônimo                             → nada
--
-- CONSEQUÊNCIA ACEITA E CONHECIDA
-- Os 111 links públicos param de funcionar, incluindo 101 diagnósticos de
-- prospecção sem workspace (Ambev, Natura, Petrobras, as rodadas competitivas
-- de assinatura digital e contabilidade). Esses continuam legíveis para os
-- admins da plataforma, que é quem os produziu. A troca foi apresentada com
-- esses números e escolhida assim: segurança do dado acima do link aberto.
--
-- Se um dia voltar a fazer sentido compartilhar relatório fora da conta, o
-- caminho é token por relatório (coluna `share_token` + política que compara o
-- token da URL), nunca reabrir a leitura para `anon`.

drop policy if exists "leitura publica diagnosticos" on diagnosticos;

-- A coluna `publico` continua existindo: ela distingue o diagnóstico entregue
-- do rascunho, e o front a usa. O que ela deixa de significar é "qualquer um
-- na internet pode ler".
comment on column diagnosticos.publico is
  'Diagnóstico concluído e visível para o workspace. NÃO significa leitura anônima — '
  'a política que permitia isso foi removida na migration 049 (18/08/2026).';
