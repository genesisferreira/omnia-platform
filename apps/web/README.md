# @omnia/web

Aplicação **pública** da Omnia Platform — portal, marketplace, blog, parceiro.

## Regra arquitetural

> **Este app NUNCA importa Payload CMS.**  
> Conteúdo CMS é consumido via API REST (Sprint 3+).  
> Ver [ADR-004](../../docs/14-adr/ADR-004-portal-cms-separation.md).

## Stack

Next.js 15 | React 19 | TypeScript | Tailwind | `@omnia/ui`

## Endpoints

| Rota          | Descrição                                 |
| ------------- | ----------------------------------------- |
| `/`           | Portal em construção                      |
| `/api/health` | Healthcheck simples                       |
| `/api/status` | Status global (`payload: not_applicable`) |

## Desenvolvimento

```bash
pnpm --filter @omnia/web dev   # http://localhost:3000
```

## Status

**Sprint 1.1** — Next.js configurado. Desacoplado do CMS.
