# @omnia/eslint-config

Configurações ESLint compartilhadas do monorepo Omnia Platform.

## Configurações

| Export                      | Uso                      |
| --------------------------- | ------------------------ |
| `@omnia/eslint-config`      | Base TypeScript strict   |
| `@omnia/eslint-config/next` | Apps Next.js (Sprint 1+) |

## Uso

```json
{
  "root": true,
  "extends": ["@omnia/eslint-config"]
}
```

## Regras principais

- `no-console` — warn (permite warn/error)
- `@typescript-eslint/consistent-type-imports` — imports de tipo explícitos
- `@typescript-eslint/no-unused-vars` — warn com `_` prefix

## Evolução (Sprint 1+)

- `eslint-plugin-boundaries` — enforcement de imports entre packages
- `eslint-plugin-import` — ordenação de imports

## Status

**Sprint 0.5** — Configuração base operacional.
