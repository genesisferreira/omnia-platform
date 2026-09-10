# Epic 17 — Knowledge Governance

**Date (UTC):** 2026-09-10  
**Branch:** `feature/epic17-knowledge-governance`  
**Release SHA (CI green tip):** `f807a0a56b408a610dd3bdb70c0d8afb965d6c24`  
**Prior green SHA:** `ecf84ca04f445e51840bb27cd30a0689258ee20f`  
**Base / production pin:** RC2.4.1 `edc824c3f1b6bf73288eb66834f0bc2af04b6878`  
**PRODUCTION_DEPLOY:** `NOT_AUTHORIZED`

## Verdict

**EPIC 17 BLOCKED — staging host unreachable from agent environment (TCP 22 / HTTPS 443 fail)**

CI Quality + Build are green on the Epic 17 tip. Staging migrate/deploy and human FPA could not run because the agent host cannot reach `191.101.234.156:22` or `admin.dev.omniafrigo.com.br:443`.

## What shipped (code)

- Package `@omnia/knowledge-governance` — scopes, lifecycle, eligibility, version hash, assessment-secret detection (CI unit tests).
- Retrieval ACL gate via `evaluateRetrievalEligibility` + vector metadata (`schoolKey`, `knowledgeScope`, `retrievalEligible`, `assessmentSecret`).
- Admin: `knowledge-governance-submissions`, academic endpoints (submit/status/reviews), LearningResources / KnowledgeDocuments governance fields, Lessons version invalidation, KI LMS assets stay `COURSE_PRIVATE` / `autoProcess: false`, governed Hub ingest wiring.
- Web: professor “Enviar para Base de Conhecimento” on course detail.
- Migration `20260910_160000_knowledge_governance` + backfill notes.
- CI step: `EPIC 17 Knowledge Governance`.

## CI

| Run                                                                                | SHA       | Result      |
| ---------------------------------------------------------------------------------- | --------- | ----------- |
| [#278](https://github.com/genesisferreira/omnia-platform/actions/runs/34508723202) | `f807a0a` | **success** |
| [#277](https://github.com/genesisferreira/omnia-platform/actions/runs/34502473069) | `ecf84ca` | **success** |

## Staging deploy (blocked)

Prepared: `scripts/deploy/_e17_staging_activate.sh` (staging only; never production).

When VPS is reachable:

```bash
# on VPS after upload + sed CRLF
bash /tmp/_e17_staging_activate.sh f807a0a56b408a610dd3bdb70c0d8afb965d6c24 feature/epic17-knowledge-governance
```

Expect: backup under `/opt/omnia/backups/staging/epic17-*`, migrate, rebuild admin/web, `STAGING_SHA_MATCH_AFTER=YES`.

## FPA matrix (required after staging deploy)

| ID     | Actor           | Action                      | Expected                                                               |
| ------ | --------------- | --------------------------- | ---------------------------------------------------------------------- |
| FPA-01 | Professor       | Create/edit lesson material | Remains `COURSE_PRIVATE`; not global retrieval                         |
| FPA-02 | Student + Tutor | Ask in lesson context       | Tutor may use authorized lesson context; Hub remains gated             |
| FPA-03 | Professor       | Submit for knowledge review | Submission `PENDING_REVIEW`; still not school/omnia retrieval-eligible |
| FPA-04 | School reviewer | Approve school              | Scope `SCHOOL_APPROVED`; school-scoped retrieval only                  |
| FPA-05 | Omnia reviewer  | Optional promote            | Scope `OMNIA_APPROVED`; global Omnia retrieval                         |
| FPA-06 | Reviewer        | Reject / revoke             | Eligibility cleared; vectors no longer returned                        |
| FPA-07 | Professor       | Edit after approve          | Version invalidation; re-review required                               |
| FPA-08 | Any             | Assessment secrets          | Never eligible for Hub retrieval                                       |
| FPA-09 | Audit           | Review submission trail     | Actor, timestamps, transitions visible                                 |

## Next unlock

1. Restore network path to staging VPS (or run deploy from a host that can reach it).
2. Run `_e17_staging_activate.sh` for SHA `f807a0a…`.
3. Execute FPA-01…09; then upgrade verdict to `EPIC 17 FPA PASS — RELEASE CANDIDATE READY` only after human sign-off.
