# Omnia Platform

Plataforma digital do ecossistema **Omnia Frigo Holding**: portal institucional, área acadêmica das escolas, Rede de Parceiros, Marketplace B2B e painel administrativo, num monorepo único.

> Estado documentado em **20/10/2026**. Legenda usada neste arquivo:
> **PUBLICADO** (em produção) · **DEV** (implementado e homologado só no ambiente de desenvolvimento) · **PARCIAL** · **PLANEJADO** · **PENDENTE DE VALIDAÇÃO**.

---

## 1. Ecossistema

| Frente                       | Papel                                                    | Situação na plataforma                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Omnia Frigo Holding**      | Estratégia, integração e expansão                        | Portal institucional — PUBLICADO                                                                                                                                                                |
| **Renovação Refrigeração**   | Engenharia, projetos e execução                          | Página institucional no portal — PUBLICADO                                                                                                                                                      |
| **Fred do Frio Academy**     | Especialização e educação profissional                   | Escola ativa na área acadêmica — PUBLICADO                                                                                                                                                      |
| **TECMOVA**                  | Formação técnica e educação profissional                 | Página institucional e login da escola — PUBLICADO. Usa os identificadores legados `cte` (escola, slug e chave de mídia), que só mudam com migração segura. Sem cursos publicados até esta data |
| **Neurofrigo Command IA**    | Tecnologia, automação e IA                               | Código dos módulos de IA existe e foi homologado em DEV; **sem provedor de IA ativo em produção** — PARCIAL                                                                                     |
| **Marketplace B2B**          | Produtos, serviços, fornecedores, compradores e cotações | Fase A — PUBLICADO tecnicamente, catálogo vazio e **sem operação comercial** iniciada                                                                                                           |
| Centro Educacional Sapientia | Referência institucional                                 | Apenas cadastro institucional; **não há módulo acadêmico** nem escola operacional                                                                                                               |

## 2. Arquitetura

- **Monorepo** pnpm 9 + Turborepo, Node.js 22 (`.nvmrc`).
- **`apps/web`** — Portal (Next.js 15, React 19): site público, blog, cursos, área do aluno e do professor, área do parceiro, Marketplace.
- **`apps/admin`** — Admin e API (Payload CMS 3 sobre Next.js 15): coleções, autenticação, endpoints `/api/omnia/*`, migrations.
- **`packages/*`** — bibliotecas internas (`shared`, `ui`, `database`, `auth`, `learning-engine`, `assessment-engine`, `retrieval`, `neurofrigo-*`, entre outras).
- **Dados**: PostgreSQL 16 (schema controlado só por migrations; `push` desligado) e Redis 7 (rate limit).
- **Execução**: Docker Compose, um proxy reverso com TLS na frente do Portal e do Admin. Produção e DEV são stacks separadas, com bancos e volumes distintos.

```
apps/
  web/            Portal (Next.js)
  admin/          Payload CMS + API + migrations
packages/         bibliotecas internas do monorepo
docker/
  compose/        development.yml, staging.yml (DEV), production.yml
  production/     DEPLOY.md (runbook de produção)
  scripts/        bootstrap do Admin (migrate / seeds controlados)
ops/backup/       backup, verificação e teste de restauração
scripts/ci/       guardas de migrations e de segredos usadas no CI
docs/             documentação técnica, releases, auditorias e operação
```

## 3. Funcionalidades

### Publicadas em produção

- Portal institucional (home, sobre, empresas, contato via formulário de interesse) e blog com RSS.
- Páginas das empresas do ecossistema; `/empresas/cte` redireciona para `/empresas/tecmova`.
- Área acadêmica: login por escola (Fred do Frio e TECMOVA), cursos, aulas, materiais, avaliações, notas, progresso e certificados, com isolamento entre escolas.
- Rede de Parceiros: busca pública, perfis e cadastro sujeito a aprovação.
- **Marketplace B2B — Fase A**: catálogo público de produtos e serviços, pedido de orçamento de projeto, cadastro de fornecedor, painel do fornecedor (anúncios, equipe com convites, propostas versionadas), área do comprador (`/minhas-cotacoes`), moderação de anúncios e de revisões, trilha de auditoria.
- SEO técnico: sitemap, robots com separação entre busca e treinamento de IA, canonical, Open Graph e dados estruturados (Organization, WebSite, WebPage, BreadcrumbList, BlogPosting).

