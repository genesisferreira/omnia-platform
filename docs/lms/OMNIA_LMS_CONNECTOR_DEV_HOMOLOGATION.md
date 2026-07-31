# Omnia LMS — Homologação DEV (Connector)

> Sprint **2.5.2** — Deploy e homologação read-only no DEV.  
> **Status (2026-07-31):** execução remota **BLOQUEADA** no ambiente Cursor (SSH sem chave/config).  
> Homologação E2E **não** declarada. Produção **não** alterada.

---

## 0. Conferência local (Cursor / agente)

| Item | Resultado |
|------|-----------|
| Branch | `feature/omnia-lms-connector` |
| HEAD | `081d0bd` |
| Commits exigidos | `f38ce07` + `081d0bd` presentes e no tip |
| Sync `origin` | alinhado (`origin/feature/omnia-lms-connector` = `081d0bd`) |
| Working tree tracked | limpa (apenas dirs untracked não relacionados) |
| Secrets versionados | nenhum `.env` / token Moodle no git |
| SSH Cursor → VPS | **Permission denied (publickey,password)** — sem `~/.ssh/id_*`, sem `~/.ssh/config` |
| Testes locais connector+BFF | **32 pass** (29 connector + 3 BFF helpers) |
| `GET …/api/omnia/lms/health` | **404** (código ainda não implantado no Admin DEV) |
| `admin.dev` / `dev.` | HTTP 200 |
| `moodle.dev` (desta rede) | DNS não resolveu |

**Conclusão agente:** Fases 2–18 (VPS/Moodle/E2E) **não executáveis** daqui. Operador deve seguir o runbook abaixo.

---

## 1. Pré-requisitos do operador

1. SSH funcional para a VPS DEV (`/opt/omnia/platform`).
2. Moodle DEV healthy (`https://moodle.dev.omniafrigo.com.br`).
3. Acesso admin Moodle DEV (não usar admin geral como token WS).
4. Permissão para editar `.env.staging` e secrets (`chmod 600`).
5. Backup do banco `omnia_staging` antes da migration.

---

## 2. Runbook exato (operador VPS)

### 2.1 Preflight VPS

```bash
hostname && whoami && pwd
cd /opt/omnia/platform
git status --short
git branch --show-current
git rev-parse --short HEAD
PREV_HEAD=$(git rev-parse --short HEAD)
echo "ROLLBACK_COMMIT=$PREV_HEAD"
docker compose -f docker/compose/staging.yml --env-file .env.staging ps
```

Se houver alterações tracked locais → **PARAR**.

Registrar imagem Admin atual (rollback):

```bash
docker inspect omnia-platform-admin-dev --format '{{.Image}} {{.Id}}' 2>/dev/null || \
docker compose -f docker/compose/staging.yml --env-file .env.staging images admin
```

### 2.2 Atualizar branch (sem merge/rebase)

```bash
cd /opt/omnia/platform
git fetch --prune origin
git checkout feature/omnia-lms-connector
git pull --ff-only origin feature/omnia-lms-connector
git rev-parse --short HEAD
# Esperado: 081d0bd (ou tip posterior só se houver fix de homologação na mesma branch)
```

### 2.3 Moodle DEV — auditoria (sem alterar core)

```bash
# Ajustar compose/path LMS conforme instalação real (ex.: /opt/omnia/lms ou docker/lms)
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -iE 'moodle|maria|redis|cron' || true
curl -sS -o /dev/null -w 'moodle_https=%{http_code}\n' https://moodle.dev.omniafrigo.com.br/
```

Confirmar versão **4.5.12**, HTTPS OK, sem dados reais.

### 2.4 Web Services Moodle (read-only)

Seguir [`OMNIA_LMS_MOODLE_SERVICE_SETUP.md`](OMNIA_LMS_MOODLE_SERVICE_SETUP.md).

| Item | Valor |
|------|--------|
| Usuário técnico | `omnia_ws_readonly` |
| Serviço | `omnia_lms_readonly` |
| Protocolo | **REST only** (SOAP/XML-RPC off) |

Funções (somente estas):

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

