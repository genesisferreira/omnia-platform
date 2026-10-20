# Omnia LMS — Política de Proteção de Conteúdo (sem download)

> **Adendo obrigatório ao Blueprint aprovado.**  
> Status: especificação de arquitetura — **não implementado**.  
> Dono primário: **Omnia BFF + Externo (CDN/VOD/storage)**. Moodle: metadados/âncora acadêmica e completion — **não** servir arquivo por URL permanente pública.

---

## 1. Objetivo

Impedir download “facilitado” de vídeos e documentos na experiência padrão do produto, protegendo conteúdo técnico e dados sensíveis, **no backend**, não apenas escondendo o botão na UI.

---

## 2. Política padrão

| Tipo                   | Comportamento padrão                                        |
| ---------------------- | ----------------------------------------------------------- |
| Vídeos                 | **Somente streaming** (HLS/DASH ou progressive autenticado) |
| Documentos (PDF etc.)  | **Somente visualizador interno** Omnia                      |
| Download de vídeo      | **Desabilitado**                                            |
| Download de documento  | **Desabilitado**                                            |
| URL pública permanente | **Proibida**                                                |

**Limitação explícita e honesta:** captura de tela, gravação de display, fotografia da tela ou ferramentas de interceptação avançadas **não podem ser impedidas de forma absoluta**. A política reduz vazamento casual e compartilhamento de links; não é DRM militar.

---

## 3. Arquitetura de entrega

```text
Player / Viewer Omnia
        │
        ▼
BFF: valida sessão ativa + matrícula + política (material>curso>global)
        │
        ▼
Emite mediaAuthorization (token curto, amarrado a sessionId)
        │
        ▼
CDN/VOD/Storage (signed URL ou cookie CDN) — TTL curto
        │
        ▼
Stream / bytes para viewer (Content-Disposition: inline; sem attachment)
```

Moodle **não** expõe `/pluginfile.php` permanentemente ao browser do aluno na jornada `lms.*`. Se o arquivo originar-se no moodledata, o Connector/BFF obtém o binário server-side ou sincroniza para object storage Ext no publish.

---

## 4. Controles obrigatórios (backend)

| Controle                       | Descrição                                                           |
| ------------------------------ | ------------------------------------------------------------------- |
| URLs assinadas                 | Query HMAC + expiry; método/path amarrados                          |
| Tokens temporários             | `mediaTokenTtl` curto (ex. 60–300s); renovação só com sessão active |
| Restrição de domínio / Referer | CDN allowlist `lms.*` (complementar, não única defesa)              |
| Validação de matrícula         | Usuário deve ter enrolment ativo no curso da activity               |
| Validação de sessão            | `sessionId` active; se revogada → 401 MEDIA_FORBIDDEN               |
| Expiração                      | Signed URL e token expiram; player renova via BFF                   |
| Hotlink block                  | Sem URL estável compartilhável                                      |
| Auditoria                      | view start/progress/end; download_attempt (mesmo bloqueado)         |
| Marca d’água opcional          | Texto dinâmico (userId/email/timestamp) overlay no viewer/player    |
| Revogação mid-playback         | Próximo segment/renew falha; player encerra com mensagem de sessão  |
| Técnicos PF / sensível         | Cursos marcados `sensitive=true` forçam view_only + watermark on    |
| Logs                           | Sem query secrets; redacção de signatures                           |

Headers sugeridos na resposta de documento:

- `Content-Disposition: inline`
- `Cache-Control: private, no-store` (ou cache CDN só com token)
- `X-Content-Type-Options: nosniff`

---

## 5. Políticas configuráveis e precedência

### 5.1 Global

- `allowVideoDownload` (default **false**)
- `allowDocumentDownload` (default **false**)
- `mediaTokenTtl`
- `enableWatermark` (default false; true para sensitive)
- `signedUrlTtl`

### 5.2 Por curso

- `inherit` | `view_only` | `downloadable`

### 5.3 Por material (activity / asset)

- `inherit` | `view_only` | `downloadable`

### 5.4 Precedência

```text
material > curso > global
```

Exceção: se perfil/regulatório `forceViewOnly` (ex. conteúdo sensível de técnico PF), **não** pode ser sobrescrito para `downloadable` sem papel admin + justificativa auditada.

---

## 6. Painel

- Alterar global / curso / material.
- Preview da política efetiva resolvida.
- Auditoria: responsável, valor anterior, valor novo, data/hora, justificativa opcional.
- Relatório de tentativas de download bloqueadas.

---

## 7. Fluxos

### 7.1 Vídeo

1. Aluno abre aula.
2. BFF autoriza → token + signed playlist.
3. Player consome segmentos.
4. Progresso pedagógico → completion Moodle (sem expor media URL).
5. Se sessão revogada → renew falha → mensagem de segurança.

### 7.2 Documento

1. Aluno abre PDF.
2. BFF stream para viewer (PDF.js ou similar) com token.
3. UI sem botão download; atalhos desabilitados na medida do possível.
4. Tentativa `/download` → 403 + audit `download_attempt`.

---

## 8. Responsabilidades

| Capacidade                          | Dono                   |
| ----------------------------------- | ---------------------- |
| Política, viewer, player, BFF authz | 🟦 Omnia               |
| Object storage / CDN signed         | 🟠 Ext                 |
| Âncora activity + completion        | 🟢 Moodle              |
| —                                   | 🟣 não decide proteção |

---

## 9. Critérios de aceite (documentais)

1. Vídeos sem URL permanente.
2. Documentos só via viewer autenticado.
3. Download padrão off; override auditado.
4. Precedência material > curso > global.
5. Sessão revogada invalida mídia.
6. Matrícula obrigatória.
7. Limitação de screen capture documentada explicitamente.
8. Logs sem secrets.
