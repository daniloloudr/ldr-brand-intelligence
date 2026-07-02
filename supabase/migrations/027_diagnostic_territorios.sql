-- ════════════════════════════════════════════════════════════════════
-- 027_diagnostic_territorios.sql
-- Diagnóstico v2 (reframe território): o sinal `diagnostic` passa a capturar
-- os TERRITÓRIOS possíveis (novo schema) além dos scores — para a camada viva
-- aprender os territórios e sua confiança.
-- Também passa a emitir quando o diagnóstico CONCLUI (status='done'), não só no
-- insert: o fluxo de geração cria a linha pendente e depois faz UPDATE com os
-- dados. Guard de idempotência: emite uma única vez, na transição para 'done'.
-- ════════════════════════════════════════════════════════════════════

create or replace function emit_signal_diagnostic() returns trigger
language plpgsql security definer as $$
declare
  v_brand uuid;
  v_terr  jsonb;
begin
  -- só quando concluído, e apenas na transição para 'done' (evita duplicar)
  if new.status is distinct from 'done' then return new; end if;
  if TG_OP = 'UPDATE' and old.status is not distinct from 'done' then return new; end if;

  select id into v_brand from brands where workspace_id = new.workspace_id limit 1;

  -- territórios possíveis (novo schema), compactados: nome + tese + confiança
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

drop trigger if exists trg_signal_diagnostic on diagnosticos;
create trigger trg_signal_diagnostic after insert or update on diagnosticos
  for each row execute function emit_signal_diagnostic();
