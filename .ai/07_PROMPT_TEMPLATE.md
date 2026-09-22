# Template de Missão

Copie o modelo abaixo e preencha somente o necessário.

```markdown
# OPERAÇÃO: <nome>

## MISSÃO: <identificador e título>

### Modo

<SOMENTE LEITURA | AUDITORIA | IMPLEMENTAÇÃO CONTROLADA | DEPLOY>

### Objetivo

<resultado verificável esperado>

### Contexto obrigatório

Leia primeiro:

- `.ai/README.md`
- `.ai/00_PROJECT_STATE.md`
- `.ai/01_ARCHITECTURE.md`
- `.ai/02_RULES.md`
- <documentos específicos da missão>

Confirme branch, HEAD e working tree antes de agir.

### Escopo

1. <item>
2. <item>
3. <item>

### Fora do escopo

- <item>
- <item>

### Restrições

- Não alterar arquitetura.
- Não iniciar módulos adjacentes.
- Não criar collections/packages/apps sem necessidade aprovada.
- Não realizar refactors não relacionados.
- Não criar commit, push, PR ou deploy sem autorização explícita.
- Preservar alterações locais existentes.

### Validação obrigatória

- <testes específicos>
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- <smoke tests, se aplicável>

### Entrega

1. Arquivos analisados/alterados.
2. Achados confirmados.
3. Mudanças realizadas.
4. Gates executados e resultados.
5. Pendências e dependências externas.
6. Status: <CONCLUÍDA | PARCIAL | BLOQUEADA>.
```

## Instrução recomendada ao agente

```text
Use evidência do código, Git, testes e ambiente. Separe fatos confirmados de
planejamento. Antes de criar algo, procure implementação/helper existente.
Faça a menor mudança capaz de cumprir o objetivo. Pare e reporte quando uma
decisão do usuário, credencial ou acesso externo for indispensável.
```

## Template de auditoria

Para auditorias somente leitura, adicione:

```text
Não alterar arquivos, configurações, banco, Git remoto ou ambiente externo.
Checks diagnósticos não mutáveis são permitidos. Liste apenas pendências reais,
com arquivo/evidência e impacto.
```

## Template de deploy

Para deploy, adicione:

```text
Seguir exclusivamente o runbook canônico. Registrar PREVIOUS_HEAD e DEPLOY_HEAD,
confirmar backup, interromper no primeiro erro e executar todos os smoke tests.
Não usar reset, force, seed geral ou migrate:down.
```
