# Partner Network — Validação em Desenvolvimento

**Data:** 2026-07-24  
**Branch:** `feature/2.3-partner-network`  
**Commits relevantes:**
- `33955c9` — `feat(partners): consolidate partner network data model` (Checkpoint 01)
- `fcc1310` — `feat(partners): deliver public partner network experience` (Macroentrega 02)

**Escopo desta validação:** tentativa de subir o ambiente local oficial e validar Partner Network de ponta a ponta.

---

## 1. Diagnóstico inicial

| Item | Resultado |
|------|-----------|
| Branch | `feature/2.3-partner-network` |
| HEAD (Macro 02) | `fcc1310a0a75bc4ea36798d63cf0a8244ebf649c` |
| Compose oficial | `docker/compose/development.yml` |
| Script oficial | `pnpm docker:dev` / `docker compose -f docker/compose/development.yml --env-file .env up -d` |
| `.env` local | presente (não versionado) |
| `.env.production` | **não utilizado** |

### Serviços previstos no compose de desenvolvimento

| Serviço | Container | Porta host |
|---------|-----------|------------|
| postgres | `omnia-postgres` | `5432` |
| redis | `omnia-redis` | `6379` |
| mailpit | `omnia-mailpit` | `1025` / `8025` |
| pgadmin | `omnia-pgadmin` | `5050` |
| minio | `omnia-minio` | `9000` / `9001` |
| n8n | `omnia-n8n` | `5678` |

Volumes locais: `omnia_postgres_data`, `omnia_redis_data`, `omnia_mailpit_data`, `omnia_pgadmin_data`, `omnia_minio_data`, `omnia_n8n_data`.

Apps locais (fora do compose de infra):
- Admin: `pnpm --filter @omnia/admin dev` → porta `3001`
- Portal: `pnpm --filter @omnia/web dev` → porta `3000`

---

## 2. Proteção de dados e ambiente

| Verificação | Resultado |
|-------------|-----------|
| `DATABASE_URL` aponta para host local | **Confirmado** (`localhost` / `127.0.0.1` / padrão compose) |
| Uso de `.env.production` | **Não** |
| Alteração de compose/infra de produção | **Não** |
| Secrets impressos nos logs | **Não** (valores sensíveis redigidos) |

---

## 3. Tentativa de subir o ambiente

### Resultado

**Bloqueado:** Docker CLI / Docker Desktop **não encontrados** neste host.

Evidências:
- `docker` ausente do PATH
- `C:\Program Files\Docker\Docker\resources\bin\docker.exe` → inexistente
- Nenhum serviço Docker instalado/visível
- `127.0.0.1:5432` → conexão **recusada**
- `127.0.0.1:6379` → conexão **recusada**
- `psql` / PostgreSQL nativo → não encontrado

Comando oficial previsto (não executável aqui):

```powershell
docker compose -f docker/compose/development.yml --env-file .env up -d postgres redis mailpit
```

Ou:

```powershell
pnpm docker:dev
```

### Variáveis Partner Network recomendadas para local

```env
GEOCODING_PROVIDER=none
NEXT_PUBLIC_PARTNER_GEO_ENABLED=true
```

Busca por cidade/UF funciona sem provedor externo.

---

## 4. O que foi validado sem banco (offline)

| Item | Resultado |
|------|-----------|
| Branch / commits | Confirmados |
| `DATABASE_URL` local | Confirmado (não produção) |
| Compose de desenvolvimento | Identificado e reutilizável |
| Lint Admin | OK (warnings pré-existentes) |
| Lint Web | OK (warning pré-existente) |
| Typecheck shared | OK |
| Typecheck admin | OK |
| Typecheck web | OK |
| Testes `@omnia/shared test:partners` | **13 pass** |
| Testes `@omnia/admin test:partner-register` | **3 pass** |
| Build web | Compilou + typecheck; falhou no `standalone` por **EPERM symlink** (Windows) |
| Build admin | Compilou + typecheck; falhou no `standalone` por **EPERM symlink** (Windows) |

---

## 5. O que NÃO pôde ser validado

Por ausência de Docker Desktop e Postgres/Redis locais:

| Item | Status |
|------|--------|
| Subir Postgres/Redis/Mailpit | **Bloqueado** |
| Executar migration `20260724_120000_partner_network` | **Não executada** |
| Login Admin / menu Partner Network | **Não validado** |
| CRUD Admin (parceiros/categorias/especialidades) | **Não validado** |
| Cadastro público ponta a ponta | **Não validado** |
| Aprovação → publicação | **Não validado** |
| Busca / filtros / paginação live | **Não validado** |
| GPS / fallback live | **Não validado** |
| Seção Home live | **Não validado** |
| Privacidade no JSON da API live | **Não validado** (coberto por testes unitários do mapper) |
| Permissões editor vs admin live | **Não validado** |
| SEO live no browser | **Não validado** (metadata implementada no código) |
| Responsividade no browser | **Não validada** |

---

## Bugs encontrados nesta validação

1. **Docker Desktop ausente** no host de desenvolvimento — impede `docker compose` oficial.
2. **Postgres/Redis locais indisponíveis** (`ECONNREFUSED` em `5432` e `6379`).
3. **Build standalone Windows EPERM** — compilação e typecheck OK; falha apenas ao criar symlinks do output `standalone`.

Nenhuma correção de código do Partner Network foi necessária além do já entregue na Macro 02.

---

## Como repetir a validação completa

Pré-requisito: instalar/iniciar **Docker Desktop**.

```powershell
# 1) Infra local
docker compose -f docker/compose/development.yml --env-file .env up -d postgres redis mailpit

# 2) Confirmar health
docker compose -f docker/compose/development.yml --env-file .env ps
docker compose -f docker/compose/development.yml --env-file .env logs postgres --tail 50

# 3) Migration
pnpm --filter @omnia/admin migrate

# 4) Apps
pnpm --filter @omnia/admin dev
pnpm --filter @omnia/web dev
```

Portas esperadas: Portal `3000`, Admin `3001`, Postgres `5432`, Redis `6379`, Mailpit `8025`.

Env local sugerido para Partner Network:

```env
GEOCODING_PROVIDER=none
NEXT_PUBLIC_PARTNER_GEO_ENABLED=true
```

---

## Como encerrar o ambiente

```powershell
# Encerrar apps (Ctrl+C nos terminais de dev)

# Encerrar containers de desenvolvimento
pnpm docker:down
# ou
docker compose -f docker/compose/development.yml --env-file .env down
```

Não remover volumes a menos que queira zerar o banco local:

```powershell
docker compose -f docker/compose/development.yml --env-file .env down -v
```

---

## Conclusão

Validação **offline** (lint, typecheck, testes unitários, compilação) concluída.  
Validação **live** (Postgres, migrate, Admin, Portal, CRUD, fluxos geo/Home) **bloqueada** por ausência de Docker Desktop e Postgres local neste host.

Sem push. Sem alteração de produção.
