-- ════════════════════════════════════════════════════════════════════
-- 060 — a receita do addon mora na INSTALAÇÃO (§13.10)
--
-- Decisão do Danilo (04/set): *"não é pro usuário escolher a receita. Nós
-- definimos. Esse processo é apenas para geração de imagem de catálogo em
-- massa."*
--
-- A 059 deu ao addon um portão comercial: o cliente pede, o br4ndcode libera.
-- Faltava dizer O QUE ele recebe ao ser liberado. Um seletor de fluxo na tela
-- seria justamente o "acesso" que a decisão manda reduzir — e pior, deixaria o
-- cliente rodar o lote sobre uma receita que ninguém aprovou.
--
-- Então a receita vira parte do ato de liberar: quem libera escolhe o fluxo, e
-- a tela do addon só OBEDECE. É a mesma lógica da §13.3 — o addon é uma tela
-- mais um CONTRATO COM UM FLUXO; até agora o contrato estava implícito.
--
-- ⚠️ Nenhuma policy nova. A 059 já garante que só `e_admin_plataforma()` dá
-- update em `addon_instalacao` — então esta coluna nasce, de graça, com a
-- propriedade que a decisão pede: **o cliente lê a receita e não pode trocá-la.**
-- ════════════════════════════════════════════════════════════════════

alter table addon_instalacao
  add column if not exists workflow_id uuid references studio_workflows(id) on delete set null;

comment on column addon_instalacao.workflow_id is
  '§13.10 — a RECEITA que este addon roda nesta marca. Escolhida por quem LIBERA, nunca pelo cliente: a policy de update da 059 é só de platform_admin. Nula = liberado mas sem receita definida; a tela recusa rodar e manda falar com a gente.';

-- O addon abre e pergunta "qual é a minha receita aqui" a cada carregamento.
create index if not exists idx_addon_instalacao_receita
  on addon_instalacao (workspace_id, addon, estado)
  where workflow_id is not null;
