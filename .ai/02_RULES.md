# Regras Permanentes de Desenvolvimento

## Escopo e arquitetura

1. Não alterar arquitetura, criar app/package/domínio ou mover fronteiras sem ADR.
2. Implementar apenas o escopo solicitado; não iniciar módulos adjacentes.
3. Preferir mudanças pequenas, incrementais, reversíveis e testáveis.
4. Não realizar refactors, renomes ou limpezas sem relação com a missão.
5. Não apagar arquivos nem usar operações Git destrutivas sem autorização explícita.

## CMS e conteúdo

1. Conteúdo editorial/marketing pertence ao Payload; código define estrutura e comportamento.
2. O Portal nunca importa Payload nem acessa PostgreSQL diretamente.
3. Portal consome APIs/DTOs públicos com allowlist e sanitização.
4. Não criar collection/global/block quando a estrutura existente resolve o caso.
5. Seeds devem ser idempotentes, estreitos e não sobrescrever conteúdo editorial existente.
6. Mudança de schema exige migration versionada e validação de rollback proporcional ao risco.

## Multiempresa e segurança

1. Respeitar ownership Tenant → Company → Site → Content.
2. Não misturar conteúdo ou dados entre empresas sem escopo explícito.
3. Segredos são server-only; nunca usar prefixo `NEXT_PUBLIC_` para segredo.
4. Não registrar secrets, connection strings, tokens ou PII.
5. Endpoints públicos devem validar entrada, limitar consulta e retornar DTO mínimo.
6. Aplicar menor privilégio e manter acesso editorial autenticado.

## Portal e UX

1. Reutilizar `@omnia/ui`, blocks e helpers existentes.
2. Preservar Server Components; usar Client Component somente quando houver interação.
3. Toda página pública deve ter title, description, canonical, robots e metadata social.
4. Imagens informativas precisam de alt editorial ou fallback semântico; decorativas usam alt vazio.
5. Manter navegação por teclado, foco visível, Skip Link e semântica HTML.
6. Não alterar layout/navegação em missões que não autorizam UX.

## Qualidade

Antes de concluir mudanças de código:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

- Executar também os testes relacionados à área alterada.
- Executar `pnpm format:check` quando documentos/configuração forem afetados.
- Corrigir somente problemas introduzidos pela mudança; registrar warnings históricos.
- Após edição substancial, revisar diagnostics/lints dos arquivos alterados.

## Git e entrega

1. Confirmar branch, HEAD e working tree antes de começar.
2. Não misturar mudanças do usuário com a missão atual.
3. Não criar commit, branch, push, PR ou deploy sem pedido explícito.
4. Separar claramente código local, estado commitado, staging e produção.
5. Nunca declarar deploy concluído sem smoke tests e evidência do ambiente.

## Deploy e banco

1. Seguir `docker/staging/DEPLOY.md` como runbook canônico.
2. Fazer backup antes de migrations.
3. Não executar seed geral, reset, force ou `migrate:down` no deploy institucional.
4. Interromper no primeiro erro e preservar o HEAD anterior para rollback.
5. Operações one-off devem usar os serviços Compose documentados.
