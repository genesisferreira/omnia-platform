# Release Notes — Landing Pré-Lançamento Omnia Frigo

## Identificação

| Campo | Valor |
|-------|--------|
| **Produto** | Landing Pré-Lançamento Omnia Frigo |
| **Versão** | **v1.0** |
| **URL** | https://omniafrigo.com.br/lancamento |
| **Data da publicação (código/tag)** | 2026-08-03 |
| **Responsável** | Genesis Ferreira Esteves |
| **Commit** | `8d3ea5ed5e3e77e29510b9a31d47903291196e08` (`8d3ea5e`) |
| **Branch** | `release/landing-v1.0` |
| **Tag** | `landing-v1.0` |
| **Status código** | 🟢 Release Git publicada |
| **Status produção (URL)** | 🟡 Aguardando deploy na VPS (SSH) |

## Congelamento

Design, identidade visual e copy estão **congelados**.  
Após publicação em produção: modo manutenção — somente correções críticas.  
Novas funcionalidades **não** devem ser adicionadas nesta landing.

Desenvolvimento volta para: Omnia LMS Release 2 · Write APIs Acadêmicas · Neurofrigo Runtime.

## Conteúdo de conversão

- CTA: **Quero acesso antecipado**
- Destino: `https://chat.whatsapp.com/B5s9NMosFMxF6Z4u3UIrJG?s=cl&p=a&mlu=4&amv=0`

## Artefatos

- Next.js `basePath: /lancamento` · `output: standalone`
- `Dockerfile` · `docker-compose.prod.yml` (Traefik PathPrefix)
- Headers de segurança · OG/Twitter estáticos · robots/sitemap

## Checklist aprovado (pré-deploy / homologação)

- [x] Build de produção
- [x] CTA / WhatsApp único
- [x] SEO (title, description, canonical, OG, Twitter, robots, sitemap)
- [x] Assets / favicon / logo / fontes self-hosted
- [x] Responsividade homologada
- [x] Tag `landing-v1.0` no GitHub
- [x] Branch `release/landing-v1.0` no GitHub

## Checklist pós-deploy (produção)

> Executar após o comando de deploy na VPS (abaixo). Em 2026-08-03 o ambiente Cursor **não possui chave SSH** para `root@191.101.234.156` (`Permission denied`).

- [ ] https://omniafrigo.com.br/lancamento abre (HTTPS 200)
- [ ] Favicon / logo / assets
- [ ] Open Graph / Twitter / WhatsApp preview
- [ ] Desktop + Mobile
- [ ] CTA Hero + CTA Final + botão flutuante → grupo oficial
- [ ] Links do rodapé
- [ ] Console sem erros
- [ ] robots.txt + sitemap.xml sob `/lancamento`

Quando o checklist acima estiver completo, atualizar **Status produção** para:

**🟢 PRODUÇÃO**

## Deploy na VPS (operador)

```bash
ssh root@191.101.234.156
cd /opt/omnia/platform
git fetch --tags origin
git checkout landing-v1.0
cd landing-lancamento
docker compose -f docker-compose.prod.yml up -d --build
curl -fsSI https://omniafrigo.com.br/lancamento | head
```

Smoke manual: Home → CTA Hero → WhatsApp → voltar → CTA Final → WhatsApp → Float → WhatsApp.
