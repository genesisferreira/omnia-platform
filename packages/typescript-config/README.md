# @omnia/typescript-config

Configurações TypeScript compartilhadas do monorepo Omnia Platform.

## Configurações

| Arquivo | Uso |
|---------|-----|
| `base.json` | Base strict para todos os workspaces |
| `nextjs.json` | Apps Next.js 15 (Sprint 1+) |
| `react-library.json` | Packages React (`@omnia/ui`) |
| `node.json` | Packages Node.js puros (SDK, logger, integrations) |

## Uso

```json
{
  "extends": "@omnia/typescript-config/base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "noEmit": false
  },
  "include": ["src/**/*"]
}
```

## Decisões

- **strict** + `noUncheckedIndexedAccess` — segurança de tipos máxima
- **verbatimModuleSyntax** — imports/exports explícitos (ESM)
- **Bundler** resolution para packages; **NodeNext** para serviços Node

## Status

**Sprint 0.5** — Configurações prontas para uso em todos os workspaces.
