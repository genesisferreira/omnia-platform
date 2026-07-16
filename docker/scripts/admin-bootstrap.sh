#!/bin/sh
# Omnia Platform — bootstrap one-off (migrations + seed)
# Uso: migrate | seed | bootstrap | holding-home
set -eu

MODE="${1:-bootstrap}"

echo "==> Omnia Admin Bootstrap [${MODE}]"

run_migrate() {
  echo "==> Aplicando migrations Payload..."
  pnpm --filter @omnia/admin migrate
  echo "==> Migrations concluídas."
}

run_seed() {
  echo "==> Executando seed (idempotente)..."
  pnpm --filter @omnia/admin seed
  echo "==> Seed concluído."
}

run_holding_home() {
  echo "==> Seed exclusivo da Home (omnia-hub)..."
  pnpm --filter @omnia/admin seed:holding-home
  echo "==> Seed holding-home concluído."
}

case "$MODE" in
  migrate)
    run_migrate
    ;;
  seed)
    run_seed
    ;;
  bootstrap)
    run_migrate
    run_seed
    ;;
  holding-home)
    run_holding_home
    ;;
  *)
    echo "Uso: admin-bootstrap.sh [migrate|seed|bootstrap|holding-home]"
    exit 1
    ;;
esac
