# Marketplace

> E-commerce e gestão de pedidos da Omnia Platform.

**Sprint:** 6

## Objetivo

Viabilizar a venda de produtos e serviços digitais — cursos, assinaturas, produtos de parceiros — com catálogo, carrinho e processamento de pedidos.

## Responsabilidades

- Gerenciar catálogo de produtos e variantes
- Processar carrinho, checkout e pedidos
- Integrar com parceiros para produtos de terceiros
- Armazenar mídia de produtos via MinIO

## Dependências

| Domínio | Uso |
|---------|-----|
| **core** | Primitivos (`Money`, `Tenant`, erros) |
| **identity** | Autenticação do comprador |
| **partner** | Produtos e comissões de parceiros |

## Integrações

- **MinIO** — armazenamento de imagens e assets de produtos

## Eventos futuros

| Evento | Descrição | Sprint |
|--------|-----------|--------|
| `OrderPlaced` | Pedido confirmado e registrado | 6 |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [STORAGE_ARCHITECTURE.md](../../STORAGE_ARCHITECTURE.md)
- [database/schemas/marketplace.md](../../database/schemas/marketplace.md)
