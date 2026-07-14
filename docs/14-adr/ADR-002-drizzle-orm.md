# ADR-002: Drizzle ORM para Dados de Aplicação

## Status

**Aceito** — Sprint 0

## Data

2026-07-07

## Contexto

A Omnia Platform utiliza **Payload CMS** para gestão de conteúdo (coleções CMS, mídia, usuários admin). Porém, módulos de negócio como CRM, marketplace e área do parceiro exigem uma camada de acesso a dados customizada com:

- Schema tipado end-to-end com TypeScript
- Migrations versionadas e reproduzíveis
- Queries performáticas e controle fino sobre SQL
- Integração nativa com Next.js 15 e PostgreSQL 16
- Baixo overhead e bundle size reduzido

O `packages/database` precisa de uma decisão explícita de ORM antes da Sprint 1.

## Decisão

Adotar **Drizzle ORM** como ORM principal para dados de aplicação customizados no `packages/database`.

**Payload CMS** mantém sua própria camada de dados para coleções CMS — Drizzle não substitui o ORM interno do Payload.

### Responsabilidades

| Camada    | Tecnologia                | Dados                                            |
| --------- | ------------------------- | ------------------------------------------------ |
| CMS       | Payload CMS (ORM interno) | Conteúdo, mídia, usuários admin                  |
| Aplicação | Drizzle ORM               | CRM, marketplace, parceiros, domínio customizado |

### Estrutura no `packages/database`

```
database/
├── src/
│   ├── schema/       # Definições Drizzle
│   ├── client.ts     # Conexão PostgreSQL
│   └── index.ts      # Exports públicos
├── migrations/       # Migrations geradas (drizzle-kit)
└── seed/             # Seeds de referência
```

## Alternativas Consideradas

### 1. Prisma

**Prós:** DX excelente, Prisma Studio, ecossistema maduro.
**Contras:** Bundle maior, abstração mais pesada, cold start em serverless, menos controle sobre SQL gerado.
**Descartado:** Overhead desproporcional para o estágio atual; Drizzle oferece melhor alinhamento com TypeScript strict e performance.

### 2. TypeORM

**Prós:** Decorators, padrão enterprise conhecido.
**Contras:** Manutenção irregular, tipagem inferior, API verbosa.
**Descartado:** Ecossistema em declínio relativo ao Drizzle/Prisma.

### 3. SQL puro (pg driver)

**Prós:** Controle total, zero abstração.
**Contras:** Sem type-safety, migrations manuais, produtividade baixa.
**Descartado:** Não escala para equipe e múltiplos módulos.

### 4. Apenas Payload CMS (sem ORM separado)

**Prós:** Simplicidade, um único ponto de dados.
**Contras:** Payload não é ORM de propósito geral; forçar dados de CRM/marketplace em coleções CMS acopla domínios.
**Descartado:** Viola separação de bounded contexts (DDD).

## Consequências

### Positivas

- Type-safety completo do schema ao client TypeScript
- Migrations com `drizzle-kit` integradas ao CI
- Queries SQL-like com autocomplete
- Bundle leve, adequado para Next.js App Router
- Coexência pacífica com Payload CMS no mesmo PostgreSQL

### Negativas

- Duas camadas de acesso a dados (Payload + Drizzle) no mesmo banco
- Curva de aprendizado para equipe sem experiência com Drizzle
- `drizzle-kit` como dependência adicional de desenvolvimento

### Riscos Mitigados

| Risco                               | Mitigação                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Conflito de schemas Payload/Drizzle | Schemas Drizzle em tabelas prefixadas (`crm_`, `mkt_`) ou schema PostgreSQL separado  |
| Migrations divergentes              | CI valida migrations; apenas `packages/database` gera migrations                      |
| Duplicação de modelos               | `@omnia/shared` centraliza tipos de domínio; Drizzle schema é fonte para persistência |

## Referências

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Payload CMS Database](https://payloadcms.com/docs/database/overview)
- [ADR-001: Monorepo Modular](ADR-001-monorepo-modular-architecture.md)
