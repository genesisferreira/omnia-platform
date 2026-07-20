# Captação pública de leads (`/interesse`)

## Endpoint

`POST /api/omnia/lead-capture`

DTO público apenas. Não cria `User`. Status/temperatura/owner são definidos no servidor (`novo` / `frio`).

## Deduplicação

Janela: **15 minutos**.

Mesmo Contact + mesma `areaInteresse` + mesma `utm_campaign` → consolida Lead existente e registra Activity `lead_captured`.

Nova campanha ou novo interesse → novo Lead.

## Rate limit

**5** tentativas / **15 minutos** por IP (`X-Real-IP` preferido), e-mail e WhatsApp.

Implementação: **Redis compartilhado** (`@omnia/shared` rate-limit), chaves namespaced por ambiente, e-mail/WhatsApp hasheados (SHA-256), TTL via Lua `INCR`+`PEXPIRE`.

**Fail-closed** em produção quando `REDIS_URL` está configurado e Redis falha → 503 (sem criação parcial). Sem Redis em desenvolvimento: fallback in-memory local (não multi-réplica).

## LGPD

Aceite obrigatório para **contato comercial** da solicitação. Versão registrada: `2026-07-01`. Origem: `lead_capture`.

UTMs e consentimento ficam em `notes` estruturados (`[lead_capture]` / `[lgpd]`) até migration de campos dedicados.
