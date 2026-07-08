# Arquitetura de Storage — Omnia Platform

> Object storage com MinIO (S3-compatible).

## Estrutura de buckets

Documentação em [storage/](storage/).

| Bucket/Pasta | Uso | Retenção |
|--------------|-----|----------|
| `uploads/` | Uploads gerais | Permanente |
| `media/` | Mídia CMS (Payload) | Permanente |
| `avatars/` | Fotos de perfil | Permanente |
| `documents/` | PDFs, contratos | LGPD — auditado |
| `images/` | Imagens otimizadas | Permanente |
| `backups/` | Backups DB e exports | 90 dias |
| `exports/` | Relatórios exportados | 30 dias |
| `imports/` | Arquivos de importação | 7 dias |

## MinIO

- **API:** `localhost:9000` (dev)
- **Console:** `localhost:9001`
- **Package:** `@omnia/integrations/minio` + `@omnia/integrations/storage`

## Integração Payload

Payload CMS armazena mídia no bucket `media/` via adapter S3/MinIO (Sprint 3+).

## Segurança

- URLs assinadas (presigned) para downloads privados
- Nunca expor `MINIO_SECRET_KEY` no client
- Scan de vírus em uploads (Sprint 2+ — avaliar)

## LGPD

- Documentos pessoais em `documents/` com auditoria
- Exclusão em cascata por `tenantId` (Sprint 2+)
