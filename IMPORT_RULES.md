# Regras de Import — Omnia Platform

> Padronização de imports, aliases e barrel exports.

## Aliases TypeScript

### Apps (Next.js)

Configurados em `tsconfig.json` de cada app:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

| Alias      | Escopo                   | Uso                   |
| ---------- | ------------------------ | --------------------- |
| `@/*`      | `apps/web`, `apps/admin` | Código interno do app |
| `@omnia/*` | Monorepo                 | Packages workspace    |

### Packages

Imports entre packages usam **nome do workspace**:

```typescript
import { AppError } from '@omnia/errors';
import { getPlatformStatus } from '@omnia/monitoring';
import type { Tenant } from '@omnia/types';
```

**Nunca** usar paths relativos cross-package (`../../packages/errors`).

---

## Barrel Exports

### Convenção `index.ts`

Cada package expõe API pública via `src/index.ts`:

```typescript
// packages/errors/src/index.ts
export { AppError } from './AppError';
export { NotFoundError } from './NotFoundError';
// ...
```

### Subpath exports (quando necessário)

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./environment": "./src/environment/index.ts"
  }
}
```

Uso: `import { ... } from '@omnia/config/environment'`

### Regras

1. **Exportar apenas API pública** — internals ficam privados
2. **Evitar barrel files gigantes** — subpath exports para módulos grandes
3. **Tree-shaking** — preferir named exports
4. **Sem re-export de terceiros** — consumidor importa direto se necessário

---

## Ordem de imports

```typescript
// 1. Node/builtins
import { readFile } from 'node:fs/promises';

// 2. Dependências externas
import { z } from 'zod';

// 3. Packages @omnia
import { AppError } from '@omnia/errors';
import { logger } from '@omnia/logger';

// 4. Aliases internos do app
import { Button } from '@/components/ui/button';

// 5. Relativos (mesmo package/módulo)
import { helper } from './helper';
```

### Separadores

- Linha em branco entre grupos
- Alfabético dentro de cada grupo (ESLint `import/order`)

---

## Convenções de nomenclatura

| Tipo             | Convenção                               | Exemplo                        |
| ---------------- | --------------------------------------- | ------------------------------ |
| Package          | `@omnia/kebab-case`                     | `@omnia/ai-core`               |
| Arquivo          | `PascalCase` classes, `camelCase` utils | `AppError.ts`, `formatDate.ts` |
| Pasta domínio    | `kebab-case`                            | `domains/marketplace/`         |
| Constantes       | `SCREAMING_SNAKE`                       | `MAX_RETRY_COUNT`              |
| Types/Interfaces | `PascalCase`                            | `TenantContext`                |

---

## Imports proibidos

```typescript
// ❌ Portal importando Payload
import { getPayload } from 'payload';

// ❌ Package importando app
import { layout } from '../../../apps/web/src/app/layout';

// ❌ Domain importando React
import { useState } from 'react'; // em domains/

// ❌ process.env direto em app (usar @omnia/config)
const url = process.env.DATABASE_URL;
```

---

## ESLint

Regras em `@omnia/eslint-config`:

- `import/order` — ordem padronizada
- `import/no-cycle` — sem dependências circulares
- `@typescript-eslint/consistent-type-imports` — `import type`

---

## Domains e modules

- `domains/` — documentação + código futuro; imports seguem mesmas regras
- `modules/` — apenas documentação; sem imports de código
