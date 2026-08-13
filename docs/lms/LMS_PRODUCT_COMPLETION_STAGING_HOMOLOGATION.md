# LMS Product Completion — Homologação Staging

Data: 2026-08-13  
Branch: `feature/lms-product-completion`  
Produto SHA: `6db7f63838bce22b1f5dd46893f575b4ea01d337`  
CI: https://github.com/genesisferreira/omnia-platform/actions/runs/31706806035 — **GREEN**

## Backup

| Campo         | Valor                                                               |
| ------------- | ------------------------------------------------------------------- |
| Path          | `/opt/omnia/backups/staging/lms-product-completion-20260813-135654` |
| Dump          | `omnia_staging.dump` (1.2M, custom format)                          |
| SHA256        | `48e0b90567ae0453e2d1f4e046c21e11e95d3f5b748dee8a4b4c7bbb9cec3263`  |
| Timestamp UTC | 2026-08-13 13:56:54                                                 |

Backup validado (`test -s`) **antes** da migration.

## Migration

- Fresh CI: `test:pages-migration-db` GREEN (inclui `20260813_120000_lms_product_completion`)
- Upgrade staging: `admin-migrate` → `Done.` / `MIGRATE_OK`
- Produção: **não executada**

## Deploy

Somente `admin` + `web` DEV.

| Campo          | Valor                                               |
| -------------- | --------------------------------------------------- |
| DEPLOY_SHA     | `6db7f63838bce22b1f5dd46893f575b4ea01d337`          |
| Admin DEV      | healthy, database up                                |
| Web DEV        | HTTP 200                                            |
| Landing        | 200, container `omnia-landing-lancamento` Up 2 days |
| Moodle         | 200, `omnia-lms-moodle-dev` healthy                 |
| Admin/Web PROD | containers intactos (`:2.3.0`, Up 2 days)           |

## Contas E2E

Reutilizadas contas controladas EPIC 16 (`e2e.*.@example.invalid`).  
Senhas geradas em runtime, **não versionadas**, não impressas neste documento.

## Evidências funcionais (staging real)

| Fluxo                                                             | Resultado                                       |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| Student login / dashboard / cursos / aula / material (1 asset)    | PASS                                            |
| Concluir aulas → progresso 17% → 100%                             | PASS (progresso real)                           |
| Avaliação TF aberta sem gabarito (`leak=False`)                   | PASS                                            |
| Tentativa + auto-grade 100 + publish                              | PASS                                            |
| Aluno vê nota publicada + feedback                                | PASS                                            |
| Dissertativa `needsManualGrade=true` + correção 85 + publish      | PASS                                            |
| Cross-tenant student B → 403 matrícula                            | PASS                                            |
| Professor turma alheia `999999` → 404                             | PASS                                            |
| Certificado: não elegível enquanto avaliações publicadas sem nota | PASS (regra acadêmica)                          |
| Certificado elegível `OMN-20F104688EBD` status valid              | PASS                                            |
| `/certificados/OMN-20F104688EBD` 200                              | PASS                                            |
| `/certificados/INVALID-CODE-XYZ` 200 (não encontrado)             | PASS                                            |
| Tutor na aula / `/ia` / dock context                              | PASS (sem gabarito)                             |
| Admin panel + health                                              | PASS                                            |
| Mobile                                                            | páginas aluno/professor 200 no shell responsivo |

## Gaps não bloqueantes

- Continue aponta ao curso, não ao timestamp do vídeo.
- Upload binário do professor ainda via Admin/media existente.
- Sem conta Professor B; cross-tenant professor validado via turma inexistente/alheia (404).
- Certificado só emite se **todas** as avaliações published do curso tiverem tentativa published ≥ passing.

## Produção / Moodle / Landing

Não tocadas. Health PROD admin 200. Moodle RO intacto.
