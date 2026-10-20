# Omnia Enrollment Lifecycle

> Matrícula acadêmica via Academic Provisioning (dry-run forçado neste épico).

## Ações

| Ação         | Comportamento dry-run               |
| ------------ | ----------------------------------- |
| `enroll`     | Simula `enrol_manual_enrol_users`   |
| `unenroll`   | Simula `enrol_manual_unenrol_users` |
| `suspend`    | Simula status suspended (sem HTTP)  |
| `reactivate` | Simula status active (sem HTTP)     |
| `sync`       | Trata como enroll simulado          |

## Pré-requisitos

- `moodleCourseId` positivo
- `moodleUserId` **ou** IdentityLink ativo
- `Idempotency-Key` + role `admin|manager`

## Idempotência

Mesma `Idempotency-Key` → retorna job existente (`deduplicated: true`).

## Eventos de auditoria

`enrollment.{action}` em `lms-audit-events` com `result: dry-run|failure|deduplicated`.
