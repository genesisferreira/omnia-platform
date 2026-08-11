# Omnia LMS — Política de Sessões Concurrentes

> **Adendo obrigatório ao Blueprint aprovado.**  
> Status: especificação de arquitetura — **não implementado**.  
> Dono primário: **Omnia** (IdP / BFF / painel). Moodle: **espelho de sessão acadêmica** via Connector.

---

## 1. Objetivo

Garantir controle configurável de **quantas sessões/dispositivos** um usuário pode manter ativos, com revogação imediata e sincronizada entre Omnia e Moodle Engine, reduzindo compartilhamento indevido de conta.

---

## 2. Política padrão

| Perfil        |         Limite padrão de sessões concurrentes |
| ------------- | --------------------------------------------: |
| Aluno         |                                         **1** |
| Professor     |                                         **2** |
| Gestor        |                                         **2** |
| Administrador |                                         **2** |
| Suporte       | **2** (configurável; tipicamente igual admin) |

Regras padrão:

- `revokePreviousSessionOnLogin = true` para aluno (e demais perfis, salvo override).
- Novo login que excede o limite **revoga imediatamente** a(s) sessão(ões) mais antiga(s) (FIFO por `lastActivityAt`), ou a sessão anterior explícita quando limite = 1.
- A revogação deve invalidar:
  - sessão Omnia (cookie/JWT/refresh);
  - sessão Moodle (via Connector: logout/invalidate);
  - tokens de mídia emitidos para a sessão revogada.
- Dispositivo anterior: mensagem clara + redirect para login.
- **Múltiplas abas do mesmo navegador** = **mesma sessão** (mesmo `sessionFamilyId` / cookie de sessão). Não contam como dispositivos distintos.

Mensagem sugerida (i18n):

> “Sua conta foi acessada em outro dispositivo. Por segurança, esta sessão foi encerrada.”

---

## 3. Modelo de identificação de sessão

### 3.1 Entidade `OmniaLmsSession`

| Campo                         | Descrição                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `sessionId`                   | UUID opaco (público em auditoria; não é o token bruto)                       |
| `sessionFamilyId`             | Identifica o “navegador/app install”; abas compartilham a família            |
| `userId`                      | Usuário Omnia                                                                |
| `moodleUserId`                | Mirror Moodle (quando provisionado)                                          |
| `profile`                     | student \| teacher \| manager \| admin \| support                            |
| `deviceFingerprint`           | Hash estável (UA + instalação app + opcional hardware id) — **não** PII crua |
| `userAgent`                   | Truncado                                                                     |
| `ipAddress`                   | Último IP conhecido                                                          |
| `createdAt`                   | Início                                                                       |
| `lastActivityAt`              | Heartbeat / última request autenticada                                       |
| `expiresAt`                   | Expiração absoluta ou sliding                                                |
| `status`                      | active \| revoked \| expired                                                 |
| `revokedAt` / `revokedReason` | login_superseded \| admin_force \| logout \| security                        |
| `moodleSessionKey`            | Referência opaca da sessão Moodle (se aplicável)                             |

### 3.2 Tokens

| Token                  | Uso           | Armazenamento                                  | Revogação                                           |
| ---------------------- | ------------- | ---------------------------------------------- | --------------------------------------------------- |
| Access token (curto)   | API BFF       | Memória / header                               | Lista de denylist por `sessionId` ou version bump   |
| Refresh token          | Renovação     | HttpOnly Secure cookie / secure storage mobile | Invalidado na revogação                             |
| Moodle WS / sesscookie | Engine        | Somente servidor Connector                     | Logout Moodle + destroy session                     |
| Media token            | Stream/viewer | Não persistir no client além do player         | Amarrado a `sessionId`; inválido se sessão revogada |

**Segurança dos tokens:** nunca logar secrets; rotacionar refresh; binding ao `sessionId`; HTTPS only; SameSite adequado; mobile: Keychain/Keystore.

---

## 4. Ciclo de vida

