# Decisões Vigentes

## Autoridade

- ADR transversal aceito:
  `docs/07-adrs/ADR-011_PLATFORM_PRINCIPLES.md`.
- ADRs técnicos históricos:
  `docs/14-adr/ADR-001-*` a `ADR-008-*`.
- Há dívida documental de dois diretórios de ADR; não mover arquivos sem decisão.

## Decisões arquiteturais consolidadas

1. **Monorepo modular** com pnpm/Turborepo.
2. **Portal e CMS separados**: `apps/web` consome APIs; Payload fica em `apps/admin`.
3. **CMS-First**: conteúdo administrável no Payload; código define estrutura.
4. **Payload para editorial, Drizzle para transacional**.
5. **Multi-tenant/multiempresa/multisite** com ownership explícito.
6. **Design system compartilhado** por `@omnia/ui`.
7. **Evolução incremental**; mudanças estruturais exigem ADR.
8. **IA assistiva e human-in-the-loop**; nunca publica automaticamente.
9. **Portal como hub**; sites oficiais podem coexistir.
10. **Deploy containerizado** com migrations/seeds one-off.

## Decisões implementadas no foundation CMS

- Site é resolvido server-side por hostname via endpoint interno autenticado.
- Pages possuem slug único por Site e uma única Home por Site.
- Conteúdo público usa DTO allowlist; documentos Payload não chegam diretamente ao Web.
- Block Renderer aceita apenas block types registrados.
- Página pública inexistente retorna 404; `/home` redireciona permanentemente para `/`.
- Home e páginas institucionais são criadas/evoluídas por operações idempotentes.

## Decisões locais pendentes de commit

As decisões abaixo estão implementadas e validadas localmente, mas ainda não são
baseline versionado:

- Navegação institucional usa uma lista compartilhada entre Header e Footer.
- `/[slug]` resolve Pages `standard` publicadas pelo endpoint existente.
- Sobre, Empresas e Contato são seeds canônicos que nunca sobrescrevem slug existente.
- SEO reutiliza o `PublicPageSeoDto`; nenhuma collection foi ampliada.
- Canonical editorial tem precedência; ausência gera canonical por hostname.
- JSON-LD institucional é gerado pelo Portal, não armazenado no CMS.
- Sitemap atual lista apenas páginas institucionais conhecidas e publicadas.
- Alt de logo é normalizado na camada pública sem alterar o layout.

## Restrições operacionais decididas

- Não usar `payload migrate:down` no fluxo institucional atual.
- Não executar seed geral em banco existente para este deploy.
- Preservar conteúdo editorial divergente e exigir revisão manual.
- Produção e staging precisam de evidência independente; não inferir um do outro.

## Como registrar nova decisão

Criar/alterar ADR quando houver:

- nova aplicação, package estrutural ou domínio;
- mudança de fronteira Payload/Drizzle/Portal;
- alteração de tenancy, segurança ou ownership;
- tecnologia com responsabilidade sobreposta;
- breaking change ou mudança no fluxo de deploy/rollback.

Decisões locais de implementação podem ser documentadas no PR, desde que não
alterem os princípios acima.
