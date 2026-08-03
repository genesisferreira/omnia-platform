# Release Notes — Landing Pré-Lançamento Omnia Frigo

## Identificação

| Campo | Valor |
|-------|--------|
| **Produto** | Landing Pré-Lançamento Omnia Frigo |
| **Versão** | **v1.0** |
| **URL** | https://omniafrigo.com.br/lancamento |
| **Data da publicação** | 2026-08-03 |
| **Responsável** | Genesis Ferreira Esteves |
| **Commit (tag)** | `8d3ea5ed5e3e77e29510b9a31d47903291196e08` (`8d3ea5e`) |
| **Branch** | `release/landing-v1.0` |
| **Tag** | `landing-v1.0` |
| **Container** | `omnia-landing-lancamento:1.0.0` |
| **Status** | 🟢 PRODUÇÃO |

## Congelamento

Design, identidade visual e copy estão **congelados**.  
Modo manutenção: somente correções críticas.  
Novas funcionalidades **não** devem ser adicionadas nesta landing.

Desenvolvimento volta para: Omnia LMS Release 2 · Write APIs Acadêmicas · Neurofrigo Runtime.

## Conteúdo de conversão

- CTA: **Quero acesso antecipado**
- Destino: `https://chat.whatsapp.com/B5s9NMosFMxF6Z4u3UIrJG?s=cl&p=a&mlu=4&amv=0`

## Checklist aprovado

- [x] Build de produção
- [x] Tag `landing-v1.0` no GitHub
- [x] Deploy VPS (`docker compose -f docker-compose.prod.yml`)
- [x] https://omniafrigo.com.br/lancamento → 200 HTTPS
- [x] Favicon / logo / assets / robots / sitemap / OG
- [x] CTA Hero + Final + float → WhatsApp oficial
- [x] Headers de segurança
- [x] Correção crítica: `next/image` logo com `unoptimized` (basePath)

## Smoke test

Home → CTA Hero → WhatsApp → CTA Final → WhatsApp → Float → WhatsApp — **validado via HTML/produção (3 CTAs + float)**.
