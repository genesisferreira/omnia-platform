# Diretrizes UI/UX — Omnia Platform

## Design system

- Package: `@omnia/ui` (shadcn/ui + Tailwind CSS)
- Tokens em `@omnia/ui/src/tokens`
- Nunca estilos inline arbitrários — usar tokens e componentes

## Princípios

1. **Consistência** — mesmos padrões em portal, admin, partner
2. **Acessibilidade** — WCAG 2.1 AA mínimo
3. **Mobile-first** — responsive por padrão
4. **Performance** — Core Web Vitals (LCP < 2.5s)
5. **i18n** — textos via `@omnia/i18n`, nunca hardcoded

## Componentes

- Preferir componentes de `@omnia/ui`
- Variantes via props, não cópia de componentes
- Composição sobre customização profunda

## Acessibilidade

- Labels em todos os inputs
- Focus visible
- Contraste mínimo 4.5:1
- Navegação por teclado
- `aria-*` quando necessário

## Tipografia e cores

- Definidas em design tokens
- Dark mode via tokens (Sprint 2+)
- Empresas do ecossistema: temas por `tenantId` (futuro)

## Formulários

- Validação inline com mensagens claras
- Estados: default, focus, error, disabled, loading
- Zod + react-hook-form (Sprint 2+)

## Feedback

- Loading: skeleton ou spinner contextual
- Sucesso/erro: toast ou inline
- Confirmação para ações destrutivas

## Referências

- `docs/06-ux/` · `docs/07-design-system/`
- `@omnia/ui` · `@omnia/i18n`
