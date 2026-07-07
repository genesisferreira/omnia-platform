# Padrões de Código — Omnia Platform

> Referência obrigatória para todo código do monorepo.

## TypeScript

- **strict** sempre ativo — sem `any`, sem `@ts-ignore` sem justificativa
- `import type` para imports de tipo (`@typescript-eslint/consistent-type-imports`)
- `as const` para objetos imutáveis em `@omnia/constants`
- Preferir `unknown` a `any` em boundaries externos

## Estrutura de arquivos

```
packages/{name}/src/
├── index.ts          # Barrel export público
├── {domain}/         # Um bounded context por pasta
│   └── index.ts
└── ...
```

## Funções

- Funções pequenas (< 30 linhas ideal)
- Um nível de abstração por função
- Nomes verbosos: `getUserById`, não `get`
- Early return para reduzir nesting

## Erros

- Lançar erros tipados (`DomainError`, `ValidationError`)
- Nunca engolir erros silenciosamente
- Formato API: `{ code, message, details?, correlationId }`

## Testes (quando implementados)

- Unitários para domínio e utils puros
- Integração para APIs e database
- E2E para fluxos críticos (login, checkout)

## Imports

```typescript
// ✅ Correto — workspace package
import type { Lead } from '@omnia/types/crm';

// ❌ Evitar — import relativo cross-package
import { Lead } from '../../../packages/types/src/crm';
```

## Comentários

- Código autoexplicativo > comentários
- Comentar apenas: regras de negócio não óbvias, workarounds, ADR references

## Referências

- [NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- `@omnia/typescript-config` · `@omnia/eslint-config`
