# Blog

> Conteúdo editorial e publicações da Omnia Platform.

**Sprint:** 4

## Objetivo

Gerenciar e exibir conteúdo editorial — artigos, categorias, tags e autores — com fluxo de publicação controlado e consumo público via portal.

## Responsabilidades

- Modelar posts, categorias, tags e metadados editoriais
- Integrar com Payload CMS para criação e edição de conteúdo
- Expor API de leitura para o portal e outros consumidores
- Controlar ciclo de vida: rascunho → revisão → publicado

## Dependências

| Domínio | Uso |
|---------|-----|
| **core** | Primitivos compartilhados |
| **cms** | Gestão de conteúdo via Payload |

## Integrações

- **Payload CMS** — armazenamento e administração de conteúdo editorial

## Eventos futuros

| Evento | Descrição | Sprint |
|--------|-----------|--------|
| `PostPublished` | Artigo publicado e disponível publicamente | 4 |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [events/README.md](../../events/README.md)
