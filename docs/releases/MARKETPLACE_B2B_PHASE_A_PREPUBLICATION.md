# Marketplace B2B — Fase A — Pré-publicação

Status: **pronto para revisão em PR DRAFT**. Nenhum deploy, migration ou alteração de produção foi executado.

| Item                             | Valor                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Produção (base)                  | `9f5a070f8c7e63c202c7d8d6a7038e4dbe6c7849` (40 migrations)                                                                              |
| Branch                           | `feat/marketplace-b2b-phase-a`                                                                                                          |
| Código homologado em DEV         | `0d304da0daa465895b7769ceb0292ba0ad753d27` (upload de PDF desligado por padrão)                                                         |
| Migrations novas                 | `20261016_140000_marketplace_b2b_phase_a`, `20261019_120000_marketplace_listing_media`, `20261019_180000_marketplace_invites_revisions` |
| Migrations esperadas após deploy | 43                                                                                                                                      |
| DAC                              | `false` (não alterado)                                                                                                                  |
| Sapientia                        | **Fora desta publicação** (seção 10)                                                                                                    |

## 1. Escopo

Marketplace B2B mais ajustes transversais:

- `packages/shared/src/portal-redirect.ts`: papel `partner` cai em `/parceiro` (antes `/ia`); `/minhas-cotacoes` e `/convite` são destinos válidos de login.
- `apps/web/src/components/layout/{Header,Footer,nav-items,partners-menu}.ts(x)`: menus **Parceiros** e **Marketplace**, rodapé com as mesmas entradas e menu compacto abaixo de 1024 px.
- `apps/web/src/lib/seo/indexing.ts`: `/parceiro`, `/minhas-cotacoes` e `/convite` como rotas privadas (fora do sitemap, `Disallow`).
- `apps/admin/payload.config.ts`: `push: false` no adapter Postgres (schema só por migration).

Sem alterações em LMS, ILS, escolas, TECMOVA, Fred do Frio, DAC, autenticação acadêmica ou na collection `media`.

## 2. Funcionalidades

**Público**: `/marketplace` com vitrine (cards com imagem, preço ou "sob consulta"), fornecedores aprovados, estados vazios orientativos e passos do comprador; `/marketplace/produtos`, `/marketplace/servicos`, `/marketplace/projeto`.

**Entrada de fornecedores**: CTAs "Quero vender no Marketplace" e "Seja um parceiro Omnia Frigo" em `/marketplace`, no menu, em `/parceiros` e no rodapé. A página `/marketplace/seja-um-fornecedor` reutiliza o cadastro de parceiros existente (`/api/omnia/partner-register`, collection `partners`), sem cadastro paralelo. Campos novos: `contactName` (obrigatório quando há intenção de vender) e `marketplaceIntent` (`products`/`services`/`both`). O cadastro entra `pending`, sem owner, sem membership e sem privilégio por CNPJ; a mensagem de sucesso não promete aprovação. Antispam: honeypot e rate limit por IP+e-mail (5 a cada 15 min). Domínios reservados (`example.*`, `.invalid`, `.test`, `localhost`) não disparam e-mail.

**Equipe do parceiro (`/parceiro/equipe`)**: owner/manager convidam por e-mail, revogam convites pendentes, alteram papel e revogam membros. O link do convite aparece uma única vez.

**Convite (`/convite?token=…`)**: aceite exige login com o mesmo e-mail convidado e conta `active`.

**Parceiro (`/parceiro`)**: dashboard, empresa, produtos, serviços, solicitações, propostas versionadas, oportunidades, estatísticas, plano, galeria de imagens (até 8) e ficha técnica em PDF. Em anúncio publicado ou suspenso, edições ficam "em revisão" com aviso do que está pendente.

**Comprador (`/minhas-cotacoes`)**: lista e detalhe com todas as versões da proposta, aceitar, pedir renegociação, recusar e enviar mensagens.

**Staff (Admin Payload)**: moderação de anúncios e de revisões, parceiros, memberships, convites (somente leitura), trilha de auditoria (somente leitura), cotações, propostas, versões, eventos e arquivos.

## 3. Segurança — controles e evidências

