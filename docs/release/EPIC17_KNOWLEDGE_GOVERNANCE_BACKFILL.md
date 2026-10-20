# Epic 17 — Knowledge Governance Backfill Report

## Policy

- **LMS / lesson-asset learning resources** → default `COURSE_PRIVATE`, `retrievalEligible=false`, `autoProcess=false`.
- **Existing Knowledge Hub documents** with `allowAiUse=true` or `publicationStatus=published` → preserve `OMNIA_APPROVED` + `retrievalEligible=true` (do **not** downgrade EPIC 10 official knowledge).
- **No automatic promotion** of professor course content into Hub AI retrieval.
- **On SCHOOL/OMNIA approval** → governed KI ingest from lesson text (media txt + learning-resource) with scope/school/agent metadata; revoke clears `retrievalEligible`.

## Migration

`20260910_160000_knowledge_governance`

## Result (expected after migrate)

| Population                                         | Scope                       | Retrieval eligible                |
| -------------------------------------------------- | --------------------------- | --------------------------------- |
| LMS learning-resources (`origin=lms_lesson_asset`) | COURSE_PRIVATE              | false                             |
| Official Hub documents (AI/published)              | OMNIA_APPROVED              | true                              |
| New professor submissions                          | COURSE_PRIVATE until review | false until SCHOOL/OMNIA approved |

## Parallel RAG

**NO** — reuses Knowledge Intelligence pipeline + Retrieval worker.
