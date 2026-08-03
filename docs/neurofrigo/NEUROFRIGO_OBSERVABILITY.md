# Neurofrigo Observability

## Eventos de domínio

| Evento | Quando |
|--------|--------|
| `ai.request.received` | Entrada |
| `ai.purpose_guard.triggered` | Purpose Guard ALLOW/DENY (antes do Intent) |
| `ai.intent.classified` | Intent + confidence |
| `ai.agent.routed` | Especialista escolhido |
| `ai.context.authorized` | Context Builder OK |
| `ai.context.denied` | Slot/fonte negada |
| `ai.tool.requested` | Pedido tool |
| `ai.tool.executed` | Sucesso |
| `ai.tool.denied` | Allowlist/policy |
| `ai.response.blocked` | Compliance/Security |
| `ai.assessment_guard.triggered` | Integridade |
| `ai.security_guard.triggered` | Security |
| `ai.compliance_guard.triggered` | Compliance |
| `ai.handoff.created` | Humano/CRM |
| `ai.feedback.received` | Feedback usuário |

Labels **sem** PII. Prompt completo / contexto sensível **não** em log sem política explícita de retenção.

## Métricas

latência · custo · tokens · erros · bloqueios · roteamento · alucinação reportada · satisfação · resolução · escalonamento humano · violações evitadas · respostas sem fonte (quando citação exigida).

## Dashboard futuro

Grafana `08-neurofrigo.json` (pós Fase 1 Runtime).
