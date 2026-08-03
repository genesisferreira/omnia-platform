# Neurofrigo Compliance Policy

## Compliance Guard (pós-especialista, obrigatório)

Valida a resposta **antes** de enviar ao usuário.

### Verificações

- Dados pessoais indevidos  
- Segredos / tokens  
- Conteúdo não autorizado / fora do escopo do agente  
- Resposta de avaliação (reforço Integrity Guard)  
- Orientação técnica perigosa sem disclaimer / aprovação  
- Alegações sem fonte quando exigidas  
- Promessa comercial (preço, prazo, contrato)  
- Linguagem inadequada / discriminação  
- LGPD  
- Tentativa de revelar arquitetura  
- Tool output sensível  

### Ações

| Ação | Efeito |
|------|--------|
| APPROVE | Envia |
| REDACT | Remove trechos |
| REDUCE | Resposta mais segura/curta |
| BLOCK | Recusa segura |
| HUMAN_CONFIRM | Pede confirmação |
| HANDOFF | Atendimento humano |

Evento: `ai.compliance_guard.triggered` / `ai.response.blocked`.
