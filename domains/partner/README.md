# Partner

> Área e gestão de parceiros da Omnia Platform.

**Sprint:** 7

## Objetivo

Permitir que parceiros comerciais se cadastrem, sejam aprovados e gerenciem seus produtos, comissões e relacionamento com a plataforma.

## Responsabilidades

- Onboarding e aprovação de parceiros
- Gestão de perfil, documentação e status de parceria
- Vincular parceiros a produtos no marketplace
- Integrar com CRM para rastreamento de leads originados por parceiros

## Dependências

| Domínio | Uso |
|---------|-----|
| **core** | Primitivos compartilhados |
| **identity** | Autenticação e perfil do parceiro |
| **crm** | Leads e oportunidades originados por parceiros |

## Integrações

Nenhuma integração externa direta. Comunicação com CRM via API ou eventos.

## Eventos futuros

| Evento | Descrição | Sprint |
|--------|-----------|--------|
| `PartnerApproved` | Parceiro aprovado e habilitado na plataforma | 7 |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [database/schemas/partners.md](../../database/schemas/partners.md)
- [events/README.md](../../events/README.md)
