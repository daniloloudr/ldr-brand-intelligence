-- ════════════════════════════════════════════════════════════════════
-- 058 — ESCOPO E VIGÊNCIA NO APRENDIZADO (E5 / D2)
--
-- ⚠️ COMPANHEIRA OBRIGATÓRIA DA 057. Não aplique a 057 sozinha.
--
-- ── O QUE A 057 QUEBROU, EM SILÊNCIO ────────────────────────────────
-- A 057 tirou `concluida`/`aprovada` do `status` da campanha e os mudou para
-- `producao`. Dois gatilhos de APRENDIZADO escutam exatamente aquilo:
--
--   trg_signal_campaign_verdict (025)  after update of status ... in ('concluida','aprovada')
--   trg_dataset_campaign        (029)  after update of status ... in ('concluida','aprovada')
--
-- Depois da 057 esses valores nunca mais aparecem no `status` — o CHECK os
-- proíbe. Os dois gatilhos param de disparar e ninguém percebe: não há erro,
-- não há linha a menos que alguém conte, só o veredicto de campanha (o sinal de
-- MAIOR peso do sistema, 3) some do cérebro. É o defeito que a casa mais teme:
-- o que erra calado. Aqui eles voltam a escutar onde a produção passou a morar.
--
-- ── O QUE A D2 PEDE ─────────────────────────────────────────────────
-- §3.5: campanha encerrada não alimenta parecer de peça nova, mas continua
-- consultável. E, textualmente: "o que a campanha aprendeu permanece NELA
-- (…) não sobe para a marca".
--
-- Isso decide a arquitetura, e não é detalhe: o aprendizado de campanha NÃO
-- pode ser fundido no modelo da marca. Se fosse, encerrar não desfaria nada —
-- o que a campanha ensinou já estaria dentro do modelo, permanente, e reabrir
-- não teria o que reativar. É o mesmo estrago que a nota do `nucleo-ia.md`
-- registra sobre os 24 sinais contaminados: "cada versão nova é construída em
-- cima da anterior", e dali não se tira mais.
--
-- Então o escopo vira DIMENSÃO do modelo vivo: `brand_intelligence` ganha
-- `campanha_id` (null = a marca). Cada campanha tem sua própria linha de
-- versões, ao lado da marca, nunca dentro dela. O filtro é de LEITURA
-- (_brain.js compõe marca + campanha ATIVA), e por ser de leitura é reversível
-- — que é o que "reabrir reativa" exige.
--
-- ── VIGÊNCIA: DATA É PROVENIÊNCIA, ESTADO É PORTÃO ──────────────────
-- A vigência fica gravada na versão destilada (é o que torna o aprendizado
-- "datado por natureza" do §3.5 legível por quem consulta depois). Ela NÃO é
-- um segundo portão: quem liga e desliga é `status` ativa/encerrada, um ato
-- humano. Vigência vencida derrubando o aprendizado à meia-noite, sem ninguém
-- encerrar nada, seria de novo comportamento que muda calado.
--
-- ── RISCO ───────────────────────────────────────────────────────────
-- Aditiva. Hoje há 4 campanhas (todas encerradas pela 057), 4 sinais
-- `campaign_verdict`, 4 exemplos de dataset com superfície `campaign`, e
-- ZERO gerações votadas com `campaign_id`. O escopo nasce praticamente vazio —
-- e é exatamente por isso que a hora de criá-lo é agora: quando houver sinal de
-- campanha fundido no modelo da marca, não haverá como separar.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · Escopo no sinal ─────────────────────────────────────────────
alter table brand_signals
  add column if not exists campanha_id uuid references studio_campaigns(id) on delete set null;

create index if not exists idx_brand_signals_escopo
  on brand_signals (brand_id, campanha_id, consumido_em);

comment on column brand_signals.campanha_id is
  '§3.5 — escopo do aprendizado. null = a marca. Sinal de campanha destila para o modelo DA CAMPANHA, nunca para o da marca.';

-- ── 2 · Escopo no exemplo do dataset ────────────────────────────────
alter table brand_dataset
  add column if not exists campanha_id uuid references studio_campaigns(id) on delete set null;

create index if not exists idx_brand_dataset_escopo
  on brand_dataset (brand_id, campanha_id, created_at desc);

-- ── 3 · Escopo e vigência no modelo vivo ────────────────────────────
alter table brand_intelligence
  add column if not exists campanha_id      uuid references studio_campaigns(id) on delete cascade,
  add column if not exists vigencia_inicio  date,
  add column if not exists vigencia_fim     date;

-- `versao` era "incremental por marca" e nunca teve unicidade. Com escopo ela
-- passa a ser incremental POR ESCOPO — e sem a trava dá para gravar duas v3 da
-- mesma campanha em corrida. `nulls not distinct` (PG15+) é o que faz a trava
-- valer também para o escopo da marca, onde `campanha_id` é null.
create unique index if not exists uq_brand_intelligence_escopo_versao
  on brand_intelligence (brand_id, campanha_id, versao) nulls not distinct;

create index if not exists idx_brand_intelligence_escopo
  on brand_intelligence (brand_id, campanha_id, versao desc);

comment on column brand_intelligence.campanha_id is
  '§3.5 — escopo desta linha de versões. null = o modelo DA MARCA. Preenchido = o que a campanha aprendeu, que fica nela e não sobe para a marca.';
comment on column brand_intelligence.vigencia_fim is
  'Vigência da campanha no momento da destilação. É proveniência (datar o aprendizado), NÃO portão — quem liga e desliga é studio_campaigns.status.';

