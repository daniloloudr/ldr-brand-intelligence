-- ── Em que mercado a marca vive ─────────────────────────────────────────
--
-- Véspera do setup da Worten (Portugal). O produto nasceu brasileiro e o Brasil
-- estava escrito no CÓDIGO, não na configuração: o prompt do diagnóstico mandava
-- pesquisar "Reclame Aqui", as tendências pediam "o setor no Brasil", o conteúdo
-- saía em "português brasileiro".
--
-- Para uma marca portuguesa isso não é imprecisão: o Reclame Aqui não existe em
-- Portugal, e texto em português brasileiro se denuncia na primeira linha.
--
-- ISO 3166-1 alfa-2. Padrão BR porque é onde estão todas as marcas de hoje —
-- as existentes não mudam de comportamento com esta migration.

alter table workspaces
  add column if not exists pais text not null default 'BR';

comment on column workspaces.pais is
  'ISO 3166-1 alfa-2. Define mercado analisado, praças de reputação e variante '
  'do idioma nos prompts (ver netlify/functions/_mercado.js).';

create index if not exists workspaces_pais_idx on workspaces (pais);
