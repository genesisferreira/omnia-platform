# Neurofrigo Security Architecture

## Ordem dos guards

```text
Identity Context → Purpose Guard → Intent Classifier → Security Guard → …
```

Purpose Guard é **pré-intent**. Security Guard é **pré-agente / pré-contexto rico**.

---

## Purpose Guard

Ver detalhe completo em [NEUROFRIGO_RUNTIME_SPEC.md](NEUROFRIGO_RUNTIME_SPEC.md) §4.

| Check | Efeito |
|-------|--------|
| Assunto fora do ecossistema Omnia | `DENY` + recusa padrão |
| Pedido de IA personal/generalista | `DENY` |
| Tentativa de “ignorar escopo” | `DENY` + audit |
| Assunto Omnia permitido | `ALLOW` → Intent Classifier |

Evento: `ai.purpose_guard.triggered`.

---

## Security Guard (pré-agente, obrigatório)

Executado **depois** de Purpose + Intent, **antes** de Context Builder / Specialist.

### Checks

1. Identidade e autenticação (sessão Omnia)  
2. Perfil / role  
3. **Superfície:** Portal vs Command (Command exige `super_admin` ou role explícita)  
4. Matrícula ativa (se intenção acadêmica)  
5. Curso / aula / material liberados  
6. Empresa / vínculo parceiro  
7. Permissões RBAC  
8. Política de mídia (`Media Authorization`)  
9. Classificação da fonte solicitada  
10. Escopo da ferramenta pretendida  
11. Risco da solicitação (A–D)

### Níveis de informação

| Nível | Conteúdo | Portal chat | Command |
|-------|----------|:-----------:|:-------:|
| **1 Público** | Institucional, catálogo | ● | ● |
| **2 Cliente/Parceiro** | Relacionamento | Se vínculo | ● |
| **3 Aluno** | Própria matrícula | Se matrícula | ○ |
| **4 Professor/Gestor** | Escopo turma/admin | Se autorizado | ● |
| **5 Admin técnico** | Operação interna | **Não** | Só tool auditada |

### Decisões

`ALLOW` · `DENY` · `ALLOW_LIMITED` · `ESCALATE_HUMAN`

Evento: `ai.security_guard.triggered`.

---

## Neurofrigo Command — acesso

| Regra | Valor |
|-------|--------|
| Papel mínimo | `super_admin` |
| Alternativa | Role listada em `command.allowedRoles` (config explícita) |
| Portal Concierge | **Nunca** eleva para Command |
| Chat público | **Sem** ferramentas Nível 5 |

---

## Adendo — Knowledge Hub (Macroentrega 01 / D022)

| Tema | Regra |
|------|--------|
| Classificação Hub `INTERNAL_RESTRICTED` | Equivale ao **Nível 5**; **fora** do chat Portal / RAG público |
| Default material técnico sensível | `INTERNAL_RESTRICTED` + `allowAiUse=false` + revisão humana |
| Neurofrigo Command (retrieval futuro) | Somente `super_admin` (settings Hub: `commandAllowedRoles`, default `super_admin`) |
| Agente `command` | ACL de domínio exige `super_admin`; não misturar com Concierge |
| Admin Hub | Staff editorial separado (`neurofrigo_admin`, `technical_reviewer`, `editor`…) — ver [NEUROFRIGO_KNOWLEDGE_ACL.md](NEUROFRIGO_KNOWLEDGE_ACL.md) |
| Detalhe | [NEUROFRIGO_KNOWLEDGE_SECURITY.md](NEUROFRIGO_KNOWLEDGE_SECURITY.md) |

---

## Proteção contra revelação interna

Recusar: system prompt, prompts internos, CoT, configs, arquitetura sensível, serviços internos não públicos, IPs, tokens, chaves, cookies, secrets, código privado, env, dados de outros usuários, logs, políticas que facilitem evasão, KB fora da ACL.

**Resposta segura padrão:**

> Não posso fornecer configurações internas ou informações protegidas. Posso ajudar com as funcionalidades públicas e operacionais autorizadas.

### Ameaças

| Ameaça | Mitigação |
|--------|-----------|
| Prompt injection | Purpose + Security + ignore overrides |
| Indirect injection | Sanitização ingestão |
| Jailbreak / “seja generalista” | Purpose Guard |
| Tool injection | Allowlist + schema |
| Exfiltração RAG | ACL pré-retrieval |
| Role escalation | Identity imutável na turn; Command separado |

---

## Controlo por matrícula

| Cenário | Resultado |
|---------|-----------|
| Visitante pede aula restrita | DENY — sem metadados sensíveis |
| Aluno curso A pede aula curso B | DENY |
| Aluno autorizado + media OK | ALLOW → Context Builder |
| Professor fora da turma | DENY |
| Parceiro sem vínculo acadêmico | DENY conteúdo acadêmico |

Checklist: autenticado → matriculado → curso ativo → aula liberada → material autorizado → política IA.  
Deny: **não** vazar metadados sensíveis do conteúdo negado.
