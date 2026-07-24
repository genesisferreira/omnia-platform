# Partner Network — Correção de CEP, Geocodificação e Proximidade (Sprint 2.3)

**Data:** 2026-07-24  
**Branch:** `feature/2.3-partner-network`  
**Ambiente:** DEV / staging (`omnia_staging`) — **produção não alterada**

---

## 1. Problema original

Na homologação manual em Belo Horizonte, a busca pública de parceiros priorizava (ou listava como se fosse próximo) parceiro(s) de São Paulo.

## 2. Causa raiz

Combinação de fatores:

1. **`GEOCODING_PROVIDER=none`** (ou ausente) → parceiros sem latitude/longitude válidas.
2. Sem coordenadas, `distanceKm` ficava `null` para todos → ordenação caía em **featured / publishedAt / nome**, não em proximidade.
3. Home “Parceiros próximos” chamava a API **sem GPS/origem** → título enganoso.
4. Histórico: `parseOrigin` já havia sido corrigido para não virar `0,0` quando `lat`/`lng` ausentes (`3408937`).

Não havia fallback silencioso hardcodeado para São Paulo no código de origem; o efeito “SP primeiro” vinha de **destaque / ordem alfabética / dados sem geo**.

## 3. Arquitetura CEP

```
UI (público / Admin) → GET /api/omnia/postal-code
  → PostalCodeProvider (lookupPostalCode)
    → ViaCEP → fallback BrasilAPI (modo auto)
  → preenche address, neighborhood, city, state, country (schema: zipCode)
```

Backend do cadastro público **revalida CEP** e geocodifica server-side; ignora lat/lng do cliente.

## 4. Providers

| Função | Provider | Env |
|--------|----------|-----|
| CEP | ViaCEP (+ BrasilAPI) | `POSTAL_CODE_PROVIDER=auto` |
| Geocode | Nominatim OSM | `GEOCODING_PROVIDER=nominatim` |

Cascata Nominatim: endereço completo → sem número → CEP+cidade → centro da cidade. Rejeita `0,0`.

## 5. Campos (schema real)

Mantidos / adicionados (sem duplicar `postalCode`/`street`):

- `zipCode`, `address`, `addressNumber`, `addressComplement`, `neighborhood`, `city`, `state`, `country`
- `latitude`, `longitude` (read-only no Admin)
- `geocodingStatus` (`pending` \| `success` \| `failed` \| `manual`)
- `geocodingProvider`, `geocodedAt`

Migration: `20260724_180000_partner_geocoding_meta`

## 6. Regras de coordenadas

- `parseOptionalCoordinate` — nunca usa `0` como fallback de parse
- Par `0,0` (Null Island) **rejeitado**
- Falha de geocode → `null` + `geocodingStatus=failed`
- Alteração de endereço → regeocode (hook `beforeChange`); `context.skipPartnerGeocode` evita loop

## 7. Busca por proximidade

Origem (nesta ordem):

1. GPS (`lat`/`lng` válidos)
2. `postalCode` / `zipCode`
3. `nearCity` + `nearState`
4. Sem origem → destaque/nome; **sem** assumir São Paulo

Com origem: calcula Haversine, ordena `distanceKm ASC`, featured só como desempate; `withinRadiusOnly` (padrão) exclui fora do raio e sem coords. `includeOutsideRadius=1` para outras regiões.

Raio: padrão 50 km, máx. 500 km.

## 8. Privacidade

APIs públicas continuam sem document/email/approvalNotes/ownerUser/approvedBy. Cadastro público ignora lat/lng enviados. Endpoint CEP com CORS + rate limit.

## 9. Backfill DEV

```bash
# dry-run
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  run --rm admin npx tsx src/scripts/backfill-partner-geocoding.ts --dry-run

# apply
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  run --rm admin npx tsx src/scripts/backfill-partner-geocoding.ts --apply
```

Somente `omnia_staging`. Script recusa produção.

## 10. Variáveis (DEV)

Ver `.env.staging.example` seção PARTNER GEO. Em especial no servidor:

```
GEOCODING_PROVIDER=nominatim
GEOCODING_USER_AGENT=OmniaPlatform-Dev/1.0 (...)
POSTAL_CODE_PROVIDER=auto
```

## 11. Testes

```bash
pnpm --filter @omnia/shared test:partners
pnpm --filter @omnia/admin test:partner-register
pnpm --filter @omnia/admin test:postal-geocode
```

## 12. Rollback

1. Checkout commit anterior na VPS DEV
2. Rebuild `admin` + `web`
3. Restaurar backup `omnia_staging` se migration precisar reverter
4. Down migration `20260724_180000_partner_geocoding_meta` só se seguro e com backup

## 13. Pendências conhecidas

- Cache Redis dedicado por CEP/endereço (hoje HTTP Cache-Control + rate limit)
- E2E automatizado browser (homologação manual GPS)
