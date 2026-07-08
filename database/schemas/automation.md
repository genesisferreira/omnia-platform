# Schema — Automation

> Workflows e execuções n8n. Sprint 8+.

## Tabelas principais

### `automation_workflows`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK |
| `n8n_workflow_id` | VARCHAR(50) | ID no n8n |
| `name` | VARCHAR(255) | — |
| `status` | ENUM | `active`, `inactive` |

### `automation_executions`

Log de execuções com status, duração e payload.

## Eventos

`WorkflowExecuted`, `WorkflowFailed`

## Package

`@omnia/automation` — definições JSON versionadas no repo.
