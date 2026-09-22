#!/usr/bin/env bash
# RC2.1 — Idempotent media path reconcile (staging Admin container).
# Compares filenames under /app/media vs /app/apps/admin/media.
# Never overwrites on content conflict. Default: dry-run.
#
# Usage:
#   bash scripts/deploy/_rc21_media_reconcile.sh --dry-run
#   bash scripts/deploy/_rc21_media_reconcile.sh --apply
#
set -euo pipefail

MODE="${1:---dry-run}"
ADMIN_CTR="${ADMIN_CTR:-omnia-platform-admin-dev}"
CANON="/app/media"
LEGACY="/app/apps/admin/media"

if [[ "$MODE" != "--dry-run" && "$MODE" != "--apply" ]]; then
  echo "Usage: $0 [--dry-run|--apply]"
  exit 2
fi

echo "MODE=$MODE"
echo "ADMIN_CTR=$ADMIN_CTR"
echo "CANONICAL_MEDIA_PATH=$CANON"
echo "LEGACY_PATH=$LEGACY"

docker exec "$ADMIN_CTR" sh -c "
set -e
CANON='$CANON'
LEGACY='$LEGACY'
MODE='$MODE'
mkdir -p \"\$CANON\"
LEGACY_FOUND=0
PERSISTENT_FOUND=0
DUPLICATE=0
CONFLICTS=0
COPIED=0

if [ -d \"\$LEGACY\" ]; then
  LEGACY_FOUND=\$(find \"\$LEGACY\" -maxdepth 1 -type f | wc -l | tr -d ' ')
fi
if [ -d \"\$CANON\" ]; then
  PERSISTENT_FOUND=\$(find \"\$CANON\" -maxdepth 1 -type f | wc -l | tr -d ' ')
fi

echo \"LEGACY_FILES_FOUND=\$LEGACY_FOUND\"
echo \"PERSISTENT_FILES_FOUND=\$PERSISTENT_FOUND\"

if [ ! -d \"\$LEGACY\" ] || [ \"\$LEGACY_FOUND\" = \"0\" ]; then
  echo \"DUPLICATE_FILENAMES=0\"
  echo \"CONFLICTS=0\"
  echo \"RECONCILE=SKIP_NO_LEGACY\"
  exit 0
fi

for f in \"\$LEGACY\"/*; do
  [ -f \"\$f\" ] || continue
  base=\$(basename \"\$f\")
  dest=\"\$CANON/\$base\"
  if [ -f \"\$dest\" ]; then
    DUPLICATE=\$((DUPLICATE+1))
    if cmp -s \"\$f\" \"\$dest\"; then
      : # identical — ok
    else
      CONFLICTS=\$((CONFLICTS+1))
      echo \"CONFLICT_FILE=\$base\"
    fi
  else
    if [ \"\$MODE\" = \"--apply\" ]; then
      cp -n \"\$f\" \"\$dest\"
      COPIED=\$((COPIED+1))
      echo \"COPIED=\$base\"
    else
      echo \"WOULD_COPY=\$base\"
    fi
  fi
done

echo \"DUPLICATE_FILENAMES=\$DUPLICATE\"
echo \"CONFLICTS=\$CONFLICTS\"
echo \"COPIED_OR_WOULD=\$COPIED\"
if [ \"\$CONFLICTS\" -gt 0 ]; then
  echo \"RECONCILE=STOP_CONFLICT\"
  exit 30
fi
echo \"RECONCILE=OK\"
"
