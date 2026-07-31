# Omnia LMS — Learning Experience Spec

> **Sprint 2.6.5** — Especificação da experiência de aprendizagem Omnia.  
> **Status:** Aceito.  
> UI sempre Omnia; Moodle é engine invisível.  
> Alinhado ao Product Spec 2.6 (MVP aluno) e ao Domain Model.

---

## 1. Princípios de experiência

1. **Uma jornada contínua** — dashboard → curso → aula, sem saltos para `moodle.*`.
2. **Continuidade** — Continuar estudando é CTA de primeira classe.
3. **Clareza de progresso** — % e badges em todo nível relevante.
4. **Estados honestos** — empty, erro, sem vínculo, offline, bloqueado.
5. **Acessibilidade WCAG AA** — teclado, foco, ARIA, contraste.
6. **Mobile-first** — shell com drawer; conteúdo legível em viewport estreito.
7. **Sem player Moodle no MVP** — aula = metadados + estados; rich media em sprint futura.

---

## 2. Experiência do Aluno (MVP + alvo)

### 2.1 Objetivos

Estudar matrículas, retomar contexto, ver progresso/notas/conclusão, sair com sessão segura.

### 2.2 Fluxo canônico

```text
Login Omnia → /lms Dashboard → Continuar | Meus cursos
  → Curso (overview + ModuleTree + Notas + Conclusão)
  → Aula/Atividade (metadados)
  → Progresso / Notas agregados
  → Logout (session LMS + portal)
```

### 2.3 Telas (MVP)

| Experiência | Rota | Conteúdo |
| --- | --- | --- |
| Dashboard | `/lms` | Saudação, Continuar, cards, progresso médio, placeholders |
| Meus cursos | `/lms/cursos` | CourseCards |
| Continuar | `/lms/continuar` | Resolve → redirect |
| Curso | `/lms/cursos/[id]` | Summary, Progress, Tabs módulos/notas/conclusão |
| Aula | `.../atividades/[id]` | Nome, tipo, status, placeholder conteúdo |
| Progresso | `/lms/progresso` | Lista % por curso |
| Notas | `/lms/notas` | Itens por curso |

### 2.4 Fora do MVP (alvo aluno)

Player streaming, materiais view_only, certificados reais, agenda, mensagens, tutor IA, gamificação.

---

## 3. Experiência do Curso

**Job:** orientar o aluno na estrutura e no status acadêmico.

| Zona | Responsabilidade |
| --- | --- |
| Header | Título, summary sanitizado, Progress, CTA Continuar |
| ModuleTree | Módulos → atividades visíveis com badge Pendente/Concluída |
| Notas | GradeCard list |
| Conclusão | CompletionBadge + timestamp |
| Empty/Erro | EmptyState / Alert |

**Regras UX:** uma job por seção; sem cards no “hero” do curso além do necessário à interação; breadcrumbs L1.

---

## 4. Experiência da Aula

**Job:** situar o aluno na atividade e no progresso.

MVP:

- Breadcrumb LMS → Cursos → Curso → Aula
- Título + Badge estado
- Tipo (`modName`)
- Texto seguro: conteúdo rich media fora de escopo
- TrackLastSeen

Alvo:

- MaterialViewer / Player Omnia
- Timeline da aula
- CTA concluir / próxima aula
- Integração Neurofrigo contextual

---

## 5. Experiência do Professor (alvo — não implementar agora)

```text
Login → Turmas → Curso → Estrutura/Conteúdo → Fila de correção → Feedback → Relatórios
```

Necessidades: editor de módulo/aula, banco de questões, correção, engajamento da turma.  
SoR writeback Moodle via Connector (futuro write mode).

---

## 6. Experiência do Gestor (alvo)

```text
Login → Indicadores → Cursos → Progresso cohorts → Relatórios/Export → Auditoria
```

Necessidades: KPIs matrícula/conclusão, multiempresa, compliance.  
Dados: agregações Omnia + leituras Connector/BI.

---

## 7. Experiência do Administrador (ops)

Já operacional no Admin Payload: Identity Links, LMS Settings (Policy), sessões, health, métricas.

Não é jornada pedagógica; é **governança**.

---

## 8. Mapa emocional / estados

| Momento | Emoção alvo | Resposta UX |
| --- | --- | --- |
| Sem vínculo | Confusão | EmptyState claro + caminho conta |
| Sem cursos | Expectativa | Empty + mensagem matrícula |
| Erro Connector | Frustração | Alert sanitizado + retry implícito |
| Offline | Incerteza | OfflineBanner |
| Concluído | Realização | Badge + revisão |

---

## 9. Referências

Product Spec · Domain Model · Information Architecture · Component Map · User Journeys
