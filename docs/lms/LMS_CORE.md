# LMS Core (Epic 02)

Catálogo nativo Payload (Cursos → Módulos → Aulas → Materiais), independente do connector Moodle.

## Admin

Grupo **LMS**: Cursos, Módulos, Aulas, Materiais (+ Vínculos / Auditoria / Políticas existentes).

## Portal

- `/cursos` — lista
- `/cursos/[slug]` — módulos e aulas
- `/cursos/[slug]/aula/[lessonSlug]` — conteúdo + materiais

APIs: `/api/omnia/public-courses`, `public-course`, `public-lesson`.

## Seed

```bash
pnpm --filter @omnia/admin seed:lms-core
# ou bootstrap: knowledge-hub | lms-core
```

## Migration

`20260805_140000_lms_core`
