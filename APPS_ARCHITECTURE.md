# Arquitetura de Apps — Omnia Platform

> Documentação da divisão futura de aplicações. **Nenhuma app foi movida nesta sprint.**

## Estado atual (Sprint 0.5)

```
apps/
├── web/      @omnia/web   — Portal, marketplace, blog, parceiro (placeholder)
└── admin/    @omnia/admin  — Admin, CRM, CMS (placeholder)
```

## Divisão proposta (Sprint 3–5)

À medida que a plataforma escala, `apps/web` se torna monolito demais. Divisão recomendada:

```
apps/
├── portal/     @omnia/portal    — Portal institucional multiempresa
├── admin/      @omnia/admin     — Painel admin, CRM, CMS (mantém)
├── landing/    @omnia/landing   — Landing pages e campanhas (leve, SSR)
├── docs/       @omnia/docs      — Documentação pública da API e dev portal
└── status/     @omnia/status    — Status page (uptime, incidentes)
```

## Mapeamento de migração

| App atual | Destino | Módulos | Motivo |
|-----------|---------|---------|--------|
| `apps/web` (portal) | `apps/portal` | portal, companies | Domínio institucional isolado |
| `apps/web` (marketplace) | `apps/portal` ou app dedicado | marketplace | Avaliar na Sprint 6 (tráfego) |
| `apps/web` (blog) | `apps/portal` | blog | Compartilha layout com portal |
| `apps/web` (partner) | `apps/portal` | partner | Mesma auth, domínio diferente |
| `apps/web` (chat) | `apps/portal` ou widget | chat | Widget embeddable |
| `apps/admin` | `apps/admin` | crm, cms | Mantém — backoffice unificado |
| — | `apps/landing` | marketing | Campanhas leves, sem auth |
| — | `apps/docs` | api | SDK + OpenAPI + guias |
| — | `apps/status` | infra | Página de status independente |

## Critérios para nova app

Criar app separada quando **pelo menos 2** forem verdadeiros:

1. Deploy independente necessário (frequência, escala)
2. Equipe diferente mantém o código
3. Domínio/subdomínio distinto (`status.omnia.com`)
4. Stack ou runtime diferente
5. SLA ou segurança distintos

## Domínios sugeridos (produção)

| App | Domínio |
|-----|---------|
| portal | `omnia.com`, `*.omnia.com` |
| admin | `admin.omnia.com` |
| landing | `lp.omnia.com`, campanhas |
| docs | `docs.omnia.com` |
| status | `status.omnia.com` |

## Packages compartilhados

Todas as apps consomem:

- `@omnia/ui` — design system
- `@omnia/types` — tipos
- `@omnia/constants` — rotas, roles
- `@omnia/auth` — autenticação
- `@omnia/i18n` — internacionalização

## API e mobile (5 anos)

- **API pública** — `api.omnia.com/v1` (backend em `apps/portal` ou serviço dedicado)
- **Mobile** — React Native consumindo `@omnia/sdk`
- **Multi-tenant** — header `X-Tenant-Id` ou subdomínio

## Decisão

**Não mover apps agora.** Reavaliar na Sprint 3 após portal funcional. Documento registrado como guia arquitetural.

## Referências

- [MODULES.md](MODULES.md)
- [ADR-001](docs/14-adr/ADR-001-monorepo-modular-architecture.md)
- [ADR-003](docs/14-adr/ADR-003-foundation-hardening.md)
