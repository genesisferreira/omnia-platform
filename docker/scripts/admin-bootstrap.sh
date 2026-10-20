#!/bin/sh
# Omnia Platform — bootstrap one-off (migrations + seed)
# Uso: migrate | seed | bootstrap | holding-home | upgrade-holding-home | holding-institutional-pages | holding-blog | holding-strategic-companies | knowledge-hub | knowledge-hub-load | lms-core | knowledge-intelligence | retrieval | neurofrigo-ai | ai-experience | tutor-ia | enterprise-ai | enterprise-ai-epic11 | commercial-ia | commercial-ia-epic12 | engineering-ia | engineering-ia-epic13 | student-intelligence | student-intelligence-epic14 | adaptive-learning | adaptive-learning-epic15 | deepseek-agents | epic16-e2e-users
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

run_knowledge_hub_load() {
  echo "==> Seed Knowledge Hub — carga oficial EPIC 10 (import + index + retrieval)..."
  pnpm --filter @omnia/admin seed:knowledge-hub-load
  echo "==> Seed knowledge-hub-load concluído."
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

run_neurofrigo_ai() {
  echo "==> Seed Neurofrigo AI MVP (Runtime + AISession)..."
  pnpm --filter @omnia/admin seed:neurofrigo-ai
  echo "==> Seed neurofrigo-ai concluído."
}

run_ai_experience() {
  echo "==> Seed AI Experience (follow-up, grounding, feedback)..."
  pnpm --filter @omnia/admin seed:ai-experience
  echo "==> Seed ai-experience concluído."
}

run_tutor_ia() {
  echo "==> Seed Tutor IA (profiles, personalização, plano, recomendações)..."
  pnpm --filter @omnia/admin seed:tutor-ia
  echo "==> Seed tutor-ia concluído."
}

run_enterprise_ai() {
  echo "==> Seed Enterprise AI (assistants, prompts, models, policies)..."
  pnpm --filter @omnia/admin seed:enterprise-ai
  echo "==> Seed enterprise-ai concluído."
}

run_enterprise_ai_epic11() {
  echo "==> EPIC 11 — migrate + enterprise-ai + homolog..."
  run_migrate
  run_enterprise_ai
  pnpm --filter @omnia/admin homolog:e11-enterprise-ai
  echo "==> Homolog EPIC 11 concluído."
}

run_commercial_ia() {
  echo "==> Seed Comercial IA (profile, prompts, proposal)..."
  pnpm --filter @omnia/admin seed:commercial-ia
  echo "==> Seed commercial-ia concluído."
}

run_commercial_ia_epic12() {
  echo "==> EPIC 12 — migrate + commercial-ia + homolog..."
  run_migrate
  run_commercial_ia
  pnpm --filter @omnia/admin homolog:e12-commercial-ia
  echo "==> Homolog EPIC 12 concluído."
}

run_engineering_ia() {
  echo "==> Seed Engenharia IA (profile, prompts, troubleshooting)..."
  pnpm --filter @omnia/admin seed:engineering-ia
  echo "==> Seed engineering-ia concluído."
}

run_engineering_ia_epic13() {
  echo "==> EPIC 13 — migrate + engineering-ia + homolog..."
  run_migrate
  run_engineering_ia
  pnpm --filter @omnia/admin homolog:e13-engineering-ia
  echo "==> Homolog EPIC 13 concluído."
}

run_student_intelligence() {
  echo "==> Seed Student Intelligence Platform (SIP)..."
  pnpm --filter @omnia/admin seed:student-intelligence
  echo "==> Seed student-intelligence concluído."
}

run_student_intelligence_epic14() {
  echo "==> EPIC 14 — migrate + SIP + homolog..."
  run_migrate
  run_student_intelligence
  pnpm --filter @omnia/admin homolog:e14-student-intelligence
  echo "==> Homolog EPIC 14 concluído."
}

run_adaptive_learning() {
  echo "==> Seed Adaptive Learning Engine..."
  pnpm --filter @omnia/admin seed:adaptive-learning
  echo "==> Seed adaptive-learning concluído."
}

run_adaptive_learning_epic15() {
  echo "==> EPIC 15 — migrate + adaptive-learning + homolog..."
  run_migrate
  run_adaptive_learning
  pnpm --filter @omnia/admin homolog:e15-adaptive-learning
  echo "==> Homolog EPIC 15 concluído."
}

run_deepseek_agents() {
  echo "==> Seed DeepSeek Live + Agent Library oficial..."
  pnpm --filter @omnia/admin seed:deepseek-agents
  echo "==> Seed deepseek-agents concluído."
}

run_epic16_e2e_users() {
  echo "==> Seed EPIC 16 E2E users (staging only; requires OMNIA_ALLOW_E2E_SEED=1 + password envs)..."
  pnpm --filter @omnia/admin seed:epic16-e2e-users
  echo "==> Seed epic16-e2e-users concluído."
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
  knowledge-hub-load)
    run_knowledge_hub_load
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
  neurofrigo-ai)
    run_neurofrigo_ai
    ;;
  ai-experience)
    run_ai_experience
    ;;
  tutor-ia)
    run_tutor_ia
    ;;
  enterprise-ai)
    run_enterprise_ai
    ;;
  enterprise-ai-epic11)
    run_enterprise_ai_epic11
    ;;
  commercial-ia)
    run_commercial_ia
    ;;
  commercial-ia-epic12)
    run_commercial_ia_epic12
    ;;
  engineering-ia)
    run_engineering_ia
    ;;
  engineering-ia-epic13)
    run_engineering_ia_epic13
    ;;
  student-intelligence)
    run_student_intelligence
    ;;
  student-intelligence-epic14)
    run_student_intelligence_epic14
    ;;
  adaptive-learning)
    run_adaptive_learning
    ;;
  adaptive-learning-epic15)
    run_adaptive_learning_epic15
    ;;
  deepseek-agents)
    run_deepseek_agents
    ;;
  epic16-e2e-users)
    run_epic16_e2e_users
    ;;
  *)
    echo "Uso: admin-bootstrap.sh [migrate|seed|bootstrap|holding-home|upgrade-holding-home|holding-institutional-pages|holding-blog|holding-strategic-companies|knowledge-hub|knowledge-hub-load|lms-core|knowledge-intelligence|retrieval|neurofrigo-ai|ai-experience|tutor-ia|enterprise-ai|enterprise-ai-epic11|commercial-ia|commercial-ia-epic12|engineering-ia|engineering-ia-epic13|student-intelligence|student-intelligence-epic14|adaptive-learning|adaptive-learning-epic15|deepseek-agents|epic16-e2e-users]"
    exit 1
    ;;
esac
