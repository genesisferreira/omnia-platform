# smtp

Conector de **envio de e-mail** — SMTP genérico com suporte a Mailpit (dev) e Resend/SendGrid (produção).

## Package

`@omnia/integrations/smtp`

Usado por `@omnia/auth` (reset de senha, verificação) e módulos de negócio (CRM, notificações).

## Variáveis de ambiente

| Variável           | Descrição                                 |
| ------------------ | ----------------------------------------- |
| `SMTP_HOST`        | Host SMTP (ex.: `localhost` com Mailpit)  |
| `SMTP_PORT`        | Porta SMTP (ex.: `1025` dev, `587` prod)  |
| `SMTP_USER`        | Usuário SMTP (opcional em dev)            |
| `SMTP_PASSWORD`    | Senha SMTP                                |
| `SMTP_FROM`        | Endereço remetente padrão                 |
| `RESEND_API_KEY`   | Alternativa: provider Resend (produção)   |
| `SENDGRID_API_KEY` | Alternativa: provider SendGrid (produção) |

## Sprint

**Sprint 2+** — E-mails transacionais de autenticação; expansão para CRM na Sprint 5.

## Princípios

- Um adapter por provider (SMTP raw, Resend, SendGrid)
- Templates HTML versionados fora do conector
- Nunca logar conteúdo sensível de e-mails
