# Contributing to Omnia Platform

Obrigado por contribuir com a Omnia Platform! Este documento descreve o fluxo de trabalho, convenções e estratégia de Pull Requests.

---

## Git Flow

Utilizamos uma variação do **Git Flow** adaptada para entrega contínua:

```
main ─────────────────────────────────────────────► produção
  ▲                    ▲
  │                    │
  │              release/*
  │                    │
develop ──────────────────────────────────────────► integração
  ▲          ▲         ▲
  │          │         │
feature/*  hotfix/*  staging
```

### Branches

| Branch      | Propósito             | Base      | Merge para           |
| ----------- | --------------------- | --------- | -------------------- |
| `main`      | Código em produção    | —         | —                    |
| `develop`   | Integração contínua   | `main`    | `main` (via release) |
| `staging`   | Homologação / QA      | `develop` | `develop`            |
| `feature/*` | Nova funcionalidade   | `develop` | `develop`            |
| `release/*` | Preparação de release | `develop` | `main` + `develop`   |
| `hotfix/*`  | Correção urgente      | `main`    | `main` + `develop`   |

### Convenção de Nomenclatura

```
feature/nome-da-feature
release/v0.1.0
hotfix/descricao-do-fix
```

Exemplos:

```
feature/crm-pipeline-vendas
release/v0.2.0
hotfix/auth-token-expiration
```

---

## Estratégia de Pull Requests

### Regras Gerais

1. **Nunca** faça push direto em `main` ou `develop`
2. Toda mudança passa por **Pull Request** com pelo menos **1 aprovação**
3. PRs devem ser **pequenos e focados** (ideal: < 400 linhas)
4. Título segue [Conventional Commits](https://www.conventionalcommits.org/)
5. Preencha o template de PR completamente
6. CI deve passar antes do merge
7. Resolva conflitos antes de solicitar review

### Fluxo de PR

```
1. Criar branch a partir de develop
2. Implementar mudanças
3. Commit com mensagens convencionais
4. Push e abrir PR para develop
5. Code review (mínimo 1 aprovação)
6. CI passa (lint, build, testes)
7. Squash merge para develop
8. Delete branch após merge
```

### Review Checklist

- [ ] Código segue convenções do projeto
- [ ] Sem secrets ou credenciais expostas
- [ ] Testes adicionados/atualizados (quando aplicável)
- [ ] Documentação atualizada (quando aplicável)
- [ ] Sem breaking changes não documentados
- [ ] Performance considerada

---

## Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos

| Tipo       | Uso                                |
| ---------- | ---------------------------------- |
| `feat`     | Nova funcionalidade                |
| `fix`      | Correção de bug                    |
| `docs`     | Documentação                       |
| `style`    | Formatação (sem mudança de lógica) |
| `refactor` | Refatoração                        |
| `test`     | Testes                             |
| `chore`    | Manutenção, deps, config           |
| `ci`       | CI/CD                              |
| `perf`     | Performance                        |

### Escopos Comuns

`crm`, `marketplace`, `portal`, `auth`, `admin`, `blog`, `ai`, `infra`, `ui`, `database`

---

## Labels do GitHub

| Label           | Uso                                  |
| --------------- | ------------------------------------ |
| `bug`           | Algo não funciona como esperado      |
| `feature`       | Nova funcionalidade                  |
| `enhancement`   | Melhoria em funcionalidade existente |
| `documentation` | Documentação                         |
| `architecture`  | Decisões e mudanças arquiteturais    |
| `database`      | Schema, migrations, queries          |
| `infra`         | Docker, CI/CD, deploy                |
| `security`      | Segurança                            |
| `ai`            | Inteligência artificial              |
| `crm`           | Módulo CRM                           |
| `marketplace`   | Módulo marketplace                   |
| `portal`        | Portal institucional                 |
| `blog`          | Módulo blog                          |
| `admin`         | Painel administrativo                |
| `partner`       | Área do parceiro                     |
| `high-priority` | Prioridade alta                      |

---

## Milestones

| Milestone | Descrição                                |
| --------- | ---------------------------------------- |
| Sprint 0  | Fundação — estrutura, docs, configuração |
| Sprint 1  | Setup técnico (Next.js, Payload, Docker) |
| Sprint 2  | Auth, database, design system            |
| Sprint 3  | Portal institucional e CMS               |
| Sprint 4  | Blog e conteúdo                          |
| Sprint 5  | CRM base                                 |
| Sprint 6  | Marketplace                              |
| Sprint 7  | Área do parceiro e admin                 |

---

## Setup Local

Consulte o [README.md](../README.md) para instruções de setup.

---

## Código de Conduta

- Respeite todos os membros da equipe
- Reviews construtivos, nunca pessoais
- Documente decisões não óbvias
- Preserve arquivos existentes — nunca apague sem justificativa

---

## Dúvidas?

Abra uma issue com a label `documentation` ou entre em contato com o Arquiteto de Software.
