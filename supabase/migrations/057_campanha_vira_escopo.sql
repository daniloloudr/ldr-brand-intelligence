-- ════════════════════════════════════════════════════════════════════
-- 057 — A CAMPANHA VIRA ESCOPO (E4 / D1)
--
-- Hoje `studio_campaigns` é duas coisas no mesmo registro, e o `status` carrega
-- as duas de uma vez:
--
--   JOB DE PRODUÇÃO   rascunho → gerando → concluida → aprovada
--   ESCOPO (§3.5)     rascunho → ativa → encerrada
--
-- A spec (D1) diz que não se estende: substitui. Decisão do Danilo (01/set):
-- **o `status` passa a ser o do ESCOPO**.
--
-- ── POR QUE A MÁQUINA DE PRODUÇÃO NÃO É APAGADA ─────────────────────
-- Ela está VIVA. Sete pontos do código a usam: `studio-campaign.js` grava
-- `gerando`, o `_studio.js` grava `concluida` ao terminar e `rascunho` quando o
-- fan-out falha, duas telas gravam `aprovada`, e o `StudioApprovals` FILTRA por
-- `concluida`. Trocar o vocabulário sem dar outro lugar a ela faria o CHECK
-- rejeitar essas escritas — e a geração de campanha pararia em produção.
--
-- Então ela se muda para `producao`, com os mesmos valores e o mesmo
-- comportamento. Não é enfeite de compatibilidade: são coisas diferentes que
-- estavam no mesmo campo, e separá-las é o que a D1 pede. O `status` fica com
-- o que o §3.5 chama de ciclo de vida do escopo.
--
-- ── O QUE CADA REGISTRO EXISTENTE VIRA ──────────────────────────────
-- A D1 exige decidir campanha a campanha. São QUATRO, e todas estão
-- `concluida` — nenhuma em `gerando`, nenhuma com fan-out em curso, a mais nova
-- de 13/jul. Então todas viram escopo `encerrada`, e a produção delas fica
-- registrada em `producao` como estava.
--
-- Isso também é o que torna esta migration de risco baixo apesar da Faixa D: o
-- aviso da spec é que o motor de fan-out lê os estados para despachar
-- adaptações — e não há nada vivo para despachar.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · A máquina de produção ganha coluna própria ──────────────────
alter table studio_campaigns add column if not exists producao text;

update studio_campaigns
   set producao = status
 where producao is null and status is not null;

alter table studio_campaigns drop constraint if exists studio_campaigns_producao_valida;
alter table studio_campaigns add constraint studio_campaigns_producao_valida
  check (producao is null or producao in ('rascunho', 'gerando', 'concluida', 'aprovada'));

comment on column studio_campaigns.producao is
  'Estado do JOB de produção: rascunho|gerando|concluida|aprovada. Era o antigo `status`. Quem escreve: studio-campaign.js e _studio.js (fan-out).';

-- ── 2 · O `status` passa a ser o ciclo de vida do ESCOPO (§3.5) ─────
-- As quatro existentes estão todas `concluida` → escopo `encerrada`.
-- O de-para é explícito em vez de um `case` genérico: são quatro registros, e a
-- D1 manda decidir campanha a campanha.
update studio_campaigns
   set status = case
     when status in ('concluida', 'aprovada') then 'encerrada'
     when status = 'gerando'                  then 'ativa'
     else 'rascunho'
   end
 where status not in ('rascunho', 'ativa', 'encerrada');

alter table studio_campaigns alter column status set default 'rascunho';

alter table studio_campaigns drop constraint if exists studio_campaigns_status_valido;
alter table studio_campaigns add constraint studio_campaigns_status_valido
  check (status is null or status in ('rascunho', 'ativa', 'encerrada'));

comment on column studio_campaigns.status is
  '§3.5 — ciclo de vida do ESCOPO: rascunho|ativa|encerrada. NÃO é estado de produção; esse mora em `producao`.';

-- ── 3 · Vigência e escopo andam juntos ──────────────────────────────
-- Escopo `ativa` sem vigência definida é escopo que ninguém sabe quando acaba.
-- Não vira CHECK duro: campanha em rascunho legitimamente não tem datas, e
-- travar isso obrigaria a preencher antes de pensar. Fica como índice para a
-- tela poder cobrar.
create index if not exists idx_campanha_ativa_sem_vigencia
  on studio_campaigns (brand_id)
  where status = 'ativa' and vigencia_fim is null;

create index if not exists idx_campanha_status on studio_campaigns (brand_id, status);
