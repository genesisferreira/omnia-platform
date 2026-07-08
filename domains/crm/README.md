# CRM

> Pipeline de relacionamento e gestão de leads.

**Sprint:** 5

## Objetivo

Centralizar a gestão de leads, oportunidades e pipeline comercial, permitindo rastreamento do funil de vendas e conversão de prospects em clientes.

## Responsabilidades

- Cadastrar e qualificar leads com origem e status
- Gerenciar pipeline de oportunidades e etapas de conversão
- Persistir dados via Drizzle ORM (`packages/database`)
- Expor APIs para integração com partner e automações

## Dependências

| Domínio | Uso |
|---------|-----|
| **core** | Primitivos compartilhados |
| **identity** | Associação de leads a usuários e permissões |

## Integrações

- **Drizzle ORM** — persistência relacional em PostgreSQL

## Eventos futuros

| Evento | Descrição | Sprint |
|--------|-----------|--------|
| `LeadCreated` | Novo lead cadastrado no pipeline | 5 |
| `LeadConverted` | Lead convertido em oportunidade ou cliente | 5 |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [database/schemas/crm.md](../../database/schemas/crm.md)
- [events/README.md](../../events/README.md)
