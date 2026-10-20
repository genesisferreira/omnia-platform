# Partner Register — estabilização cadastro + rate limit

**Branch:** `feature/2.3-partner-network`  
**Ambiente:** DEV (`omnia_staging`) — produção não alterada

## Causas raiz

1. **Erro de conexão no frontend:** o cadastro **chegava a ser criado** (ex.: partner id 5 pending), mas a resposta demorava (geocode Nominatim em cascata e/ou SMTP aguardado). O `fetch` falhava/abortava e o catch exibia “Falha de conexão” genérica — inclusive quando o body não era JSON.
2. **Rate limit:** o contador incrementava **antes** do create. Retentativas após timeout consumiam a cota (5/15 min por IP+e-mail). Namespace Redis usava `NODE_ENV=production` da imagem Next sem `APP_ENV=staging`.

## Correções

- Geocode com timeout 8s; falha → `geocodingStatus=failed`, sem 0,0.
- SMTP fire-and-forget com timeout 3s; não desfaz create.
- Rate limit: `peek` antes + `INCR` só após create OK; abuso (honeypot/422) em escopo separado.
- Idempotência por documento/e-mail → “já recebido”.
- API JSON com `success`/`ok`/`code`/`message`/`retryAfter` + header `Retry-After`.
- Frontend: loading, sem limpar form em erro, parse seguro, 429 com minutos, timeout 45s.
- `APP_ENV=staging` no `.env.staging` para namespace Redis `omnia:staging:rl`.

## Limpeza Redis DEV

Somente chaves `*partner-register*` no Redis de staging (`omnia-redis`). Sem `FLUSHALL`.
