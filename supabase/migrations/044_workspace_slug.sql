-- 044: multitenant por SUBDOMÍNIO — nomedamarca.s1ngulr.com (Danilo 2026-07-15)
-- slug = identificador do workspace na URL; wildcard DNS faz o resto.
alter table workspaces add column if not exists slug text;

-- backfill: slugify do nome (minúsculas, sem acento, hífens; colisão ganha sufixo)
update workspaces set slug = sub.slug_final from (
  select id,
    base || case when row_number() over (partition by base order by created_at) > 1
                 then '-' || (row_number() over (partition by base order by created_at))::text
                 else '' end as slug_final
  from (
    select id, created_at,
      trim(both '-' from regexp_replace(
        lower(translate(nome,
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
        '[^a-z0-9]+', '-', 'g')) as base
    from workspaces
  ) s
) sub
where workspaces.id = sub.id and workspaces.slug is null;

create unique index if not exists idx_workspaces_slug on workspaces (slug);