| Controle                         | Implementação                                                                                                                                                                                                                                                                                                                                                                                                                | Teste (DEV)                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Isolamento entre parceiros       | `partnerMembershipScopedAccess`                                                                                                                                                                                                                                                                                                                                                                                              | E2E: leitura/edição/proposta em outro parceiro → 403/404                                                                               |
| Isolamento entre compradores     | `quoteScopedReadAccess`; respond 404 para não-donos                                                                                                                                                                                                                                                                                                                                                                          | E2E: cotação/página de outro comprador → 404                                                                                           |
| Publicação só por staff          | `listingBeforeChange`                                                                                                                                                                                                                                                                                                                                                                                                        | E2E: parceiro publicando → 403                                                                                                         |
| Convite explícito                | Token de 32 bytes, só o hash SHA-256 é gravado (`tokenHash` sem leitura); expira em 7 dias; uso único; revogável                                                                                                                                                                                                                                                                                                             | E2E: token forjado → 404; reuso → 409; revogado inutilizável                                                                           |
| Aceite com consentimento         | Login obrigatório, e-mail igual ao convidado, conta `active`, sem papel acadêmico (`student`/`instructor`)                                                                                                                                                                                                                                                                                                                   | E2E: outro e-mail → 403; conta pendente → 403                                                                                          |
| Sem escalada                     | Membership só por staff ou aceite de convite; convites só de owner/manager; manager não convida nem promove owner; `client → partner` só no aceite                                                                                                                                                                                                                                                                           | E2E: membership direta → 403; editor não convida nem lê equipe → 404                                                                   |
| Revogação                        | `status = revoked` corta o acesso; reativação só por novo convite                                                                                                                                                                                                                                                                                                                                                            | E2E: revogado → 403; reativar por PATCH → 403; reconvite → 200                                                                         |
| Auditoria                        | `marketplace-audit-events` append-only (create/update/delete negados pela API), leitura staff/owner/manager                                                                                                                                                                                                                                                                                                                  | E2E: eventos de convite, membership e revisão; editor → 403; POST → 403                                                                |
| Revisão moderada                 | Edição de anúncio publicado/suspenso vai para `pendingRevision` (diff de → para); o público vê a versão aprovada até a decisão                                                                                                                                                                                                                                                                                               | E2E: título/preço inalterados no público; autoaprovação ignorada; aprovar/rejeitar                                                     |
| Decisões comerciais              | Aceitar/renegociar só comprador; recusar parceiro ou comprador                                                                                                                                                                                                                                                                                                                                                               | E2E: parceiro aceitar/renegociar → 400                                                                                                 |
| Versões imutáveis                | `quote-proposal-versions.update = adminsOnly`; índice único `(proposal, versionNumber)`                                                                                                                                                                                                                                                                                                                                      | E2E: PATCH de versão → 403                                                                                                             |
| Valores monetários               | Centavos inteiros, totais no servidor                                                                                                                                                                                                                                                                                                                                                                                        | Unit + E2E                                                                                                                             |
| Upload                           | Collection própria `partner-listing-media`; tipo pelo conteúdo; 5 MB imagem, 10 MB PDF; nome aleatório                                                                                                                                                                                                                                                                                                                       | E2E: SVG disfarçado, HTML como PDF, slot errado → 400; 6 MB → 413                                                                      |
| Upload de PDF desligado          | `MARKETPLACE_PDF_UPLOAD_ENABLED` (só liga com `true` explícito; ausente = desligado). Bloqueio no hook da collection `partner-listing-media` (qualquer origem, inclusive staff, REST direto e PDF disfarçado de imagem), no endpoint do Admin e na rota do web; o painel troca o envio por aviso. O Compose de produção lista o `environment` explicitamente, então a variável não chega ao container sem mudança no Compose | DEV `0d304da`, flag ausente: 11/11 (PDF → 403 em painel, endpoint, REST parceiro/staff e disfarçado; imagem → 201; nenhum PDF gravado) |
| PDF ativo                        | `scanPdfForActiveContent`: rejeita `/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFiles`, `/RichMedia`, `/XFA`, `/SubmitForm`, `/ImportData`, `/GoToE` e PDF criptografado; decodifica `#xx` e infla streams Flate                                                                                                                                                                                                               | Unit 5/5; E2E: PDF com JS → 400; criptografado → 400                                                                                   |
| Download de arquivos             | `nosniff`; CSP `sandbox; default-src 'none'`; `Cross-Origin-Resource-Policy: same-site`; `Cache-Control: no-cache`; PDF como `attachment`                                                                                                                                                                                                                                                                                    | E2E: headers conferidos no download anônimo de anúncio publicado                                                                       |
| Anexos privados até a publicação | `public` sincronizado por `listingAfterChange`; ACL no binário; anexo em revisão fica privado até aprovar                                                                                                                                                                                                                                                                                                                    | E2E: rascunho/revisão → 403 anônimo; aprovado → 200                                                                                    |
| IDOR em anexos                   | `assertListingFilesBelongToPartner` (dono e tipo), também na aprovação da revisão                                                                                                                                                                                                                                                                                                                                            | E2E: anexar arquivo de outro parceiro → 403                                                                                            |
| Rate limit                       | Cotação 10/h, proposta 30/h, resposta 30/h, upload 60/h, convites 30/h por usuário; produção `fail-closed`                                                                                                                                                                                                                                                                                                                   | Teste isolado em janela nova: usos 1–10 → 201, 11º → 429 (`Retry-After` 3533 s)                                                        |
| XSS                              | Validação de textos livres + `JsonLd` escapado; e-mail de cadastro com HTML escapado                                                                                                                                                                                                                                                                                                                                         | E2E: título com `</script>` sai escapado                                                                                               |
| CSRF no upload do painel         | Rota web exige `Origin` igual à origem pública                                                                                                                                                                                                                                                                                                                                                                               | E2E: origem externa → 403                                                                                                              |
| Indexação                        | `noindex` em `/parceiro`, `/minhas-cotacoes`, `/convite`; `Disallow` no robots.txt                                                                                                                                                                                                                                                                                                                                           | Testes de SEO do web                                                                                                                   |

