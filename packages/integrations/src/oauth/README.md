# oauth

Conectores **OAuth 2.0 / OIDC** para login social e integrações com provedores externos (Google, GitHub, etc.).

## Package

`@omnia/integrations/oauth`

Usado por `@omnia/auth` nos fluxos de autenticação. Apps consomem via `@omnia/auth`, não diretamente.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `OAUTH_GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Client secret Google |
| `OAUTH_GITHUB_CLIENT_ID` | Client ID GitHub (opcional) |
| `OAUTH_GITHUB_CLIENT_SECRET` | Client secret GitHub (opcional) |
| `OAUTH_REDIRECT_URI` | URI de callback pós-autorização |

## Sprint

**Sprint 2** — Login social e vinculação de contas junto com `@omnia/auth`.

## Princípios

- Um adapter por provedor (Google, GitHub, …)
- State parameter e PKCE para proteção CSRF
- Tokens OAuth nunca persistidos em localStorage
