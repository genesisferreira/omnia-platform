# Marketplace B2B — Fase A — Pré-publicação

Status: **pronto para revisão em PR DRAFT**. Nenhum deploy, migration ou alteração de produção foi executado.

| Item                             | Valor                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| Produção (base)                  | `9f5a070f8c7e63c202c7d8d6a7038e4dbe6c7849` (40 migrations)                             |
| Branch                           | `feat/marketplace-b2b-phase-a`                                                         |
| Código homologado em DEV         | `1642864f3681ae34983d54b1f5abd83e5d76943d`                                             |
| Migrations novas                 | `20261016_140000_marketplace_b2b_phase_a`, `20261019_120000_marketplace_listing_media` |
| Migrations esperadas após deploy | 42                                                                                     |
| DAC                              | `false` (não alterado)                                                                 |

## 1. Escopo

Marketplace B2B mais quatro ajustes transversais:

- `packages/shared/src/portal-redirect.ts`: papel `partner` cai em `/parceiro` (antes `/ia`); `/minhas-cotacoes` é destino válido de login.
- `apps/web/src/components/layout/nav-items.ts`: item público **Marketplace** no menu.
- `apps/web/src/lib/seo/indexing.ts`: `/parceiro` e `/minhas-cotacoes` como rotas privadas (fora do sitemap, `Disallow`).
- `apps/admin/payload.config.ts`: `push: false` no adapter Postgres (schema só por migration).

Sem alterações em LMS, ILS, escolas, TECMOVA, Fred do Frio, DAC, autenticação acadêmica ou na collection `media`.

## 2. Funcionalidades

**Parceiro (`/parceiro`)**: dashboard, empresa, produtos, serviços, solicitações (em análise, recusar), propostas versionadas, oportunidades, estatísticas, plano, galeria de imagens (até 8) e ficha técnica em PDF por anúncio.

**Comprador (`/minhas-cotacoes`)**: lista de cotações, detalhe com todas as versões da proposta (vigente destacada, anteriores imutáveis), aceitar (com confirmação), pedir renegociação (mensagem obrigatória), recusar e enviar mensagens. Link em "Minha conta" e após enviar a solicitação.

**Staff (Admin Payload)**: moderação de anúncios (publicar, rejeitar, suspender), parceiros, memberships, cotações, propostas, versões, eventos e arquivos de anúncio.

## 3. Segurança — controles e evidências

| Controle                         | Implementação                                                                                                              | Teste                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Isolamento entre parceiros       | `partnerMembershipScopedAccess`, `partnerMembershipCreateAccess`                                                           | E2E: leitura/edição/proposta em outro parceiro → 403/404              |
| Isolamento entre compradores     | `quoteScopedReadAccess`; respond 404 para não-donos                                                                        | E2E: cotação/página de outro comprador → 404                          |
| Publicação só por staff          | `listingBeforeChange`                                                                                                      | E2E: parceiro publicando → 403                                        |
| Decisões comerciais              | Aceitar/renegociar só comprador; recusar parceiro ou comprador (`BUYER_ONLY_QUOTE_STATUSES`)                               | E2E: parceiro aceitar/renegociar → 400; recusa pelo parceiro → 200    |
| Versões imutáveis                | `quote-proposal-versions.update = adminsOnly`; índice único `(proposal, versionNumber)`                                    | E2E: PATCH de versão → 403                                            |
| Valores monetários               | Centavos inteiros, totais no servidor (`validateProposalBody`)                                                             | Unit + E2E (preço negativo, quantidade inválida)                      |
| Upload                           | Collection própria `partner-listing-media`; tipo pelo conteúdo (JPEG/PNG/WebP/PDF); 5 MB imagem, 10 MB PDF; nome aleatório | E2E: SVG disfarçado, HTML como PDF, slot errado → 400; 6 MB → 413     |
| Anexos privados até a publicação | `public` sincronizado por `listingAfterChange`; ACL de leitura também no binário                                           | E2E: rascunho → 403 anônimo; publicado → 200; removido/suspenso → 403 |
| IDOR em anexos                   | `assertListingFilesBelongToPartner` (dono e tipo)                                                                          | E2E: anexar arquivo de outro parceiro → 403                           |
| Rate limit                       | Cotação 10/h, proposta 30/h, resposta 30/h, upload 60/h por usuário; produção `fail-closed`                                | E2E: 429 na 8ª cotação após uso prévio da cota                        |
| XSS                              | Validação de textos livres + `JsonLd` (escapa `<`) nas páginas públicas                                                    | E2E: título com `</script>` publicado sai escapado                    |
| CSRF no upload do painel         | Rota web exige `Origin` igual à origem pública                                                                             | E2E: origem externa → 403                                             |
| Indexação                        | `robots: noindex` em `/parceiro` e `/minhas-cotacoes`; `Disallow` no robots.txt                                            | E2E: meta noindex; testes de SEO do web                               |

### Riscos residuais

1. **Sem antivírus** nos arquivos enviados. Tipos são restritos a imagens e PDF validados pelo conteúdo, mas PDFs não são inspecionados por malware.
2. **Manager vincula qualquer usuário existente** à própria empresa, já ativo, sem convite/aceite. Não eleva privilégios fora da empresa.
3. **Alteração de anúncio publicado** (texto ou anexos) não volta para moderação.
4. **`Origin` ausente aceita** nos endpoints do Admin para chamadas server-to-server; navegadores sempre enviam `Origin` em POST cross-site.
5. **Usuários `partner` em produção**: 0 hoje, então a mudança de redirect `/ia` → `/parceiro` não afeta ninguém.
6. **Menu "Marketplace"** aparece com catálogo vazio até haver parceiros e anúncios aprovados.

