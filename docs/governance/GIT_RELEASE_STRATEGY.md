# Estratégia de Git e releases

Estado em 20/10/2026. Nenhuma ação remota foi executada: os passos abaixo dependem de aprovação.

## Divergência atual

| Ref                                         | Situação                                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Produção                                    | `0d304da` (Marketplace Fase A, upload de PDF desligado)                                                                                                |
| `main`                                      | `454d21e` — o merge do PR #1. **Árvore idêntica à da Sprint 01 (`3162571`)**, sem conteúdo próprio. 350 commits atrás da produção                      |
| `develop`                                   | 319 commits atrás da produção, sem commits próprios                                                                                                    |
| PRs #6 → #7 → #8 → #9                       | Pilha encadeada que forma a produção: DAC (`9cc994c`) → SEO V1 (`bb61be2`) → TECMOVA (`9f5a070`) → Marketplace (`0d304da` + 2 commits de documentação) |
| PR #4 (`release/omnia-platform-ai-v3`)      | 1 commit só de documentação fora da produção                                                                                                           |
| PR #5 (`hotfix/fred-onboarding-production`) | Conteúdo já presente na produção (patches equivalentes)                                                                                                |

De 41 branches remotas, 31 estão integralmente contidas na produção. As demais têm só documentação, conteúdo equivalente já publicado, a landing (app separada) ou correções antigas já substituídas (`fix/release-2.1.1-seo-feeds` e `hotfix/cors-lead-capture-options`, cujo efeito já existe na produção por outros commits).

Simulação local `git merge-tree main 0d304da`: **sem conflitos; a árvore resultante é idêntica à da produção.**

## Base recomendada

Criar `release/production` exatamente no commit em produção, como fonte da verdade do que está publicado.

## Ordem de integração proposta

1. Criar `release/production` em `0d304da` (sem alterar nenhuma branch existente).
2. Avançar `main` para a produção por PR de `release/production` → `main` (merge sem conflito, conteúdo igual ao publicado).
3. Fechar como "integrados" os PRs #6, #7, #8 e #9, registrando que estão contidos em `main`. O PR #5 também está contido.
4. Avaliar o PR #4 (só documentação) e decidir entre integrar ou fechar.
5. Atualizar `develop` a partir de `main`, ou aposentá-la se o fluxo passar a ser `main` + `release/*`.
6. A partir daí, toda mudança entra por PR para `main`, com CI verde e revisão, e cada publicação vira tag `prod-<sha curto>`.

## Proteção de branches (após aprovação)

- `main` e `release/*`: PR obrigatório, 1 aprovação, CI obrigatório (guards, quality, build), sem force-push, sem exclusão.
- Tags `prod-*` protegidas.
- Deploy continua manual pelo runbook (`docker/production/DEPLOY.md`); nenhum workflow faz deploy.

## Riscos e rollback

- Fazer deploy a partir da `main` atual regrediria 350 commits. Até a regularização, **a fonte da verdade é o SHA em produção**.
- O plano não reescreve histórico: só adiciona merges e refs. Se algo der errado, basta apagar a branch nova; as existentes não mudam.
- Não usar force-push nem apagar branches antigas antes de arquivá-las como tags.

## Aprovações necessárias

1. Push da branch de trabalho da Fase 1 e abertura de PR.
2. Criação de `release/production` no GitHub.
3. Merge para `main` e fechamento dos PRs encadeados.
4. Configuração de proteção de branches e ativação do CI revisado.