### Desligado de propósito em produção

- **Device Access Control** (limite de dispositivos por aluno): implementado, **desligado**.
- **Upload de PDF no Marketplace**: bloqueado no servidor; liga só com `MARKETPLACE_PDF_UPLOAD_ENABLED=true`. Só imagens JPEG/PNG/WebP são aceitas.

### Somente em DEV ou parciais

- Assistente de IA (tutor, concierge e agentes Neurofrigo): código e testes existem; sem provedor configurado em produção.
- Headers de segurança (HSTS, CSP em modo observação, X-Frame-Options no painel) — DEV / PENDENTE DE VALIDAÇÃO.
- Rotina de backup automatizado e teste de restauração (`ops/backup`) — validada em laboratório; **não agendada em produção**.

### Planejadas (não entregues)

- 20 conteúdos técnicos do plano editorial (`docs/editorial/`) — nenhum publicado.
- Notificações transacionais do Marketplace (e-mail de cotação, proposta e convite).
- Termos de uso e política de privacidade públicos.
- Analytics e acompanhamento de indexação.
- Migração para o domínio `omniafrigoholding.com.br`.

## 4. Desenvolvimento local

Pré-requisitos: Node.js 22, pnpm 9 (via `corepack`) e Docker.

```bash
git clone https://github.com/genesisferreira/omnia-platform.git
cd omnia-platform
corepack enable
pnpm install
cp .env.example .env          # preencha com valores locais; nunca use credenciais reais
pnpm docker:dev               # PostgreSQL, Redis e serviços de apoio locais
pnpm --filter @omnia/admin migrate
pnpm dev                      # web em :3000 e admin em :3001
```

Seeds alteram dados: rode-os só em banco local descartável. Nunca rode seeds em produção.

### Variáveis de ambiente

Os modelos sem segredos estão em `.env.example`, `.env.staging.example` e `.env.production.example`. Principais grupos:

| Grupo                        | Variáveis                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Banco e cache                | `DATABASE_URL`, `REDIS_URL`                                                    |
| Payload e integração interna | `PAYLOAD_SECRET`, `OMNIA_INTERNAL_API_SECRET`                                  |
| URLs públicas                | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`                                 |
| E-mail                       | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| IA (opcional)                | `NEUROFRIGO_LLM_PROVIDER`, `DEEPSEEK_API_KEY`                                  |
| Marketplace                  | `MARKETPLACE_PDF_UPLOAD_ENABLED` (ausente = desligado)                         |

## 5. Qualidade e testes

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm --filter @omnia/shared test:marketplace
pnpm --filter @omnia/web test:seo-google
pnpm --filter @omnia/web test:security-headers
pnpm --filter @omnia/admin test:security-headers
node scripts/ci/check-migrations.mjs
node scripts/ci/check-secrets.mjs
```

O workflow `.github/workflows/ci.yml` roda guardas (migrations e segredos), lint, typecheck, formatação, testes de contrato e build. **Ele não faz deploy** e não usa segredos de produção.

## 6. Banco e migrations

- Migrations em `apps/admin/src/migrations`, registradas em `index.ts`. O Admin **não** aplica migrations no boot.
- Aplicação controlada pelo serviço `admin-migrate` (profile `bootstrap`) do Compose, sempre depois de backup validado.
- Migrations novas devem ser aditivas; `scripts/ci/check-migrations.mjs` bloqueia `DROP`, `TRUNCATE` e `DELETE` no `up`.
- Produção está em 43 migrations (última: `20261019_180000_marketplace_invites_revisions`).

## 7. Autenticação e proteção acadêmica

- Contas e sessões do Payload (cookie `httpOnly`, `secure`, `sameSite=lax` no Portal). Papéis: `super_admin`, `instructor`, `student`, `partner` e `client`, entre outros.
- **Isolamento entre escolas**: conteúdos, matrículas e mídias são filtrados pela escola do usuário (`school_key`), com testes de regressão de leitura e escrita entre escolas.
- **Alunos primeiro**: alterações que tocam autenticação, matrículas, progresso, avaliações ou certificados exigem homologação em DEV com contas sintéticas e comparação de fingerprints antes de qualquer publicação.

