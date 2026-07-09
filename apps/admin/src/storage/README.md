# Storage — Media & MinIO

## Sprint 2 — Estado atual

| Recurso | Implementação |
|---------|---------------|
| Media Library | Coleção `media` com upload local em `apps/admin/media/` |
| MinIO (Docker) | Disponível em `localhost:9000` via `pnpm docker:dev` |
| Adapter S3/MinIO | **Preparado** — integração completa na Sprint 3+ |

## Variáveis de ambiente

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=omnia_minio
MINIO_SECRET_KEY=omnia_minio_secret
MINIO_BUCKET=omnia-media
MINIO_USE_SSL=false
```

Configuração centralizada via `@omnia/config` → `getConfig().storage`.

## Integração futura (MinIO)

Quando habilitado, usar `@payloadcms/storage-s3`:

```typescript
import { s3Storage } from '@payloadcms/storage-s3';

plugins: [
  s3Storage({
    collections: { media: true },
    bucket: process.env.MINIO_BUCKET,
    config: {
      endpoint: getMinioEndpoint(getConfig().storage),
      credentials: { ... },
      forcePathStyle: true,
    },
  }),
],
```

## Buckets documentados

Ver [`storage/`](../../../../storage/) na raiz do monorepo.
