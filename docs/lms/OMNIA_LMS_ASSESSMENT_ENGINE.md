# Omnia LMS — Assessment Engine

> **Sprint 2.7 — Épico D**  
> Package: `@omnia/assessment-engine`  
> Camada read-only entre Learning Engine e Connector para quizzes/tarefas.

## Arquitetura

```text
Aluno → Experience → Learning Engine → Assessment Engine → Connector → Moodle
```

## Responsabilidades

| Módulo | Função |
| --- | --- |
| Assessment State | Snapshot resolvido (status, grade, feedback, completion) |
| Assessment Timeline | Eventos via Learning Engine |
| Assessment Events | `assessment.*`, `quiz.viewed`, `assignment.viewed`, `grade.viewed`, `feedback.viewed` |
| Assessment Cache | TTL in-memory |
| Assessment Metadata | Nome, tipo, instruções, estimativa |
| Assessment Status | Disponível / Indisponível / Em andamento / Concluído / Nota / Feedback |

## Security ready (stubs)

`AssessmentAuthorizationPort` · `AttemptLockPort` · `SecureSubmissionPort` · `WriteApiPort` → `NOT_IMPLEMENTED`.

## Fora de escopo

Submissão quiz/assignment, Write API Moodle, professor, correção, banco de questões.