-- ── 4 · Os dois gatilhos que a 057 calou ────────────────────────────
-- Voltam a escutar `producao`, que é onde o vocabulário deles passou a morar.
-- O `when` mudou de coluna; o significado não: continua sendo "a campanha
-- terminou de produzir e o time julgou". Ganham o escopo de brinde.
create or replace function emit_signal_campaign_verdict() returns trigger
language plpgsql security definer as $$
begin
  if new.producao is distinct from old.producao and new.producao in ('concluida', 'aprovada') then
    insert into brand_signals(brand_id, workspace_id, campanha_id, tipo, fonte, ref_id, payload, peso)
    values (new.brand_id, new.workspace_id, new.id, 'campaign_verdict', 'studio', new.id,
      jsonb_build_object('status', new.producao, 'mode', new.mode,
        'formatos', new.formatos, 'conceito', left(coalesce(new.conceito, ''), 2000)),
      case when new.producao = 'aprovada' then 3 else 1 end);
  end if;
  return new;
end; $$;
drop trigger if exists trg_signal_campaign_verdict on studio_campaigns;
create trigger trg_signal_campaign_verdict after update of producao on studio_campaigns
  for each row execute function emit_signal_campaign_verdict();

create or replace function dataset_capture_campaign() returns trigger
language plpgsql security definer as $$
begin
  if new.producao is distinct from old.producao and new.producao in ('concluida', 'aprovada') then
    insert into brand_dataset(brand_id, workspace_id, campanha_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, new.id, 'campaign',
      jsonb_build_object('conceito', new.conceito, 'formatos', new.formatos, 'mode', new.mode),
      coalesce((select jsonb_agg(jsonb_build_object('provider', g.provider,
          'formato', g.formato, 'url', g.image_url, 'voto', g.feedback))
        from studio_generations g where g.campaign_id = new.id and g.status = 'done'), '[]'::jsonb),
      jsonb_build_object('tipo', 'verdict', 'valor', new.producao, 'em', now()),
      'studio_campaigns', new.id)
    on conflict (fonte_tabela, fonte_id) do update
      set avaliacao = excluded.avaliacao, output = excluded.output;
  end if;
  return new;
end; $$;
drop trigger if exists trg_dataset_campaign on studio_campaigns;
create trigger trg_dataset_campaign after update of producao on studio_campaigns
  for each row execute function dataset_capture_campaign();

-- ── 5 · O voto na peça carrega o escopo em que ela nasceu ───────────
-- `studio_generations.campaign_id` já existe desde a 018 e nunca foi lido pelo
-- aprendizado. É a única fonte de escopo que existe em volume — hoje zerada,
-- mas é por onde o escopo vai chegar quando campanha voltar a produzir.
create or replace function emit_signal_image_vote() returns trigger
language plpgsql security definer as $$
begin
  if new.feedback is not null and new.feedback is distinct from old.feedback then
    insert into brand_signals(brand_id, workspace_id, campanha_id, tipo, fonte, ref_id, payload, peso)
    values (new.brand_id, new.workspace_id, new.campaign_id, 'image_vote', 'studio', new.id,
      jsonb_build_object('voto', new.feedback, 'provider', new.provider,
        'formato', new.formato, 'media_type', new.media_type,
        'prompt', left(coalesce(new.prompt_final, ''), 2000)),
      2);
  end if;
  return new;
end; $$;

create or replace function dataset_capture_vote() returns trigger
language plpgsql security definer as $$
begin
  if new.feedback is not null and new.feedback is distinct from old.feedback then
    insert into brand_dataset(brand_id, workspace_id, campanha_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, new.campaign_id,
      case when new.media_type = 'video' then 'studio_video' else 'studio_image' end,
      jsonb_build_object('brand_context', new.brand_context,
        'prompt_final', new.prompt_final, 'formato', new.formato),
      jsonb_build_object('provider', new.provider, 'media_type', new.media_type,
        'url', new.image_url),
      jsonb_build_object('tipo', 'vote', 'valor', new.feedback,
        'em', coalesce(new.feedback_at, now())),
      'studio_generations', new.id)
    on conflict (fonte_tabela, fonte_id) do update
      set avaliacao = excluded.avaliacao, output = excluded.output;
  end if;
  return new;
end; $$;

-- ── 6 · Backfill do escopo no que já existe ─────────────────────────
-- Só ROTULA: nenhum sinal muda de estado, nenhum já-consumido volta a valer.
-- O sinal de campanha já consumido continua consumido — ele já está dentro do
-- modelo da marca, e o backfill não tem como tirá-lo de lá (é a mesma
-- irreversibilidade que este arquivo existe para impedir daqui em diante).
update brand_signals set campanha_id = ref_id
 where campanha_id is null and tipo = 'campaign_verdict' and ref_id is not null
   and exists (select 1 from studio_campaigns c where c.id = brand_signals.ref_id);

update brand_signals s set campanha_id = g.campaign_id
  from studio_generations g
 where s.campanha_id is null and s.tipo = 'image_vote'
   and s.ref_id = g.id and g.campaign_id is not null;

update brand_dataset d set campanha_id = d.fonte_id
 where d.campanha_id is null and d.fonte_tabela = 'studio_campaigns'
   and exists (select 1 from studio_campaigns c where c.id = d.fonte_id);

update brand_dataset d set campanha_id = g.campaign_id
  from studio_generations g
 where d.campanha_id is null and d.fonte_tabela = 'studio_generations'
   and d.fonte_id = g.id and g.campaign_id is not null;

-- As versões que já existem são todas da MARCA: `campanha_id` null já é o
-- valor certo, e é por isso que não há update para `brand_intelligence`.