```text
Login OK
  → cria OmniaLmsSession (family)
  → emite tokens Omnia
  → Connector: estabelece/registra sessão Moodle vinculada
  → se count(active) > limit: revoga excedente (mais antigas)
  → notifica dispositivos revogados (websocket/push/poll)

Heartbeat (intervalo configurável, ex. 60s)
  → atualiza lastActivityAt
  → se session revoked/expired → force logout UX

Request API
  → valida access token + session status=active
  → se revogada → 401 + código SESSION_REVOKED

Logout
  → revoga sessão Omnia + Moodle + media tokens

Expiração
  → job ou validação lazy: status=expired

Troca de dispositivo (aluno limite 1)
  → novo login revoga família anterior imediatamente

Perda de conexão
  → refresh pode renovar se sessão ainda active
  → se revogada offline, ao reconectar recebe SESSION_REVOKED

Corrida entre dois logins simultâneos
  → transação serializada por userId (lock)
  → apenas uma sessão “vencedora” por slot; demais revoked
  → auditoria registra ambas tentativas
```

---

## 5. Vínculo Omnia ↔ Moodle

| Passo     | Omnia                    | Moodle                                                                             |
| --------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Login     | Cria sessão              | Connector cria/reutiliza login técnico ou user session conforme desenho SSO futuro |
| Atividade | Heartbeat BFF            | Opcional touch session Moodle                                                      |
| Revogação | Marca revoked + denylist | `revokeSession` / logout user sessions via WS ou API admin session kill            |
| Logout    | Revoga local             | Sync logout                                                                        |

**Regra:** o browser do aluno **não** mantém cookie Moodle de primeira parte em `moodle.*` na jornada produto; o Connector opera server-side. Assim, “sessão Moodle” é vínculo de autorização no Connector + eventual sessão server-side, não login UI Moodle.

---

## 6. Painel de administração (especificação UX)

### 6.1 Configuração global

- `maxConcurrentSessionsStudent` (default 1)
- `maxConcurrentSessionsTeacher` (default 2)
- `maxConcurrentSessionsManager` (default 2)
- `maxConcurrentSessionsAdmin` (default 2)
- `maxConcurrentSessionsSupport` (default 2)
- `revokePreviousSessionOnLogin` (bool)
- `sessionDuration` (TTL absoluto/sliding)
- `heartbeatIntervalSeconds`
- `sessionIdleTimeout`

### 6.2 Exceções

- Override por usuário: `maxConcurrentSessions` específico.
- Toda alteração: auditoria (responsável, before/after, timestamp, justificativa opcional).

### 6.3 Operações

- Listar sessões ativas (IP, dispositivo, início, última atividade).
- Encerrar sessão específica.
- Encerrar todas as sessões do usuário.
- Consultar histórico de revogações.

---

## 7. Comportamento mobile

- Cada instalação do app = `sessionFamilyId` distinto (device install id).
- Push opcional: “sessão encerrada noutro dispositivo”.
- Refresh token no secure storage; revogação limpa storage.
- Background: ao voltar ao foreground, validar sessão antes de retomar player.

---

## 8. Auditoria

Registrar (sem tokens):

- login success/fail;
- session create/revoke/expire;
- admin force logout;
- race resolution;
- policy changes.

Retenção: alinhada LGPD / política Omnia.

---

## 9. Responsabilidades

| Capacidade                                 | Dono                     |
| ------------------------------------------ | ------------------------ |
| Limites, painel, tokens Omnia, UX mensagem | 🟦 Omnia                 |
| Invalidar sessão acadêmica espelhada       | 🟦 Connector → 🟢 Moodle |
| IA                                         | — (não decide sessão)    |
| Push aviso                                 | 🟠 Ext                   |

---

## 10. Critérios de aceite (documentais)

1. Segundo login com limite 1 revoga o primeiro (Omnia + Moodle sync).
2. Abas do mesmo browser = uma sessão.
3. Sessões identificáveis e auditáveis.
4. Limites alteráveis no painel (global/perfil/usuário).
5. Logout e revogação imediata definidos.
6. Corrida de login tratada com lock.
7. Tokens de mídia inválidos após revogação.
