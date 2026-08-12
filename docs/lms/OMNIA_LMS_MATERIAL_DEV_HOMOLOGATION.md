# Omnia LMS — Material Experience · Homologação DEV

> **Sprint 2.7 — Épico C**  
> Ambiente: `dev.omniafrigo.com.br` · **Produção intacta**

## Resultado desta execução

| Item                           | Valor                                                                     |
| ------------------------------ | ------------------------------------------------------------------------- |
| Branch                         | `feature/omnia-lms-learning-engine`                                       |
| Commit implantado              | `7ff1980` (`7ff19803a66532171a0e0b9aeea3a0060ba77a21`)                    |
| Commit mensagem                | `feat(materials): implement LMS material experience`                      |
| Container                      | `omnia-platform-web-dev`                                                  |
| Imagem Web nova                | `sha256:50281facbad2e346809f6d3591567dd552e2e593090b127dfc3c6854d4ed2da7` |
| Health Web                     | **healthy**                                                               |
| Commit Web anterior (rollback) | `10fddfa` (`10fddfadd6187bde2a184d300dd080bd51355b06`)                    |
| Imagem Web anterior            | `sha256:28ebfd85bbf83e8f19947872804787c5d82dedd8caed23c5217e6a38a61fdf9a` |
| Branch anterior VPS            | `feature/omnia-lms-experience-mvp`                                        |
| Serviços alterados             | **somente `web`**                                                         |
| Produção                       | **intacta**                                                               |

## Pré-commit (local)

| Suite                         | Resultado                                         |
| ----------------------------- | ------------------------------------------------- |
| `@omnia/learning-engine` test | pass (7)                                          |
| `test:lms-material`           | pass (6)                                          |
| `test:lms-lesson`             | pass (8)                                          |
| `test:lms-smoke`              | pass (33)                                         |
| `typecheck` web               | pass                                              |
| `lint` web                    | pass (warning pré-existente `ChangePasswordForm`) |
| `build` web                   | pass                                              |

Build note — First Load JS aula: **11.1 kB** / shared **127 kB** (`/lms/cursos/[courseId]/atividades/[activityId]`).

## Deploy (VPS)

```text
git fetch --prune origin
git checkout feature/omnia-lms-learning-engine
git pull --ff-only origin feature/omnia-lms-learning-engine
# HEAD = 7ff1980
DOCKER_BUILDKIT=1 docker compose -f docker/compose/staging.yml --env-file .env.staging build web
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-build --force-recreate --no-deps web
```

Turbo prune incluiu `@omnia/learning-engine`. Admin/Moodle/Redis/DB/Traefik **não** rebuildados.

## Rotas validadas (HTTP)

| URL                                                        | Código                                       |
| ---------------------------------------------------------- | -------------------------------------------- |
| `https://dev.omniafrigo.com.br/`                           | **200**                                      |
| `https://dev.omniafrigo.com.br/lms`                        | **307** (login, deslogado)                   |
| `https://dev.omniafrigo.com.br/lms/cursos`                 | **307**                                      |
| `/lms/cursos/1` / atividade                                | **307**                                      |
| `https://admin.dev.omniafrigo.com.br/api/omnia/lms/health` | **200** `healthy` · Moodle 4.5.12 · readOnly |

Home HTML: sem match `moodle.` / `wstoken`.

## Logs Web

Next.js 15.5.20 Ready (~220ms). Scan: sem TypeError / hydration / Cannot find module / wstoken / ECONNREFUSED.

## MaterialViewer / Provider / Renderers

Validados em **testes unitários/integração** + presença no build DEV. Smoke **autenticado** (login → curso → aula → materiais → nav) **não executado nesta sessão** — falta credencial de aluno DEV com Identity Link.

## Learning Events / Timeline / Continue

Cobertos por `test:lms-material-engine` + `test:lms-lesson-engine` + Learning Engine. Runtime autenticado pendente.

## Segurança

- Connector health `readOnly: true`
- Sem rebuild de secrets/infra
- Placeholders PDF/vídeo/H5P (sem signed URL / CDN)
- URLs Moodle bloqueadas nos testes de material

## Rollback

```bash
cd /opt/omnia/platform
git checkout feature/omnia-lms-experience-mvp
git reset --hard 10fddfadd6187bde2a184d300dd080bd51355b06
# ou: git checkout 10fddfa && rebuild web from that commit
DOCKER_BUILDKIT=1 docker compose -f docker/compose/staging.yml --env-file .env.staging build web
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-build --force-recreate --no-deps web
# Smoke mínimo: / → 200; /lms → 307; health → 200
```

Imagem anterior: `sha256:28ebfd85bbf83e8f19947872804787c5d82dedd8caed23c5217e6a38a61fdf9a`

## Pendências

1. **Smoke autenticado Material Experience** (login portal + curso + aula + renderers + nav + eventos no browser).
2. PDF/vídeo/H5P reais / Media Authorization — fora do escopo (esperado).

## Veredito

**Deploy DEV + testes + health: OK.**  
**Homologação Material Experience completa: PENDENTE smoke autenticado.**
