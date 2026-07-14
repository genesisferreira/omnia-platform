# Quality Gates — Omnia Platform

> Requisitos mínimos para merge em `develop` e `main`.

## Gates obrigatórios

| Gate                            | Comando / Verificação                      | Bloqueante |
| ------------------------------- | ------------------------------------------ | ---------- |
| **Build**                       | `pnpm build`                               | ✅         |
| **Lint**                        | `pnpm lint`                                | ✅         |
| **Typecheck**                   | `pnpm typecheck`                           | ✅         |
| **Sem dependências circulares** | Revisão manual / ferramenta futura         | ✅         |
| **Sem warnings críticos**       | ESLint errors = 0                          | ✅         |
| **Documentação atualizada**     | README/ADR quando aplicável                | ✅         |
| **ADR quando necessário**       | Mudança estrutural → ADR em `docs/14-adr/` | ✅         |
| **Review aprovado**             | Mínimo 1 approval (CODEOWNERS)             | ✅         |

## Gates recomendados (Sprint 2+)

| Gate             | Comando               | Status    |
| ---------------- | --------------------- | --------- |
| Testes unitários | `pnpm test`           | Sprint 2+ |
| Testes E2E       | `pnpm test:e2e`       | Sprint 3+ |
| Coverage mínimo  | 70% packages críticos | Sprint 4+ |
| Security scan    | `pnpm audit`          | Sprint 2+ |
| Bundle size      | Limite por app        | Sprint 6+ |

## Verificações arquiteturais

Antes de merge, confirmar:

- [ ] Portal (`apps/web`) **não** importa Payload
- [ ] Packages **não** importam apps
- [ ] Domains **não** importam UI
- [ ] Config via `@omnia/config` (quando implementado)
- [ ] Erros via `@omnia/errors`
- [ ] Feature flags para features novas

### Comandos de verificação

```bash
# Payload isolado no admin
rg "@payloadcms|from 'payload'" apps/web/

# Build completo
pnpm lint && pnpm typecheck && pnpm build
```

## CI (GitHub Actions)

Pipeline em `.github/workflows/` deve executar:

1. Install (`pnpm install`)
2. Lint
3. Typecheck
4. Build (com services: postgres)

## Exceções

Exceções a quality gates exigem:

1. Issue/documentação justificando
2. Aprovação explícita do code owner
3. Plano de correção com prazo

## Definition of Done

Ver [GOVERNANCE.md](GOVERNANCE.md#definition-of-done).
