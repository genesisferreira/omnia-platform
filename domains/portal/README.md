# Portal

> Portal institucional público da Omnia Platform.

**Sprint:** 3

## Objetivo

Apresentar a presença institucional da plataforma — landing pages, páginas institucionais e conteúdo estático — de forma pública, performática e desacoplada do CMS administrativo.

## Responsabilidades

- Renderizar páginas públicas (home, sobre, contato, etc.)
- Consumir conteúdo do CMS exclusivamente via API REST
- Garantir SEO, acessibilidade e performance no `apps/web`
- Manter separação clara entre apresentação pública e área administrativa

## Dependências

| Domínio  | Uso                                                   |
| -------- | ----------------------------------------------------- |
| **core** | Primitivos (`Tenant`, paginação, erros)               |
| **cms**  | Conteúdo estruturado (somente API, sem import direto) |

## Integrações

Nenhuma integração externa direta. Todo conteúdo é obtido via API do domínio CMS.

## Eventos futuros

| Evento       | Descrição                        | Sprint |
| ------------ | -------------------------------- | ------ |
| `PageViewed` | Página institucional visualizada | 3+     |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [ADR-004 — Separação Portal/CMS](../../docs/14-adr/ADR-004-portal-cms-separation.md)
