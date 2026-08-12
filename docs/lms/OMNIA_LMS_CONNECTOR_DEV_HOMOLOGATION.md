# Omnia LMS — Homologação DEV (Connector)

> Sprint **2.5.2** — Deploy e homologação read-only no DEV.  
> **Status (2026-07-31):** **HOMOLOGADO no DEV** (evidências abaixo).  
> Produção **não** alterada. Sem merge.

---

## Resultado

| Item              | Valor                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Commit implantado | `5589092` (`fix(lms): complete connector dev homologation` — tip da branch)                |
| Código base       | `f38ce07` + `081d0bd` + fixes de build/homolog                                             |
| Banco             | `omnia_staging`                                                                            |
| Backup            | `/opt/omnia/backups/platform/dev/omnia_staging_20260731T175337Z.dump` (~398 KB)            |
| Rollback meta     | `/opt/omnia/backups/platform/dev/rollback-meta-20260731T175337Z.txt` (`PREV_HEAD=85decbc`) |
| Container Admin   | `omnia-platform-admin-dev` → imagem `omnia-platform-dev-admin` (**healthy**)               |
| Moodle            | `omnia-lms-moodle-dev` **healthy** / HTTPS 200 / **4.5.12**                                |
| Health BFF        | HTTP **200** `status=healthy` `mode=read_only` Moodle auth OK                              |

---

## Moodle Web Service (DEV)

| Campo           | Valor                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Usuário técnico | `omnia_ws_readonly`                                                                                             |
| Serviço         | `omnia_lms_readonly`                                                                                            |
| Protocolo       | REST only                                                                                                       |
| Token           | `/opt/omnia/secrets/omnia-lms-moodle-ws-token.txt` + `MOODLE_REST_TOKEN` em `.env.staging` (**não versionado**) |
| Meta            | `/opt/omnia/secrets/omnia-lms-ws-meta.txt`                                                                      |

Funções habilitadas (9):

```
core_webservice_get_site_info
core_user_get_users_by_field
core_enrol_get_users_courses
core_course_get_courses
core_course_get_courses_by_field
core_course_get_contents
core_completion_get_activities_completion_status
core_completion_get_course_completion_status
gradereport_user_get_grade_items
```

Rotação: criar novo token → atualizar secret/env → recreate Admin → revogar token antigo.  
Revogação emergência: desabilitar serviço/token + `MOODLE_CONNECTOR_ENABLED=false`.

Dados fictícios: `omnia_aluno_dev`, `omnia_prof_dev`, curso `OMNIA_DEV_VALID` (id 2), page + critérios de completion.

---

## Migration

Aplicada: `20260731_160000_lms_connector_foundation`  
Tabelas: `lms_identity_links`, `lms_audit_events`, `lms_settings`.

---

## Healthcheck (sanitizado)

```json
{
  "ok": true,
  "status": "healthy",
  "moodle": {
    "reachable": true,
    "authenticated": true,
    "version": "4.5.12 (Build: 20260608)",
    "serviceName": "omnia_lms_readonly"
  },
  "sessionStore": { "reachable": true },
  "cacheStore": { "reachable": true },
  "mode": "read_only"
}
```

Nota operacional: Global `lms-settings.connectorEnabled` precisa estar `true` **e** `MOODLE_CONNECTOR_ENABLED=true` no env.

---

## APIs homologadas

| Endpoint                     | Resultado                        |
| ---------------------------- | -------------------------------- |
| `GET /health`                | 200 healthy                      |
| `GET /me` anon               | 401                              |
| `GET /me` auth + vínculo     | 200 connected                    |
| `GET /me` sem vínculo        | 200 `MOODLE_IDENTITY_NOT_LINKED` |
| `GET /courses`               | 200 (1 curso)                    |
| `GET /courses/:id`           | 200                              |
| `GET /courses/:id/content`   | 200                              |
| `GET /courses/:id/progress`  | 200                              |
| `GET /grades?courseId=`      | 200                              |
| `GET /completion?courseId=`  | 200                              |
| curso não matriculado / IDOR | 403                              |

Vínculo manual: Omnia user `1` ↔ Moodle `4` (`omnia_aluno_dev`), `status=active`, `syncStatus=synced`.

---

## Cache / Session / Policy

- Cache: leituras de content/cursos OK (2ª chamada 200); namespace lógico `omnia:lms:cache:staging:*` (Redis Platform compartilhado).
- Sessão aluno: 1ª OK; abas mesma `sessionFamilyId` reutilizam; 2º device revoga 1ª (`SESSION_REVOKED`); heartbeat/logout OK.
- Professor: 3ª sessão revoga a mais antiga; revoke-all admin OK.
- Corrida: 2 logins paralelos → **1** sessão ativa residual.
- Policy: limites aluno 1→2→1 registrados em `lms_audit_events`.
- Auditoria: `lms.session.*` + `lms.policy.update` presentes.

---

## Segurança (amostra)

- Token Moodle não retornado nas respostas HTTP.
- Anônimo bloqueado; IDOR bloqueado; sem vínculo estruturado.
- Função Moodle arbitrária não exposta ao client.
- Erros sanitizados (sem stack).
- Produção: containers `*-prod` **não** recriados nesta sprint; só Admin DEV.

---

## Testes automatizados (local, pós-fix)

| Suite                  | Resultado      |
| ---------------------- | -------------- |
| `@omnia/lms-connector` | **29 pass**    |
| BFF helpers            | **3 pass**     |
| typecheck connector    | OK             |
| typecheck shared       | OK             |
| Build Admin Docker DEV | OK (`5589092`) |

Lint Admin completo / typecheck Admin local: não executados ponta a ponta nesta máquina (build Docker Admin validou compilação Next).

---

## Bugs encontrados e correções

1. **Build:** `PayloadRequest` vs `Request` no rate limit → tipagem PayloadRequest.
2. **Build:** `req.url` possibly undefined → `new URL(req.url \|\| 'http://local', ...)`.
3. **Runtime:** health `disabled` com env true porque Global `connectorEnabled` default false → habilitado em `lms_settings`.
4. **Moodle:** progress/completion permissão → caps + enrol do WS user no curso DEV.
5. **Moodle:** `nocriteriaset` → critérios de completion criados no curso fictício.

Commits de fix na branch: `cfa1189`, `5589092`.

---

## Pendências / riscos residuais

- Redis staging aponta para container nomeado `omnia-platform-redis-prod` (infra compartilhada pré-existente); namespaces usam `APP_ENV=staging`.
- Sync revoke → sessão Moodle nativa ainda não (fora do escopo ME01).
- Provisionamento / write acadêmico: **não** iniciado.
- Recomenda-se **rotacionar** a senha root VPS usada via plink histórico e preferir chave SSH / `OMNIA_VPS_PASSWORD` em env local.

---

## Rollback

```bash
cd /opt/omnia/platform
# ver /opt/omnia/backups/platform/dev/rollback-meta-20260731T175337Z.txt
git checkout 85decbc   # ou imagem Admin anterior
# restore dump se necessário (somente omnia_staging)
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-deps admin
```

---

## GO/NO-GO

**GO para macroentrega de provisionamento** (próxima), com ressalvas acima.

Critérios ME01 read-only + session policy no DEV: **atendidos**.