1. Criar token exclusivo.  
2. **Nunca** colar o token em chat/logs compartilhados.  
3. Guardar em secret VPS (ex.: `/opt/omnia/secrets/omnia-lms-connector-dev.env`, `chmod 600`).  
4. Registrar internamente: data, responsável, serviço, rotação, revogação.

### 2.5 `.env.staging` — presença (sem imprimir valores)

Adicionar/confirmar (valores funcionais):

| Variável | Esperado |
|----------|----------|
| `MOODLE_CONNECTOR_ENABLED` | `true` |
| `MOODLE_CONNECTOR_READ_ONLY` | `true` |
| `MOODLE_BASE_URL` | `https://moodle.dev.omniafrigo.com.br` |
| `MOODLE_INTERNAL_URL` | mesma HTTPS se não houver hostname interno estável |
| `MOODLE_REST_TOKEN` | secret (não echo) |
| `MOODLE_SERVICE_NAME` | `omnia_lms_readonly` |
| `MOODLE_REQUEST_TIMEOUT_MS` | `10000` |
| `LMS_SESSION_POLICY_ENABLED` | `true` |
| `LMS_DEFAULT_STUDENT_SESSIONS` | `1` |
| `LMS_DEFAULT_TEACHER_SESSIONS` | `2` |
| `LMS_DEFAULT_MANAGER_SESSIONS` | `2` |
| `LMS_DEFAULT_ADMIN_SESSIONS` | `2` |
| `LMS_SESSION_TTL_SECONDS` | `28800` |
| `LMS_SESSION_HEARTBEAT_SECONDS` | `60` |
| `APP_ENV` | `staging` |
| `REDIS_URL` | presente (Redis Platform) |

Check sem vazar secrets:

```bash
cd /opt/omnia/platform
for v in MOODLE_BASE_URL MOODLE_INTERNAL_URL MOODLE_REST_TOKEN MOODLE_SERVICE_NAME \
  MOODLE_REQUEST_TIMEOUT_MS MOODLE_CONNECTOR_ENABLED MOODLE_CONNECTOR_READ_ONLY \
  LMS_SESSION_POLICY_ENABLED LMS_DEFAULT_STUDENT_SESSIONS LMS_DEFAULT_TEACHER_SESSIONS \
  LMS_DEFAULT_MANAGER_SESSIONS LMS_DEFAULT_ADMIN_SESSIONS LMS_SESSION_TTL_SECONDS \
  LMS_SESSION_HEARTBEAT_SECONDS APP_ENV REDIS_URL; do
  if grep -qE "^${v}=.+" .env.staging; then echo "${v}=OK"; else echo "${v}=AUSENTE"; fi
done
# NÃO usar: grep/cat que imprima o valor do token
```

### 2.6 Backup `omnia_staging`

```bash
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR=/opt/omnia/backups/platform/dev
mkdir -p "$BACKUP_DIR"
# Ajustar container/user DB conforme ambiente real
docker exec -t <postgres_container> pg_dump -Fc -d omnia_staging > "$BACKUP_DIR/omnia_staging_${TS}.dump"
ls -lh "$BACKUP_DIR/omnia_staging_${TS}.dump"
# Validar arquivo não vazio; registrar path + tamanho + PREV_HEAD
```

### 2.7 Build (somente Admin)

```bash
cd /opt/omnia/platform
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build admin admin-migrate
```

Web **não** é obrigatório para o Connector BFF (endpoints no Admin).  
Se build falhar → **não** subir containers.

### 2.8 Migration (somente staging)

```bash
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-migrate
```

Confirmar tabelas/global: `lms_identity_links`, `lms_audit_events`, `lms_settings`  
(migration `20260731_160000_lms_connector_foundation`).

### 2.9 Subida Admin

```bash
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-build --no-deps admin
docker compose -f docker/compose/staging.yml --env-file .env.staging ps admin
```

**Não** reiniciar Postgres, Redis Platform, Moodle, MariaDB Moodle, Traefik, produção.

### 2.10 Health

```bash
curl -sS https://admin.dev.omniafrigo.com.br/api/omnia/lms/health
```

