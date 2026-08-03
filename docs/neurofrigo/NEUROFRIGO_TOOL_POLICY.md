# Neurofrigo Tool Policy

## Tool Router

O modelo **nunca** escolhe nome arbitrário de função. Só tools da allowlist da turn (perfil × intenção × agente × risco).

## Categorias futuras

| Categoria | Exemplos | Notas |
|-----------|----------|-------|
| LMS Read | courses, content, progress, grades | Via Omnia Connector |
| Academic Provisioning | provision.* | Dry-run até ativação |
| Write APIs acadêmicas | enroll, grade write | **Após** Épico C LMS + Nível C/D |
| Learning Events | emit/read own | |
| Media Authorization | authorize/sign | Controlado |
| CRM / Lead | capture, handoff | Consentimento |
| Partner Network | search nearby | |
| Search/RAG | kb.search | ACL pré-busca |
| Internet/Radar | allowlisted fetch | Validação fonte |
| SMTP | notify | Confirm B+; canal de notificação — não chat MVP |
| WhatsApp | notify / canal futuro | **Fora do MVP** — roadmap; Confirm B+ quando existir |
| Jitsi / payments | | Futuro, alto controle |

## Metadados obrigatórios por tool

`name` · `version` · `schema` · `permissions` · `timeout` · `idempotency` · `risk (A–D)` · `rateLimit` · `audit` · `confirmationPolicy` · `rollback?`

## Níveis de ação

| Nível | Tipo | Execução |
|-------|------|----------|
| **A** | Leitura segura | Automática |
| **B** | Sugestão | Confirmação do usuário |
| **C** | Alteração operacional | Confirmação + auth forte |
| **D** | Alto risco | Aprovação humana administrativa |

### Nunca sem aprovação humana (D / política)

Alterar nota · aprovar aluno · emitir certificado definitivo · matricular curso pago · cancelar matrícula · pagamento · proposta vinculante · alterar políticas · excluir usuário · divulgar dados de terceiros · orientar manutenção física perigosa como procedimento oficial.

## Auditoria

`ai.tool.requested` · `ai.tool.executed` · `ai.tool.denied` — sem payloads secretos nos logs.
