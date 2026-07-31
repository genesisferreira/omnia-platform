# Omnia LMS — Assessment Experience · Homologação DEV

> **Sprint 2.7 — Épico D** · Web-only · **Produção intacta**

## Resultado

| Item | Valor |
| --- | --- |
| Branch | `feature/omnia-lms-learning-engine` |
| Commit implantado | `508b442` |
| Container | `omnia-platform-web-dev` = **healthy** |
| Imagem Web | `sha256:5d3a42c43a5f8e79555c7465660a5b3787d6596df3ce9b174d3c9092b3c07ed1` |
| Imagem anterior | `sha256:50281facbad2e346809f6d3591567dd552e2e593090b127dfc3c6854d4ed2da7` (`7ff1980`) |
| Turbo prune | Incluiu `@omnia/assessment-engine` + `@omnia/learning-engine` |
| Produção | Intacta |

## Testes

| Suite | Resultado |
| --- | --- |
| `@omnia/assessment-engine` | pass |
| `@omnia/learning-engine` | pass |
| `test:lms-assessment` | pass |
| `test:lms-smoke` | pass |
| typecheck / build web | pass |

## Rotas

| URL | Código |
| --- | --- |
| `/` | 200 |
| `/lms` | 307 (deslogado) |
| Admin LMS health | 200 healthy · Moodle 4.5.12 · readOnly |

## Rollback

```bash
cd /opt/omnia/platform
git checkout 7ff1980
DOCKER_BUILDKIT=1 docker compose -f docker/compose/staging.yml --env-file .env.staging build web
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-build --force-recreate --no-deps web
```

## Pendências conhecidas

- Submissão quiz/assignment (Write API) — fora do escopo
- Smoke autenticado browser (credencial aluno) — residual operacional
