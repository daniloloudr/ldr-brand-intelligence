#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# backup-db.sh — dump completo do Postgres (Supabase) → Cloudflare R2
# Usado pelo cron diário (GitHub Actions) E pelo migrate.sh (pré-migration).
# NÃO escreve no banco: só LÊ (pg_dump). Restauração: ver .spec/backup.md
#
# Requer no ambiente:
#   SUPABASE_DB_URL      connection string (Session pooler, porta 5432)
#   R2_ACCOUNT_ID        conta Cloudflare R2
#   R2_ACCESS_KEY_ID     access key do R2
#   R2_SECRET_ACCESS_KEY secret do R2
#   R2_BACKUP_BUCKET     bucket de backups (ex.: dumps1ngulr)
# Opcional:
#   BACKUP_TAG           rótulo do dump (default: "manual"; cron usa "daily",
#                        migrate.sh usa "pre-migration")
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL}"
: "${R2_ACCOUNT_ID:?defina R2_ACCOUNT_ID}"
: "${R2_ACCESS_KEY_ID:?defina R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?defina R2_SECRET_ACCESS_KEY}"
: "${R2_BACKUP_BUCKET:?defina R2_BACKUP_BUCKET}"
TAG="${BACKUP_TAG:-manual}"

TS="$(date -u +%Y%m%d_%H%M%S)"
FILE="db_${TS}_${TAG}.dump"
TMP="$(mktemp -d)"
OUT="${TMP}/${FILE}"
trap 'rm -rf "$TMP"' EXIT

echo "[backup] pg_dump (custom format, comprimido)…"
# -Fc = custom (restaurável seletivo com pg_restore) · --no-owner/--no-privileges
# evitam ruído de roles do Supabase na restauração.
pg_dump "$SUPABASE_DB_URL" -Fc --no-owner --no-privileges -f "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
echo "[backup] gerado: ${FILE} (${SIZE})"

echo "[backup] enviando ao R2…"
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 cp "$OUT" "s3://${R2_BACKUP_BUCKET}/db/${FILE}" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --only-show-errors

echo "[backup] ✅ s3://${R2_BACKUP_BUCKET}/db/${FILE}"
