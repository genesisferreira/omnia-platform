# Omnia LMS — Policy Engine

## API central

```ts
resolveLmsPolicy(context) → LmsResolvedPolicy
```

## Políticas efetivas nesta entrega

- Limite de sessões por perfil
- Revogação da sessão excedente
- TTL / heartbeat
- Flags preparadas: downloads, watermark, media TTL

## Precedência (estrutura)

`userException > material > course > global`

Nesta entrega, course/material normalmente vazios → efetivo = global por perfil (com override admin via Global `lms-settings`).

## Admin

Global Payload **LMS — Políticas** (`lms-settings`):

- connector enabled / read-only
- limites aluno/professor/gestor/admin
- revoke oldest, TTL, heartbeat
- motivo da alteração → `lms-audit-events`
