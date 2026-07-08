# Companies

> Gestão multiempresa da Omnia Platform.

**Sprint:** 2

## Objetivo

Suportar o modelo multi-tenant com múltiplas empresas por organização, isolando dados e configurações por empresa dentro de um tenant.

## Responsabilidades

- Cadastrar e gerenciar empresas vinculadas a um tenant
- Controlar hierarquia tenant → empresa → usuários
- Aplicar isolamento de dados por `companyId`
- Expor APIs de gestão empresarial para área administrativa

## Dependências

| Domínio | Uso |
|---------|-----|
| **core** | Primitivos (`Tenant`, identificadores) |

## Integrações

Nenhuma integração externa direta. Persistência via Drizzle ORM em PostgreSQL.

## Eventos futuros

| Evento | Descrição | Sprint |
|--------|-----------|--------|
| `CompanyCreated` | Nova empresa cadastrada no tenant | 2 |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [TENANT_ARCHITECTURE.md](../../TENANT_ARCHITECTURE.md)
- [database/schemas/companies.md](../../database/schemas/companies.md)
