# Sprint 2 — UX & Design System

## Identidade visual Omnia

### Cores

| Token | Hex | Uso |
|-------|-----|-----|
| Verde Esmeralda | `#0A5A47` | Primary, CTAs |
| Azul Profundo | `#0E2D4D` | Secondary, hero gradient |
| Cobre Premium | `#C7783D` | Accent, badges |
| Grafite Escuro | `#11161B` | Texto, footer |
| Branco | `#FFFFFF` | Background |

### Tipografia

| Uso | Fonte | Fallback |
|-----|-------|----------|
| Títulos | Montserrat | system-ui, sans-serif |
| Corpo | Inter | system-ui, sans-serif |

> Google Fonts **não** usado no build (proxy corporativo). Fallback system-ui garante renderização.

## Componentes (@omnia/ui)

- `Button` — variantes default, secondary, outline, ghost
- `Card` — header, content, footer
- `Container` — max-width responsivo
- `Badge` — status e roles
- `SectionTitle` — títulos de seção
- `Input` / `Textarea` — formulários futuros

## Portal

1. **Header** — logo, nav, link admin
2. **Hero** — gradiente brand, CTA
3. **Ecossistema** — 3 cards informativos
4. **Empresas** — grid de cards do CMS
5. **CTA** — call-to-action admin
6. **Footer** — copyright

## Admin

1. **Sidebar** — navegação + atalhos CMS
2. **Dashboard** — saudação, stats, status, atalhos
3. **Payload Admin** — `/admin` (CMS nativo)

## Responsividade

Mobile-first com breakpoints Tailwind (`sm`, `md`, `lg`).
