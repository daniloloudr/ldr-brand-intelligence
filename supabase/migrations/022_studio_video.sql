-- 022_studio_video.sql — suporte a vídeo no Studio
-- studio_generations passa a guardar imagem OU vídeo. image_url/thumbnail_url
-- são reusados como URL da mídia no R2 (o frontend renderiza <img> ou <video>
-- conforme media_type). Mantém compat: linhas existentes ficam como 'image'.

alter table studio_generations
  add column if not exists media_type text not null default 'image';

comment on column studio_generations.media_type is 'image | video — define o player no frontend e a extensão no R2';
