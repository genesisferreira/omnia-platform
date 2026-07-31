# Omnia LMS — Experience MVP Homologation (DEV)

> Deploy **somente** `web` em staging. **PROD intocada.**

## Pré-requisitos

- Branch `feature/omnia-lms-experience-mvp` (ou tip commit homologado).
- Admin/Connector já operacionais em DEV (Sprint 2.5.x).
- Usuário portal com Identity Link Moodle.
- Env web: `OMNIA_INTERNAL_API_SECRET`, `INTERNAL_ADMIN_URL` ou `NEXT_PUBLIC_ADMIN_URL`.

## Checklist de jornadas

| # | Jornada | Critério |
| --- | --- | --- |
| 1 | Login portal → `/lms` | Shell Omnia; sem chrome institucional |
| 2 | Conta sem vínculo | EmptyState “não vinculada” |
| 3 | Dashboard | Cursos + progresso; CTA Continuar |
| 4 | Meus cursos | Cards Abrir/Continuar |
| 5 | Curso | Árvore módulos; tabs notas/conclusão |
| 6 | Aula | Metadados; **sem** iframe/redirect Moodle |
| 7 | Continuar | Abre last-seen ou primeiro curso |
| 8 | Progresso / Notas | Listas agregadas |
| 9 | Logout | Revoga sessão LMS + cookie portal |
| 10 | Network | Sem requests a `moodle.*` no browser |

## Smoke automatizado

```bash
pnpm --filter @omnia/web test:lms-continue
pnpm --filter @omnia/web test:lms-smoke
```

## Deploy script

No VPS:

```bash
bash scripts/deploy/deploy-lms-experience-dev.sh feature/omnia-lms-experience-mvp
```

Rebuild **somente** o serviço `web`. Admin/Connector permanecem na tip de observabilidade já homologada.

## Veredito (2026-07-31)

| Item | Resultado |
| --- | --- |
| Branch tip | `653ea18` (`feature/omnia-lms-experience-mvp`) |
| Testes locais | `test:lms-continue` + `test:lms-smoke` OK; `typecheck` web OK |
| Push origin | OK |
| Deploy web DEV | **bloqueado** — senha SSH root não aceita nesta sessão |
| `/lms` em DEV | ainda **não** implantado (aguardando rebuild `web`) |
| PROD intocada | sim |
| GO / NO-GO Sprint 2.7 | **NO-GO deploy** até rebuild web na VPS; **código MVP pronto** |

### Desbloqueio

Fornecer senha root atual (ou chave SSH) e executar:

```bash
cd /opt/omnia/platform
bash scripts/deploy/deploy-lms-experience-dev.sh feature/omnia-lms-experience-mvp 653ea18
```

