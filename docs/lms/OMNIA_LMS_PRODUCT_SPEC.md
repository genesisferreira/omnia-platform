# Omnia LMS — Product Spec (Experience MVP)

> **Sprint 2.6** — Especificação oficial do produto para a primeira experiência utilizável do aluno.  
> Moodle é **apenas** motor acadêmico. Toda UI é Omnia, via Connector.

**Status:** Aceito — Sprint 2.6  
**Host MVP:** `https://dev.omniafrigo.com.br/lms/*` (`apps/web`)  
**Host alvo (pós-MVP):** `https://lms.dev.omniafrigo.com.br` (`apps/lms` / promoção do mesmo UX)

---

## 1. Personas

### 1.1 Aluno (foco do MVP)

- Estuda cursos matriculados no Moodle, sem abrir a UI Moodle.
- Precisa continuar de onde parou, ver progresso, notas e conclusão.
- Autenticado na plataforma Omnia (Payload) com Identity Link ativo.

### 1.2 Professor (fora do MVP UI)

- Gerencia turmas e conteúdo no engine; UI Omnia docente em sprint futura.

### 1.3 Gestor (fora do MVP UI)

- Indicadores e catálogo; consome APIs admin/BFF em sprints futuras.

### 1.4 Administrador (fora do MVP UI)

- Policies, sessões, identity links no Admin Payload; não é a jornada deste MVP.

---

## 2. Jornadas (Aluno MVP)

| ID | Jornada | Resultado |
|----|---------|-----------|
| J-L1 | Login | Sessão Omnia (cookie portal) → acesso a `/lms` |
| J-L2 | Dashboard | Saudação, continuar, cursos, progresso agregado |
| J-L3 | Meus Cursos | Lista de matrículas com cards Omnia |
| J-L4 | Continuar estudando | Abre última aula/módulo conhecido |
| J-L5 | Abrir curso | Overview + árvore de módulos |
| J-L6 | Abrir aula | Metadados da atividade (sem player Moodle) |
| J-L7 | Progresso | Progresso por curso / agregado |
| J-L8 | Notas | Notas via Connector |
| J-L9 | Conclusão | Status de completion do curso |
| J-L10 | Logout | Revoga sessão LMS + logout portal |

Fluxo:

```text
Login Omnia → /lms (Dashboard) → Meus Cursos → Curso → Módulo → Aula
                              ↘ Continuar
                              ↘ Progresso / Notas
```

---

## 3. Mapa de navegação (MVP)

```text
/lms                          Dashboard
├── /lms/continuar            Continue Learning (redirect)
├── /lms/cursos               Meus Cursos
│   └── /lms/cursos/[id]      Curso
│       └── .../atividades/[activityId]   Aula / atividade
├── /lms/progresso            Progresso
└── /lms/notas                Notas
```

Shell: Header + Sidebar + Main + Breadcrumb + User Menu + placeholders (Search, Notifications) + Footer.

---

## 4. Estados por tela

Cada tela implementa:

| Estado | Comportamento |
|--------|----------------|
| Loading | Spinner / skeleton |
| Skeleton | Placeholders de layout |
| Empty | Sem dados (ex.: sem cursos) |
| Erro | Falha Connector / Moodle (mensagem sanitizada) |
| Offline | `navigator.onLine === false` |
| Sem permissão | 401/403 |
| Sem vínculo | `MOODLE_IDENTITY_NOT_LINKED` |
| Curso bloqueado | Não matriculado / invisível |
| Concluído | Badge / CTA revisão |

---

## 5. Componentes (Design System)

Button, Card, Progress, Avatar, Badge, Tabs, Sidebar, Navbar, Breadcrumb, Modal, Drawer, Toast, Alert, Empty State, Spinner, Skeleton.

Tokens: cores Omnia, tipografia, spacing, radius, elevation, motion; dark mode preparado.

---

## 6. Responsividade

- Desktop ≥ 1024px — sidebar persistente  
- Tablet 768–1023 — sidebar colapsável / drawer  
- Mobile &lt; 768 — bottom/nav drawer, cards empilhados  

---

## 7. Acessibilidade (WCAG AA)

- Navegação por teclado e foco visível  
- Landmarks ARIA (`banner`, `navigation`, `main`)  
- Contraste AA nos tokens  
- Skip link para conteúdo  
- Textos alternativos / labels em ícones  

---

## 8. Contratos de API (somente Connector)

Base BFF: `{ADMIN}/api/omnia/lms`  
Proxy portal: `{WEB}/api/lms/*` (S2S server-only)

| Uso UI | Connector |
|--------|-----------|
| Perfil acadêmico | `GET /me` |
| Lista cursos | `GET /courses` |
| Detalhe curso | `GET /courses/:id` |
| Conteúdo / módulos | `GET /courses/:id/content` |
| Progresso | `GET /courses/:id/progress` |
| Notas | `GET /grades?courseId=` |
| Conclusão | `GET /completion?courseId=` |
| Sessão LMS | `POST /sessions`, `/heartbeat`, `/logout` |
| Health (ops) | `GET /health` |

**Não criar** endpoints novos no Connector nesta sprint.  
Dashboard e Continue Learning são **agregações client/server** sobre os endpoints acima + last-seen local.

### Segurança

- Nunca URL Moodle no browser  
- Nunca token Moodle / `wstoken`  
- Nunca iframe/renderer Moodle  
- Identity Link obrigatório para dados acadêmicos  

---

## 9. Continue Learning

1. Preferência: last-seen (`localStorage` chave `omnia:lms:last:{omniaUserId}`) com `{ courseId, activityId, sectionId, updatedAt }`  
2. Fallback: primeiro curso com progresso incompleto  
3. Fallback: primeiro curso matriculado  
4. Sem cursos → empty state  

---

## 10. Fora de escopo (Sprint 2.6)

Neurofrigo, streaming protegido, marketplace, pagamentos, provisionamento, certificados reais, gamificação, chat, IA, CDN, player de mídia Moodle.

---

## 11. Critérios de aceite (produto)

- Aluno autentica e acessa Dashboard Omnia  
- Vê cursos, abre curso/aula, progresso, notas, conclusão  
- Continuar estudando restaura contexto  
- Zero telas Moodle  
- DEV homologável; PROD intocada  
