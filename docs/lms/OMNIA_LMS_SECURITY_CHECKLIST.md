# Omnia LMS — Security Checklist

> Checklist de segurança do produto LMS (Blueprint + adendos de sessão e proteção de conteúdo).  
> Usar em reviews de Connector, BFF e painel — **antes** de produção.

---

## A. Sessões

- [ ] Limite concurrent configurável por perfil (aluno default 1)
- [ ] Novo login revoga sessão excedente imediatamente
- [ ] Revogação sincroniza Omnia + Moodle (Connector)
- [ ] Abas do mesmo browser compartilham `sessionFamilyId`
- [ ] Mensagem clara `SESSION_REVOKED` no client
- [ ] Heartbeat + idle/absolute timeout
- [ ] Lock por `userId` em corrida de login
- [ ] Access/refresh tokens não logados
- [ ] Refresh em cookie HttpOnly Secure / mobile secure storage
- [ ] Denylist/versionamento pós-revogação
- [ ] Painel: listar/encerrar sessão(ões); auditoria
- [ ] Exceção por usuário auditada

## B. Conteúdo / mídia

- [ ] Sem URL pública permanente de vídeo/documento
- [ ] Signed URL + TTL curto
- [ ] Media token amarrado a `sessionId`
- [ ] Validação de matrícula + política efetiva
- [ ] Precedência material > curso > global
- [ ] Download default off
- [ ] Viewer/player sem `Content-Disposition: attachment` no modo view_only
- [ ] Tentativas de download registradas
- [ ] Watermark opcional / obrigatório em conteúdo sensível
- [ ] Revogação de sessão interrompe renew/playback
- [ ] Logs sem signatures/secrets
- [ ] Documentada limitação de screen capture

## C. Connector / Moodle

- [ ] Aluno não autentica diretamente em `moodle.*` na jornada produto
- [ ] Conta serviço allowlist mínima
- [ ] REST only; XML-RPC proibido
- [ ] Sem acesso direto ao MariaDB Moodle pela Platform
- [ ] Sem custom core
- [ ] HTTPS / Traefik

## D. LGPD / auditoria

- [ ] Consentimentos e base legal para logs de sessão/IP
- [ ] Retenção definida
- [ ] Export/erase orquestra Omnia→Moodle
- [ ] Mudanças de política com before/after + ator

## E. Operação

- [ ] Secrets em env/secret store (`chmod 600`)
- [ ] Rate limit login
- [ ] Alertas de anomalia (muitos revoke, download_attempt spike)
- [ ] Backup engine separado (já infra)

---

## Aceite mínimo para GO do Connector (fase 2.5)

Deve existir **desenho** aprovado (este pacote de docs) cobrindo A–C.  
Implementação do Connector só após GO explícito da direção técnica.
