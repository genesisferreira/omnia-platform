# RC2 Staging Validation Report — 2026-09-09

**BRANCH:** `release/rc2-2026-09-08`  
**RC2_BASE_SHA:** `9d07765759b94247ea22548d3e4eea8ca0723063`  
**RC2_SHA (tip):** `87ad1e635a216fcc0a3788c0299b069712f08128`  
**LOCAL_ORIGIN_MATCH:** YES  
**PRODUCTION_DEPLOY:** **NOT AUTHORIZED**

---

## CI / Build

| Field      | Value                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| CI         | **GREEN** (run [34347367029](https://github.com/genesisferreira/omnia-platform/actions/runs/34347367029) on `87ad1e6`) |
| Prior fail | Run 34347080626 on `6fc6643` — Format check only; fixed in `d515169` + re-trigger                                      |
| BUILD      | Included in CI Build job (success with Quality)                                                                        |

Commits:

1. `6fc6643` — FPA remediation wave
2. `d515169` — prettier
3. `87ad1e6` — empty ci re-trigger

---

## Staging deploy / media / E2E

| Field                 | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| STAGING_BACKUP        | **NOT RUN** (VPS deploy gate not executed this session) |
| STAGING_BACKUP_SHA256 | —                                                       |
| STAGING_WEB_SHA       | still prior RC1 fixture content observed via public API |
| STAGING_ADMIN_SHA     | unknown / not unified to RC2 tip                        |
| STAGING_SHA_MATCH     | **NO** (deploy pending)                                 |

### Media diagnosis (pre-deploy, read-only public)

Observed still on staging (public-lesson):

- lesson `bem-vindo-video` summary still “URL externa de exemplo”
- `externalUrl` still rickroll fixture
- media file `apostila-fundamentos-2.pdf` previously returned Payload `Something went wrong.`

| Field                             | Provisional                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| MEDIA_STORAGE_MODE                | local Payload `staticDir` (code: absolute path + `PAYLOAD_MEDIA_DIR`)                                  |
| MEDIA_ROOT_CAUSE                  | **LIKELY E/C:** container rebuild lost files and/or relative staticDir before RC2; DB records orphaned |
| MEDIA_VOLUME_PERSISTENT           | **UNKNOWN** until VPS inspect                                                                          |
| MEDIA_SERVE                       | **FAIL** (pre-RC2 deploy)                                                                              |
| MEDIA_SURVIVES_CONTAINER_RECREATE | **NOT TESTED**                                                                                         |
| MEDIA_ACL                         | read still public at collection level (pre-existing); create staff+instructor in RC2 code              |
| CROSS_SCHOOL_MEDIA                | **NOT RETESTED** post-deploy                                                                           |

---

## Product capability matrix (code vs staging)

| Capability                  | Code                    | Staging product                    |
| --------------------------- | ----------------------- | ---------------------------------- |
| PROFESSOR_CREATE_COURSE     | WORKING                 | NOT RETESTED                       |
| PROFESSOR_CREATE_MODULE     | WORKING                 | NOT RETESTED                       |
| PROFESSOR_CREATE_LESSON     | IMPROVED (url/content)  | NOT RETESTED                       |
| PROFESSOR_DRAFT / PUBLISH   | WORKING                 | NOT RETESTED                       |
| VIDEO_EXTERNAL_AUTHORING    | YES                     | NOT RETESTED                       |
| VIDEO_EXTERNAL_STUDENT      | YES (player)            | BLOCKED until deploy + URL content |
| PDF_UPLOAD_UI               | PARTIAL (Media ID)      | PARTIAL / BLOCKED media            |
| PDF_STUDENT_ACCESS          | depends media serve     | FAIL pre-deploy                    |
| EXERCISE_AUTHORING_UI       | PARTIAL (MCQ)           | NOT RETESTED                       |
| MCQ/TF/SHORT/ESSAY          | schema YES / UI partial | —                                  |
| AUTO_CORRECTION             | YES                     | —                                  |
| MANUAL_CORRECTION           | PARTIAL UI              | —                                  |
| FPA001                      | CODE PASS + unit tests  | STAGING RETEST PENDING             |
| FPA002                      | CODE PASS               | STAGING RETEST PENDING             |
| FPA003                      | CODE PASS               | STAGING FAIL until deploy+media    |
| FPA004                      | CONTENT_GAP             | PENDING controlled content test    |
| FPA005                      | CODE PASS               | STAGING RETEST PENDING             |
| FPA006                      | CODE PASS               | STAGING RETEST PENDING             |
| PERSONALIZED_EXERCISE       | RULE_GENERATED          | E2E PENDING                        |
| REINFORCEMENT               | PARTIAL (arch)          | E2E PENDING                        |
| STUDENT360 / SIPE           | EXISTS                  | E2E PENDING                        |
| PROFESSOR_VISIBILITY        | PARTIAL                 | E2E PENDING                        |
| FRED_E2E / CTE_E2E          | PENDING                 | PENDING                            |
| CROSS_SCHOOL / CROSS_TENANT | code suites in CI       | staging pending                    |

---

## PARTIAL / blockers (explicit)

1. **Staging not on RC2 SHA** — deploy blocked until operator runs unify with tip `87ad1e6…`
2. **Media volume persistence unproven** — P1 infra until `MEDIA_SURVIVES_CONTAINER_RECREATE=YES`
3. **PDF/material UI** remains Media-ID PARTIAL (P2/P1 product depending on owner expectation)
4. **Exercise authoring UI** limited vs schema (PARTIAL)
5. **Reinforcement / Tutor grounded E2E** not executed on staging
6. **FPA-004** still content-dependent

---

## Counts (honest)

|          |                                                                          |
| -------- | ------------------------------------------------------------------------ |
| P0_COUNT | 0 known in code; staging media may elevate if treated as release blocker |
| P1_COUNT | ≥1 provisional (media persistence + FPA-003 staging until fixed)         |
| P2_COUNT | authoring UI gaps                                                        |
| UX_COUNT | 0 open in code for 002/005/006                                           |

---

## Verdict

```text
RC2 BLOCKED — STAGING_DEPLOY_MEDIA_E2E_PENDING
CI=GREEN
LOCAL_ORIGIN_MATCH=YES
HUMAN_RETEST_REQUIRED=YES
PRODUCTION_DEPLOY=NOT_AUTHORIZED
```

### Operator next commands (staging only)

```bash
# On VPS /opt/omnia/platform — AFTER backup
git fetch origin
git checkout release/rc2-2026-09-08
git reset --hard 87ad1e635a216fcc0a3788c0299b069712f08128
# adapt unify script to RC2_SHA; backup DB; rebuild web+admin
# inspect: docker volume ls | grep media; PAYLOAD_MEDIA_DIR; ls apps/admin/media
# re-upload or restore media volume; prove recreate survival
# then Human FPA retest 001–006 + professor→aluno chain
```