### Riscos residuais

1. **Sem antivírus.** Por isso o upload de PDF fica **desligado em produção** nesta publicação (flag acima); só imagens JPEG/PNG/WebP são aceitas. Para religar no futuro: antivírus isolado ou decisão explícita, variável no `environment` do admin e do web no Compose. Não há ClamAV nem serviço equivalente na VPS, e instalar um serviço pesado está fora do escopo. Os PDFs passam por uma **verificação heurística de conteúdo ativo**, que **não é inspeção de malware**: um PDF malicioso que explore falha do leitor sem usar essas construções não é detectado. Mitigação: download como `attachment` com CSP `sandbox`, só para anúncios aprovados, e moderação humana antes da publicação. Antivírus isolado com quarentena fica para uma fase seguinte.
2. **Login permite conta `pending`** (só `blocked` é barrado) e não há verificação de e-mail. Por isso o aceite de convite exige conta `active` e e-mail igual; quem cria conta com o e-mail de outra pessoa não consegue aceitar sem a conta estar ativa.
3. **`Origin` ausente aceita** nos endpoints do Admin para chamadas server-to-server; navegadores sempre enviam `Origin` em POST cross-site.
4. **Usuários `partner` em produção**: 0 hoje, então a mudança de redirect `/ia` → `/parceiro` não afeta ninguém.
5. **Catálogo vazio** em produção até haver parceiros e anúncios aprovados; as páginas mostram estados vazios orientativos.
6. **E-mail de convite não é enviado**: o link é exibido uma vez para quem convidou repassar. Envio automático depende de configuração de e-mail transacional.

### LGPD

- Cotações copiam nome, e-mail e telefone do comprador para o parceiro destinatário, que precisa deles para responder. Nada disso sai em API pública.
- Convites guardam e-mail convidado e hash do token; a auditoria guarda ids de usuário e diffs de anúncio, sem senhas nem tokens.
- Logs dos endpoints são genéricos, sem dados pessoais nem conteúdo das mensagens.
- `quote_requests.buyer_user_id` usa `ON DELETE restrict`: pedido de eliminação exige procedimento manual pelo staff antes de excluir o usuário.

## 4. Migrations

**41 — `20261016_140000_marketplace_b2b_phase_a`**: 10 tabelas novas e 7 colunas em `payload_locked_documents_rels`. Somente `CREATE ... IF NOT EXISTS` e `ADD CONSTRAINT` idempotentes.

**42 — `20261019_120000_marketplace_listing_media`**: tabela `partner_listing_media`, coluna `datasheet_id` nos anúncios, FKs das galerias passam de `media` para `partner_listing_media`. Aborta se alguma galeria já tiver linhas.

**43 — `20261019_180000_marketplace_invites_revisions`**: colunas `contact_name` e `marketplace_intent` em `partners`; tabelas `partner_invitations` (`token_hash` único) e `marketplace_audit_events`; colunas de revisão (`revision_status`, `revision_notes`, `pending_revision`, `revision_submitted_at`, `revision_submitted_by_id`) nos dois tipos de anúncio; colunas em `payload_locked_documents_rels`. Somente aditiva; `down` correspondente.

