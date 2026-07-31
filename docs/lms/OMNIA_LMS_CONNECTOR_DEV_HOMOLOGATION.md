# Omnia LMS — Homologação DEV (Connector)

## Pré-requisitos

1. Moodle DEV healthy (`moodle.dev.omniafrigo.com.br`)
2. WS REST + serviço `omnia_lms_readonly` + token no Admin
3. Admin DEV com `MOODLE_CONNECTOR_ENABLED=true`
4. Redis Platform acessível
5. Usuário Omnia + vínculo manual em `lms-identity-links` (DEV)

## Roteiro

1. `GET /api/omnia/lms/health` → `healthy` / `read_only`
2. Site info via health (versão ~4.5.12)
3. Criar vínculo manual admin → aluno Moodle de teste
4. `GET /me` → `connected: true`
5. `GET /courses` → lista
6. `GET /courses/:id/content`
7. `GET /courses/:id/progress`
8. `GET /grades?courseId=`
9. `GET /completion?courseId=`
10. Segunda chamada de content → cache hit (métricas/logs)
11. `POST /sessions` duas vezes (aluno) → segunda revoga primeira
12. Duas abas com mesmo `sessionFamilyId` → mesmo `sessionId`

## Comandos VPS (DEV Platform) — quando SSH disponível

```bash
cd /opt/omnia/platform
git fetch origin
git checkout feature/omnia-lms-connector
git pull --ff-only origin feature/omnia-lms-connector

# Env (não versionar): adicionar MOODLE_* e LMS_* ao .env.staging
# Token só em secret store / arquivo chmod 600

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  build admin admin-migrate

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-migrate

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-deps admin

curl -sS https://admin.dev.omniafrigo.com.br/api/omnia/lms/health
```

Moodle WS: seguir [`OMNIA_LMS_MOODLE_SERVICE_SETUP.md`](OMNIA_LMS_MOODLE_SERVICE_SETUP.md).
