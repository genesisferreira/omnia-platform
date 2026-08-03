# Neurofrigo Knowledge Hub — ACL

> **Macroentrega 01.** Avaliação em `@omnia/neurofrigo-knowledge` (`evaluateKnowledgeAcl`). Admin Payload tem ACL própria de staff.

## Dois planos

| Plano | Onde | Quem |
|-------|------|------|
| **Admin Hub** | Access Payload (`apps/admin/src/access/knowledge.ts`) | Staff editorial |
| **Retrieval futuro** | `evaluateKnowledgeAcl` | Portal chat / Command / system |

ME01 opera o plano Admin. O plano de retrieval está tipado e testável, **sem** wiring ao Runtime/RAG.

---

## Admin — papéis

| Conjunto | Roles |
|----------|-------|
| Readers / staff | `super_admin`, `admin`, `neurofrigo_admin`, `technical_reviewer`, `editor` |
| Publishers | `super_admin`, `admin`, `neurofrigo_admin` |
| Settings | `admin` plataforma / `neurofrigo_admin` |
| Auditoria (read) | platform admin / `neurofrigo_admin` / `super_admin` |
| Auditoria (write UI) | **negado** — só sistema (`overrideAccess`) |

### Matriz Admin (documentos)

| Ação | editor | technical_reviewer | publisher |
|------|:------:|:------------------:|:---------:|
| Read | ● | ● | ● |
| Create | ● | ● | ● |
| Update draft | ● | ● | ● |
| Update não-draft | ○ | ● | ● |
| Publish / approve fields | ○ | ○ | ● |
| Delete | ○ | ○ | ● |

Student, partner, client, instructor: **sem** acesso ao Hub Admin.

---

## Retrieval futuro — canais

| `channel` | Comportamento |
|-----------|----------------|
| `admin` | ALLOW (bypass de retrieval; UI já gated) |
| `command` | Somente se `role === super_admin` |
| `portal_chat` / `system` | ACL completa abaixo |

### Regras portal_chat / system (ordem lógica)

1. `INTERNAL_RESTRICTED` → **DENY** (`DENY_CHAT_INTERNAL`) — chat público nunca vê  
2. `allowAiUse === false` → **DENY** (`DENY_AI_FLAG`)  
3. `publicationStatus !== published` → **DENY** (`DENY_PUBLICATION`)  
4. `allowedAgents` preenchido e agente fora da lista → **DENY**  
5. Agente `command` exige `super_admin`  
6. `allowedRoles` preenchido e role fora → **DENY**  
7. `CLIENT_PARTNER` + `allowedCompanies` → exige interseção com empresas do contexto  
8. `STUDENT` ou `requiresEnrollment` → autenticação + matrícula nos `allowedCourses` se listados  
9. `TEACHER_MANAGER` → role `instructor` \| `admin` \| `super_admin`  

Códigos: `ALLOW` · `DENY_UNAUTHENTICATED` · `DENY_CLASSIFICATION` · `DENY_AI_FLAG` · `DENY_AGENT` · `DENY_ROLE` · `DENY_COMPANY` · `DENY_ENROLLMENT` · `DENY_COMMAND` · `DENY_PUBLICATION` · `DENY_CHAT_INTERNAL`.

## Classificação × superfícies

| Classificação | Portal chat | Command (`super_admin`) | Admin Hub |
|---------------|:-----------:|:-----------------------:|:---------:|
| PUBLIC | ● (se publicado + AI) | ● | ● |
| CLIENT_PARTNER | vínculo empresa | ● | ● |
| STUDENT | matrícula | ● | ● |
| TEACHER_MANAGER | instructor+ | ● | ● |
| INTERNAL_RESTRICTED | **Nunca** | ● | ● |

## Allowlist de agentes

Collection `knowledge-agent-access`: classificações, áreas, categorias, source types; `canUseWebResearch=false` por default; `canUseUnpublished` tipicamente só para `command` no seed.

## Princípio

**Deny sem vazar existência** de documentos negados em retrieval futuro (alinha Security Guard / RAG Spec). Em ME01, negação = ausência de acesso Admin ou flag `allowAiUse=false`.
