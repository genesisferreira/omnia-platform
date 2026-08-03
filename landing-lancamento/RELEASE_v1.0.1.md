# Release — Landing Omnia Frigo v1.0.1

## Identificação

| Campo | Valor |
|-------|--------|
| **Produto** | Landing Oficial de Pré-Lançamento Omnia Frigo |
| **Versão** | **v1.0.1** |
| **Motivo** | Publicação Oficial de Produção |
| **URL** | https://omniafrigo.com.br/lancamento |
| **Ambiente** | Produção (VPS `omnia-server` · Traefik PathPrefix `/lancamento`) |
| **Data** | 2026-08-03 |
| **Hora** | 14:04:37 -03:00 |
| **Responsável** | Genesis Ferreira Esteves |
| **Branch** | `release/landing-v1.0` |
| **Tag** | `landing-v1.0.1` |
| **Commit** | `029c4c02ef45a2560fefa192c0632c84eb397b43` (`029c4c0`) |
| **Status** | 🟢 PRODUÇÃO |

## Conteúdo publicado

- Hero institucional
- Comunidade Oficial (CTA principal)
- Destaque do lançamento (dia 20 + sorteio MEC)
- Evento Especial de Lançamento
- Sorteio de 20 cursos técnicos reconhecidos pelo MEC
- Benefícios · Ecossistema · Por que entrar agora · CTA final · Float WhatsApp

## Congelamento / manutenção

Após esta publicação a Landing entra em **modo de manutenção**.  
Somente correções críticas. Sem novas funcionalidades.

Desenvolvimento retorna para: Omnia LMS Release 2 · Write APIs Acadêmicas · Neurofrigo Runtime.

## Checklist de Produção

- [x] Build produção / Next standalone
- [x] Docker `omnia-landing-lancamento:1.0.1`
- [x] basePath `/lancamento`
- [x] Assets · fontes · favicon · imagens
- [x] HTTPS
- [x] Headers de segurança · sem source maps públicos
- [x] OG · Twitter · robots · sitemap · canonical
- [x] Smoke CTAs → WhatsApp oficial
- [x] Tag `landing-v1.0.1`

## Smoke Test

| Passo | Esperado |
|-------|----------|
| Home / Hero | 200 |
| Destaque sorteio + Evento Especial | visíveis |
| Benefícios · Ecossistema · Rodapé | ok |
| CTA Hero / Evento / Final / Float | WhatsApp oficial |

Link único: `https://chat.whatsapp.com/B5s9NMosFMxF6Z4u3UIrJG?s=cl&p=a&mlu=4&amv=0`
