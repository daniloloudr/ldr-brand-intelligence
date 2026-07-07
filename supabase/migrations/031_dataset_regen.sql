-- 031_dataset_regen.sql — regenerar = reprovação implícita, também no DATASET.
-- O sinal image_regen (emitido pelo studio-generate/-video quando o usuário
-- regenera/reajusta) vira exemplo julgado da peça ORIGINAL em brand_dataset.
-- ON CONFLICT DO NOTHING: se a peça já tem voto explícito, ele prevalece;
-- se o voto vier depois, o trigger de voto (029) faz UPDATE e sobrepõe o regen.
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
