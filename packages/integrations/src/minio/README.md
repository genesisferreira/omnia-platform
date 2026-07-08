# minio

Conector de baixo nível para **MinIO** (S3-compatible) — upload, download e presigned URLs.

## Package

`@omnia/integrations/minio`

Usado internamente por `@omnia/integrations/storage`. Apps preferem `storage/` em vez deste conector direto.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `MINIO_ENDPOINT` | Host MinIO (ex.: `localhost`) |
| `MINIO_PORT` | Porta API (padrão `9000`) |
| `MINIO_ACCESS_KEY` | Access key |
| `MINIO_SECRET_KEY` | Secret key |
| `MINIO_BUCKET` | Bucket padrão (`omnia-media`) |
| `MINIO_USE_SSL` | `true`/`false` |

## Sprint

**Sprint 1** (Docker Compose) · **Sprint 3** (mídia Payload via `storage/`).

## Princípios

- SDK S3-compatible — substituível por AWS S3 em produção
- Console admin em `localhost:9001` (dev)
- Nunca expor credentials no client