Nenhuma altera tabelas acadêmicas ou `media`; nenhuma tem `DROP`/`TRUNCATE` no `up`.

**Dry-run em Postgres descartável** (rede Docker isolada, restaurado do dump DEV com 40 migrations):

- 40 → 43 aplicadas; reexecução sem efeito.
- `migrate:down` volta a 40; reaplicação volta a 43.
- Guard da 42 verificado.
- Fingerprints acadêmicos, de mídia, DAC e de `partners` idênticos em todas as etapas.
- Container e rede descartáveis removidos ao final.

**DEV**: backup `/opt/omnia/backups/marketplace-v4-dev-20261019-160311` antes de aplicar 42 → 43.

## 5. Verificações executadas (o CI não roda para PRs com base `feat/tecmova-institutional`)

| Verificação                                                                                                            | Resultado                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck web, admin e shared                                                                                          | PASS                                                                                                                                  |
| ESLint e Prettier nos arquivos alterados                                                                               | PASS                                                                                                                                  |
| Unit `test-partners-nav` (web)                                                                                         | 17/17 PASS                                                                                                                            |
| Unit `test:marketplace` e `test-public-origin` (shared), `test-partner-register` e `test-marketplace-pdf-scan` (admin) | PASS (34/34, 9/9, 7/7, 5/5)                                                                                                           |
| Build Docker web/admin/admin-bootstrap (`d04fc71`)                                                                     | PASS                                                                                                                                  |
| E2E rodada 3 — fornecedor, convites, permissões, auditoria, revisões, PDFs                                             | 44/44 PASS (rate limit medido à parte, abaixo)                                                                                        |
| Rate limit isolado em janela nova                                                                                      | PASS                                                                                                                                  |
| Navegador desktop 1366 px                                                                                              | PASS: um menu por vez, clique fora, Escape com retorno de foco, seta para baixo, `aria-expanded`, fecha ao navegar                    |
| Navegador tablet 820 px e mobile 390 px                                                                                | PASS: menu compacto, sem transbordo, Escape, fecha ao navegar, ordem de foco no painel                                                |
| E2E rodada 1 — anúncios, cotações, propostas, isolamento                                                               | 65/65 PASS                                                                                                                            |
| E2E rodada 2 — uploads, IDOR, XSS, CSRF, LGPD                                                                          | 61/61 PASS (remoção de imagem em anúncio publicado agora é revisão: a imagem segue pública até a aprovação e fica privada depois)     |
| Regressão Fred/TECMOVA em DEV                                                                                          | PASS: páginas, login de escola, alunos e professores das duas escolas (aula, avaliações, notas, certificados, isolamento 404, logout) |
| Fingerprints acadêmicos DEV e DAC                                                                                      | Iguais em todos os deploys DEV; DAC `false`                                                                                           |
| Produção                                                                                                               | Somente leitura; containers não reiniciados                                                                                           |

O Tab nativo não pôde ser exercitado no navegador automatizado (o webview não recebe foco do sistema); a ordem de foco foi verificada pelo DOM.

## 6. Plano de deploy (não executar sem autorização explícita)

Pré-requisitos: PR aprovado; janela combinada; `APP_VERSION` desdefinido; tags de imagem com SHA completo.

1. **Leitura**: web/admin em `9f5a070…`, healthy, `payload_migrations = 40`, DAC `false`, disco livre.
2. **Backup**: `pg_dump -Fc` de `omnia_platform_prod` + `tar` do volume `omnia_platform_admin_media_prod`; `sha256sum`, `pg_restore -l` e `gzip -t`.
3. **Fingerprint acadêmico** antes (referência atual: `ENROLL_FP=9f29639f…`, `CERT_FP=f89a05f8…`).
4. **Build**: `web`, `admin` e `admin-bootstrap` com o SHA final.
5. **Migration**: `docker compose … --profile bootstrap run --rm --no-deps admin-migrate` → 43 migrations, fingerprints iguais. O boot do admin **não** aplica migrations sozinho.
6. **Admin** e depois **web**: `up -d --no-deps --no-build`, aguardando healthy.
7. **Smoke**: `/marketplace*` e `/marketplace/seja-um-fornecedor` 200, `/parceiro`, `/minhas-cotacoes` e `/convite` sem sessão redirecionam ao login, APIs públicas 200, Fred e TECMOVA (login, aula, avaliação, certificado), robots e sitemap.
8. **Monitoramento**: 30 min.

