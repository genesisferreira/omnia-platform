# @omnia/config

Configuração centralizada da Omnia Platform.

## Uso (Sprint 2+)

```typescript
import { getConfig } from '@omnia/config';

const config = getConfig();

config.env;           // 'development' | 'staging' | 'production'
config.app.publicUrl; // http://localhost:3000
config.app.adminUrl;  // http://localhost:3001
config.database.url;  // PostgreSQL connection string
config.storage;       // MinIO settings
config.payload.secret;
```

## Módulos

| Módulo | Variáveis |
|--------|-----------|
| `environment` | `NODE_ENV` |
| `application` | `APP_VERSION`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL` |
| `database` | `DATABASE_URL` |
| `storage` | `MINIO_*` |
| `payload` | `PAYLOAD_SECRET` |

## Regras

1. Apps **não** leem `process.env` diretamente — usam `getConfig()`
2. Validação com **Zod** em cada módulo
3. `getConfig()` é singleton — use `resetConfigCache()` em testes

## Status

**Sprint 2** — Runtime básico implementado.
