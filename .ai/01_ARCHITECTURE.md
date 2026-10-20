# Arquitetura Implementada

## Visão

A Omnia Platform é o hub digital modular da Omnia Frigo Holding. O Portal é a
entrada pública do ecossistema; não substitui automaticamente os sites oficiais
das empresas.

## Monorepo

```text
apps/web        Portal público Next.js
apps/admin      Admin Next.js + Payload CMS
packages/*      Bibliotecas e scaffolds compartilhados
docs/*          Produto, especificações, ADRs e infraestrutura
docker/*        Compose, Dockerfiles e scripts operacionais
```

O workspace inclui 27 packages. Nem todos representam funcionalidades
operacionais; vários são fundações/scaffolds para evolução futura.

## Portal (`apps/web`)

- Next.js App Router, React Server Components e renderização server-side.
- Rotas públicas implementadas localmente: `/`, `/[slug]`, `/robots.txt`,
  `/sitemap.xml`, `/api/health` e `/api/status`.
- Resolve o Site pelo hostname através do Admin usando endpoint S2S e segredo
  server-only.
- Consome somente DTOs públicos do Admin; não importa Payload nem acessa o banco.
- `fetchPublicPage` e `fetchCompanies` usam cache de render e revalidate de 60 s.
- `BlockRenderer` possui registry explícito e exaustivo dos blocks permitidos.
- Layout global contém Skip Link, Header, conteúdo principal e Footer.

## Admin e CMS (`apps/admin`)

- Next.js hospeda o painel Payload e endpoints.
- Collections confirmadas: Users, Tenants, Companies, Sites, Domains, Media e Pages.
- Global confirmado: Global Settings.
- Pages usa drafts/versions, unicidade de slug por Site e uma Home por Site.
- Endpoint `GET /api/omnia/public-page?site=&slug=` retorna somente página
  publicada e DTO sanitizado.
- Endpoint público de Companies retorna allowlist de dados institucionais.
- Endpoint interno `resolve-site` exige segredo e resolve Domain → Site →
  Company/Tenant.
- Migrations Payload são versionadas; seeds e upgrades operacionais são
  idempotentes e estreitos.

## Contratos compartilhados

- `@omnia/shared` define contratos públicos de página, mapeamento allowlist,
  sanitização de links/canonical e helpers de hostname.
- `@omnia/config` valida configuração de ambiente com Zod.
- `@omnia/ui` fornece tokens e componentes do design system.
- `@omnia/database` contém a fundação Drizzle para dados transacionais.

## Fluxos principais

### Resolução do Site

```text
Request → headers/hostname → getSiteContext → resolve-site S2S
→ Domain/Site/Company/Tenant → contexto SSR
```

### Página pública

```text
Request / ou /[slug] → Site resolvido → public-page no Admin
→ PublicPageDto sanitizado → metadata/JSON-LD + BlockRenderer
```

### Deploy staging

```text
Build imagens → migrations → Admin saudável
→ upgrade Home → seed páginas → Web saudável → smoke tests
```

## Persistência e fronteiras

- Payload/PostgreSQL: conteúdo editorial, Sites, Domains, Companies e mídia.
- Drizzle/PostgreSQL: reservado para dados transacionais futuros.
- Portal: stateless; não persiste dados.
- Redis, MinIO, n8n e integrações existem como infraestrutura/fundação, mas não
  devem ser descritos como módulos de negócio concluídos.

## Não implementado

- CRM, LMS, Marketplace, parceiros, pagamentos, chat e IA operacional.
- Menus/Header/Footer administráveis por CMS.
- Preview editorial público completo.
- Blog e demais collections editoriais do roadmap.
- Autenticação/RBAC da aplicação transacional.
- RLS multi-tenant e observabilidade completa.

Mudanças estruturais exigem ADR; evolução deve ser incremental.
