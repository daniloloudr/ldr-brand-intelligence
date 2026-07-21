-- 046_workspace_onboarding.sql — estado do "Preparar ambiente" (onboarding completo)
-- Decisão 2026-07-20: admin dispara o pipeline (brand → diagnóstico → concorrentes →
-- mineração → sínteses → destilação) e acompanha o progresso antes de liberar o acesso.
-- Guarda só o estado da máquina; a detecção de "terminou" cruza com as tabelas de saída.
alter table workspaces add column if not exists onboarding jsonb;
