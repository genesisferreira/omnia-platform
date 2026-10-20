# Controle de mudanças

Mudanças em produção, no GitHub remoto, em DNS ou em credenciais seguem uma autorização **por item**. Cada item tem um identificador (`CHANGE_ID`) e só pode ser executado depois que o responsável revisar o plano e autorizar expressamente aquele identificador (ex.: "AUTORIZO CHG-SEC-001"). Uma autorização não vale para outros itens nem para itens encadeados.

Os planos detalhados (hosts, comandos, artefatos) ficam em documentação operacional privada, fora deste repositório público.

## Ciclo de cada mudança

1. Plano revisado: objetivo, risco, pré-requisitos, ponto de recuperação, procedimento, testes antes e depois, critério de sucesso, critério de parada, rollback e risco residual.
2. Autorização expressa do `CHANGE_ID`.
3. Execução com verificação do baseline (alunos, banco, DAC, upload de PDF) antes e depois.
4. Registro de evidências e confirmação de estabilidade.
5. Encerramento formal; só então a próxima mudança é proposta.

Critérios de parada comuns a todas: risco acadêmico, perda de acesso, divergência de dados, falha de backup, exposição de segredo, mudança inesperada de migrations, DAC ligado ou upload de PDF habilitado.

## Mudanças da conclusão da Fase 1

| CHANGE_ID    | Tema                                                                        | Depende de                          | Status                                     |
| ------------ | --------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------ |
| CHG-SEC-002A | Contenção: troca de credencial de acesso ao servidor potencialmente exposta | —                                   | Preparada, aguardando autorização          |
| CHG-SEC-002B | Acesso ao servidor só por chave                                             | CHG-SEC-002A                        | Preparada (configuração validada em cópia) |
| CHG-SEC-001  | Retirar a rota pública de um painel de infraestrutura                       | —                                   | Preparada (configuração validada em cópia) |
| CHG-BKP-001  | Escolha do destino externo de backup                                        | Decisão do responsável              | Recomendação pronta                        |
| CHG-BKP-002  | Primeira cópia externa e restauração isolada                                | CHG-BKP-001                         | Procedimento pronto                        |
| CHG-BKP-003  | Agendamento, alerta e retenção                                              | CHG-BKP-002                         | Modelos prontos                            |
| CHG-GIT-001  | Publicar a branch da Fase 1                                                 | —                                   | Pronta (CI local PASS)                     |
| CHG-GIT-002  | Regularizar a base de produção no GitHub                                    | CHG-GIT-001 recomendado             | Equivalência verificada                    |
| CHG-GIT-003  | CI obrigatório e proteção de branches                                       | CHG-GIT-001, CHG-GIT-002            | Política pronta                            |
| CHG-APP-001  | Publicar headers de segurança e o bloqueio de upload anônimo                | CHG-GIT-001 recomendado             | Homologada em DEV                          |
| CHG-SEC-003  | Proteger os demais painéis administrativos                                  | Confirmação de uso pelo responsável | Proposta por painel                        |
| CHG-SEC-004  | MFA e menor privilégio dos administradores                                  | Decisão do responsável              | Plano pronto                               |

Nenhum item desta tabela foi executado. A Fase 1 só é concluída após CHG-SEC-002A, CHG-SEC-002B, CHG-SEC-001, CHG-BKP-001, CHG-BKP-002 e CHG-BKP-003.
