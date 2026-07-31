# Omnia LMS — Design System (Experience MVP)

> **Sprint 2.6** — Tokens e padrões visuais da experiência do aluno.  
> Identidade Omnia (emerald / deep-blue / copper). **Não** copiar visual Moodle.

## Princípios

1. UI 100% Omnia; Moodle é motor invisível.
2. Contraste WCAG AA em light e `.dark`.
3. Um job por seção; progresso e navegação claros.
4. Motion leve (`animate-lms-fade-in`) para hierarquia, não ruído.

## Tokens LMS (`@omnia/ui` globals)

| Token | Uso |
| --- | --- |
| `--lms-sidebar` / `--lms-sidebar-foreground` | Shell lateral |
| `--lms-surface` | Fundo da área de estudos |
| `--lms-progress` | Barra de progresso |
| `--lms-success` / `--lms-warning` | Feedback de estado |

Tailwind: `bg-lms-sidebar`, `bg-lms-surface`, `text-lms-progress`, `shadow-lms-card`, `animate-lms-fade-in`.

## Tipografia e spacing

- Headings: `font-heading` (já do portal).
- Corpo: tipografia base do design system Omnia.
- Densidade confortável em cards de curso; hierarquia via tamanho, não cards empilhados no hero.

## Dark mode

Variáveis `.dark` espelham os tokens LMS com contraste AA. Componentes novos (Alert, Progress, EmptyState) usam tokens semânticos (`destructive`, `muted`, `lms-warning`).

## Shell

- Sidebar escura (`lms-sidebar`) + main em `lms-surface`.
- Header sticky com Avatar + logout.
- Breadcrumb em todas as telas profundas.
- Placeholders: busca e notificações (Sprint futura).

## Acessibilidade

- Skip link “Ir para o conteúdo”.
- Foco visível (`ring-ring`) em nav, tabs e CTAs.
- Progress com `aria`/label textual.
- Tabs com `role="tablist"` / `tabpanel`.

## Fora do escopo visual (MVP)

Player de mídia, iframe Moodle, gamificação, marketplace, certificados reais.
