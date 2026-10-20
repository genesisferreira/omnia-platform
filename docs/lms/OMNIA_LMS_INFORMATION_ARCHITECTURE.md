# Omnia LMS — Information Architecture

> Navegação e estrutura de informação do produto em Omnia (`/lms/*` MVP → `lms.*` alvo).  
> Engine `moodle.*` fora da IA de usuário.  
> **Sprint 2.6.5:** consolidado com Domain Model e Learning Experience Spec.

**Fontes relacionadas:** [`OMNIA_LMS_DOMAIN_MODEL.md`](OMNIA_LMS_DOMAIN_MODEL.md) · [`OMNIA_LMS_LEARNING_EXPERIENCE_SPEC.md`](OMNIA_LMS_LEARNING_EXPERIENCE_SPEC.md) · [`OMNIA_LMS_PRODUCT_SPEC.md`](OMNIA_LMS_PRODUCT_SPEC.md)

---

## 0. Mapa L1 — Aluno MVP (operacional)

```text
Dashboard (/lms)
├── Continuar (/lms/continuar)
├── Meus cursos (/lms/cursos)
│   └── Curso (/lms/cursos/[courseId])
│       ├── Módulos / Aulas (tab)
│       ├── Notas (tab)
│       ├── Conclusão (tab)
│       └── Aula (/atividades/[activityId])
├── Progresso (/lms/progresso)
├── Notas (/lms/notas)
├── Perfil / Conta (portal /minha-conta)
├── Busca (placeholder)
├── Notificações (placeholder)
└── Ajuda (futuro)
```

Configurações LMS profundas ficam no **Admin** (policies, identity), não no shell aluno MVP.

---

## 1. Mapas de site alvo (L1 completo)

### 1.1 Aluno

```text
Home (Dashboard)
├── Continuar estudando
├── Meus cursos
│   └── [Curso]
│       ├── Visão geral
│       ├── Módulos / Aulas
│       ├── Materiais
│       ├── Avaliações
│       ├── Ao vivo
│       └── Certificado
├── Agenda
├── Certificados
├── Favoritos
├── Mensagens
├── Notificações
├── IA Tutor
├── Conquistas / Ranking
├── Pesquisa
└── Perfil / Preferências
```

### 1.2 Professor

```text
Home Professor
├── Minhas turmas
├── Biblioteca de cursos
│   └── Editor de curso
│       ├── Estrutura
│       ├── Conteúdo / Upload
│       ├── Avaliações / Banco
│       ├── Calendário
│       └── Publicação
├── Correções
├── Relatórios
├── Mensagens
├── IA Professor
└── Perfil docente
```

### 1.3 Gestor

```text
Home Executivo
├── Indicadores
├── Catálogo / Cursos
├── Pessoas (alunos, professores)
├── Tenants / Empresas
├── Parceiros
├── Financeiro / Conversões
├── Relatórios / Exportações
├── Auditoria
└── Configurações LMS
```

### 1.4 Marketplace (público autenticável)

```text
Catálogo
├── Cursos
├── Trilhas / Assinaturas
├── Mentorias / Eventos
├── Detalhe oferta
└── Checkout
```

---

## 2. Objetos de informação (canônicos)

| Objeto                | Onde vive                | Exposto na Omnia como |
| --------------------- | ------------------------ | --------------------- |
| User                  | Omnia Id + Moodle user   | Perfil unificado      |
| Organization / Tenant | Omnia                    | Empresa / marca       |
| Category              | Moodle                   | Categoria catálogo    |
| Course                | Moodle                   | Curso                 |
| Section / Module      | Moodle                   | Módulo                |
| Activity / Lesson     | Moodle / produto         | Aula / Atividade      |
| Enrollment            | Moodle                   | Matrícula             |
| Completion / Progress | Moodle + agregação Omnia | Progresso             |
| Grade                 | Moodle                   | Nota                  |
| Certificate           | Moodle + Omnia verify    | Certificado           |
| Media Asset           | Ext storage              | Vídeo/PDF             |
| Session               | Omnia Redis              | Sessão LMS            |
| Policy                | Omnia                    | Políticas             |
| IdentityLink          | Omnia                    | Vínculo acadêmico     |
| Live Session          | Omnia + Ext              | Aula ao vivo          |
| Order / License       | Omnia                    | Pedido / licença      |
| Lead                  | Omnia CRM                | Lead educacional      |
| AI Conversation       | Neurofrigo               | Chat tutor            |
| Achievement           | Omnia                    | Conquista             |

Detalhe de entidades: Domain Model.

---

## 3. User flows (IA)

### 3.1 Aluno

```text
Login → Dashboard → Curso → Módulo → Aula → Material/Atividade → Conclusão → Dashboard
                 ↘ Continuar
                 ↘ Progresso / Notas
```

### 3.2 Professor (alvo)

```text
Login → Turmas → Curso → Correção → Feedback → Relatórios
```

### 3.3 Gestor (alvo)

```text
Login → Indicadores → Cursos → Progresso → Relatórios
```

---

## 4. Prioridade de navegação (aluno)

| Prioridade | Item                                           | MVP |
| ---------- | ---------------------------------------------- | :-: |
| P0         | Dashboard, Continuar, Meus cursos, Curso, Aula |  ●  |
| P0         | Progresso, Notas                               |  ●  |
| P1         | Materiais, Certificados, Perfil                | ○/— |
| P2         | Agenda, Mensagens, IA, Gamificação             |  —  |

---

## 5. Taxonomia de labels (ubiquitous language)

| Label UI    | Entidade domínio       |
| ----------- | ---------------------- |
| Meus cursos | Enrollment + Course    |
| Módulo      | Module                 |
| Aula        | Lesson (Activity)      |
| Atividade   | Activity               |
| Progresso   | Progress               |
| Notas       | Grade                  |
| Conclusão   | Completion             |
| Continuar   | Continue Learning rule |

---

## 6. Referências

Blueprint · User Journeys · Product Spec · Component Map · Frontend Architecture

---

## 7. Princípios de IA (informação)

1. **Progressive disclosure:** dashboard → curso → aula.
2. **Uma busca global** (cursos, aulas, certificados, mensagens) — alvo.
3. **Estados vazios** orientam próxima ação.
4. **Tenant branding** sem mudar hierarquia.
5. **Mobile:** mesmos L1; ações primárias no polegar.
6. **Nunca** expor URLs `moodle.*` na navegação do aluno.

---

## 8. Taxonomia de catálogo (negócio)

- Área técnica (ex.: refrigeração comercial, industrial, manutenção)
- Nível (básico → avançado → certificação)
- Modalidade (assíncrono / ao vivo / trilha)
- Público (individual / empresa / parceiro)
- Idioma

Metadados de vitrine = Omnia; vínculo acadêmico = Moodle course id.

---

## 9. Relação com Platform hub

| Hub Omnia                     | LMS                         |
| ----------------------------- | --------------------------- |
| Conteúdo institucional / blog | Descoberta e SEO            |
| Rede de Parceiros             | Credenciamento e exclusivos |
| Conta / Minha conta           | Entry SSO futuro            |
| Admin CMS                     | Não substitui authoring LMS |
