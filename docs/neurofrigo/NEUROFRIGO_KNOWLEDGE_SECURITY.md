# Neurofrigo Knowledge Hub — Security

> **Macroentrega 01.** Controles da fundação documental. Alinha [NEUROFRIGO_SECURITY_ARCHITECTURE.md](NEUROFRIGO_SECURITY_ARCHITECTURE.md).

## Superfície

| Item | Controle |
|------|----------|
| UI | Somente Admin Payload autenticado |
| Público | Sem endpoints de leitura do Hub no Portal/Landing |
| Command | Runtime futuro: só `super_admin` (settings `commandAllowedRoles`) |
| Chat Portal | Sem consumo de KB nesta entrega |

## Classificação `INTERNAL_RESTRICTED`

- Default de novos documentos técnicos sensíveis.  
- **Proibida** em retrieval de chat (`CHAT_FORBIDDEN_CLASSIFICATIONS`).  
- Exige revisão humana.  
- `allowAiUse` default false — reforço em profundidade.

## Controles em profundidade

1. **RBAC Admin** — staff limitado; publishers para approve/delete.  
2. **Flags de uso** — `allowAiUse`, `allowWebPublication`, `allowDownload`.  
3. **Classificação** — cinco níveis; chat bloqueia o nível 5.  
4. **Workflow** — sem publicação sem transição válida + papel publisher.  
5. **Auditoria imutável** — create só sistema; update/delete UI negados.  
6. **Jobs** — sem provider real; erros sanitizados (sem tokens/corpo completo).  
7. **Settings** — web research / promoção automática off.

## Ameaças e mitigações (ME01)

| Ameaça | Mitigação |
|--------|-----------|
| Editor publica sozinho | Field access + hook publishers |
| Conteúdo sensível no chat | Sem wiring RAG; `INTERNAL_RESTRICTED` + `allowAiUse=false` |
| Elevação via agente `command` | ACL exige `super_admin` |
| Vazamento em audit | Estados sanitizados; sem secrets |
| Ingestão maliciosa automática | Modo manual only |
| Embeddings acidentais | Jobs `not_implemented`; settings placeholder |

## Dados proibidos em logs/audit

Tokens, cookies, chaves, env, corpo integral do documento, PII desnecessária.

## Produção e landing

Homologação ME01 ocorre em **staging**. Produção e landing de lançamento permanecem **intactas** — ver checklist de homologação.

## Relação Níveis 1–5 (Security Architecture)

| Nível legado | Classificação Hub |
|--------------|-------------------|
| 1 Público | `PUBLIC` |
| 2 Cliente/Parceiro | `CLIENT_PARTNER` |
| 3 Aluno | `STUDENT` |
| 4 Professor/Gestor | `TEACHER_MANAGER` |
| 5 Admin técnico | `INTERNAL_RESTRICTED` |
