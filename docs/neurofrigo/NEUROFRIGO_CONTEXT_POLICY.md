# Neurofrigo Context Policy

## Context Builder

Monta **apenas** o contexto mínimo necessário para a intenção + perfil autorizados.

### Slots possíveis

| Slot                         | Quando                       |
| ---------------------------- | ---------------------------- |
| identity                     | Sempre                       |
| profile / tenant             | Sempre                       |
| empresa / parceiro           | Intenção comercial / partner |
| matrícula / curso / aula     | Acadêmico autorizado         |
| materiais permitidos         | Após Media + matrícula       |
| progresso / notas permitidas | Tutor / adaptive             |
| eventos recentes             | Learning Events próprios     |
| histórico conversa           | Janela curta da sessão       |
| políticas / intenção / tools | Sempre (redigido)            |

### Propriedades do contexto

Mínimo · temporário · autorizado · auditável · redigido · separado por tenant · usuário · sessão.

### Nunca enviar ao modelo

- Banco completo / dump
- Documentos não relacionados
- Dados de outros usuários
- Secrets, tokens, env, cookies
- System prompts de outros agentes
- Conteúdo Nível 5

### Redação

PII mínimo; mascarar documentos; truncar logs; `ai.context.authorized` / `ai.context.denied`.

## Controlo de matrícula (resumo)

Ver [NEUROFRIGO_SECURITY_ARCHITECTURE.md](NEUROFRIGO_SECURITY_ARCHITECTURE.md) § Controlo por matrícula.  
Context Builder **não** inclui slots acadêmicos se Security Guard não liberou.
