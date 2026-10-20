# S03 — Collection `domains` (especificação técnica)

> **Status:** Especificação aprovável para Feature 006B  
> **Branch alvo:** `feature/sprint-03-cms-foundation`  
> **Não implementar nesta etapa** — somente contrato documental.

Alinhado a: `S03_MULTISITE_BRANDING.md`, `S03_COLLECTION_SITES.md`, ADR-011,  
`lib/branding/domain.ts`, `lib/site-resolver/contracts.ts`.

---

## 1. Responsabilidade

### Representa

Um **hostname** (domínio ou subdomínio) que resolve para um **Site** na Omnia Platform.

### Não representa

| Entidade             | Motivo                                |
| -------------------- | ------------------------------------- |
| Site                 | Collection `sites`                    |
| Company / Brand      | Ownership no Site                     |
| URL de página / path | `pages`, rotas do portal              |
| Redirect de conteúdo | Futura `redirects` (path → path)      |
| App Admin            | Fora da resolução pública (`admin.*`) |

---

## 2. Campos MVP

| Campo                | Tipo Payload           | Obrig. | Notas                                              |
| -------------------- | ---------------------- | ------ | -------------------------------------------------- |
| `hostname`           | text                   | Sim    | Valor informado no admin (pode vir “sujo”)         |
| `normalizedHostname` | text                   | Sim    | Resultado canônico; **unique**; chave de resolução |
| `site`               | relationship → `sites` | Sim    | Site alvo                                          |
| `environment`        | select                 | Sim    | Ver §4                                             |
| `isPrimary`          | checkbox               | Sim    | Default `false`                                    |
| `isActive`           | checkbox               | Sim    | Default `true`                                     |
| `redirectToPrimary`  | checkbox               | Sim    | Default `false`; só secundários                    |
| `forceHttps`         | checkbox               | Sim    | Default `true`                                     |
| `notes`              | textarea               | Não    | Internas admin                                     |

### Sem campo `status`

Operação via **`isActive`** + **`environment`**. Evita colisão com `_status` do Payload e com `siteStatus` do Site.

### Campos adiados (sem stub)

`brand`, `redirects`, certificados TLS, `analytics` — **não criar** até existirem collections/processos.

---

## 3. Environments

Reutilizar `SITE_ENVIRONMENTS`:

`local` | `development` | `staging` | `production`

Default seed/staging: conforme ambiente do hostname (ex.: `dev.*` → `staging`).

---

## 4. Relacionamentos

### MVP

| Campo  | Collection | Cardinalidade |
| ------ | ---------- | ------------- |
| `site` | `sites`    | N:1           |

### Futuro

brand · redirects · certificados · analytics — **sem FK temporária**.

Compatível com `SiteDomainRecord` / `SiteDomainRepository.findByHostname` (`site-resolver/contracts.ts`).

---

## 5. Regras de hostname e normalização

Fonte de verdade da normalização: `normalizeHostname` em `lib/branding/domain.ts`.

| Regra                          | Comportamento                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Unicidade                      | `normalizedHostname` **unique** global                                        |
| Sem protocolo                  | Remover `http(s)://`                                                          |
| Sem caminho / query / fragment | Descartar                                                                     |
| Lowercase                      | Sim                                                                           |
| Remover porta                  | Sim                                                                           |
| Remover ponto final            | Sim                                                                           |
| Remover `www.` inicial         | **Sim** (decisão alinhada ao helper atual)                                    |
| Subdomínios                    | Preservar (`admin.dev.…`, `dev.…`)                                            |
| `localhost` / IPv4             | Permitidos só se `environment ∈ {local, development}`                         |
| Inativo                        | `isActive = false` → **nunca** resolve Site                                   |
| Primário                       | No máximo **um** `isPrimary = true` por (`site`, `environment`)               |
| `redirectToPrimary`            | Válido apenas se `isPrimary = false`; secundário → primário do mesmo site/env |

**Armazenamento:** persistir `hostname` (entrada) e `normalizedHostname` (lookup). Resolução do middleware usa **somente** `normalizedHostname`.

---

## 6. Exemplos iniciais (documentar — **não seedar** nesta feature)

