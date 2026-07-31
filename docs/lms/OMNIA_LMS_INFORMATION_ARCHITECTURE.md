# Omnia LMS — Information Architecture

> Navegação e estrutura de informação do produto em `lms.*` (Omnia). Engine `moodle.*` fora da IA de usuário.

---

## 1. Mapas de site (L1)

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

| Objeto | Onde vive | Exposto na Omnia como |
| --- | --- | --- |
| User | Omnia Id + Moodle user | Perfil unificado |
| Organization / Tenant | Omnia | Empresa / marca |
| Category | Moodle | Categoria catálogo |
| Course | Moodle | Curso |
| Section / Module | Moodle | Módulo |
| Activity | Moodle | Aula / Atividade |
| Enrollment | Moodle | Matrícula |
| Completion | Moodle | Progresso |
| Grade | Moodle | Nota |
| Certificate | Moodle + Omnia verify | Certificado |
| Media Asset | Ext storage | Vídeo/PDF |
| Live Session | Omnia + Ext | Aula ao vivo |
| Order / License | Omnia | Pedido / licença |
| Lead | Omnia CRM | Lead educacional |
| AI Conversation | Neurofrigo | Chat tutor |
| Achievement | Omnia | Conquista |

---

## 3. Princípios de IA (informação)

1. **Progressive disclosure:** dashboard → curso → aula.  
2. **Uma busca global** (cursos, aulas, certificados, mensagens).  
3. **Estados vazios** orientam próxima ação.  
4. **Tenant branding** sem mudar hierarquia.  
5. **Mobile:** mesmos L1; ações primárias no polegar.  
6. **Nunca** expor URLs `moodle.*` na navegação do aluno.

---

## 4. Taxonomia de catálogo (negócio)

- Área técnica (ex.: refrigeração comercial, industrial, manutenção)  
- Nível (básico → avançado → certificação)  
- Modalidade (assíncrono / ao vivo / trilha)  
- Público (individual / empresa / parceiro)  
- Idioma  

Metadados de vitrine = Omnia; vínculo acadêmico = Moodle course id.

---

## 5. Relação com Platform hub

| Hub Omnia | LMS |
| --- | --- |
| Conteúdo institucional / blog | Descoberta e SEO |
| Rede de Parceiros | Credenciamento e exclusivos |
| Conta / Minha conta | Entry SSO futuro |
| Admin CMS | Não substitui authoring LMS |
