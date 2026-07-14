# Princípios do Projeto — Omnia Platform

> Princípios oficiais. Obrigatórios para todo contribuidor e agente de IA.

## Arquitetura

1. **Nunca duplicar código** — extrair para `packages/` compartilhados.
2. **Sempre utilizar packages compartilhados** — não reinventar infra em apps.
3. **Portal nunca acessa banco diretamente** — usar `@omnia/database` via API/services.
4. **Portal nunca importa Payload** — conteúdo CMS via REST (`apps/admin`).
5. **Toda integração externa passa por `@omnia/integrations`** — adapters raw.
6. **Toda IA passa por `@omnia/ai-core`** — guardrails, orquestração, rate limit.
7. **Toda automação passa por `@omnia/automation`** — contratos n8n.
8. **Toda configuração passa por `@omnia/config`** — nunca `process.env` em apps.
9. **Toda regra de negócio pertence aos `domains/`** — não em UI ou packages genéricos.
10. **Todo módulo deve ser desacoplado** — comunicação via API ou eventos.

## Padrões de engenharia

11. **DDD sempre que possível** — bounded contexts em `domains/`.
12. **Clean Architecture** — dependências apontam para dentro (domínio no centro).
13. **SOLID** — especialmente Single Responsibility e Dependency Inversion.
14. **Convention over Configuration** — padrões sensatos, override via env.
15. **Feature Flags obrigatórias** — `@omnia/feature-flags` para rollout gradual.

## Dependências

16. **Packages nunca dependem de Apps** — fluxo unidirecional.
17. **Domains não dependem de UI** — lógica independente de framework.
18. **UI não depende de Database** — apps usam services/APIs.
19. **AI não depende de CRM** — integração via eventos/interfaces.
20. **CRM depende apenas de interfaces** — inversão de dependência.

## Qualidade

21. **Erros tipados** — `@omnia/errors`, nunca `throw new Error()` genérico em produção.
22. **Validação centralizada** — `@omnia/validation` com Zod.
23. **Testes compartilhados** — `@omnia/testing` para fixtures e factories.
24. **Observabilidade desde o início** — logs, métricas, traces via `@omnia/monitoring`.
25. **Segurança por padrão** — RBAC, audit, LGPD em `@omnia/security`.

## Governança

26. **Arquitetura congelada após Sprint 1.2** — mudanças estruturais exigem ADR.
27. **Definition of Done** — ver [QUALITY_GATES.md](QUALITY_GATES.md).
28. **Documentação atualizada** — todo package tem README.
29. **ADR para decisões irreversíveis** — ver [docs/14-adr/](docs/14-adr/).
30. **Code review obrigatório** — ver [GOVERNANCE.md](GOVERNANCE.md).

## Anti-padrões (proibidos)

| Anti-padrão                                   | Correto                               |
| --------------------------------------------- | ------------------------------------- |
| `import payload from 'payload'` em `apps/web` | API REST do admin                     |
| `process.env.DATABASE_URL` em componentes     | `@omnia/config`                       |
| Lógica CRM em `packages/ui`                   | `domains/crm`                         |
| Chamada direta OpenAI em page                 | `@omnia/ai-core`                      |
| Copy-paste de utils entre apps                | `@omnia/shared` ou package específico |

---

_Última atualização: Sprint 1.2 — Arquitetura congelada._