| Hostname                        | Uso                | Site                              | Env          | Primário?                       |
| ------------------------------- | ------------------ | --------------------------------- | ------------ | ------------------------------- |
| `admin.dev.omniafrigo.com.br`   | Admin Payload      | **Fora** da collection pública    | —            | —                               |
| `dev.omniafrigo.com.br`         | Portal homologação | `omnia-hub`                       | `staging`    | Sim                             |
| `omniafrigo.com.br`             | Portal produção    | `omnia-hub`                       | `production` | Sim                             |
| `www.omniafrigo.com.br`         | Apex/www           | `omnia-hub`                       | `production` | Não (`redirectToPrimary: true`) |
| Domínios oficiais RR/FDFA/CTE/… | Externos           | Permanecem em `Sites.externalUrl` | —            | —                               |

`admin.*` não entra em Domains do portal; Traefik/roteamento separado.

---

## 7. Access control (MVP)

| Operação                   | Regra                                          |
| -------------------------- | ---------------------------------------------- |
| Admin create/update/delete | Autenticado                                    |
| Read Admin                 | Autenticado                                    |
| API pública direta         | **Não** — resolução via BFF/middleware interno |
| RBAC multiempresa          | Adiado                                         |

---

## 8. Versions / drafts

| Aspecto           | Decisão                                                        |
| ----------------- | -------------------------------------------------------------- |
| `versions.drafts` | **Não**                                                        |
| `timestamps`      | **Sim**                                                        |
| Motivo            | Domínio é config operacional; mudança deve valer imediatamente |
| Auditoria         | Hooks futuros / AuditLog                                       |

---

## 9. Admin UX (006B)

| Item             | Valor                                                           |
| ---------------- | --------------------------------------------------------------- |
| `useAsTitle`     | `normalizedHostname`                                            |
| `defaultColumns` | normalizedHostname, site, environment, isPrimary, isActive      |
| `group`          | Multiempresa                                                    |
| Sidebar          | environment, isPrimary, isActive, redirectToPrimary, forceHttps |

---

## 10. Índices (proposta)

| Índice                      | Campos                                        |
| --------------------------- | --------------------------------------------- |
| Unique                      | `normalizedHostname`                          |
| Index                       | `site`                                        |
| Index                       | `environment`                                 |
| Index                       | `isPrimary`                                   |
| Index                       | `isActive`                                    |
| Composto (futuro / partial) | `(site, environment)` onde `isPrimary = true` |

---

## 11. Hooks futuros (somente documentação)

1. `beforeValidate`: `normalizedHostname = normalizeHostname(hostname)`
2. Validar `isValidHostname(normalizedHostname)`
3. Unicidade de `normalizedHostname`
4. Garantir um primário por `(site, environment)`
5. Bloquear hostnames reservados (`admin.*`, internos)
6. `localhost` só em local/development
7. `redirectToPrimary` inválido se `isPrimary`
8. Revalidação de cache (`domain:{hostname}`)
9. Auditoria

---

## 12. Decisão obrigatória — sites externos

**Não.** Domínios oficiais das empresas **não** viram registros em `domains` agora.

Enquanto hospedados fora da plataforma, permanecem em **`Sites.externalUrl`** (Sites `isExternal: true`).

Só entram em `domains` quando o DNS apontar para a Omnia Platform e o Site deixar de ser meramente referencial (ADR-011 P17 — coexistência).

---

## 13. Critérios de aceite — Feature 006B

- [ ] `Domains.ts` com campos MVP (§2)
- [ ] Sem campo `status`; sem drafts
- [ ] Relationship `site` → `sites` apenas
- [ ] Sem FKs futuras stub
- [ ] Validação/normalização via helpers `lib/branding/domain.ts`
- [ ] `normalizedHostname` unique
- [ ] Access autenticado
- [ ] Registrado em `payload.config.ts`
- [ ] Migration versionada
- [ ] Sem seed de Domains nesta etapa (ou seed mínimo hub só se aprovado explicitamente)
- [ ] `typecheck` / lint direcionado
- [ ] Commit seletivo sem `payload-generated-schema.ts`

---

## Riscos

| Risco                       | Mitigação                                           |
| --------------------------- | --------------------------------------------------- |
| Colisão `www` vs apex       | Normalização remove `www.`; secundário com redirect |
| Admin hostname no resolver  | Excluir / lista reservada                           |
| Domínio inativo servindo    | Resolver exige `isActive`                           |
| Dois primários              | Hook + índice composto                              |
| External → Domain prematuro | Decisão §12                                         |

---

## Arquivos previstos — Feature 006B

```
apps/admin/src/collections/Domains.ts
apps/admin/payload.config.ts
apps/admin/src/migrations/<ts>_domains.ts (+ .json)
apps/admin/src/migrations/index.ts
```

Opcional posterior: seed mínimo `dev.omniafrigo.com.br` → `omnia-hub`; wiring `SiteDomainRepository`.