## 8. Marketplace B2B

Implementado: catálogo, fornecedores, convites com aceite autenticado, moderação de revisões, cotações, propostas versionadas, mensagens, rate limit e auditoria. Ainda não pronto para operação comercial: faltam notificações por e-mail, termos de uso, processo de moderação definido e fornecedores aprovados. Detalhes em `docs/releases/MARKETPLACE_B2B_PHASE_A_PREPUBLICATION.md`.

## 9. SEO, GEO e AEO

Base técnica publicada (sitemap, robots, canonical, dados estruturados). O conteúdo de autoridade, a medição (Search Console, Bing e Analytics) e a desambiguação da marca ficam para a Fase 2. Plano editorial em `docs/editorial/omnia-google-authority-v1.md`.

## 10. Domínios

- Atual: `omniafrigo.com.br` (Portal) e subdomínio do Admin.
- Planejado: `omniafrigoholding.com.br`, com convivência e redirecionamentos controlados (Fase 2). **A migração não foi feita.** As mesmas contas serão mantidas; um novo login pode ser necessário após a troca de domínio, porque cookies não são compartilhados entre domínios diferentes.

## 11. Git, releases e CI/CD

- A produção corresponde à sequência de PRs #6 → #7 → #8 → #9, ainda não integrada à `main`. A `main` não tem conteúdo próprio (árvore igual à da Sprint 01), então pode ser avançada até a produção sem conflitos.
- Regularização planejada em `docs/governance/GIT_RELEASE_STRATEGY.md`. Proteção de branches e ativação do CI dependem de aprovação.
- Imagens de produção são construídas a partir do SHA exato e marcadas com ele; as imagens anteriores são mantidas para rollback.

## 12. Backup, deploy e rollback

- Backup e restauração: `ops/backup/` e `docs/ops/BACKUP_AND_RECOVERY.md`. O backup automático de produção e a cópia externa **ainda não estão ativos**.
- Deploy de produção: `docker/production/DEPLOY.md`. Admin primeiro, depois Portal, com `--no-deps --no-build`; Postgres e Redis não são recriados.
- Rollback de aplicação: voltar web e admin para as imagens anteriores. Restauração de banco só com decisão humana explícita.

## 13. Segurança

Linha de base e pendências em `docs/security/SECURITY_BASELINE.md`. Mudanças de produção seguem autorização individual por identificador (`docs/governance/CHANGE_MANAGEMENT.md`). Vulnerabilidades devem ser reportadas em privado aos responsáveis técnicos, nunca em issues públicas.

## 14. Limitações conhecidas

- Sem backup automático nem cópia externa em produção.
- Headers de segurança ainda não publicados em produção.
- Sem segundo fator de autenticação para administradores.
- Sem notificações transacionais no Marketplace; sem termos de uso e política de privacidade públicos.
- TECMOVA sem cursos publicados; Sapientia sem módulo acadêmico.
- `test-rbac` desatualizado (falha também na versão publicada).

## 15. Roadmap

| Fase  | Escopo                                                                                                      | Situação    |
| ----- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| **1** | Proteção: backup e recuperação, segurança, Git, CI/CD, README, inventário de domínios                       | Em execução |
| **2** | Domínio `omniafrigoholding.com.br`, SEO, GEO, AEO, Search Console, Bing, Analytics e autoridade de conteúdo | Planejada   |
| **3** | Operação comercial do Marketplace: notificações, processos, documentos jurídicos, métricas e fornecedores   | Planejada   |

## Documentação

- Contexto e arquitetura: `PROJECT_CONTEXT.md`, `TENANT_ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md`, `docs/08-architecture/`.
- Padrões: `CODING_STANDARDS.md`, `MODULES.md`, `.github/CONTRIBUTING.md`.
- Operação: `docker/production/DEPLOY.md`, `docs/ops/`.
- Releases e auditorias: `docs/releases/`, `docs/release/`, `docs/audits/`.

## Licença

[MIT](LICENSE).
