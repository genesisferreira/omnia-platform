# Schema — Marketplace

> E-commerce B2B/B2C. Sprint 6.

## Tabelas principais

### `mkt_products`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK |
| `name` | VARCHAR(255) | — |
| `sku` | VARCHAR(50) | — |
| `price` | DECIMAL | — |
| `stock` | INTEGER | — |
| `status` | ENUM | `active`, `inactive` |

### `mkt_orders`

Pedidos com itens, pagamento e rastreamento.

### `mkt_order_items`

Itens do pedido.

## Integrações

- MinIO para imagens de produtos
- n8n para notificações de pedido
