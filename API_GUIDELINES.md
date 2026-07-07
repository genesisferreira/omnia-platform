# Diretrizes de API — Omnia Platform

## Versionamento

- Prefixo: `/api/v1/`
- Breaking changes → nova versão (`v2`)
- Deprecation header: `Sunset`, `Deprecation`

## Formato de resposta

### Sucesso

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
```

### Erro

```json
{
  "error": {
    "code": "CRM_LEAD_NOT_FOUND",
    "message": "Lead não encontrado",
    "details": [],
    "correlationId": "uuid"
  }
}
```

## Convenções REST

| Método | Uso | Exemplo |
|--------|-----|---------|
| GET | Leitura | `GET /api/v1/crm/leads` |
| POST | Criação | `POST /api/v1/crm/leads` |
| PATCH | Atualização parcial | `PATCH /api/v1/crm/leads/:id` |
| DELETE | Remoção | `DELETE /api/v1/crm/leads/:id` |

## Autenticação

- `Authorization: Bearer <access_token>`
- API pública: `X-Api-Key` (Sprint 3+)
- Multi-tenant: `X-Omnia-Tenant-Id`

## Validação

- Zod schemas compartilhados (`@omnia/types` + validadores)
- 400 para input inválido com `details` por campo
- 422 para regras de negócio violadas

## Paginação

- Query: `?page=1&pageSize=20`
- Cursor-based para listas grandes (Sprint 5+)

## Rate limiting

- API pública: 100 req/min por API key
- Autenticada: 1000 req/min por user
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## SDK

- Client tipado em `@omnia/sdk`
- Documentação em `apps/docs` (futuro)

## OpenAPI

- Spec em `docs/05-api/openapi.yaml` (Sprint 3+)
- Gerada a partir de schemas Zod quando possível

## Referências

- [API_GUIDELINES](API_GUIDELINES.md) · `docs/05-api/`
