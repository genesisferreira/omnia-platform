# Identity

> Autenticação e gestão de usuários da Omnia Platform.

**Sprint:** 2

## Objetivo

Gerenciar identidade, autenticação e autorização de usuários, servindo como base de segurança para todos os domínios que exigem contexto de usuário autenticado.

## Responsabilidades

- Registrar, autenticar e gerenciar perfis de usuário
- Controlar sessões, tokens e políticas de acesso
- Integrar com pacotes `auth` e `security`
- Emitir contexto de identidade para outros domínios via API

## Dependências

| Domínio  | Uso                       |
| -------- | ------------------------- |
| **core** | Primitivos compartilhados |

## Integrações

- **`packages/auth`** — fluxos de autenticação e sessão
- **`packages/security`** — políticas, RBAC e proteções

## Eventos futuros

| Evento        | Descrição                             | Sprint |
| ------------- | ------------------------------------- | ------ |
| `UserCreated` | Novo usuário registrado na plataforma | 2      |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [SECURITY_ARCHITECTURE.md](../../SECURITY_ARCHITECTURE.md)
- [database/schemas/users.md](../../database/schemas/users.md)
