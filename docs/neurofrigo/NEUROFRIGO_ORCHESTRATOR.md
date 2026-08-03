# Neurofrigo Orchestrator

> Entrypoint dos agentes **por superfície**. O usuário do Portal não precisa saber qual especialista foi acionado.

## Superfícies

| Superfície | Orchestrator | Entrada |
|------------|--------------|---------|
| **Tutor / Concierge** | `orchestrator.portal` | Chat do Portal (MVP) |
| **Command** | `orchestrator.command` | Console admin — **não** misturado ao chat público |

Os dois compartilham ports (Purpose, Security, Tools), mas **allowlists de agentes/tools distintas** e Identity checks diferentes.

## Responsabilidades

| Deve | Não deve |
|------|----------|
| Receber mensagens da superfície correta | Tratar Command como Concierge |
| Montar Identity Context | Acessar bancos diretamente |
| Executar **Purpose Guard** antes de Intent | Aceitar uso generalista / fora Omnia |
| Classificar intenção (após Purpose) | Ignorar Security Guard |
| Selecionar especialista da allowlist da superfície | Executar tools arbitrárias |
| Controlar handoff entre especialistas | Criar agentes fora da allowlist |
| Preservar só contexto permitido | Compartilhar contexto entre superfícies |
| Aplicar políticas + auditoria | Bypass Compliance / Assessment / Purpose |
| Retornar resposta unificada | Usar WhatsApp como canal MVP |
| | Delegar “cérebro” ao n8n |

## Fluxo interno (Portal — MVP)

1. `ai.request.received` (`channel: portal`)  
2. Identity Context  
3. **Purpose Guard** → deny = recusa padrão + `ai.purpose_guard.triggered`  
4. Intent Classifier → `{ intent, confidence, entities }`  
5. Security Guard → allow / deny / escalate  
6. Context Builder  
7. Tool Router (allowlist Portal)  
8. Especialista Concierge/Tutor/domínio  
9. Assessment Integrity Guard (se acadêmico)  
10. Compliance Guard  
11. Resposta unificada  

## Fluxo Command (restrito)

1. Identity **deve** ser `super_admin` **ou** role em allowlist explícita de Command.  
2. Caso contrário → `DENY` imediato (sem Intent de domínio).  
3. Purpose Guard ainda aplica (escopo Omnia operacional).  
4. Tools/agentes apenas da allowlist Command.  
5. Auditoria reforçada; Nível 5 só via tools Command auditadas — nunca no chat Portal.

## Troca entre especialistas

- Só dentro da mesma superfície.  
- Máximo de hops configurável (default 2).  
- Contexto transferido = subset redigido.

## Allowlist de agentes

Ver [Agent Catalog](NEUROFRIGO_AGENT_CATALOG.md) — seções Tutor/Concierge vs Command.

## Resposta unificada

```json
{
  "message": "…",
  "citations": [],
  "suggestedActions": [],
  "handoff": null,
  "agentTraceId": "…",
  "surface": "portal | command",
  "blocked": false,
  "blockReason": null
}
```

## Canais

- **MVP:** somente Portal.  
- WhatsApp: roadmap futuro.  
- n8n: pode receber eventos/webhooks **depois** do Orchestrator; não inicia conversa nem classifica intenção.
