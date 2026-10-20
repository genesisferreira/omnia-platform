# RC2.4 — Tutor Quality + Product Parity

**Branch:** `release/rc24-tutor-quality-parity`  
**Baseline prod:** `20ea5315dea7734e5cd82a4e3c91917354a025ce`  
**Production deploy:** NOT AUTHORIZED in this task

## Scope

1. Tutor relevance gate (no condensador dump on unrelated Q)
2. Grounded synthesis (question-specific sentences)
3. LMS next-step intent (progress/catalog, not Knowledge)
4. Admin `/` absolute redirect (Invalid URL fix)
5. Professor question authoring: MCQ + TF + SHORT + ESSAY

## Out of scope

- Production deploy
- Traefik override removal (only after Admin middleware validated on staging)
- Knowledge scope schema COURSE_PRIVATE / SCHOOL_APPROVED / OMNIA_APPROVED
- Auto-ingest professor uploads to all agents

## Parity note

DEV and PROD were both on SHA `20ea531` at audit time. Visible DEV-only differences are primarily **FPA fixtures / content**, not code features.