### LGPD

- Cotações copiam nome, e-mail e telefone do comprador para o parceiro destinatário, que precisa deles para responder (execução de contrato/pré-contrato). Nada disso sai em API pública.
- Logs dos endpoints são genéricos, sem dados pessoais nem conteúdo das mensagens.
- `quote_requests.buyer_user_id` usa `ON DELETE restrict`: excluir um usuário com cotações falha de propósito, para preservar o histórico comercial. Pedido de eliminação exige procedimento manual pelo staff (anonimizar `contact_*`, descrição e mensagens, ou remover as cotações) antes de excluir o usuário.

## 4. Migrations

**41 — `20261016_140000_marketplace_b2b_phase_a`**: 10 tabelas novas e 7 colunas em `payload_locked_documents_rels`. Somente `CREATE ... IF NOT EXISTS` e `ADD CONSTRAINT` idempotentes.

**42 — `20261019_120000_marketplace_listing_media`**: tabela `partner_listing_media`, coluna `datasheet_id` nos dois tipos de anúncio, coluna em `payload_locked_documents_rels`, e as FKs das galerias passam de `media` para `partner_listing_media`. Aborta com erro se alguma galeria já tiver linhas.

Nenhuma das duas altera tabelas acadêmicas ou a tabela `media`; nenhuma tem `DROP`/`TRUNCATE` no `up`.

**Dry-run em Postgres descartável** (rede Docker isolada, restaurado do dump DEV pré-Marketplace com 40 migrations):

- 40 → 42 aplicadas; reexecução sem efeito (idempotente).
- `migrate:down` volta a 40 e remove as 11 tabelas; reaplicação volta a 42.
- Guard da 42: com uma linha na galeria, a migration falha, não é registrada e a linha é preservada.
- Fingerprints de matrículas, certificados, usuários, mídia, DAC e do schema acadêmico idênticos em todas as etapas.
- Container e rede descartáveis removidos ao final.

## 5. Plano de deploy (não executar sem autorização explícita)

Pré-requisitos: PR aprovado; janela combinada; `APP_VERSION` desdefinido; tags de imagem com SHA completo.

1. **Leitura**: web/admin em `9f5a070…`, healthy, `payload_migrations = 40`, DAC `false`, disco livre (hoje ≈ 22,6 GB; banco ≈ 29 MB; mídia ≈ 95 MB).
2. **Backup**: `pg_dump -Fc` de `omnia_platform_prod` + `tar` do volume `omnia_platform_admin_media_prod`; `sha256sum`, `pg_restore -l` e `gzip -t`.
3. **Fingerprint acadêmico** antes (referência atual: `ENROLL_FP=9f29639f…`, `CERT_FP=f89a05f8…`).
4. **Build**: `web`, `admin` e `admin-bootstrap` com o SHA final.
5. **Migration**: `docker compose … --profile bootstrap run --rm --no-deps admin-migrate` → 42 migrations, fingerprints iguais. O boot do admin **não** aplica estas migrations sozinho.
6. **Admin** e depois **web**: `up -d --no-deps --no-build`, aguardando healthy.
7. **Smoke**: `/marketplace*` 200, `/parceiro` e `/minhas-cotacoes` 307 sem sessão, APIs públicas 200, Fred e TECMOVA (login, aula, avaliação, certificado), robots e sitemap.
8. **Monitoramento**: 30 min.

Postgres e Redis não são reiniciados. O rate limit em produção exige Redis (`REDIS_URL` presente no admin de produção).

## 6. Rollback

- **Aplicação**: voltar web/admin para `omnia-platform-{web,admin}-prod:9f5a070f8c7e63c202c7d8d6a7038e4dbe6c7849` (imagens presentes no host) com `--no-deps --no-build`. O código antigo ignora as tabelas novas.
- **Banco**: manter as tabelas aditivas. `migrate:down` só se não houver dados reais do Marketplace (apaga essas tabelas).
- **Restore do dump**: último recurso; perde escritas acadêmicas posteriores ao backup.

## 7. Credencial Postgres DEV

A senha de `omnia_admin` (DEV) apareceu em saída de terminal durante a homologação anterior. Inventário: não reutilizada em produção (produção usa `omnia_prod` em outro container); consumidores só `omnia-platform-{web,admin}-dev`. Rotacionada em 2026-10-19 com backup DEV prévio; a senha antiga é rejeitada e a nova autentica pela rede Docker. Arquivos atualizados: `/opt/omnia/platform/.env.staging` (os `.env.staging` dos builds são symlinks para ele) e `/opt/omnia/stacks/database/.env`. Servidores salvos no pgAdmin DEV, se houver, precisam da senha nova.

## 8. Dados sintéticos em DEV

Namespace `HOMOLOG_MARKETPLACE_20261016`: parceiros `homolog-mk-*` (ids 8, 9, 10), usuários `homolog.mk.*@example.invalid` (ids 42–48) e anúncios, arquivos, cotações, propostas e eventos ligados a eles. Remoção segura: filtrar por esses slugs/ids e apagar eventos → versões → propostas → cotações → anúncios → arquivos → memberships → parceiros → usuários. Nunca em cascata a partir de tabelas acadêmicas.

## 9. Pendências conhecidas

- `test-rbac` ("define os sete papéis") falha também em produção (`9f5a070`): teste desatualizado, fora do escopo.
- `apps/web/src/lib/seo/json-ld.ts` não passa no `format:check`; pré-existente, não alterado.
- PR com base em `feat/tecmova-institutional` (= produção). A `main` está 335 commits atrás da produção; o CI só roda para PRs contra `main`/`develop`.
- Verificação visual do painel em mobile não executada (requer login interativo).
