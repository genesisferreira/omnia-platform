# Storage — Omnia Platform

> Estrutura de armazenamento de objetos via MinIO.

## Buckets / Pastas

| Pasta | Propósito | Público |
|-------|-----------|---------|
| [uploads/](uploads/) | Uploads gerais de usuários | Privado |
| [media/](media/) | Mídia do Payload CMS | Misto |
| [avatars/](avatars/) | Fotos de perfil | Privado |
| [documents/](documents/) | PDFs, contratos (LGPD) | Privado |
| [images/](images/) | Imagens otimizadas | Misto |
| [backups/](backups/) | Backups DB e exports | Privado |
| [exports/](exports/) | Relatórios exportados | Privado |
| [imports/](imports/) | Arquivos de importação | Privado |

## MinIO

- Package: `@omnia/integrations/minio` + `@omnia/integrations/storage`
- Console dev: http://localhost:9001
- Documentação: [STORAGE_ARCHITECTURE.md](../STORAGE_ARCHITECTURE.md)

## Convenções

- Path: `{tenantId}/{category}/{fileId}.{ext}`
- URLs assinadas para conteúdo privado
- Nunca servir arquivos privados sem autenticação
