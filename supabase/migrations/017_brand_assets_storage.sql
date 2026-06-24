-- Bucket para upload de assets de marca (logos SVG, fotos de referência,
-- ilustrações, ícones, padrões, mockups, etc.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  true,
  20971520, -- 20MB
  ARRAY[
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "autenticado faz upload de brand assets" on storage.objects;
create policy "autenticado faz upload de brand assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets');

drop policy if exists "publico le brand assets" on storage.objects;
create policy "publico le brand assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

drop policy if exists "autenticado remove brand assets" on storage.objects;
create policy "autenticado remove brand assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets');

-- Adiciona colunas para metadata de storage no brand_assets
alter table brand_assets
  add column if not exists file_path text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint;
