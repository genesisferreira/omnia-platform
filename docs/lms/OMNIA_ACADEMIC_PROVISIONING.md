# Omnia Academic Provisioning

> **Sprint 3.0 — Épico A**  
> Package `@omnia/academic-provisioning` + BFF interno S2S.  
> **Restrição dura:** zero mutações reais em usuários/matrículas Moodle (`EXECUTE_DISABLED_UNTIL_ACTIVATION`).

## Escopo

- Provisionamento de identidade Omnia → (simulado) Moodle User → Identity Link
- Lifecycle de matrícula: enroll / unenroll / suspend / reactivate / sync
- Fila Redis (`omnia:lms:provision:{env}`) + retry/backoff + DLQ
- Auditoria append-only (`lms-audit-events`)
- Métricas Prometheus + dashboard Grafana `06-provisioning`

## Arquitetura

```text
Internal S2S Client
  → Admin BFF /api/omnia/lms/internal/provision/*
    → @omnia/academic-provisioning
      → Queue (Redis/memory)
      → Audit port
      → MoodleWritePort (Connector callWrite dry-run)
```

## Package

| Módulo              | Responsabilidade                                |
| ------------------- | ----------------------------------------------- |
| `ProvisionService`  | create/update/disable/enable/sync user          |
| `EnrollmentService` | enroll/unenroll/suspend/reactivate/sync         |
| `IdentitySync`      | dedupe por `omniaUserId` + link ativo           |
| `ProvisionQueue`    | register / enqueue / dequeue / ack / nack / DLQ |
| `RetryPolicy`       | backoff `min(2^n * base, max)`                  |
| `security`          | RBAC admin\|manager + Idempotency-Key           |

Sem UI. Sem dependência de Next/Payload no package (portas injetadas).

## Endpoints (Admin only)

| Method | Path                                             | Ação                |
| ------ | ------------------------------------------------ | ------------------- |
| POST   | `/api/omnia/lms/internal/provision/users`        | user commands       |
| POST   | `/api/omnia/lms/internal/provision/enrollments`  | enrollment commands |
| GET    | `/api/omnia/lms/internal/provision/jobs/:id`     | status job          |
| GET    | `/api/omnia/lms/internal/provision/capabilities` | write contracts     |
| POST   | `/api/omnia/lms/internal/provision/worker/tick`  | processa N jobs     |

Auth: `x-omnia-internal-key` + `x-omnia-user-id` + `x-omnia-lms-role: admin|manager`.  
Header `Idempotency-Key` obrigatório (8–128 chars). Cookie browser **recusado**.

## Dry-run

Toda operação retorna `mode: "dry-run"` e `code: "EXECUTE_DISABLED_UNTIL_ACTIVATION"`.  
IdentityLink **não** é criado/atualizado. Auditoria registra intenção.

## Flags

| Env / Setting                                   | Default | Nota                  |
| ----------------------------------------------- | ------- | --------------------- |
| `MOODLE_PROVISION_ENABLED` / `provisionEnabled` | true    | Liga endpoints        |
| `MOODLE_PROVISION_DRY_RUN` / `provisionDryRun`  | true    | Dry-run               |
| `MOODLE_PROVISION_EXECUTE`                      | false   | Bloqueado neste épico |

## Referências

- [OMNIA_WRITE_CONNECTOR.md](OMNIA_WRITE_CONNECTOR.md)
- [OMNIA_IDENTITY_SYNC.md](OMNIA_IDENTITY_SYNC.md)
- [OMNIA_ENROLLMENT_LIFECYCLE.md](OMNIA_ENROLLMENT_LIFECYCLE.md)
- [OMNIA_PROVISIONING_SECURITY.md](OMNIA_PROVISIONING_SECURITY.md)
- [OMNIA_PROVISIONING_DEV_HOMOLOGATION.md](OMNIA_PROVISIONING_DEV_HOMOLOGATION.md)
- Decision Log **D018**
