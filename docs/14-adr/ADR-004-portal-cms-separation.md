# ADR-004: Separação Portal e CMS (Payload)

## Status

**Aceito** — Sprint 1.1

## Data

2026-07-07

## Contexto

A Omnia Platform possui duas superfícies distintas:

- **Portal** (`apps/web`) — experiência pública (portal, marketplace, blog, parceiro)
- **Admin** (`apps/admin`) — backoffice e CMS (Payload)

Misturar Payload CMS no portal criaria:

- Acoplamento de deploy entre público e admin
- Risco de expor APIs/admin no domínio público
- Bundle maior no portal
- Violação de bounded contexts (portal vs cms)

## Decisão

1. **Payload CMS existe exclusivamente em `apps/admin`**
2. **`apps/web` NUNCA importa** `payload`, `@payloadcms/*` ou `@omnia/integrations/payload`
3. O portal consome conteúdo CMS via **API REST** (Sprint 3+) — não via SDK Payload direto no client
4. `@omnia/integrations/payload` é usado apenas pelo admin e workers server-side
5. `/api/status` no portal retorna `payload: "not_applicable"`

## Alternativas consideradas

### Payload em ambos os apps

**Descartado:** Duplicação de config, risco de segurança, acoplamento.

### CMS headless separado (serviço dedicado)

**Adiado:** Overhead prematuro; admin como host do Payload é suficiente na Sprint 1–3.

## Consequências

### Positivas

- Boundaries claros entre portal e CMS
- Deploy independente futuro (apps/portal + apps/admin)
- Portal leve e seguro
- Alinhado com DDD (bounded context `cms`)

### Negativas

- Conteúdo CMS requer API intermediária para o portal
- Duas apps para manter (já planejado)

## Verificação

```bash
# apps/web não deve referenciar payload
rg -i payload apps/web/
# Resultado esperado: zero matches
```

## Referências

- [APPS_ARCHITECTURE.md](../../APPS_ARCHITECTURE.md)
- [ADR-001](ADR-001-monorepo-modular-architecture.md)
