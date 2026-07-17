# Estado Atual do Projeto

> Atualizado em 2026-07-17. Estado volátil: confirme Git, CI e staging antes de
> iniciar uma missão.

## Git

- Branch: `feature/sprint-04-cms-content-foundation`
- HEAD commitado: `9656fd4ac57d7933feeb511b047107c0006c33c8`
- Último commit: `fix(cms): make institutional migration rollback safe`
- Working tree: **com alterações locais não commitadas** das Missões 01, 03 e G02.

## Entregue no HEAD

- Monorepo pnpm/Turborepo com `apps/web`, `apps/admin` e packages compartilhados.
- Payload CMS com Users, Tenants, Companies, Sites, Domains, Media e Pages.
- Resolução multisite server-to-server por hostname.
- Endpoint público de páginas publicadas e contratos sanitizados em
  `@omnia/shared`.
- Page Builder público com seis blocks: Hero, Institutional Intro,
  Mission/Vision, Values, Features e Companies.
- Home CMS da Holding e conteúdo institucional canônico.
- Migrations de Pages e dos blocks institucionais.
- CI com lint, typecheck, format check, testes de contratos/seeds/migrations e build.

## Alterações locais validadas, ainda não commitadas

### Portal institucional navegável

- Rota pública dinâmica `/[slug]`.
- Páginas institucionais Sobre, Empresas e Contato via seed idempotente.
- Header/Footer com navegação institucional compartilhada.
- Página 404 pública.
- Serviços Docker one-off para upgrade da Home e seed institucional.
- Runbook staging consolidado em `docker/staging/DEPLOY.md`.

### SEO do Portal

- Metadata compartilhada, Open Graph, Twitter Cards e canonical automática/editorial.
- `robots.txt`, `sitemap.xml` e JSON-LD Organization/WebSite/WebPage.
- Normalização de alt text recebido no DTO público.
- Testes unitários da camada SEO.

## Gates locais conhecidos

- Missão 01: testes do seed institucional, typecheck e lint de Web/Admin passaram.
- Revisão final: builds de Web/Admin, typecheck e lint passaram.
- G02 SEO: 7 testes, typecheck, lint e build do Web passaram.
- Build do Web confirmou rotas `/`, `/[slug]`, `/robots.txt` e `/sitemap.xml`.
- Warnings históricos de argumentos não usados em migrations do Admin permanecem;
  não foram introduzidos por essas missões.

## Ambientes

### Staging — última evidência pública anterior ao deploy local

- Portal e Admin respondiam HTTP 200.
- Home publicada ainda possuía apenas Hero, Features e Companies.
- `/sobre`, `/empresas` e `/contato` respondiam 404.
- Portanto, as alterações locais acima **ainda dependem de commit e deploy**.

### Produção

- Portal Omnia não possui publicação de produção confirmada neste contexto.
- Não inferir estado de produção a partir de staging ou DNS.

## Riscos conhecidos

- `payload migrate:down` pode reverter um batch inteiro; migration histórica de
  Domains possui dívida de rollback. Não usar `migrate:down` no deploy atual.
- Seed institucional não é transacional, mas é convergente: reexecuções ignoram
  slugs já criados.
- Header/Footer continuam definidos em código; menus CMS permanecem pendentes.
- Preview editorial, sitemap genérico para slugs arbitrários e domínio canônico
  primário por Site ainda não estão implementados.
