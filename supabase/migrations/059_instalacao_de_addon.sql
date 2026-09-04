-- ════════════════════════════════════════════════════════════════════
-- 059 — a instalação de addon (estudio.md §13.10)
--
-- Um addon é uma TELA construída sobre um fluxo, no vocabulário do cliente
-- (§13.2). A decisão do Danilo em 03/set: **nenhum addon vem ligado** — o
-- cliente SOLICITA e o br4ndcode LIBERA. É portão comercial, e tem um efeito
-- colateral bom: a fila de pedidos mede a demanda ANTES de o addon existir.
--
-- Isso torna esta migration PRÉ-REQUISITO do primeiro addon, não passo
-- posterior: sem ela, o addon teria de ser cravado no menu, que é exatamente
-- o que a decisão proíbe.
--
-- ── o que esta migration NÃO faz, de propósito ──
--
-- Não existe tabela de CATÁLOGO. O que existe para pedir mora numa lista no
-- código (`src/lib/addons.js`), porque cada addon É uma tela — o banco não
-- deve anunciar o que não tem implementação. Addon fora do registro não pode
-- ser solicitado, e assim nunca há linha apontando para o vazio.
--
-- Sem versionamento, sem cobrança, sem publicação por terceiros. Existe UM
-- addon. Cada uma dessas é um produto próprio (§13.10).
--
-- ── os dois níveis, porque são duas perguntas ──
--
--   workspace  →  "o contrato cobre?"   é onde já moram plano e creditos_saldo
--   marca      →  "aparece em qual?"    §13.5 regra 4: addon é por marca
--
-- Uma linha por (workspace, addon, marca), com brand_id NULO significando
-- "todas as marcas do workspace". O índice único usa `nulls not distinct`
-- (PG15+) — mesmo recurso que a 058 usou para o escopo do aprendizado, senão
-- duas linhas com brand_id nulo conviveriam sem conflito.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · quem é admin de plataforma, sem sessão de suporte ───────────
--
-- `operador_pode(ws)` (053) responde outra pergunta: se existe uma SESSÃO DE
-- SUPORTE aberta e não expirada para AQUELE workspace. Liberar addon não é
-- ato de suporte — é ato comercial, e não depende de sessão. Precisa do
-- admin puro.
create or replace function public.e_admin_plataforma()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

revoke all on function public.e_admin_plataforma() from public;
grant execute on function public.e_admin_plataforma() to authenticated;

comment on function public.e_admin_plataforma is
  'Admin de plataforma, sem exigir sessão de suporte aberta. Para atos comerciais (liberar addon), não para acesso a dado do cliente — esse é o operador_pode(ws) da 053.';

-- ── 2 · a instalação ────────────────────────────────────────────────
create table if not exists addon_instalacao (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  addon         text not null,
  brand_id      uuid references brands(id) on delete cascade,
  estado        text not null default 'pedido',
  pedido_por    uuid,
  pedido_em     timestamptz not null default now(),
  decidido_por  uuid,
  decidido_em   timestamptz,
  motivo        text
);

alter table addon_instalacao drop constraint if exists addon_instalacao_estado_valido;
alter table addon_instalacao add constraint addon_instalacao_estado_valido
  check (estado in ('pedido', 'ativo', 'recusado', 'suspenso'));

-- `nulls not distinct`: sem isso, N linhas com brand_id nulo para o mesmo
-- (workspace, addon) conviveriam, e "instalado para todas as marcas" viraria
-- N instalações silenciosas.
create unique index if not exists uq_addon_instalacao
  on addon_instalacao (workspace_id, addon, brand_id) nulls not distinct;

-- O menu pergunta "o que está ATIVO aqui" a cada carregamento de página.
create index if not exists idx_addon_instalacao_ativo
  on addon_instalacao (workspace_id, estado);

-- A fila do admin pergunta "o que está PEDIDO em qualquer lugar".
create index if not exists idx_addon_instalacao_fila
  on addon_instalacao (estado, pedido_em) where estado = 'pedido';

comment on table addon_instalacao is
  '§13.10 — addon solicitado pelo cliente e liberado pelo br4ndcode. brand_id nulo = todas as marcas do workspace. O catálogo do que se pode pedir vive no CÓDIGO (src/lib/addons.js), não aqui.';
comment on column addon_instalacao.estado is
  'pedido → ativo ⇄ suspenso, ou recusado (com motivo). Suspender NÃO apaga — mesma regra da §8.3 dos agentes.';

-- ── 3 · RLS — a guarda que sustenta o portão comercial ──────────────
--
-- Aqui as policies NÃO podem ser `for all`, que é o idioma das outras tabelas.
-- O cliente precisa poder LER e PEDIR, e precisa NÃO PODER liberar. Se fosse
-- `for all`, qualquer membro do workspace se auto-liberaria com um update, e o
-- portão comercial seria decorativo.
alter table addon_instalacao enable row level security;

-- LER: quem é do workspace, o suporte com sessão aberta, e o admin.
drop policy if exists "le instalacao do proprio workspace" on addon_instalacao;
create policy "le instalacao do proprio workspace" on addon_instalacao
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
    or public.e_admin_plataforma()
  );

-- PEDIR: só para o próprio workspace, e só no estado `pedido`. O `with check`
-- do estado é o que impede alguém de nascer `ativo`.
drop policy if exists "pede addon para o proprio workspace" on addon_instalacao;
create policy "pede addon para o proprio workspace" on addon_instalacao
  for insert with check (
    estado = 'pedido'
    and workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- LIBERAR, RECUSAR, SUSPENDER: só admin de plataforma. É a regra 1 da §13.10.
drop policy if exists "so admin decide instalacao" on addon_instalacao;
create policy "so admin decide instalacao" on addon_instalacao
  for update using (public.e_admin_plataforma())
       with check (public.e_admin_plataforma());

-- CANCELAR: o cliente apaga o próprio pedido, ou um pedido recusado — que é o
-- que permite pedir de novo depois, já que o índice único bloqueia a segunda
-- linha e o cliente não pode dar update. Instalação ATIVA ou SUSPENSA ele não
-- apaga: sair é decisão de contrato, e é ato do admin.
drop policy if exists "cancela o proprio pedido" on addon_instalacao;
create policy "cancela o proprio pedido" on addon_instalacao
  for delete using (
    (estado in ('pedido', 'recusado')
      and workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
    or public.e_admin_plataforma()
  );

grant select, insert, update, delete on addon_instalacao to authenticated;
