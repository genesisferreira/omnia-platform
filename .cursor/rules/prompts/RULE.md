# Prompts do Projeto

Templates de prompts para tarefas recorrentes no desenvolvimento da Omnia Platform.

## Novo Módulo

```
Crie o módulo [NOME] seguindo DDD e Clean Architecture.
Bounded context: [CONTEXTO]
Entidades: [LISTA]
Consulte docs/03-domain/ e ADR-001 antes de implementar.
```

## Nova Feature

```
Implemente [FEATURE] no módulo [MODULO].
Requisitos: docs/02-prd/
Regras: docs/15-business-rules/
Siga convenções em PROJECT_CONTEXT.md.
```

## Code Review

```
Revise o código considerando:
- SOLID principles
- Clean Architecture boundaries
- TypeScript strict
- Sem secrets expostos
- Testes adequados
```

## ADR

```
Crie ADR-[NUM] documentando a decisão sobre [ASSUNTO].
Siga o template em docs/14-adr/README.md.
Inclua alternativas consideradas e consequências.
```
