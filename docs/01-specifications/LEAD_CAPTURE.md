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

Implementação atual: **in-memory por processo** (não distribuída). Redis compartilhado é dívida antes de produção multi-réplica.

## LGPD

Aceite obrigatório para **contato comercial** da solicitação. Versão registrada: `2026-07-01`. Origem: `lead_capture`.

UTMs e consentimento ficam em `notes` estruturados (`[lead_capture]` / `[lgpd]`) até migration de campos dedicados.
