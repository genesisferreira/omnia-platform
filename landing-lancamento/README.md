# Omnia Frigo — Landing Pré-Lançamento v1.0 (oficial)

**Status:** Homologada · pronta para produção  
**URL:** https://omniafrigo.com.br/lancamento  
**Escopo:** apenas esta pasta (`landing-lancamento/`)

> Design, identidade e copy estão **congelados**. Alterar somente para correção de produção.

## Stack

- Next.js 15 (App Router) · `basePath: /lancamento`
- React 19 · fontes self-hosted (Syne + Source Sans 3)
- CTA único → comunidade WhatsApp oficial

## Scripts

```bash
npm ci
npm run build
npm start
# local: http://localhost:3000/lancamento
```

## Docker

```bash
docker build -t omnia-landing-lancamento:1.0.0 .
docker run --rm -p 3000:3000 omnia-landing-lancamento:1.0.0
```

## Publicação

Ver [DEPLOY.md](./DEPLOY.md).

## CTA oficial

`https://chat.whatsapp.com/B5s9NMosFMxF6Z4u3UIrJG?s=cl&p=a&mlu=4&amv=0`
