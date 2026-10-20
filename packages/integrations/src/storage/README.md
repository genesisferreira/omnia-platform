# storage

Facade de **object storage** — abstração sobre MinIO/S3 para uploads, mídia, documentos e exports.

## Package

`@omnia/integrations/storage`

Usado por apps e módulos que precisam de upload/download. Delega ao conector `minio/` em dev e S3 em produção.

## Variáveis de ambiente

| Variável           | Descrição                       |
| ------------------ | ------------------------------- |
| `STORAGE_PROVIDER` | Provider ativo: `minio` ou `s3` |
| `MINIO_ENDPOINT`   | Host MinIO (dev)                |
| `MINIO_PORT`       | Porta API MinIO                 |
| `MINIO_ACCESS_KEY` | Access key                      |
| `MINIO_SECRET_KEY` | Secret key                      |
| `MINIO_BUCKET`     | Bucket padrão (`omnia-media`)   |
| `MINIO_USE_SSL`    | `true`/`false`                  |

## Sprint

**Sprint 2+** — Uploads gerais e avatars; integração Payload (`media/`) na Sprint 3.

## Princípios

- URLs presigned para downloads privados
- Prefixos por tenant: `uploads/`, `media/`, `documents/`, etc.
- Nunca expor `MINIO_SECRET_KEY` no client
