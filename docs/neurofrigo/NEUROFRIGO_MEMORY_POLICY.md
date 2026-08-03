# Neurofrigo Memory Policy

## Tipos de memória

| Tipo | Uso | Retenção |
|------|-----|----------|
| Sessão | Turnos recentes | Curta (TTL sessão) |
| Aluno (agregada) | Preferências de estudo, mastery signals | Política LGPD + opt-out |
| Preferências | Idioma, tom | Até exclusão |
| Histórico acadêmico | **Não duplicar SoR** — referenciar Moodle/Omnia | — |
| Operacional | Handoffs, tickets | Prazo suporte |
| **Proibida** | Gabaritos, secrets, conversas completas desnecessárias, dados de terceiros | Nunca persistir |

## Não armazenar indefinidamente

Conversas completas sem necessidade · PII sensível · respostas de provas · credenciais · docs privados · dados de outros usuários.

## Direitos do titular

Consultar · apagar · desativar personalização · controlar retenção · auditar acesso.

## Isolamento

Por tenant · usuário · sessão. Sem cross-user retrieval.
