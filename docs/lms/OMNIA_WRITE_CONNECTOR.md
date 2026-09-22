# Omnia Write Connector

> Camada WRITE do `@omnia/lms-connector` — Sprint 3.0.  
> Path `call()` permanece **somente leitura**. Writes usam `callWrite()`.

## Allowlist

| Função                       | Constante                             | Uso              |
| ---------------------------- | ------------------------------------- | ---------------- |
| `core_user_create_users`     | `MOODLE_WRITE_FUNCTIONS.createUsers`  | Criar usuários   |
| `core_user_update_users`     | `MOODLE_WRITE_FUNCTIONS.updateUsers`  | Update / suspend |
| `enrol_manual_enrol_users`   | `MOODLE_WRITE_FUNCTIONS.enrolUsers`   | Matricular       |
| `enrol_manual_unenrol_users` | `MOODLE_WRITE_FUNCTIONS.unenrolUsers` | Desmatricular    |

Função fora da allowlist → `MoodleValidationError`.

## `callWrite(fn, params, { dryRun, correlationId })`

1. Connector enabled?
2. Função na write whitelist?
3. Se `dryRun !== false` **ou** epic lock (`provisionExecuteEnabled=false`) → **não faz HTTP**; retorna:
   ```json
   {
     "mode": "dry-run",
     "code": "EXECUTE_DISABLED_UNTIL_ACTIVATION",
     "functionName": "...",
     "params": {},
     "data": { "simulated": true }
   }
   ```
4. Path `execute` existe como contrato, mas permanece bloqueado até ativação.

## `listWriteCapabilities()`

Consulta allowlist local (+ notas). **Não** executa writes.

## Config

```ts
provisionEnabled: boolean; // default true
provisionDryRun: boolean; // default true
provisionExecuteEnabled: boolean; // default false — MOODLE_PROVISION_EXECUTE
```

Admin global `lms-settings`: `provisionEnabled`, `provisionDryRun` (default true).

## Testes

- `callWrite` dry-run não incrementa fetch
- write fora da allowlist rejeitado
- `call('core_user_create_users')` continua rejeitado no path read
