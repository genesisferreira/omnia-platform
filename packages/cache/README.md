# @omnia/cache

Abstração de cache para toda a plataforma.

## Estrutura

```
src/
├── redis/        # Driver Redis (produção)
├── memory/       # Driver in-memory (dev/test)
├── strategies/   # TTL, invalidação, write-through
└── keys/         # Padrões de chaves (tenant-aware)
```

## Padrão de chaves

```
omnia:{tenantId}:{domain}:{resource}:{id}
```

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 2+**.
