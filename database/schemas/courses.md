# Schema — Courses (Academy)

> Educação e cursos. Sprint 7+.

## Tabelas principais

### `acad_courses`

| Coluna        | Tipo         | Descrição                        |
| ------------- | ------------ | -------------------------------- |
| `id`          | UUID         | PK                               |
| `tenant_id`   | UUID         | FK                               |
| `title`       | VARCHAR(255) | —                                |
| `slug`        | VARCHAR(255) | —                                |
| `description` | TEXT         | —                                |
| `price`       | DECIMAL      | —                                |
| `status`      | ENUM         | `draft`, `published`, `archived` |

### `acad_enrollments`

Matrículas de alunos em cursos.

### `acad_certificates`

Certificados emitidos.

## Storage

Vídeos e materiais em MinIO `media/` e `documents/`.

## Eventos

`CoursePurchased`, `CourseCompleted`
