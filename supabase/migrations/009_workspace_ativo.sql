-- Adiciona flag de ativo/inativo nos workspaces
alter table workspaces add column if not exists ativo boolean default true;
