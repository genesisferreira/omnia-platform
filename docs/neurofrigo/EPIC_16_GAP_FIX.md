# EPIC 16 — Gap Fix (post-login routing + public Concierge Dock)

## Gaps

1. Student login landed on Admin `/area/student` placeholder.
2. Public homepage had no AI Dock / Concierge.

## Fixes

### Login → Portal

- Admin `LoginForm` sends `student` / `instructor` / `client` / `partner` to Portal via `POST /api/auth/establish` (JWT → `omnia_payload_token`).
- Staff with Portal `next=` (`/ia`, cursos, etc.) also go to Portal.
- `/area/[role]` redirects to Portal `/ia`.
- Open redirects blocked (`safePortalNextPath`).

### Public Concierge

- Dock visible when anonymous.
- `POST /api/ai/public-chat` → Admin `POST /omnia/ai/public-chat`.
- Role `anonymous`, channel `portal_public`, assistant forced to Concierge.
- Anonymous cookie `omnia_ai_anon` (not elevatable to auth ACL).
- Policy `Anonymous public Concierge` ensured server-side.
- Retrieval ACL: `portal_public` keeps only public published AI content.
- Purpose Guard (visitor) applies via orchestrator.

## Human retest URLs

- Public: https://dev.omniafrigo.com.br
- Student: https://dev.omniafrigo.com.br/login?next=/ia
- Course: https://dev.omniafrigo.com.br/cursos/fundamentos-refrigeracao-industrial
- Lesson: https://dev.omniafrigo.com.br/cursos/fundamentos-refrigeracao-industrial/aula/apostila-pdf
- Admin: https://admin.dev.omniafrigo.com.br
