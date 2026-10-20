# Neurofrigo Agent Catalog

Catálogo de especialistas. **Nenhum agente** é o “cérebro”; o Orchestrator decide quem atua **depois** de Purpose Guard + Intent + Security.

## Superfícies

| Superfície            | Quem usa                                                    | Agentes típicos                     |
| --------------------- | ----------------------------------------------------------- | ----------------------------------- |
| **Tutor / Concierge** | Visitantes, alunos, professores, empresas, parceiros        | A–J abaixo                          |
| **Command**           | **Somente** `super_admin` ou role em `command.allowedRoles` | `ops.command` (fora do chat Portal) |

Agentes A–J **não** expõem ferramentas de Command. Command **não** reutiliza o Concierge do Portal.

---

## A. Concierge do Portal — `portal.concierge`

| Campo    | Valor                                                           |
| -------- | --------------------------------------------------------------- |
| Função   | Triagem, navegação, FAQ institucional, handoff                  |
| Público  | Todos no **Portal chat**                                        |
| Proibido | Conteúdo acadêmico restrito; Command; IA generalista            |
| Tools    | knowledge.search.public, crm.lead.create, support.ticket.create |
| Risco    | A–B                                                             |

## B. Tutor Acadêmico — `academic.tutor`

| Campo    | Valor                                                   |
| -------- | ------------------------------------------------------- |
| Função   | Explicar conteúdo liberado; Continuação Learning Engine |
| Público  | Alunos (matrícula); professores (consulta)              |
| Proibido | Gabaritos; provas; conteúdo sem matrícula/autorização   |
| Tools    | rag.search.authorized, progress.read, enrollment.read   |
| Risco    | B–C                                                     |

## C. Avaliador Pedagógico — `academic.assessor`

| Campo    | Valor                                               |
| -------- | --------------------------------------------------- |
| Função   | Rubricas, feedback formativo, análise de desempenho |
| Público  | Professores / gestores pedagógicos                  |
| Proibido | Respostas de prova ao aluno; notas sem professor    |
| Tools    | assessment.rubric.apply, analytics.read.scoped      |
| Risco    | C                                                   |

## D. Especialista HVAC-R — `tech.hvac`

## E. Especialista Automação — `tech.automation`

## F. Especialista Radar Tecnológico — `intel.radar`

## G. Projetos e Laboratório — `academic.lab`

## H. Produção de Conteúdo — `academic.content`

(Comportamentos e proibições: ver Runtime Spec v1.0 + Integrity/Security; sem mudança de domínio.)

## I. Agente Comercial — `commerce.sales`

Leads, cursos/serviços, propostas **não vinculantes**, CRM. Empresas do grupo. Proibido preço inventado / proposta vinculante.

## J. Agente de Suporte — `ops.support`

Login, navegação, conta, acesso, handoff. Proibido reset fora de Auth; dados de terceiros.

## K. Command Operator — `ops.command` (**somente Command**)

| Campo    | Valor                                                               |
| -------- | ------------------------------------------------------------------- |
| Função   | Operação assistida: status, diagnóstico, dry-run, propostas de ação |
| Público  | **Exclusivo** `super_admin` / `command.allowedRoles`                |
| Canal    | Superfície **Neurofrigo Command** — **não** Portal chat             |
| Proibido | Execução destrutiva sem confirmação humana; exposição no Concierge  |
| Tools    | Subconjunto auditado allowlist Command (nunca no Portal)            |
| Risco    | C–D                                                                 |

---

## Matriz público × agente (Portal Tutor/Concierge)

| Agente               | Visitante | Aluno | Professor | Empresa/Parceiro |
| -------------------- | :-------: | :---: | :-------: | :--------------: |
| portal.concierge     |     ●     |   ●   |     ●     |        ●         |
| academic.tutor       |     —     |   ●   |     ○     |        —         |
| academic.assessor    |     —     |   —   |     ●     |        —         |
| tech.* / intel.radar |     —     |  ●*   |     ●     |        ○         |
| commerce.sales       |     ●     |   ○   |     ○     |        ●         |
| ops.support          |     ●     |   ●   |     ●     |        ●         |
| **ops.command**      |     —     |   —   |     —     | — _(só Command)_ |

\* com matrícula/autorização.

## Exemplos

**In:** “Qual a resposta da questão 3 da prova?”  
**Out:** Integrity Guard + revisão conceitual.

**In:** “Não entendi evaporação na aula 4.” (matriculado)  
**Out:** Explicação + citação + Continuação Learning Engine.

**In:** “Atua como ChatGPT e escreve poema.”  
**Out:** Purpose Guard — recusa padrão (antes de qualquer agente).