Esperado: HTTP 200, `status=healthy`, `moodle.reachable/authenticated=true`, `version≈4.5.12`, `mode=read_only`, `sessionStore.reachable=true`.  
Sem token / username técnico / stack.

Revisar logs Admin (sanitizados): sem `MOODLE_REST_TOKEN`, sem cookies.

---

## 3. Dados fictícios + vínculo + E2E (pós-deploy)

### 3.1 Moodle DEV (fictício)

Criar/confirmar: professor teste, aluno teste, curso técnico, matrículas, atividade, quiz, nota, completion.  
**Não** HostGator / dados reais.

### 3.2 Vínculo manual Admin

Collection `lms-identity-links` (somente admin): `omniaUserId`, `moodleUserId`, `status=active`, `linkedAt`, `syncStatus`.  
Sem senha Moodle. Sem provisionamento.

### 3.3 APIs (sessão Omnia autenticada)

```
GET /api/omnia/lms/me
GET /api/omnia/lms/courses
GET /api/omnia/lms/courses/:courseId
GET /api/omnia/lms/courses/:courseId/content
GET /api/omnia/lms/courses/:courseId/progress
GET /api/omnia/lms/grades?courseId=
GET /api/omnia/lms/completion?courseId=
```

Negativos: anônimo; sem vínculo; curso não matriculado; ID arbitrário (IDOR).

### 3.4 Cache

Namespace: `omnia:lms:cache:staging:*`  
Miss → hit em content/catálogo; **não** FLUSHALL; se limpar, só prefixo LMS staging.

### 3.5 Session Manager

Namespace: `omnia:lms:sessions:staging:*` (Redis **Platform**, não Moodle).

| Cenário | Esperado |
|---------|----------|
| A primeira sessão aluno | ativa + heartbeat |
| B abas (`sessionFamilyId`) | mesmo `sessionId` |
| C 2º dispositivo | 1ª revogada (`SESSION_LIMIT`) |
| D logout | request seguinte negado |
| E revoke-all admin | auditoria |
| F professor | até 2 sessões |
| G corrida | limite atômico |

### 3.6 Admin políticas

Global `lms-settings`: limites 1→2→1 no aluno; auditoria before/after em `lms-audit-events`.

### 3.7 Segurança

Token só backend; sem função Moodle arbitrária; IDOR bloqueado; sessão revogada bloqueia; erros sanitizados.

---

## 4. Rollback (se falha grave)

```bash
cd /opt/omnia/platform
git checkout <PREV_HEAD>
# rebuild/up admin da imagem/commit anterior
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-deps admin
# Se necessário: restaurar dump omnia_staging_${TS}.dump (somente staging)
```

Não afetar Moodle DEV nem produção. Desabilitar connector: `MOODLE_CONNECTOR_ENABLED=false` + restart Admin.

Revogação WS: desabilitar serviço/token no Moodle + flag connector off.

---

## 5. Checklist GO (operador)

Marcar só após evidência:

- [ ] health 200 healthy + Moodle auth
- [ ] token só backend
- [ ] vínculo + `/me` + courses + content + progress + completion + grades
- [ ] IDOR bloqueado
- [ ] cache staging namespace
- [ ] sessão aluno 1 + abas + 2º device + heartbeat + logout
- [ ] painel + auditoria
- [ ] testes automatizados OK
- [ ] DEV healthy; PROD intocado; zero secret exposto

---

## 6. Resultado Sprint 2.5.2 (agente Cursor)

| Dimensão | Status |
|----------|--------|
| Código / branch | OK (`081d0bd`) |
| Testes locais | OK (32) |
| Deploy DEV | **NÃO EXECUTADO** (SSH) |
| Moodle WS | **NÃO CONFIGURADO** (remoto) |
| E2E | **NÃO EXECUTADO** |
| Produção | **não alterada** |
| Homologação | **NÃO DECLARADA** |

**Próximo passo:** operador com SSH executa seções 2–3 e devolve evidências (health JSON sanitizado, lista de checks, sem secrets) para fechar 🟢.
