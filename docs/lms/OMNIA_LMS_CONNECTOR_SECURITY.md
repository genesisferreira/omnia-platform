# Omnia LMS — Connector Security

## Controles

| Risco              | Mitigação                                                          |
| ------------------ | ------------------------------------------------------------------ |
| Token leakage      | Env server-only; redaction em logs/erros; nunca NEXT_PUBLIC        |
| SSRF               | URL Moodle fixa por config (`MOODLE_*_URL`)                        |
| IDOR               | Resolve vínculo pelo usuário autenticado; exige matrícula no curso |
| Função arbitrária  | Whitelist no `MoodleClient`                                        |
| Mass assignment    | DTOs whitelist nos endpoints                                       |
| Rate limit         | `@omnia/shared/rate-limit` scope `lms:*`                           |
| Sessão revogada    | Verificação em heartbeat / assertActive                            |
| Race login         | Lua Redis                                                          |
| Stack ao cliente   | `LmsConnectorError.toPublicJson`                                   |
| Produção localhost | Bloqueio em `loadLmsConnectorConfig`                               |

## Checklist rápido

- [ ] Token só no secret store / env Admin
- [ ] Health sem username técnico completo / sem token
- [ ] Logs sem cookies/payload acadêmico completo
- [ ] Connector disabled em falha de config (prod)
- [ ] XML-RPC desabilitado no Moodle
