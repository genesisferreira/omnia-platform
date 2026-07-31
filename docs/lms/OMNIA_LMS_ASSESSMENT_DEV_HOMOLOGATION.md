# Omnia LMS — Assessment Experience · Homologação DEV

> Sprint 2.7 Épico D · Web-only · Produção intacta

## Deploy

| Item | Valor |
| --- | --- |
| Branch | `feature/omnia-lms-learning-engine` |
| Commit | (preencher no deploy) |
| Container | `omnia-platform-web-dev` |
| Compose | `docker/compose/staging.yml` + `.env.staging` |

## Smoke mínimo

- `/` → 200
- `/lms` → 307 deslogado
- health Connector → 200 healthy
- Quiz/assign abrem AssessmentViewer (autenticado — se disponível)

## Rollback

Voltar HEAD Web anterior + `build web` + `up -d --no-deps web`.
