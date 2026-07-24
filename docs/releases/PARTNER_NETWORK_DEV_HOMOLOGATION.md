# Partner Network — Homologação DEV (Sprint 2.3)

**Data (última atualização):** 2026-07-24  
**Branch:** `feature/2.3-partner-network`  
**HEAD remoto:** `2a169a9a3a66737785cc2cb031e2f12d3330f7ee` (`docs(partners): record branch push and VPS SSH blocker`)  
**Ambiente alvo:** DEV / staging oficial (não produção)

| Portal | Admin |
|--------|-------|
| https://dev.omniafrigo.com.br | https://admin.dev.omniafrigo.com.br |

**Status final desta sessão:** 🟡 **PARCIAL** — branch **publicada no GitHub**; deploy + homologação E2E na VPS **bloqueados por ausência de SSH** nesta workstation.

---

## 1. Fase repositório (concluída)

| Item | Resultado |
|------|-----------|
| Branch local | `feature/2.3-partner-network` |
| `git push -u origin feature/2.3-partner-network` | **OK** (branch nova no origin) |
| Tracking | `origin/feature/2.3-partner-network` |
| HEAD local = remoto | `2a169a9` |
| Merge main/develop | **Não realizado** (proibido) |
| Produção | **Não alterada** |

Commits da Sprint na branch (resumo):

| Commit | Mensagem |
|--------|----------|
| `7f9b69d` | `feat(partners): create partner network admin structure` |
| `33955c9` | `feat(partners): consolidate partner network data model` |
| `fcc1310` | `feat(partners): deliver public partner network experience` |
| `e443156` | `docs(partners): document development validation` |
| `fe28432` | `docs(partners): homologation report` |
| `2a169a9` | `docs(partners): record branch push and VPS SSH blocker` |

---

## 2. Fase VPS DEV (bloqueada)

| Item | Resultado |
|------|-----------|
| Host tentado | `191.101.234.156` / `dev.omniafrigo.com.br` |
| Usuários tentados | `root`, `ubuntu`, `omnia` (sessões anteriores + esta) |
| SSH | **Permission denied (publickey,password)** |
| Chaves em `~/.ssh` | Somente `known_hosts` — **sem IdentityFile** |
| WSL | Não instalado |
| Docker local | Ausente |
| `.env.staging` local | Ausente |

Diretório canônico documentado (não verificado nesta sessão por falta de SSH): `/opt/omnia/platform`  
Compose canônico: `docker/compose/staging.yml` + `.env.staging`  
Containers esperados: `omnia-platform-admin-dev`, `omnia-platform-web-dev`

### Evidência pública atual (pré-deploy)

| Check | Resultado |
|-------|-----------|
| Portal `/` | 200 |
| Portal `/parceiros` | **404** (código 2.3 ainda não no container) |
| Admin `/api/health` | `healthy` / `database: up` |
| `GET /api/omnia/public-partners` | **404** |

---

## 3. Runbook VPS (executar com SSH)

Quando houver acesso SSH à VPS DEV:

```bash
set -euo pipefail
cd /opt/omnia/platform   # confirmar path real se diferente

export DEPLOY_BRANCH=feature/2.3-partner-network
export PREVIOUS_HEAD="$(git rev-parse HEAD)"

test -z "$(git status --porcelain | grep -v '^.env' || true)" || {
  echo "ATENÇÃO: revisar working tree antes de continuar"
}

git fetch --prune origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"
git rev-parse --short HEAD
# esperado: 2a169a9 (ou tip atual de origin/feature/2.3-partner-network)

export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build admin web admin-migrate

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-migrate

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-build admin
# aguardar healthy: omnia-platform-admin-dev

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-build web
# aguardar healthy: omnia-platform-web-dev

# Smoke
curl -sS -o /dev/null -w '%{http_code}\n' https://dev.omniafrigo.com.br/parceiros
curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://admin.dev.omniafrigo.com.br/api/omnia/public-partners'
curl -sS https://admin.dev.omniafrigo.com.br/api/health
```

**Não executar** seeds institucionais, bootstrap completo ou qualquer operação de produção nesta release.

Migration obrigatória: `20260724_120000_partner_network`.

---

## 4–8. Homologação E2E / correções

| Área | Status |
|------|--------|
| Collections Admin | ⏸ Aguarda deploy |
| Cadastro → aprovação → publicação | ⏸ |
| Portal / busca / Home / geo / SEO | ⏸ |
| Privacidade APIs | Revisada offline (testes) — E2E ⏸ |
| Bugs de código corrigidos nesta release | Nenhum (bloqueio de acesso) |

---

## 9. Testes (workstation)

| Suite | Resultado |
|-------|-----------|
| `@omnia/shared` `test:partners` | **13/13 pass** |
| `@omnia/admin` `test:partner-register` | **3/3 pass** |
| Typecheck / lint (sessão anterior) | OK / warnings históricos |
| E2E DEV | **Não executado** |

---

## 10. Desbloqueio necessário

1. Instalar chave SSH privada em `~/.ssh` (ou `ssh-agent`) com acesso a `root@191.101.234.156`, **ou**  
2. Executar o runbook da §3 na VPS e colar evidências (HEAD, migrate exit 0, HTTP 200 em `/parceiros` e public-partners).

Após isso, o agente pode completar healthcheck, homologação e atualizar este documento para 🟢.

---

## Limitações

- Sem SSH, o agente **não** pode confirmar path real, branch atual da VPS, containers nem aplicar migration.
- Produção não foi tocada.
- Sem merge para `main`/`develop`.
