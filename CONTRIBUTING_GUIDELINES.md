# Diretrizes de Contribuição — Omnia Platform

> Complementa [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) com foco em engenharia.

## Fluxo de trabalho

1. Issue criada ou tarefa no roadmap
2. Branch `feature/{modulo}-{descricao}` a partir de `develop`
3. Implementação seguindo guidelines
4. PR para `develop` com template preenchido
5. Code review (CODEOWNERS)
6. Merge → staging → main (releases)

## Antes de abrir PR

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

## Escopo do PR

- Um PR = uma feature ou fix focado
- Evitar PRs gigantes (> 500 linhas)
- Separar refactor de feature

## Documentação obrigatória no PR

- O que mudou e por quê
- Como testar
- Screenshots (UI)
- ADR linkado (se arquitetura)

## Packages — quando criar novo

Criar novo package quando:

- Código reutilizado por 2+ apps/packages
- Bounded context claro
- Responsabilidade única

Não criar package para:

- Utils usados uma vez
- Config de um único app

## Boundaries

- `packages/shared` — sem deps internas
- `packages/types` — sem deps internas
- Apps não importam de `integrations` diretamente — usar services

## Preservação

- Nunca apagar arquivos sem justificativa no PR
- Migrations sempre reversíveis quando possível

## Referências

- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
- [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
