# Linha de base de segurança

Estado em 20/10/2026. Detalhes de infraestrutura (hosts, painéis, rede) ficam em documentação privada, fora deste repositório público.

## Headers HTTP

| Header                                             | Portal                                                   | Admin                    | Situação |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------ | -------- |
| `X-Content-Type-Options: nosniff`                  | todas as rotas                                           | todas as rotas           | DEV      |
| `Referrer-Policy: strict-origin-when-cross-origin` | todas as rotas                                           | todas as rotas           | DEV      |
| `X-Frame-Options: SAMEORIGIN`                      | todas as rotas                                           | só `/admin` e `/login`   | DEV      |
| `Permissions-Policy`                               | geolocalização só na própria origem (busca de parceiros) | tudo negado              | DEV      |
| `Strict-Transport-Security`                        | `max-age=86400`, **sem** `includeSubDomains`/`preload`   | idem                     | DEV      |
| `Content-Security-Policy-Report-Only`              | observação, não bloqueia                                 | observação, não bloqueia | DEV      |
| `X-Powered-By`                                     | removido                                                 | removido                 | DEV      |

Decisões:

- **Arquivos de mídia do Admin continuam podendo ser embutidos**: o Portal exibe PDFs de aula em iframe a partir do Admin, que é outra origem. Por isso o `X-Frame-Options` do Admin vale só para o painel e o login, e o `frame-ancestors` da CSP lista a origem do Portal.
- `includeSubDomains`/`preload` só depois do inventário completo de subdomínios: existem subdomínios de e-mail e de hospedagem em outros provedores.
- HSTS começa com 1 dia; sobe para 6 meses e depois 1 ano após observação em produção.
- A CSP passa a bloquear só depois de rodar em Report-Only em produção e de ajustar as origens de imagens, vídeo e formulários.

## Upload do Marketplace

- O hook da coleção nega o upload **antes de ler o arquivo** quando não há usuário (o `beforeOperation` roda antes do controle de acesso do Payload).
- PDF bloqueado no servidor, inclusive para staff e por REST direto (`MARKETPLACE_PDF_UPLOAD_ENABLED`).

## Contas administrativas

Estado verificado: 6 contas `super_admin`, sem segundo fator, nenhuma bloqueada, nenhuma sessão administrativa ativa no momento da verificação. Nenhuma conta foi alterada.

Plano (requer decisão do responsável):

1. **Menor privilégio**: confirmar quem precisa de `super_admin`, rebaixar o restante para papéis operacionais e manter no máximo 2 contas `super_admin` nominais, mais 1 conta de emergência guardada em cofre.
2. **MFA**: o Payload 3 não tem TOTP nativo. Opções: plugin ou estratégia de autenticação com TOTP no Admin (precisa de homologação em DEV), ou exigir acesso ao painel por SSO ou VPN.
3. **Sessões**: revisar a expiração do token administrativo e o número máximo de tentativas de login.
4. **Recuperação**: procedimento escrito para recuperar o acesso de super_admin sem expor credenciais (reset por e-mail verificado ou pela conta de emergência).
5. **Rotação**: após qualquer exposição, trocar a senha, revogar as sessões da conta e registrar a ação.

| Ação            | Impacto                                     | Risco de bloqueio                                  | Reversão               |
| --------------- | ------------------------------------------- | -------------------------------------------------- | ---------------------- |
| Rebaixar papéis | Usuários perdem acesso a coleções sensíveis | Baixo, se a conta de emergência for validada antes | Restaurar o papel      |
| Ativar MFA      | Novo passo no login                         | Médio: perda do dispositivo                        | Códigos de recuperação |
| Encurtar sessão | Mais logins                                 | Baixo                                              | Ajustar configuração   |

## Credenciais

- Repositório público: `scripts/ci/check-secrets.mjs` bloqueia chaves privadas, tokens e URLs de banco com credencial fora do ambiente local.
- Os arquivos `.env*.example` contêm só valores de exemplo de desenvolvimento local.
- Rotação de credenciais de infraestrutura segue o procedimento privado de controle de mudanças.

## Pendências de infraestrutura (sem detalhes públicos)

Itens registrados em documentação privada e que dependem de autorização individual (ver `docs/governance/CHANGE_MANAGEMENT.md`): segurança do acesso administrativo ao servidor (CHG-SEC-002A/B), retirada da rota pública de painel de infraestrutura (CHG-SEC-001), proteção dos demais painéis (CHG-SEC-003), MFA e menor privilégio (CHG-SEC-004). Também pendentes, para a Fase 2: firewall do host, fixação de versões de imagens, limpeza de registros DNS sem serviço e registro DMARC.
