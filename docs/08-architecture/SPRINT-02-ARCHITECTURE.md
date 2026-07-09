# Sprint 2 — Arquitetura

## Visão

```mermaid
flowchart TB
    Portal[apps/web :3000] -->|REST API| PayloadAPI[apps/admin /api/*]
    AdminDash[apps/admin Dashboard] --> Payload[Payload CMS]
    Payload --> PG[(PostgreSQL)]
    Payload --> MediaLocal[media/ local]
    MediaLocal -.->|futuro| MinIO[(MinIO)]
    Portal --> Config[@omnia/config]
    AdminDash --> Config
    Portal --> UI[@omnia/ui]
    AdminDash --> UI
```

## Decisões mantidas (ADR)

| ADR | Regra |
|-----|-------|
| ADR-004 | Portal **não** importa Payload |
| ADR-005 | Multi-tenant via coleção `tenants` |
| ADR-008 | Arquitetura congelada — sem mudanças estruturais |

## Coleções Payload

| Coleção | Camada | Consumidor |
|---------|--------|------------|
| tenants | CMS | Admin |
| companies | CMS | Portal (REST), Admin |
| media | CMS | Portal (REST), Admin |
| global-settings | CMS Global | Portal (REST) |
| users | CMS Auth | Admin |

## Fluxo Portal → CMS

```
apps/web → fetch(adminUrl/api/companies) → JSON → CompanyCards
```

Revalidação ISR: 60 segundos.

## Design System

Package `@omnia/ui` com tokens Omnia e componentes shadcn-style.

Fontes: Montserrat (títulos), Inter (corpo) com fallback system-ui.

## Config Runtime

`@omnia/config` → `getConfig()` singleton com validação Zod.
