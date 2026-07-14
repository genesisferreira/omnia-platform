# Arquitetura de Deploy — Omnia Platform

> Estratégia de deploy por ambiente (documentação — implementação Sprint 2+).

## Ambientes

| Ambiente    | Branch    | Infra           |
| ----------- | --------- | --------------- |
| development | local     | Docker Compose  |
| staging     | `staging` | TBD (Sprint 2+) |
| production  | `main`    | TBD (Sprint 2+) |

## Apps

| App            | Porta (dev) | Deploy futuro      |
| -------------- | ----------- | ------------------ |
| `@omnia/web`   | 3000        | Vercel / container |
| `@omnia/admin` | 3001        | Vercel / container |

## Serviços

| Serviço    | Dev    | Produção (planejado)            |
| ---------- | ------ | ------------------------------- |
| PostgreSQL | Docker | Managed (RDS/Supabase)          |
| Redis      | Docker | Managed (ElastiCache)           |
| MinIO      | Docker | S3 / MinIO HA                   |
| n8n        | Docker | n8n Cloud / self-hosted         |
| Mailpit    | Docker | SMTP produção (Resend/SendGrid) |

## CI/CD

- GitHub Actions: lint, typecheck, build
- Deploy: não configurado (Sprint 2+)

## Secrets

- GitHub Secrets para CI
- `.env` local — nunca commitado
- Vault / Doppler (produção — Sprint 2+)

## Multi-ambiente

Variáveis por ambiente em `config/development`, `config/staging`, `config/production`.
