# Omnia Identity Sync

> Deduplicação Omnia User ↔ Moodle User via `IdentityLink` ativo.

## Regras (Sprint 3.0 dry-run)

1. Antes de `create`/`sync`, consultar `lms-identity-links` com `status=active` para `omniaUserId`.
2. Se link ativo com `moodleUserId` → **no-op idempotente** (`IDENTITY_ALREADY_LINKED`).
3. Dry-run **não** cria nem atualiza IdentityLink — apenas audita intenção.
4. Update/disable/enable exigem `moodleUserId` no comando **ou** link ativo existente.

## Fluxo alvo (pós-ativação)

```text
Omnia User → createUser Moodle → IdentityLink active → audit
```

## Porta

```ts
type IdentityLinkPort = {
  findActive(omniaUserId: string): Promise<IdentityLookupResult>;
};
```

Implementação Admin: `findIdentityLink` (Payload collection `lms-identity-links`).
