# Omnia LMS — Experience MVP Homologation (DEV)

> Deploy **somente** `web` em staging. **PROD intocada.**  
> **Status (2026-07-31):** **HOMOLOGADO no DEV — GO para Sprint 2.7**

## Pré-requisitos

- Branch `feature/omnia-lms-experience-mvp`
- Admin/Connector operacionais (Sprint 2.5.x)
- Usuário portal com Identity Link (DEV: Omnia user `1` ↔ Moodle `omnia_aluno_dev`)
- Env web: `OMNIA_INTERNAL_API_SECRET`, `INTERNAL_ADMIN_URL` (ou `NEXT_PUBLIC_ADMIN_URL`)

## Deploy executado

| Item | Valor |
| --- | --- |
| Commit anterior (VPS) | `a5bad91` (`feature/omnia-lms-observability`) |
| Commit implantado | **`f82abb6`** + hotfix sanitize (ver commits abaixo) |
| Container | `omnia-platform-web-dev` |
| Image digest (1º deploy) | `sha256:3fece73ea3f4385c09629079bf34eab6b18582c97bb7931473734e416f0dbc79` |
| Health | **healthy** |
| Janela | `2026-07-31T21:34:04Z` → `21:36:44Z` (~2m40s) |
| Serviços NÃO rebuildados | Moodle, Redis LMS, MariaDB, Admin/Connector, Traefik, PROD |

### Nota de auditoria

VPS tinha alteração local `docker/observability/prometheus/prometheus.yml` (ajuste de scrape da Sprint 2.5.3). Foi **stash** antes do checkout; tree limpa em `f82abb6`.

`INTERNAL_ADMIN_URL=http://omnia-platform-admin-dev:3000` adicionado ao `.env.staging` (S2S web→admin).

## Rotas MVP (pt-BR)

| Rota | Sem sessão | Esperado |
| --- | --- | --- |
| `/` | 200 | OK |
| `/lms` | 307 → login Admin `next=/lms` | Auth gate OK |
| `/lms/cursos` | 307 login | OK |
| `/lms/cursos/:id` | 307 login | OK |
| `/lms/cursos/:id/atividades/:aid` | 307 login | OK |
| `/lms/continuar` | 307 login | OK |
| `/lms/progresso` `/lms/notas` | 307 login | OK |
| `/lms/dashboard` `/lms/courses` | 404 | Aliases EN fora do MVP |
| `/api/omnia/lms/health` (Admin) | 200 healthy | Connector OK |
| `/api/lms/me` (Web proxy) | 401 | Sem cookie |

## Connector (S2S user `1`)

| Endpoint | Resultado |
| --- | --- |
| `me` | 200 connected |
| `courses` | 200 (1 item) |
| `courses/2` + content/progress/grades/completion | 200 |
| `sessions` create/heartbeat/logout | 200 |
| Token Moodle / wstoken nas respostas browser | **ausente** (scrub no proxy) |

## Segurança — bug encontrado e corrigido

**Bug:** payload `content` do Connector inclui URLs `https://moodle.dev.../mod/...`. O proxy `/api/lms/*` repassaria ao browser.

**Correção:** `scrubMoodleLeakage` no Route Handler + `sanitizeLmsHtml` no summary do curso. Testes em `test-lms-sanitize.ts`.

Built LMS server chunks: **0** hits `moodle.` / `wstoken` em `/lms` e `/api/lms`.

## Testes

| Suite | Resultado |
| --- | --- |
| `test:lms-continue` | PASS |
| `test:lms-smoke` (+ CourseCard + sanitize) | PASS |
| `typecheck` (@omnia/web) | PASS |
| Build Docker Next 15 | PASS (warnings ESLint pré-existentes senha) |

## Performance (build)

- First Load JS compartilhado ~102 kB
- Rotas LMS dinâmicas ~113 kB First Load
- Chunks por rota (`/lms/cursos/[courseId]` 1.24 kB route)

## Acessibilidade (código)

- Skip link “Ir para o conteúdo”
- `aria-label` sidebar / menu
- Tabs `role="tablist"`
- Progress `role="progressbar"`
- Offline banner + EmptyState/Alert

## Produção

| Container | Image (inalterada no deploy) |
| --- | --- |
| `omnia-platform-web-prod` | `sha256:c1041a90…` healthy |
| `omnia-platform-admin-prod` | `sha256:0f5f909d…` healthy |

## Rollback

```bash
cd /opt/omnia/platform
git checkout feature/omnia-lms-observability  # ou tip anterior a5bad91
docker compose -f docker/compose/staging.yml --env-file .env.staging build web
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-deps web
```

## Veredito

🟢 **OMNIA LMS EXPERIENCE MVP HOMOLOGADO NO DEV — GO PARA SPRINT 2.7**
