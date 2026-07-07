# @omnia/prettier-config

Configuração Prettier compartilhada do monorepo Omnia Platform.

## Uso

No `package.json` da raiz ou de qualquer workspace:

```json
{
  "prettier": "@omnia/prettier-config"
}
```

## Decisões

- **singleQuote** — padrão JavaScript moderno
- **printWidth 100** — equilíbrio entre legibilidade e densidade
- **endOfLine lf** — consistência cross-platform (Windows/Linux/macOS)

## Status

**Sprint 0.5** — Configuração centralizada.
