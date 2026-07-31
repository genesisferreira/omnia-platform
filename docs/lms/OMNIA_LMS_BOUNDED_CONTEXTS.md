# Omnia LMS — Bounded Contexts (DDD)

> **Sprint 2.6.5** — Mapa DDD oficial.  
> **Status:** Aceito.

---

## 1. Camadas

| Camada | Conteúdo |
| --- | --- |
| **Core Domain** | Learning Experience (aluno), Academic Access (enrollment/progress), Identity Bridge |
| **Supporting Domain** | Session Security, Policy, Observability, Content Protection |
| **Generic / Shared** | Auth Payload, Tenancy, Logging, Config |
| **Infrastructure** | Moodle WS, Redis, Postgres, Traefik, OTel/Prometheus |
| **Application** | BFF Connector (`/api/omnia/lms`), Web `/lms/*`, Admin Payload globals |

---

## 2. Bounded Contexts

```text
┌─────────────────────┐     ┌──────────────────────┐
│ Identity & Access   │────▶│ Identity Bridge      │
│ (Payload Users)     │     │ (IdentityLink)       │
└─────────────────────┘     └──────────┬───────────┘
                                       │
┌─────────────────────┐     ┌──────────▼───────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Learning Experience │────▶│ Learning Engine      │────▶│ LMS Connector BFF│────▶│ Academic Engine  │
│ (Omnia UI /lms)     │◀────│ (@omnia/learning-    │     │ (Anti-Corruption)│     │ (Moodle)         │
│                     │     │  engine)             │     │                  │     │                  │
└─────────────────────┘     └──────────────────────┘     └────────┬─────────┘     └──────────────────┘
                                                                  │
                                                   ┌──────────────┼──────────────┐
                                                   ▼              ▼              ▼
                                            Session Security   Policy        Observability
```

| Context | Linguagem | Ownership | Integração |
| --- | --- | --- | --- |
| **Identity & Access** | User, role, cookie | Omnia Auth/Payload | SSO futuro |
| **Identity Bridge** | IdentityLink | Omnia LMS tables | Moodle user id |
| **Academic Engine** | Course, enrol, grade… | Moodle | WS RO |
| **LMS Connector** | DTOs Omnia, errors | `@omnia/lms-connector` + Admin BFF | ACL traduz Moodle→Omnia |
| **Learning Experience** | Dashboard, Aula, Continuar | `apps/web` `/lms` | Proxy S2S + Learning Engine |
| **Learning Engine** | Continue, Timeline, Events, State, Cache, Sync | `@omnia/learning-engine` | Porta `LearningPersistence`; lê Connector via Experience |
| **Session Security** | Session, device, revoke | Session Manager | Redis |
| **Policy** | Limits, flags | Policy Engine + lms-settings | Audit |
| **Observability** | metrics, traces | monitoring/logger | Prom/Grafana |
| **Teaching** *(futuro)* | Turma, correção | UI professor | Connector write |
| **Governance** *(futuro)* | KPI, relatório | UI gestor | BI |
| **Intelligence** *(futuro)* | Recommendation, AiInteraction | Neurofrigo | Events |
| **Commerce** *(futuro)* | Offer, Payment | Marketplace | Gateway |
| **Media** *(futuro)* | Signed URL, player | Omnia media | CDN/storage |

---

## 3. Anti-Corruption Layer (Connector)

- Moodle REST → mappers tipados Omnia.
- Erros Moodle → códigos sanitizados (`MOODLE_*`, `FORBIDDEN`, …).
- Nunca vazar `wstoken` / URLs Moodle ao browser (scrub adicional no Web proxy).

---

## 4. Context Mapping

| De | Para | Relação |
| --- | --- | --- |
| Learning Experience | Connector | Customer/Supplier (Omnia manda UX) |
| Connector | Moodle | Conformist + ACL |
| Session Security | Policy | Shared Kernel (limites) |
| Identity Bridge | Academic Engine | Partnership via IDs |
| Observability | todos | Open Host (OTel) |

---

## 5. Shared Kernel (mínimo)

- `omniaUserId`, `LmsRole`, correlation/trace ids
- Envelope de eventos (`OMNIA_LMS_EVENT_CATALOG.md`)
- Códigos de erro públicos LMS

---

## 6. O que NÃO misturar

- UI Moodle no Learning Experience
- Write acadêmico no browser
- Policy no Moodle core
- Eventos Neurofrigo no Connector RO sem contrato

---

## Referências

Domain Model · Connector Architecture · Responsibility Matrix · Blueprint
