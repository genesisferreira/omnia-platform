# EPIC 16 — Universal AI Command Center + Global AI Dock

**Branch:** `feature/universal-ai-command-center`  
**Base RC:** `omnia-platform-ai-v3-rc.1` @ `01109e1`  
**Produção / Landing / Moodle:** não tocados  
**Security gate:** `github_credential_rotated=false` → `PRODUCTION_DEPLOY_ALLOWED=false`

## Objetivo

Tornar assistentes já existentes **visíveis, centralizados, contextuais e seguros** no Portal — sem reconstruir a arquitetura de IA.

## Auditoria (EXISTE / PARCIAL / FALTA)

| Item                                  | Status                                                 |
| ------------------------------------- | ------------------------------------------------------ |
| Chat page `/ia`                       | **EXISTE** (novo)                                      |
| Chat component                        | **EXISTE** (`AiChatWorkspace` + `AskAiPanel`)          |
| AI Dock global                        | **EXISTE** (novo)                                      |
| Assistant selector                    | **EXISTE** (Registry via `/api/ai/assistants`)         |
| Session history                       | **EXISTE** (list/open via `/api/ai/sessions`)          |
| Context awareness                     | **PARCIAL→EXISTE** (`resolvePageAiContext`)            |
| Identity / role                       | **EXISTE** (sessão + `/api/ai/context`)                |
| Tenant / company                      | **EXISTE** server-side (bindRequestScope)              |
| Course / lesson                       | **EXISTE** (props LMS + page context)                  |
| Citations / feedback / explainability | **EXISTE** (reutilizado)                               |
| Mobile dock                           | **EXISTE** (bottom sheet + desktop drawer)             |
| Streaming / attachments               | **FALTA** (fora do escopo mínimo; loading progressivo) |
| Admin registries                      | **EXISTE**                                             |

## Arquitetura reutilizada

- `@omnia/neurofrigo-runtime`, `@omnia/enterprise-ai`, `@omnia/retrieval`, `@omnia/neurofrigo-tutor`
- `POST /api/ai/chat` → Admin `/api/omnia/ai/chat`
- Assistant Registry + Policy Engine (`listAllowedAssistants`)
- AI Sessions / Feedback collections
- Auth gate `requirePortalSession` / S2S identity headers

## Componentes novos

| Componente                                   | Papel                             |
| -------------------------------------------- | --------------------------------- |
| `AiChatWorkspace`                            | UI de conversa compartilhada      |
| `AiExperienceProvider`                       | Estado global (sessão/turns/dock) |
| `AiDock`                                     | Botão flutuante + drawer          |
| `AiCommandCenterClient` + `/ia`              | Command Center                    |
| Admin `GET /omnia/ai/sessions` (+ `:id`)     | Histórico com ownership           |
| Portal `/api/ai/sessions`, `/api/ai/context` | BFF                               |

## Rotas de homologação humana

| Perfil    | Login                             | Onde testar                   |
| --------- | --------------------------------- | ----------------------------- |
| Student   | `/login?next=/ia`                 | `/ia`, `/cursos/...`, AI Dock |
| Professor | `/login?next=/ia`                 | `/ia`, curso autorizado, Dock |
| Admin     | `/login?next=/ia` + Admin Payload | registries + `/ia`            |

Não versionar senhas.

## Segurança

- Anônimo → 401
- Sessão A não abre sessão B → 403
- Assistants filtrados por policy/role (Registry)
- Spoof de role/tenant/company no body → ignorado (server bind)

## n8n

Não integrado. Gateway futuro permanece desacoplado.
