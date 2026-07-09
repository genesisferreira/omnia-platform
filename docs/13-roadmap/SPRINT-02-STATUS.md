# Sprint 2 — Platform Base

> Status: **Em revisão humana** — branch `feature/sprint-02-platform-base`

## Objetivo

Primeira base funcional: Payload CMS com coleções, design system Omnia, portal e admin com layouts.

## Checklist

### Payload CMS
- [x] Coleções: Users, Tenants, Companies, Media
- [x] Global: GlobalSettings
- [x] Media Library (upload local)
- [x] MinIO documentado (`apps/admin/src/storage/README.md`)
- [x] CORS para portal consumir API REST

### Multiempresa
- [x] Coleção Tenants
- [x] Companies com relação a Tenant
- [x] Seed das 6 empresas da Holding

### Design System (@omnia/ui)
- [x] Tokens Omnia (cores, fontes)
- [x] Button, Card, Container, Badge, SectionTitle, Input, Textarea

### Portal (apps/web)
- [x] Layout: Header + Footer
- [x] Hero, Ecossistema, Cards empresas, CTA
- [x] Consumo CMS via REST (sem Payload)

### Admin (apps/admin)
- [x] Dashboard com stats e atalhos
- [x] Shell com navegação lateral
- [x] Link para Payload Admin

### Config (@omnia/config)
- [x] Runtime com Zod
- [x] environment, application, database, storage, payload

### Documentação
- [x] SPRINT-02-STATUS, ARCHITECTURE, DATABASE, UX
- [x] Release notes v0.3.0
- [x] CHANGELOG, README, PROJECT_CONTEXT

## Validação

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm build
pnpm docker:dev
pnpm dev
pnpm --filter @omnia/admin seed   # opcional — empresas da Holding
```

## URLs

| App | URL |
|-----|-----|
| Portal | http://localhost:3000 |
| Admin Dashboard | http://localhost:3001 |
| Payload CMS | http://localhost:3001/admin |

## Próximo passo

**Sprint 3** — Auth (JWT, RBAC), migrations Drizzle, design system completo.
