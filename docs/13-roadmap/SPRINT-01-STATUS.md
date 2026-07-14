# Sprint 1 — Status

> Acompanhamento da Sprint 1 — Base Executável.

## Objetivo

Transformar a fundação documental em base executável.

## Critérios de aceitação

| #   | Critério                                  | Status                |
| --- | ----------------------------------------- | --------------------- |
| 1   | `pnpm install` funciona                   | ⬜ Validar localmente |
| 2   | `pnpm lint` funciona                      | ⬜ Validar localmente |
| 3   | `pnpm typecheck` funciona                 | ⬜ Validar localmente |
| 4   | `pnpm build` funciona                     | ⬜ Validar localmente |
| 5   | Docker Compose sobe PG, Redis, MinIO, n8n | ⬜ Validar localmente |
| 6   | `apps/web` abre em localhost:3000         | ⬜ Validar localmente |
| 7   | `apps/admin` abre em localhost:3001       | ⬜ Validar localmente |
| 8   | Payload CMS configurado                   | ✅                    |
| 9   | Drizzle ORM preparado                     | ✅                    |
| 10  | Documentação atualizada                   | ✅                    |
| 11  | Sem funcionalidades de negócio indevidas  | ✅                    |

## Entregas

- [x] Next.js 15 — web + admin
- [x] Tailwind CSS + shadcn/ui preparado
- [x] Payload CMS mínimo
- [x] Drizzle ORM — conexão base
- [x] Docker Compose desenvolvimento
- [x] Healthcheck `/api/health`
- [x] Scripts docker:dev/down/logs
- [x] `.env.example` atualizado
- [x] Documentação Sprint 1
- [x] CI revisado

## Branch

`feature/sprint-01-executable-foundation`

## Próxima sprint

**Sprint 2** — Auth (JWT, RBAC), design system completo, primeiras tabelas Drizzle.
