-- Retrato para a 057: o stub de `studio_campaigns` do retrato mínimo tem só
-- (id, workspace_id, conteudo). A 057 mexe em `status`, que num banco real
-- existe desde a migration 018.
alter table studio_campaigns add column if not exists nome     text;
alter table studio_campaigns add column if not exists status   text default 'rascunho';
alter table studio_campaigns add column if not exists brand_id uuid;

-- Semeia o estado ANTERIOR à 057: campanhas com vocabulário de PRODUÇÃO no
-- status, que é o que a migration precisa traduzir.
insert into studio_campaigns (id, workspace_id, nome, status) values
  ('babe0000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','concluída de verdade','concluida'),
  ('babe0000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','aprovada pelo time','aprovada'),
  ('babe0000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','gerando agora','gerando'),
  ('babe0000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','só rascunho','rascunho');
