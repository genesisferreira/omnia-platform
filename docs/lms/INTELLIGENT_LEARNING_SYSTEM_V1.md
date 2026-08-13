# Intelligent Learning System V1

Base: LMS Product Completion STAGING GO (`61f5d51`).  
Branch: `feature/intelligent-learning-system-v1`

Camada educacional inteligente **sobre** o LMS Core. Não é um segundo LMS. Não cria runtime de IA paralelo.

## Auditoria (resumo)

| Domínio                         | Status                           | Ação                                   |
| ------------------------------- | -------------------------------- | -------------------------------------- |
| Schools                         | PARCIAL (companies + brandTheme) | EVOLUIR `schoolKey`                    |
| LMS Core                        | EXISTE                           | REUTILIZAR                             |
| SIP / Adaptive / Tutor          | EXISTE                           | REUTILIZAR + ligar eventos             |
| Onboarding / PCAR / Student 360 | FALTAVA                          | IMPLEMENTADO                           |
| Professor cockpit 360           | PARCIAL                          | EVOLUIR                                |
| Exercise generator / blueprint  | FALTAVA                          | IMPLEMENTADO (rule + validação humana) |

## Modelo

Escola = `companies.schoolKey` + `courses/classes/enrollments/certificates.schoolKey`.  
Não há collection `schools`.

Coleções ILS: `ils-onboarding`, `ils-consents`, `ils-competency-history`, `ils-interventions`, `ils-generated-exercises`, `ils-assessment-blueprints`, `ils-audit-events`.

Pacote: `@omnia/intelligent-learning`.

## IMT V1

`sum(score * confidence * evidenceCount) / sum(confidence * evidenceCount)`  
somente competências com `evidenceCount >= 2`.  
Se evidência total `< 4`: **insufficient** (não inventa número).

## CTE branding

Estrutura configurável (`brandTheme=cte`, issuer CTE). Assets oficiais ainda não homologados — placeholder documentado.

## Alunos legado

Quem já tinha progresso no LMS Core entra como `EXEMPTED` (sem gate). Aluno novo = first login obrigatório.

## Não feito nesta entrega

CRM, ERP, WhatsApp, n8n, produção, merge develop, equivalência estatística de provas, video resume.
