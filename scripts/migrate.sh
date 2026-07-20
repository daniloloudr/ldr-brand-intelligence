#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# migrate.sh — aplica migrations COM backup antes (cinto de segurança).
# Nunca rode `supabase db push` direto: use este script. Faz o dump
# pré-migration → R2, e SÓ ENTÃO aplica. Se o backup falhar, não migra.
#
# Uso:  ./scripts/migrate.sh
# Requer as mesmas envs do backup-db.sh (SUPABASE_DB_URL + R2_*).
# ════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

echo "═══ 1/2 · backup pré-migration ═══"
BACKUP_TAG="pre-migration" ./scripts/backup-db.sh

echo ""
echo "═══ 2/2 · aplicar migrations ═══"
echo "As migrations pendentes serão aplicadas em PRODUÇÃO (Supabase único)."
read -r -p "Confirmar 'supabase db push'? [y/N] " ok
case "$ok" in
  y|Y|s|S) supabase db push --db-url "$SUPABASE_DB_URL" ;;
  *) echo "cancelado — nada foi aplicado (o backup já está salvo no R2)." ; exit 0 ;;
esac
echo "✅ migrations aplicadas. Backup pré-migration está no R2 se precisar reverter."
