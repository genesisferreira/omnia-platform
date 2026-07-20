# Matriz RBAC staff — Release 2.1 / HOTFIX P04

Contas temporárias de homologação em staging: domínio `@example.invalid`.

| Papel | CRM global | Organizations | Users | Observação |
| --- | --- | --- | --- | --- |
| `super_admin` | CRUD total | CRUD | CRUD | Acesso pleno |
| `admin` | CRUD CRM (delete conforme policy) | CRUD | update (não delete) | Escopo plataforma |
| `editor` | read/create/update via `staffOnly`; delete negado (`adminsOnly`) | read autenticado | self + restrições | Não herda admin |
| `partner` | negado | read autenticado | self | Sem CRM global |
| `instructor` | negado | read autenticado | self | Sem CRM global |
| `student` | negado | read autenticado | self | Sem CRM global |
| `client` | negado | read autenticado | self | Sem CRM global |

Proteção é no access control Payload (`staffOnly` / `adminsOnly`), não apenas UI.

`accountStatus`:

| Status | Login nativo | Login BFF | Sessão existente |
| --- | --- | --- | --- |
| `pending` | permitido | permitido | válido |
| `active` | permitido | permitido | válido |
| `blocked` | rejeitado (`beforeLogin`) | 403 | JWT wrap + `me`/`refresh` invalidam |
