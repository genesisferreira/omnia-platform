# Academy

> Plataforma de cursos e aprendizado da Omnia.

**Sprint:** 7

## Objetivo

Oferecer cursos, trilhas de aprendizado e gestão de matrículas, integrando compra via marketplace e acesso controlado por identidade.

## Responsabilidades

- Modelar cursos, módulos, aulas e progresso do aluno
- Controlar matrículas e certificados
- Integrar com marketplace para fluxo de compra
- Garantir acesso autenticado via domínio identity

## Dependências

| Domínio         | Uso                                  |
| --------------- | ------------------------------------ |
| **core**        | Primitivos compartilhados            |
| **identity**    | Autenticação e autorização de alunos |
| **marketplace** | Processamento de compra de cursos    |

## Integrações

Nenhuma integração externa direta além dos domínios listados. Persistência via Drizzle ORM.

## Eventos futuros

| Evento            | Descrição                          | Sprint |
| ----------------- | ---------------------------------- | ------ |
| `CoursePurchased` | Curso adquirido e matrícula criada | 7      |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [database/schemas/courses.md](../../database/schemas/courses.md)
- [events/README.md](../../events/README.md)
