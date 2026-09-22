# Stack Confirmada

> As versões abaixo são constraints do workspace. A versão efetiva deve ser
> confirmada no lockfile/ambiente; o build local recente usou Next.js 15.5.20.

## Runtime e workspace

| Item       | Configuração confirmada |
| ---------- | ----------------------- |
| Node.js    | `>=22`; `.nvmrc` no CI  |
| pnpm       | `9.15.0`                |
| Turborepo  | `^2.3.3`                |
| TypeScript | `^5.7.2`                |
| Monorepo   | pnpm workspaces         |

## Aplicações

| Tecnologia | Constraint / uso                       |
| ---------- | -------------------------------------- |
| Next.js    | `^15.1.3`, App Router                  |
| React      | `^19.0.0`                              |
| Payload    | `^3.14.0`, integrado ao `apps/admin`   |
| Lexical    | `@payloadcms/richtext-lexical ^3.14.0` |

## UI

| Tecnologia               | Constraint |
| ------------------------ | ---------- |
| Tailwind CSS             | `^3.4.17`  |
| Radix Slot               | `^1.1.1`   |
| Lucide React             | `^0.469.0` |
| class-variance-authority | `^0.7.1`   |
| clsx                     | `^2.1.1`   |
| tailwind-merge           | `^2.6.0`   |

O design system compartilhado vive em `@omnia/ui`. Fontes públicas atuais:
Montserrat (headings) e Inter (texto).

## Dados e validação

| Tecnologia         | Constraint / papel                              |
| ------------------ | ----------------------------------------------- |
| PostgreSQL         | Banco principal Payload e fundação transacional |
| Drizzle ORM        | `^0.38.3`, dados transacionais                  |
| Drizzle Kit        | `^0.30.1`                                       |
| postgres.js        | `^3.4.5`                                        |
| Payload PostgreSQL | `@payloadcms/db-postgres ^3.14.0`               |
| Zod                | `^3.24.1`, configuração/validação               |
| Redis              | Infra de cache/sessão/fila; uso evolutivo       |
| MinIO              | Object storage planejado/configurado            |

## Operação

- Docker e Docker Compose para desenvolvimento e staging.
- Traefik externo para TLS e roteamento de staging.
- GitHub Actions para quality checks e build.
- Serviços one-off Docker para migrations, seeds e upgrades.

## Qualidade

| Ferramenta | Constraint |
| ---------- | ---------- |
| ESLint     | `^8.57.1`  |
| Prettier   | `^3.4.2`   |
| tsx        | `^4.19.2`  |

Scripts raiz:

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`

## Packages

Existem 27 packages de tooling, UI, configuração, banco, segurança,
observabilidade e módulos futuros. A existência do package não confirma uma
feature operacional. Confirmar implementação pelo conteúdo e pelos consumidores.
