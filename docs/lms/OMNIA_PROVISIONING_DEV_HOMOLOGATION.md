# Omnia Provisioning — Homologação DEV (dry-run)

Checklist Sprint 3.0 Épico A. **Produção intacta. Zero mutação Moodle.**

## Pré-requisitos

- [ ] Branch com package + Admin BFF deployada no staging (Admin preferencial)
- [ ] `MOODLE_PROVISION_EXECUTE=false` (ou ausente)
- [ ] `MOODLE_PROVISION_DRY_RUN=true`
- [ ] Internal API key configurada no Admin

## Smoke

1. **Capabilities**  
   `GET /api/omnia/lms/internal/provision/capabilities`  
   Headers S2S → `200`, `mode: dry-run`, catálogo write presente.

2. **Provision user dry-run**  
   `POST .../provision/users` com `Idempotency-Key`, body `{ "action":"create", "omniaUserId":"..." }`  
   → `mode: dry-run`, `EXECUTE_DISABLED_UNTIL_ACTIVATION`, audit gravado.

3. **Idempotency**  
   Repetir mesmo key → `deduplicated: true`.

4. **Enrollment dry-run**  
   `POST .../provision/enrollments` com `moodleCourseId` + user/link  
   → dry-run ok.

5. **Job status**  
   `GET .../provision/jobs/:id` → status succeeded/queued.

6. **Métricas**  
   `GET /api/metrics` contém `provision_success_total` (ou failure) após smoke.

7. **Moodle inalterado**  
   Probe read `core_user_get_users_by_field` antes/depois **ou** assert nos logs `moodle.write.dry_run` sem HTTP write.

## Não fazer

- Rebuild Moodle/DB/Traefik só por este épico
- Ativar `MOODLE_PROVISION_EXECUTE=true`
- Expor rotas no Web proxy

## Critério GO

`🟢 OMNIA LMS ACADEMIC PROVISIONING HOMOLOGADO — GO PARA O ÉPICO B (MEDIA AUTHORIZATION)`
