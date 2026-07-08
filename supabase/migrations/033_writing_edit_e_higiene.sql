-- 033_writing_edit_e_higiene.sql — E1.3 (copy reescrita = ensino) + higiene.
-- 1) dataset captura writing_edit: a versão da IA vs. a preferida pelo humano
--    é exemplo-ouro de voz (mesmo espírito do assistant_correction).
-- 2) higiene: remove sinais órfãos (brand_id null — workspaces sem marca,
--    nunca consumíveis) e adiciona guard nos triggers que derivam a marca.

-- ── 1. Dataset: writing_edit ─────────────────────────────────────────
create or replace function dataset_capture_signal() returns trigger
language plpgsql security definer as $$
declare g record;
begin
  if new.tipo = 'assistant_correction' then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, 'assistant',
      jsonb_build_object('pergunta', new.payload->>'pergunta'),
      jsonb_build_object('resposta', new.payload->>'resposta'),
      jsonb_build_object('tipo', 'correction', 'correcao', new.payload->>'correcao', 'em', new.created_at),
      'brand_signals', new.id)
    on conflict (fonte_tabela, fonte_id) do nothing;
  elsif new.tipo = 'content_used' then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, 'content_hub',
      new.payload - 'briefing',
      jsonb_build_object('briefing', new.payload->>'briefing'),
      jsonb_build_object('tipo', 'adoption', 'valor', true, 'em', new.created_at),
      'brand_signals', new.id)
    on conflict (fonte_tabela, fonte_id) do nothing;
  elsif new.tipo = 'writing_edit' then
    insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
    values (new.brand_id, new.workspace_id, 'writing_room',
      jsonb_build_object('secao', new.payload->>'secao', 'formato', new.payload->>'formato', 'cluster', new.payload->>'cluster'),
      jsonb_build_object('original', new.payload->>'original'),
      jsonb_build_object('tipo', 'edit', 'edicao', new.payload->>'edicao', 'em', new.created_at),
      'brand_signals', new.id)
    on conflict (fonte_tabela, fonte_id) do nothing;
  elsif new.tipo = 'image_regen' and new.ref_id is not null then
    select id, brand_context, prompt_final, formato, provider, media_type, image_url
      into g from studio_generations where id = new.ref_id;
    if found then
      insert into brand_dataset(brand_id, workspace_id, superficie, contexto, output, avaliacao, fonte_tabela, fonte_id)
      values (new.brand_id, new.workspace_id,
        case when g.media_type = 'video' then 'studio_video' else 'studio_image' end,
        jsonb_build_object('brand_context', g.brand_context,
          'prompt_final', g.prompt_final, 'formato', g.formato),
        jsonb_build_object('provider', g.provider, 'media_type', g.media_type, 'url', g.image_url),
        jsonb_build_object('tipo', 'regen', 'valor', 'reprovacao_implicita',
          'ajuste', new.payload->>'ajuste', 'em', new.created_at),
        'studio_generations', g.id)
      on conflict (fonte_tabela, fonte_id) do nothing;
    end if;
  end if;
  return new;
end; $$;

-- ── 2. Higiene: sinais órfãos + guards ───────────────────────────────
delete from brand_signals where brand_id is null;

-- Preserva a lógica da 027 (transição p/ done + territórios) e adiciona o guard.
create or replace function emit_signal_diagnostic() returns trigger
language plpgsql security definer as $$
declare
  v_brand uuid;
  v_terr  jsonb;
begin
  if new.status is distinct from 'done' then return new; end if;
  if TG_OP = 'UPDATE' and old.status is not distinct from 'done' then return new; end if;

  select id into v_brand from brands where workspace_id = new.workspace_id limit 1;
  if v_brand is null then return new; end if;   -- workspace sem marca → sem sinal órfão

  select coalesce(jsonb_agg(jsonb_build_object(
           'nome',      t->>'nome',
           'tese',      left(coalesce(t->>'tese', ''), 400),
           'confianca', t->>'confianca')), '[]'::jsonb)
    into v_terr
    from jsonb_array_elements(coalesce(new.data->'territorios_possiveis', '[]'::jsonb)) t;

  insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso)
  values (v_brand, new.workspace_id, 'diagnostic', 'posicionamento', new.id,
    jsonb_build_object('tipo', new.tipo,
      'score_singularidade',  new.score_singularidade,
      'score_consistencia',   new.score_consistencia,
      'score_posicionamento', new.score_posicionamento,
      'frase', left(coalesce(new.frase_diagnostico, ''), 500),
      'territorio_legado', left(coalesce(new.data->>'territorio_inexplorado', ''), 400),
      'territorios', v_terr),
    1);
  return new;
end; $$;

create or replace function emit_signal_listening() returns trigger
language plpgsql security definer as $$
declare v_brand uuid;
begin
  select id into v_brand from brands where workspace_id = new.workspace_id limit 1;
  if v_brand is not null then
    insert into brand_signals(brand_id, workspace_id, tipo, fonte, ref_id, payload, peso)
    values (v_brand, new.workspace_id, 'listening_sentiment', 'listening', new.id,
      jsonb_build_object('avg_positivo', new.avg_positivo, 'avg_neutro', new.avg_neutro,
        'avg_negativo', new.avg_negativo, 'total_mencoes', new.total_mencoes, 'periodo', new.periodo),
      1);
  end if;
  return new;
end; $$;
