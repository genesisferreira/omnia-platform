# Definition of Done — Omnia Platform

> Critérios para considerar uma tarefa/sprint/feature **concluída**.

## Por tarefa (PR)

- [ ] Código segue [CODING_STANDARDS.md](CODING_STANDARDS.md) e [NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md)
- [ ] `pnpm lint` passa sem warnings novos
- [ ] `pnpm typecheck` passa
- [ ] `pnpm format:check` passa
- [ ] Testes adicionados/atualizados (quando aplicável)
- [ ] Sem secrets ou credenciais no código
- [ ] README atualizado se estrutura mudou
- [ ] ADR criado se decisão arquitetural significativa
- [ ] PR revisado e aprovado (CODEOWNERS)

## Por feature

- [ ] Critérios de aceite do PRD atendidos
- [ ] Documentação de API atualizada (`docs/05-api/`)
- [ ] Tipos em `@omnia/types` se novo domínio
- [ ] Constantes em `@omnia/constants` se novos valores fixos
- [ ] Feature flag se rollout gradual necessário
- [ ] Acessibilidade WCAG 2.1 AA (UI)
- [ ] Testado em ambiente de staging

## Por sprint

- [ ] Todas as tarefas da sprint com PR merged
- [ ] Release notes em `docs/20-release-notes/`
- [ ] Roadmap atualizado (`docs/13-roadmap/`)
- [ ] Demo funcional para stakeholders
- [ ] Dívidas técnicas documentadas

## Foundation (Sprint 0 + 0.5)

- [x] Monorepo funcional (pnpm + Turborepo)
- [x] Workspaces com package.json
- [x] Tooling compartilhado (`typescript-config`, `eslint-config`, `prettier-config`)
- [x] Packages de infraestrutura criados
- [x] Módulos de negócio documentados
- [x] Guidelines e ADRs
- [x] CI operacional
- [ ] `pnpm-lock.yaml` gerado e commitado (requer `pnpm install` local)

## Segurança (quando aplicável)

- [ ] Input validado (Zod)
- [ ] Autorização verificada (RBAC)
- [ ] Dados sensíveis não logados
- [ ] LGPD: consentimento e auditoria considerados
