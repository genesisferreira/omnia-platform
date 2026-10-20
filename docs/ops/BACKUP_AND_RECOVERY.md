# Backup e recuperação

Estado em 20/10/2026: **os scripts existem e foram validados em laboratório; o backup automático de produção e a cópia externa ainda não estão ativos.**

## Situação anterior (auditoria de 20/10/2026)

- Backups de produção só manuais, feitos antes de cada deploy, no mesmo servidor e no mesmo disco do banco.
- Sem agendamento, sem política de retenção e sem cópia externa.
- Os backups mais recentes (dump `pg_dump -Fc` + mídia + manifesto) passam na verificação SHA256; os mais antigos são dumps soltos, sem mídia.

## Ferramentas (`ops/backup/`)

| Script                   | Função                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `omnia-backup.sh`        | Dump do PostgreSQL (`pg_dump -Fc` + globais sem senhas), arquivos dos volumes de mídia, manifesto, contagem de linhas por tabela, SHA256, criptografia GPG opcional e retenção |
| `omnia-backup-verify.sh` | Confere SHA256, assinatura do dump e integridade dos arquivos; `--deep` lê o catálogo do dump                                                                                  |
| `omnia-restore-test.sh`  | Restaura num Postgres descartável (rede Docker interna, dados em tmpfs), compara a contagem de linhas de todas as tabelas e os arquivos de mídia, e mede o tempo               |
| `backup.env.example`     | Modelo de configuração, sem credenciais                                                                                                                                        |

Propriedades:

- Nenhuma credencial no script: o dump usa o usuário do próprio container do Postgres.
- Leitura do banco de origem; nada é restaurado sobre o ambiente de origem.
- Aborta antes de gravar quando falta espaço (fator configurável sobre o tamanho estimado), quando o container não está rodando, quando um volume não existe ou quando outro backup do mesmo ambiente está em execução.
- Remove o diretório parcial em caso de falha e aciona `ALERT_COMMAND`, se configurado.
- Retenção por idade (`RETENTION_DAYS`) que sempre preserva os `RETENTION_MIN_KEEP` mais recentes, e só roda depois de um backup concluído.
- Criptografia com chave **pública** GPG: a chave privada não fica no servidor.

## Evidências do laboratório (20/10/2026)

Executado com um banco sintético descartável e com uma cópia somente leitura do banco DEV. Nenhum recurso de produção foi usado.

| Teste                                                                    | Resultado                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Sintaxe dos três scripts                                                 | PASS                                                                                                    |
| Dry-run sem gravar dados                                                 | PASS                                                                                                    |
| Backup sintético (4 tabelas, 26 arquivos)                                | PASS — 3 s                                                                                              |
| Verificação profunda                                                     | PASS                                                                                                    |
| Restauração sintética (linhas e mídia idênticas)                         | PASS — 7 s                                                                                              |
| Backup criptografado (GPG), sem texto claro no destino                   | PASS                                                                                                    |
| Verificação e restauração do backup criptografado                        | PASS                                                                                                    |
| Detecção de arquivo corrompido e de arquivo ausente                      | PASS                                                                                                    |
| Abortar por espaço insuficiente, sem deixar parcial                      | PASS                                                                                                    |
| Abortar com container inexistente, volume inexistente e Postgres parado  | PASS                                                                                                    |
| Retenção (remove antigos, preserva o mínimo)                             | PASS                                                                                                    |
| Log sem segredos                                                         | PASS                                                                                                    |
| Banco DEV com o schema completo (183 tabelas, 43 migrations) + mídia DEV | Backup PASS (5 s, 2,2 MB); restauração PASS com contagens idênticas em 183 tabelas e 96 arquivos (10 s) |

## Metas propostas (a aprovar — não são garantias)

| Meta                 | Proposta                                                                     | Condição                                        |
| -------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| RPO                  | 24 h (backup diário); 6 h após o início da operação comercial do Marketplace | Agendamento aprovado                            |
| RTO                  | 2 h para restaurar banco + mídia de produção                                 | Cópia externa acessível e procedimento ensaiado |
| Retenção             | 14 diários + 8 semanais + 6 mensais no destino externo                       | Custo aprovado                                  |
| Teste de restauração | Mensal, automatizado em ambiente descartável                                 | —                                               |

## Destino externo

**BACKUP_EXTERNAL_DESTINATION=PENDING_APPROVAL.** Nada foi contratado, configurado ou enviado.

| Opção                                                                                | Segurança e imutabilidade                                            | Custo                  | Recuperação                            | Complexidade                |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------- | -------------------------------------- | --------------------------- |
| Storage de objetos S3 compatível com Object Lock (ex.: Backblaze B2, Wasabi, AWS S3) | Criptografia no cliente (GPG) + bloqueio contra exclusão por período | Baixo, cobrança por GB | Download direto; independe do servidor | Baixa: `rclone` ou `restic` |
| `restic` para repositório S3                                                         | Criptografia e deduplicação nativas; com Object Lock no bucket       | Baixo                  | Bom, com snapshots                     | Média                       |
| Segundo servidor (pull via SSH)                                                      | Depende do hardening do segundo servidor; sem imutabilidade nativa   | Médio                  | Bom                                    | Média/alta                  |
| Snapshot do provedor da VPS                                                          | Mesmo provedor e mesma conta: não protege contra perda de conta      | Variável               | Restaura a máquina inteira             | Baixa, mas grosseira        |

Recomendação: storage de objetos S3 compatível com Object Lock, arquivos já criptografados com GPG no servidor, credencial de escrita sem permissão de exclusão e a chave privada guardada fora do servidor.

## Ativação em produção (requer autorização)

1. Escolher o destino externo e criar a chave GPG (privada fora do servidor).
2. Criar o arquivo de configuração fora do repositório, com permissão 600.
3. Rodar `omnia-backup.sh --dry-run` e depois um backup manual em horário de baixo uso.
4. Rodar `omnia-backup-verify.sh --deep` e `omnia-restore-test.sh` com esse backup.
5. Só então agendar (timer do systemd ou cron) e configurar o alerta de falha.
6. Repetir o teste de restauração a partir da **cópia externa**: é o aceite da proteção.

## Restauração real

Restaurar produção é decisão humana explícita. Procedimento: restaurar primeiro num banco novo, validar contagens e fingerprints acadêmicos, e só então trocar a aplicação. Escritas posteriores ao horário do backup são perdidas.
