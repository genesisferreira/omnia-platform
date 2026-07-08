# ADR-005: Arquitetura Multiempresa (Multi-Tenant)

## Status

**Aceito** — Sprint 1.1

## Data

2026-07-07

## Contexto

A Omnia Platform integra **seis empresas** do ecossistema Omnia Frigo Holding e deve suportar:

- Isolamento de dados por empresa/tenant
- Usuários com acesso a múltiplos contextos
- Parceiros vinculados a tenants específicos
- Escalabilidade para 100k+ usuários

## Decisão

Adotar modelo **multi-tenant com `tenantId` obrigatório** em todas as entidades de negócio.

### Hierarquia conceitual

```
Tenant (isolamento lógico)
  └── Company (empresa do ecossistema: OFH, RR, NF...)
        └── Workspace (contexto operacional: CRM, Academy...)
              └── User (pessoa com roles)
                    └── Partner (ator externo B2B)
```

### Regras

| Conceito | Descrição |
|----------|-----------|
| **Tenant** | Unidade de isolamento de dados (schema lógico ou row-level) |
| **Company** | Empresa do ecossistema dentro de um tenant |
| **Workspace** | Subdivisão funcional (ex: CRM da RR) |
| **User** | Identidade autenticada com RBAC |
| **Partner** | Parceiro comercial com acesso restrito |

### Implementação (futura)

- Coluna `tenant_id` em todas as tabelas Drizzle
- Header `X-Omnia-Tenant-Id` em APIs
- Row-Level Security no PostgreSQL (Sprint 2+)
- Constantes em `@omnia/constants/companies`

## Alternativas

### Database-per-tenant

**Descartado:** Custo operacional alto para 6 empresas no mesmo ecossistema.

### Schema-per-tenant

**Adiado:** Avaliar se row-level não escalar.

## Consequências

- Toda query de negócio filtra por `tenantId`
- Documentação em [TENANT_ARCHITECTURE.md](../../TENANT_ARCHITECTURE.md)
- Tipos em `@omnia/types/companies` (Sprint 2+)

## Referências

- [TENANT_ARCHITECTURE.md](../../TENANT_ARCHITECTURE.md)
- [database/schemas/tenant.md](../../database/schemas/tenant.md)
