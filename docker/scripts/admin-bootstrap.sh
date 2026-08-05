#!/bin/sh
# Omnia Platform — bootstrap one-off (migrations + seed)
# Uso: migrate | seed | bootstrap | holding-home | upgrade-holding-home | holding-institutional-pages | holding-blog | holding-strategic-companies | knowledge-hub | lms-core | knowledge-intelligence | retrieval
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

run_knowledge_hub() {
  echo "==> Seed Knowledge Hub (categorias + agents + settings; sem docs técnicos)..."
  pnpm --filter @omnia/admin seed:knowledge-hub
  echo "==> Seed knowledge-hub concluído."
}

run_lms_core() {
  echo "==> Seed LMS Core (1 curso, 2 módulos, 4 aulas + materiais)..."
  pnpm --filter @omnia/admin seed:lms-core
  echo "==> Seed lms-core concluído."
}

run_knowledge_intelligence() {
  echo "==> Seed Knowledge Intelligence (pipeline LMS → chunks + fila; sem embeddings)..."
  pnpm --filter @omnia/admin seed:knowledge-intelligence
  echo "==> Seed knowledge-intelligence concluído."
}

run_retrieval() {
  echo "==> Seed Retrieval Engine (embeddings → vector store → busca semântica)..."
  pnpm --filter @omnia/admin seed:retrieval
  echo "==> Seed retrieval concluído."
}

run_holding_home() {
  echo "==> Seed exclusivo da Home (omnia-hub)..."
  pnpm --filter @omnia/admin seed:holding-home
  echo "==> Seed holding-home concluído."
}

run_upgrade_holding_home() {
  echo "==> Upgrade institucional da Home (omnia-hub)..."
  pnpm --filter @omnia/admin upgrade:holding-home
  echo "==> Upgrade holding-home concluído."
}

run_holding_institutional_pages() {
  echo "==> Seed páginas institucionais (omnia-hub)..."
  pnpm --filter @omnia/admin seed:holding-institutional-pages
  echo "==> Seed holding-institutional-pages concluído."
}

run_holding_blog() {
  echo "==> Seed Blog (omnia-hub)..."
  pnpm --filter @omnia/admin seed:holding-blog
  echo "==> Seed holding-blog concluído."
}

run_holding_strategic_companies() {
  echo "==> Seed páginas estratégicas das empresas..."
  pnpm --filter @omnia/admin seed:holding-strategic-companies
  echo "==> Seed holding-strategic-companies concluído."
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
  upgrade-holding-home)
    run_upgrade_holding_home
    ;;
  holding-institutional-pages)
    run_holding_institutional_pages
    ;;
  holding-blog)
    run_holding_blog
    ;;
  holding-strategic-companies)
    run_holding_strategic_companies
    ;;
  knowledge-hub)
    run_knowledge_hub
    ;;
  lms-core)
    run_lms_core
    ;;
  knowledge-intelligence)
    run_knowledge_intelligence
    ;;
  retrieval)
    run_retrieval
    ;;
  *)
    echo "Uso: admin-bootstrap.sh [migrate|seed|bootstrap|holding-home|upgrade-holding-home|holding-institutional-pages|holding-blog|holding-strategic-companies|knowledge-hub|lms-core|knowledge-intelligence|retrieval]"
    exit 1
    ;;
esac
