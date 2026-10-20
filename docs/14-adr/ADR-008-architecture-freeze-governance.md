# ADR-008: Congelamento de Arquitetura e Governança

## Status

**Aceito** — Sprint 1.2

## Data

2026-07-07

## Contexto

Após três sprints de fundação (0, 0.5, 1, 1.1), a plataforma possui estrutura modular consolidada. Continuar alterações estruturais sem governança formal aumentaria risco de refatorações custosas conforme a base de usuários cresce (meta: 500k usuários, 50k parceiros, 20M registros CRM).

## Decisão

1. **Congelar a arquitetura** após Sprint 1.2 — mudanças estruturais exigem nova ADR
2. **Criar packages transversais** de governança:
   - `@omnia/config` — configuração centralizada
   - `@omnia/errors` — erros tipados
   - `@omnia/events` — event bus
   - `@omnia/cache`, `@omnia/mail`, `@omnia/queue`, `@omnia/validation`, `@omnia/search`
   - `@omnia/testing` — plataforma de testes
3. **Documentar governança** na raiz:
   - `SYSTEM_OVERVIEW.md`, `PROJECT_PRINCIPLES.md`, `GOVERNANCE.md`
   - `QUALITY_GATES.md`, `DEPENDENCY_RULES.md`, `IMPORT_RULES.md`
   - `DECISIONS_LOG.md`, `OBSERVABILITY.md`, `SECURITY_REVIEW.md`
4. **Atualizar CODEOWNERS** com ownership por área

## Alternativas consideradas

| Alternativa                     | Motivo rejeição                                     |
| ------------------------------- | --------------------------------------------------- |
| Evoluir estrutura organicamente | Risco de inconsistência e débito técnico            |
| Microserviços desde o início    | Complexidade prematura; monorepo modular suficiente |
| Implementar tudo na Sprint 1.2  | Escopo inflado; estrutura + docs primeiro           |

## Consequências

### Positivas

- Base estável para Sprints 2–12
- Onboarding previsível para novos devs
- Agentes de IA seguem princípios documentados
- Extração futura para microserviços facilitada (eventos, queue)

### Negativas

- Rigidez — ADRs adicionam overhead para mudanças
- Packages vazios até Sprint 2+ (implementação gradual)

## O que é "mudança estrutural" (exige ADR)

- Novo app em `apps/`
- Novo domínio em `domains/`
- Novo package em `packages/` (exceto implementação de package já planejado)
- Alteração de regras de dependência
- Troca de ORM, CMS ou banco principal
- Separação em microserviço

## O que NÃO exige ADR

- Implementação dentro de packages/domains existentes
- Bug fixes, features dentro de bounded contexts
- Atualização de dependências (semver)
- Documentação e testes

## Referências

- [PROJECT_PRINCIPLES.md](../../PROJECT_PRINCIPLES.md)
- [GOVERNANCE.md](../../GOVERNANCE.md)
- [QUALITY_GATES.md](../../QUALITY_GATES.md)
