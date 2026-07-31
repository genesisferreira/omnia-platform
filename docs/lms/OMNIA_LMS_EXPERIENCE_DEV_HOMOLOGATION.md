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

## Veredito

Preencher após deploy:

| Item | Resultado |
| --- | --- |
| Commit / imagem web | _TBD_ |
| `/lms` HTTP (auth gate) | _TBD_ |
| Sem requests `moodle.*` no browser | _TBD_ |
| PROD intocada | sim (escopo DEV) |
| GO / NO-GO Sprint 2.7 | _TBD_ |
| Notas | _TBD_ |
