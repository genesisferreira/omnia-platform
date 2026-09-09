# RC2 Remediation Report — 2026-09-08

**RC2_BRANCH:** `release/rc2-2026-09-08`  
**RC2_BASE_SHA:** `9d07765759b94247ea22548d3e4eea8ca0723063`  
**Mode:** Code remediation + gate completion  
**PRODUCTION:** **NOT AUTHORIZED**  
**HUMAN_RETEST_REQUIRED:** YES

---

## Phase 1 — Branch / worktree

| Field | Value |
| --- | --- |
| RC2_BASE_SHA | `9d07765759b94247ea22548d3e4eea8ca0723063` |
| RC2_BRANCH | `release/rc2-2026-09-08` |
| RC1 untouched | YES (`release/rc-2026-09-08` remains at base) |

---

## Code review (wave)

| Area | Review |
| --- | --- |
| diagnostic-bank | 27 unique stems; real TF gabarito; RULE_CURATED |
| seedBank/domainPrompt | Removidos; `buildDiagnosticBank` + `gradeDiagnosticAnswer` |
| consent copy | Sem `ils-onboarding-v1` na UI; version no backend |
| Lesson DTO | `externalUrl` + `content` no `getEnrolledLesson` |
| LessonPlayer | Embed YT/Vimeo/direct; PDF error amigável; vídeo ≠ PDF anexo |
| Media.staticDir | Absoluto (`PAYLOAD_MEDIA_DIR` ou `apps/admin/media`) |
| Media ACL | `read` permanece público (pré-existente portal); **create** staff+instructor; **não** expandimos write público |
| TutorPanel / AiDock | Telemetria removida; dock oculto em aula/onboarding |
| Authoring | create + PATCH com `externalUrl`/`content`; form professor |
| Seed | Rickroll / “URL de exemplo” removidos |

**Security notes:** URL externa rejeita javascript/data/file; Media create não é público; cross-school media ainda depende de enrollment/product ACL (Media.read público pré-existente = risco residual documentado, não introduziu nova exposição).

---

## Local tests (pre-commit)

| Suite | Result |
| --- | --- |
| `@omnia/intelligent-learning` test | PASS (12) incl. semantic variety + grading |
| `@omnia/intelligent-learning` typecheck | PASS |
| external-video unit | PASS (3) |
| neurofrigo-tutor | PASS (4) |
| web epic16-ai-context | PASS |
| web test:lms-lesson | PASS |
| admin tsc | PASS (após fix TS sanitize URL) |
| web typecheck | (ver gate) |

---

## Fixes shipped

### FPA-001 / 002 / 003 / 005 / 006
Código remediated — staging retest obrigatório.

### FPA-004
CONTENT_GAP / grounding depende de conteúdo + Knowledge + media serve no staging.

---

## Staging / CI / media (fill in validation report)

Ver `docs/release/RC2_STAGING_VALIDATION_REPORT.md` após deploy.

---

## Verdict (code commit wave)

Pré-commit local: testes da wave PASS.  
Deploy/CI/media persistence / E2E humano: **pendentes** até gate staging.

```text
PRODUCTION_DEPLOY=NOT_AUTHORIZED
HUMAN_RETEST_REQUIRED=YES
```
