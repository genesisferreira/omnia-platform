# Omnia Provisioning Security

## Controles

| Controle    | Implementação                                                   |
| ----------- | --------------------------------------------------------------- |
| S2S only    | `x-omnia-internal-key` obrigatório; cookie Payload **recusado** |
| RBAC        | `x-omnia-lms-role` ∈ `admin\|manager`                           |
| Idempotency | Header `Idempotency-Key` (8–128) + dedupe na fila               |
| Correlation | `x-correlation-id` / `x-request-id` propagado                   |
| Rate limit  | `lms:provision` — 30 req/min por actor                          |
| Audit       | Append-only `lms-audit-events` (sem update/delete de eventos)   |
| Write lock  | `EXECUTE_DISABLED_UNTIL_ACTIVATION`                             |
| Surface     | **Zero** rotas de provision em `apps/web` `/api/lms/*`          |

## O que não fazer

- Aceitar `moodleUserId` arbitrário do browser público
- Expor token Moodle
- Chamar REST write real até decisão de ativação
- Permitir role `student`/`teacher` nos endpoints internos de provision
