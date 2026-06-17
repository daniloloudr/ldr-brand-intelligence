-- ── Brand Assets ────────────────────────────────────────────────────
create table if not exists brand_assets (
  id         uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  brand_id   uuid references brands(id) on delete cascade,
  tipo       text not null,  -- logo | cor | tipografia | icone | padrao | outro
  nome       text not null,
  descricao  text,
  valor      text,           -- hex para cores, nome da fonte, URL para arquivos
  metadata   jsonb default '{}'
);

alter table brand_assets enable row level security;

drop policy if exists "workspace acessa brand_assets" on brand_assets;
create policy "workspace acessa brand_assets" on brand_assets
  for all using (
    brand_id in (
      select br.id from brands br
      where br.workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
    or exists (select 1 from platform_admins where user_id = auth.uid())
  );

-- ── Design Tokens ────────────────────────────────────────────────────
create table if not exists design_tokens (
  id         uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  brand_id   uuid references brands(id) on delete cascade,
  nome       text not null,
  valor      text not null,
  categoria  text not null,  -- color | typography | spacing | border-radius | shadow | outro
  descricao  text,
  metadata   jsonb default '{}'
);

alter table design_tokens enable row level security;

drop policy if exists "workspace acessa design_tokens" on design_tokens;
create policy "workspace acessa design_tokens" on design_tokens
  for all using (
    brand_id in (
      select br.id from brands br
      where br.workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
    or exists (select 1 from platform_admins where user_id = auth.uid())
  );

-- ── Jobs de extração de brand manual ────────────────────────────────
create table if not exists brand_manual_jobs (
  id         uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  brand_id   uuid references brands(id) on delete cascade,
  file_path  text not null,
  status     text default 'processing',  -- processing | done | error
  error      text
);

alter table brand_manual_jobs enable row level security;

drop policy if exists "workspace acessa brand_manual_jobs" on brand_manual_jobs;
create policy "workspace acessa brand_manual_jobs" on brand_manual_jobs
  for all using (
    brand_id in (
      select br.id from brands br
      where br.workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
    or exists (select 1 from platform_admins where user_id = auth.uid())
  );

-- ── Supabase Storage bucket ──────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-manuals', 'brand-manuals', false, 52428800, ARRAY['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "autenticado faz upload de brand manual" on storage.objects;
create policy "autenticado faz upload de brand manual"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-manuals');

drop policy if exists "autenticado lê seus brand manuals" on storage.objects;
create policy "autenticado lê seus brand manuals"
  on storage.objects for select to authenticated
  using (bucket_id = 'brand-manuals');
