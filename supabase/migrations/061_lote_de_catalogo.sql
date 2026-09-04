-- ════════════════════════════════════════════════════════════════════
-- 061 — o lote sobrevive ao F5 (addon Lote de Catálogo, §7.5)
--
-- Hoje a rodada existe só no estado do React: atualizar a página apaga o SKU,
-- o contexto escrito, as referências subidas e as vistas escolhidas. As IMAGENS
-- ficam (em `studio_generations`, agrupadas por `pasta`), mas o PEDIDO que as
-- produziu some — e sem ele não há como regerar uma peça que o time do cliente
-- reprovou dias depois.
--
-- É o mesmo raciocínio da §7.4: a rodada é uma entidade, não um estado de tela.
-- Aqui ela é fina de propósito — uma linha por PEÇA do lote, com o que é preciso
-- para remontar o pedido: o fluxo, o contexto, as referências resolvidas, as
-- vistas pedidas e as posições extras.
--
-- ⚠️ NÃO guarda o prompt final. Ele é derivado (grafo + contexto + pose), e
-- guardar derivado congela a receita: um conserto no fluxo não alcançaria os
-- lotes já gravados, e regerar produziria a peça velha com o defeito velho.
-- ════════════════════════════════════════════════════════════════════

create table if not exists lote_peca (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  brand_id      uuid not null references brands(id) on delete cascade,
  workflow_id   uuid references studio_workflows(id) on delete set null,
  pasta         text not null,          -- "Lote <SKU> · <data>" — casa com studio_generations.pasta
  sku           text not null,
  linha         jsonb not null default '{}'::jsonb,   -- contexto, referências, vistas pedidas
  extras        jsonb not null default '[]'::jsonb,   -- posições escritas na hora
  criado_por    uuid
);

comment on table lote_peca is
  '§7.5 — uma peça de um lote de catálogo, como PEDIDO. As imagens ficam em studio_generations (agrupadas pela mesma `pasta`); aqui fica o que é preciso para remontar o pedido e regerar depois.';
comment on column lote_peca.linha is
  'A linha do preflight: sku, contexto, peca_principal, peca_vista_2, acessorios, elenco, saidas. Já com as referências RESOLVIDAS em URL — nome da Biblioteca pode ser renomeado, URL não.';

-- A tela abre "os lotes desta marca, mais recentes primeiro".
create index if not exists idx_lote_peca_marca on lote_peca (brand_id, created_at desc);
-- E "as peças desta pasta", que é como o agrupamento acontece.
create index if not exists idx_lote_peca_pasta on lote_peca (brand_id, pasta);

-- Duas rodadas do mesmo SKU no mesmo dia são a MESMA pasta e devem ser a mesma
-- linha, atualizada — senão a lista de lotes enche de duplicata do mesmo pedido.
create unique index if not exists uq_lote_peca on lote_peca (brand_id, pasta, sku);

-- ── RLS — o idioma da casa: quem é do workspace, e o suporte com sessão ──
alter table lote_peca enable row level security;

drop policy if exists "workspace acessa lote_peca" on lote_peca;
create policy "workspace acessa lote_peca" on lote_peca
  for all using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  ) with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or public.operador_pode(workspace_id)
  );

grant select, insert, update, delete on lote_peca to authenticated;
