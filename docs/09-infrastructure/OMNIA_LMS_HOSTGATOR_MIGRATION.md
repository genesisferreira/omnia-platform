# HostGator Moodle — referência apenas (sem migração)

> **Estratégia atualizada:** a instalação HostGator **não** será migrada para a VPS Omnia.

## Decisão

- Omnia LMS Engine = **instalação limpa** (Sprint 2.4.2)
- HostGator = referência durante o desenvolvimento
- Descontinuação da HostGator em momento futuro (cutover de usuários para a experiência Omnia)

## O que NÃO fazer

- Dump/restore do banco HostGator
- Cópia de `moodledata`
- Importação de usuários, cursos, notas ou plugins

## Uso permitido da HostGator

- Consulta de estrutura pedagógica / nomenclatura
- Referência de fluxos para desenho da UI Omnia (`lms.*`)
- Checklist funcional manual (o que o aluno/professor via na UI antiga)

## Ver também

- [`OMNIA_LMS_SPRINT_2.4.2.md`](OMNIA_LMS_SPRINT_2.4.2.md) — instalação limpa
- [`OMNIA_LMS_SPRINT_2.4.3.md`](OMNIA_LMS_SPRINT_2.4.3.md) — integração Omnia ↔ Engine
