-- Marca a procedência dos brand_assets.
--
-- Motivo: a extração do manual fazia `delete where brand_id` antes de gravar
-- os assets extraídos — ou seja, reimportar um manual apagava da biblioteca as
-- peças salvas do Studio e os arquivos que o cliente tinha subido. Agora ela
-- só apaga o que ela mesma criou (metadata->>origem = 'extracao').
--
-- Este backfill marca os assets de extrações ANTERIORES, que não têm o
-- carimbo. Critério: não veio de upload, não veio de geração e não tem arquivo
-- em storage — sobra o que a extração cria (cor, nome de fonte, descrição).

update brand_assets
   set metadata = coalesce(metadata, '{}'::jsonb) || '{"origem":"extracao"}'::jsonb
 where metadata->>'origem'        is null
   and metadata->>'source'        is null
   and metadata->>'generation_id' is null
   and file_path                  is null
   and (valor is null or valor !~* '^https?://');

create index if not exists idx_brand_assets_origem
  on brand_assets ((metadata->>'origem'));