Postgres e Redis não são reiniciados. O rate limit em produção exige Redis.

## 7. Rollback

- **Aplicação**: voltar web/admin para `omnia-platform-{web,admin}-prod:9f5a070f8c7e63c202c7d8d6a7038e4dbe6c7849` (imagens presentes no host) com `--no-deps --no-build`. O código antigo ignora tabelas e colunas novas.
- **Banco**: manter as estruturas aditivas. `migrate:down` só se não houver dados reais do Marketplace.
- **Restore do dump**: último recurso; perde escritas acadêmicas posteriores ao backup.

## 8. Credencial Postgres DEV

A senha de `omnia_admin` (DEV) apareceu em saída de terminal numa homologação anterior. Não é reutilizada em produção. Rotacionada em 2026-10-19 com backup DEV prévio; a senha antiga é rejeitada. Arquivos atualizados: `/opt/omnia/platform/.env.staging` (os `.env.staging` dos builds são symlinks para ele) e `/opt/omnia/stacks/database/.env`.

## 9. Dados sintéticos em DEV

Namespace `HOMOLOG_MARKETPLACE_20261016`: parceiros `homolog-mk-*` e fornecedores `Homolog Fornecedor *`, usuários `homolog.mk.*@example.invalid` (ids 42–51) e anúncios, arquivos, convites, eventos de auditoria, cotações e propostas ligados a eles. Remoção segura: filtrar por esses slugs/ids e apagar auditoria → convites → eventos → versões → propostas → cotações → anúncios → arquivos → memberships → parceiros → usuários. Nunca em cascata a partir de tabelas acadêmicas. Esses dados nunca vão para produção.

## 10. Sapientia — auditoria somente leitura

| Item                                | Classificação                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Módulo de código Sapientia          | **AUSENTE**: nenhuma rota, collection, migration, endpoint, teste, recurso de IA ou variável de ambiente                                                                             |
| Branch, PR ou commit                | **AUSENTE**: nenhuma das 42 branches do GitHub nem mensagens de commit; nenhuma worktree local com código Sapientia                                                                  |
| Imagem ou container                 | **AUSENTE** na VPS (DEV e produção)                                                                                                                                                  |
| Cadastro institucional              | **IMPLEMENTADO**: empresa "Centro Educacional Sapientia" (`centro-educacional-sapientia`, `showInEcosystem=false`), site externo e organização nos seeds; presente em DEV e produção |
| Integração com Fred/TECMOVA         | **AUSENTE**: escolas atuais são `fred-do-frio` e `cte` (TECMOVA) em `intelligent-learning`, na `schoolKey` da `media` e no tutor-guard                                               |
| Relação institucional com a holding | **NÃO VERIFICADO**: decisão jurídica/humana pendente                                                                                                                                 |
| SHA exato do Sapientia              | **NÃO VERIFICADO**: não há código no repositório; se existir em outro repositório, é preciso informá-lo                                                                              |

**Conclusão**: não há o que integrar nesta publicação. Incluir o Sapientia como escola exigiria uma nova `schoolKey`, migrations no domínio acadêmico (escolas, matrículas, mídia por escola, tutor-guard) e regressão completa de Fred e TECMOVA, o que mexe no isolamento acadêmico. **Recomendação: publicações separadas.** O Marketplace segue sozinho; o Sapientia entra num PR próprio, com:

1. Escopo definido (portal institucional, escola no LMS ou os dois) e decisão sobre a relação com a holding.
2. Branch própria a partir da produção vigente, migrations numeradas depois da 43 e sem tocar nas tabelas do Marketplace.
3. Homologação em DEV com backup, dry-run em banco descartável, regressão Fred/TECMOVA, fingerprints acadêmicos e DAC `false`.
4. Rollback por imagem e migrations aditivas, como neste plano.

## 11. Pendências conhecidas

- `test-rbac` ("define os sete papéis") falha também em produção (`9f5a070`): teste desatualizado, fora do escopo.
- `apps/web/src/lib/seo/json-ld.ts` não passa no `format:check`; pré-existente, não alterado.
- PR com base em `feat/tecmova-institutional` (= produção). O CI só roda para PRs contra `main`/`develop`; as verificações foram executadas e registradas acima.
- Antivírus para arquivos enviados (risco residual 1).
