# Assessment — release limitation (R0)

**Classification:** `STUB` / `CONTROLLED` (read-only)

## Scope for this release candidate

- `@omnia/assessment-engine` exposes state/status/metadata/cache/events as **read-only**.
- Security ports return `NOT_IMPLEMENTED` stubs.
- Adaptive Learning may recommend `ASSESSMENT` only when an explicit capability/flag exists; write path is **not** production-ready.

## Impact on published flows

| Flow                                                | Impact                                             |
| --------------------------------------------------- | -------------------------------------------------- |
| Login → Cursos → Aula → AI → Tutor → SIP → Adaptive | **Not blocked** — assessment write is not required |
| Certificates                                        | Out of scope / not implemented                     |
| Moodle grade write via Omnia                        | Not in RC                                          |

## Protection

- Do not market assessment submission as available.
- UI that implies write assessment must remain disabled or clearly limited.
- No Assessment EPIC work in R0.

## Exit

Assessment is **not** a P0 blocker for the Neurofrigo/SIP/Adaptive release candidate while kept read-only and disclosed.
