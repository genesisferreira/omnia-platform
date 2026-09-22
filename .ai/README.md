# Contexto Permanente — Omnia Platform

Esta pasta resume o estado **confirmado** do repositório para desenvolvimento
assistido por IA. Ela não substitui código, ADRs, documentos de produto ou
runbooks operacionais.

## Ordem de leitura

1. [`00_PROJECT_STATE.md`](./00_PROJECT_STATE.md) — estado commitado, local e publicado.
2. [`01_ARCHITECTURE.md`](./01_ARCHITECTURE.md) — arquitetura implementada e fronteiras.
3. [`02_RULES.md`](./02_RULES.md) — regras obrigatórias de trabalho.
4. [`03_STACK.md`](./03_STACK.md) — stack e ferramentas confirmadas.
5. [`04_BACKLOG.md`](./04_BACKLOG.md) — lacunas confirmadas, sem antecipar módulos.
6. [`05_DEPLOY.md`](./05_DEPLOY.md) — referência operacional de staging.
7. [`06_DECISIONS.md`](./06_DECISIONS.md) — decisões vigentes e fontes.
8. [`07_PROMPT_TEMPLATE.md`](./07_PROMPT_TEMPLATE.md) — modelo para novas missões.

## Hierarquia de autoridade

Em caso de divergência:

1. Código, migrations e configuração atualmente versionados.
2. ADRs aceitos, especialmente `docs/07-adrs/ADR-011_PLATFORM_PRINCIPLES.md`.
3. `docs/00-product/PRODUCT_MASTER_V2.md` para escopo de produto.
4. Especificações e runbooks canônicos em `docs/` e `docker/staging/DEPLOY.md`.
5. Esta pasta, que funciona como índice operacional e deve ser atualizada após
   mudanças confirmadas.

## Regras de manutenção

- Separar sempre: **commitado**, **alterado localmente**, **staging** e **produção**.
- Não marcar uma feature como publicada sem evidência de deploy e smoke test.
- Não transformar roadmap/documentação em afirmação de implementação.
- Registrar data, branch e HEAD ao atualizar o estado.
- Não copiar segredos, URLs com credenciais ou dados pessoais para esta pasta.
