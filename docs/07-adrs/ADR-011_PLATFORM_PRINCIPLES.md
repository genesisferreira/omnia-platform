# ADR-011: Princípios Arquiteturais da Plataforma

## Status

**Aceito** — 2026-07-10

## Data

2026-07-10

## Data de aceitação

2026-07-10

## Contexto

A Omnia Platform evoluiu da Sprint 2 (Platform Base) para um conjunto documentado de especificações de produto, CMS, portal, multisite e governança editorial (`docs/00-product/`, `docs/01-specifications/`).

Os ADRs técnicos existentes (ADR-001 a ADR-008) definem decisões pontuais — monorepo, Drizzle, separação portal/CMS, multi-tenant, IA, DDD, congelamento arquitetural. **Faltava um documento permanente** que consolide os **princípios invioláveis** que orientam toda implementação futura, independentemente de sprint ou módulo.

Este ADR não substitui ADRs anteriores; **complementa e sintetiza** a visão arquitetural acordada na documentação V2. Em caso de conflito entre código e este documento, **este ADR prevalece** até nova ADR ou revisão formal registrada em `docs/19-decisions/`.

## Decisão

Adotar oficialmente os princípios arquiteturais descritos nas seções 1 a 12 deste documento como **referência permanente** para engenharia, produto, design e operações da Omnia Frigo Holding.

---

## 1. Visão

A **Omnia Platform** é a plataforma digital da Omnia Frigo Holding — não um site institucional isolado, mas o **hub integrador** de um ecossistema de empresas, parceiros, educação, serviços, comércio e inteligência aplicada ao setor de refrigeração.

### 1.1 Atributos arquiteturais oficiais

| Atributo            | Definição na Omnia                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Plataforma SaaS** | Software servido como serviço multi-cliente; tenant como unidade de isolamento lógico                                         |
| **CMS-First**       | Conteúdo de marketing, institucional e editorial administrável via Payload CMS — código define estrutura, CMS define conteúdo |
| **Multiempresa**    | Múltiplas empresas do ecossistema (RR, FDFA, CTE, CES, Neurofrigo, Holding) com escopo, conteúdo e permissões distintos       |
| **Multisite**       | Múltiplas presenças digitais (hub Omnia, páginas por empresa, LPs, apps, sites externos integrados)                           |
| **Multi-tenant**    | Isolamento de dados, políticas LGPD e billing por tenant (ADR-005)                                                            |
| **Modular**         | Monorepo com domínios, packages e apps desacoplados (ADR-001, ADR-007)                                                        |
| **API First**       | Contratos REST versionados (`/api/v1/*`); portal consome APIs, não acopla implementação interna                               |
| **Event Driven**    | Evolução futura via `@omnia/events` e n8n; domínio emite eventos; consumidores assíncronos (ADR-008, Sprint 14+)              |
| **Cloud Ready**     | Containerização Docker, Traefik, ambientes dev/staging/prod; escala horizontal planejada                                      |

### 1.2 Papel do Portal Omnia

> **O Portal Omnia (`apps/web`) é o hub público do ecossistema.**  
> Apresenta, conecta e direciona para cada marca — **sem substituir** automaticamente os sites oficiais existentes das empresas.

---

## 2. Princípios fundamentais

Os princípios abaixo são **obrigatórios** em toda feature de produto e engenharia.

| #   | Princípio                                  | Implicação                                                                                                                                                |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Nada importante ficará hardcoded**       | Textos, menus, SEO, ordem de seções, CTAs → Payload                                                                                                       |
| P2  | **Todo conteúdo será administrável**       | Marketing e operações editam sem deploy de código                                                                                                         |
| P3  | **Toda página terá SEO**                   | title, description, canonical, OG; validação antes de publicar                                                                                            |
| P4  | **Toda página terá preview**               | Staging + draftMode; conteúdo relevante visualizado antes de produção                                                                                     |
| P5  | **Toda página terá versionamento**         | Payload versions + drafts; histórico e rollback                                                                                                           |
| P6  | **Toda publicação poderá ser agendada**    | `publishedAt`, timezone, despublicação programada                                                                                                         |
| P7  | **Toda alteração deverá ser auditável**    | AuditLog: quem, quando, o quê, empresa, site, motivo                                                                                                      |
| P8  | **IA nunca publica automaticamente**       | IA sugere; humano aprova e publica (ADR-006, S03_EDITORIAL)                                                                                               |
| P9  | **Conteúdo pertence ao ecossistema**       | Escopo tenant/company/site explícito em todo registro                                                                                                     |
| P10 | **Relacionamentos substituem duplicação**  | `related*` fields; reutilização; não copy-paste entre empresas                                                                                            |
| P11 | **Componentes são reutilizáveis**          | Page Builder blocks + `@omnia/ui`; DRY no portal                                                                                                          |
| P12 | **Toda empresa mantém identidade própria** | Brand, tema, logos, tom — design system federado                                                                                                          |
| P13 | **Holding integra, não substitui**         | Hub conecta marcas; não apaga sites oficiais                                                                                                              |
| P14 | **Sites próprios continuam existindo**     | Modelo híbrido: externos integrados + hub Omnia                                                                                                           |
| P15 | **Portal Omnia é o Hub do Ecossistema**    | Home, ecossistema, empresas, conversão central                                                                                                            |
| P16 | **Ecossistema integrado**                  | Empresas, parceiros, cursos, CRM, IA, Marketplace, Neurofrigo, conteúdo, eventos, produtos, serviços e downloads integrados — não silos isolados          |
| P17 | **Coexistência dos sites oficiais**        | Sites das empresas são ativos estratégicos; podem coexistir permanentemente com a plataforma; hub central sem substituição imediata obrigatória           |
| P18 | **Design System federado**                 | Portal, Admin, CRM, LMS, Marketplace, Chat, IA, áreas autenticadas e Neurofrigo usam `@omnia/ui`; marcas com temas próprios dentro dos limites do Core DS |
| P19 | **Evolução incremental**                   | Entregas modulares e graduais; compatibilidade; evitar breaking changes e grandes substituições sem ADR formal                                            |

### Princípios expandidos (P16–P19)

#### Princípio do Ecossistema Integrado (P16)

O valor da Omnia Platform está na integração entre empresas, parceiros, cursos, CRM, IA, Marketplace, Neurofrigo, conteúdo, eventos, produtos, serviços e downloads. Esses módulos não devem funcionar como silos isolados.

#### Princípio de Coexistência dos Sites Oficiais (P17)

Os sites oficiais das empresas da Holding são ativos estratégicos e podem coexistir permanentemente com a Omnia Platform. A plataforma atua como hub central e não obriga a substituição imediata desses sites.

#### Princípio do Design System Federado (P18)

Portal, Admin, CRM, LMS, Marketplace, Chat, IA, áreas autenticadas e Neurofrigo devem utilizar o Design System oficial da Omnia Platform. As marcas podem utilizar temas próprios dentro dos limites definidos pelo Core Design System.

#### Princípio da Evolução Incremental (P19)

A arquitetura deve favorecer evolução modular, compatibilidade, entregas graduais e redução de reescritas. Evitar breaking changes e grandes substituições de arquitetura sem ADR formal.

### Exceções permitidas (código fixo)

- Lógica de apresentação e comportamento de UI
- Labels de acessibilidade e mensagens técnicas de sistema
- Contratos de API e feature flags
- Tokens de design system (não conteúdo de marketing)

---

## 3. Princípios de CMS

### 3.1 CMS-First (ADR-004)

| Regra                          | Descrição                          |
| ------------------------------ | ---------------------------------- |
| Payload em `apps/admin` apenas | Portal nunca importa Payload       |
| Consumo via REST               | `apps/web` → API do admin          |
| Deploy independente            | Portal e CMS escalam separadamente |

### 3.2 Modelo de conteúdo

| Conceito              | Princípio                                                                               |
| --------------------- | --------------------------------------------------------------------------------------- |
| **Collections**       | Entidades editoriais e de negócio público (pages, posts, companies, partners, courses…) |
| **Globals**           | Configuração transversal por site/tenant (header, footer, home, seo-settings)           |
| **Blocks**            | Unidades do Page Builder — composição de páginas sem código                             |
| **Page Builder**      | Páginas = array ordenado de blocks; ordem e ativação pelo admin                         |
| **Shared Components** | Renderers React 1:1 com block slugs (`apps/web/src/components/blocks/`)                 |
| **Reusable Content**  | Testimonials, FAQs, banners, forms referenciados — não duplicados                       |

### 3.3 Governança CMS

- Workflow editorial: draft → revisão → aprovação → publicação (S03_EDITORIAL_GOVERNANCE)
- Separação Payload users (editores CMS) vs Drizzle users (plataforma app)
- Access control por tenant, company e site

---

## 4. Princípios de branding

### 4.1 Hierarquia oficial

```
Holding (Omnia Frigo Holding)
    ↓ governa estratégia, hub, políticas globais
Empresas (RR, FDFA, CTE, CES, Neurofrigo…)
    ↓ operação, conteúdo, CRM, LMS por vertical
Brands (identidade comercial e visual)
    ↓ logos, cores, tipografia, tom de voz
Sites (presença digital administrável)
    ↓ domínio, tema, menus, home, SEO por site
```

### 4.2 Responsabilidade por nível

| Nível       | Responsabilidade                                                                |
| ----------- | ------------------------------------------------------------------------------- |
| **Holding** | Hub ecossistema, narrativa institucional, governança, design tokens base        |
| **Empresa** | Conteúdo vertical, serviços, cursos, pipeline, página `/empresas/[slug]` no hub |
| **Brand**   | Identidade visual, logos, paleta, tipografia (whitelist), voz                   |
| **Site**    | Domínio, ambiente, menus, analytics, overrides limitados de tema                |

### 4.3 Regras de branding

- Tokens validados no admin — **sem CSS arbitrário** por página ou editor
- Herança: Core DS → Holding theme → Brand theme → Site overrides (accent, hero)
- Neurofrigo Carga é **produto** da empresa Neurofrigo — não empresa separada
- Omnia Holding **não é filha de si mesma** na seção ecossistema

---

## 5. Princípios de UX

| Princípio               | Aplicação                                                                        |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Consistência**        | `@omnia/ui` + design system federado; padrões de layout em blocks                |
| **Simplicidade**        | Mobile-first; jornadas claras; mínimo de cliques para conversão                  |
| **Performance**         | ISR, lazy load, `next/image`; LCP < 2.5s (4G) como alvo                          |
| **Acessibilidade**      | WCAG 2.1 AA; alt obrigatório; contraste validado em themes                       |
| **Responsividade**      | Breakpoints Tailwind; touch 44×44px; menu drawer mobile                          |
| **Experiência premium** | Visual industrial, tecnológico, institucional — Montserrat + Inter; paleta Omnia |

Referência: `docs/06-ux/`, `UI_UX_GUIDELINES.md`, S03_PORTAL_ARCHITECTURE §13.

---

## 6. Princípios técnicos

Cada tecnologia tem **papel definido** — não duplicar responsabilidades.

| Tecnologia                | Papel na Omnia                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------- |
| **Payload CMS**           | Conteúdo editorial, mídia, Page Builder, SEO fields, preview, versions — `apps/admin`  |
| **Next.js**               | Portal público (`apps/web`) e shell admin; SSR/ISR; App Router                         |
| **Drizzle ORM**           | Dados transacionais: CRM, LMS, auth, pagamentos, audit, partners operacional (ADR-002) |
| **PostgreSQL**            | Banco principal; Payload + Drizzle; RLS por tenant (evolução)                          |
| **Redis**                 | Sessões JWT, cache, filas, rate limit, event bus (futuro)                              |
| **MinIO**                 | Object storage S3-compatible; mídia Payload; vídeos/PDFs                               |
| **Docker**                | Ambientes reproduzíveis; compose dev/staging; bootstrap migrate/seed                   |
| **Traefik**               | Reverse proxy staging/prod; TLS; roteamento multisite (futuro)                         |
| **n8n**                   | Automações workflows: leads, notificações, integrações — event-driven                  |
| **Evolution API**         | WhatsApp omnichannel; integração CRM e suporte                                         |
| **IA (`@omnia/ai-core`)** | Assistentes, RAG, sugestões editoriais — nunca publish automático (ADR-006)            |

### Fronteiras obrigatórias

| Camada  | Persiste                                               | Não persiste                                  |
| ------- | ------------------------------------------------------ | --------------------------------------------- |
| Payload | Conteúdo, SEO, perfil público parceiro, vitrine cursos | CRM leads processados, matrículas, pagamentos |
| Drizzle | CRM, LMS, auth, audit, telemetria                      | Corpo editorial de páginas                    |
| Portal  | Nada — stateless; consome APIs                         | —                                             |

---

## 7. Princípios de dados

### 7.1 Hierarquia de ownership

```
Tenant → Company → Brand → Site → Content
```

Todo registro de negócio ou conteúdo editorial carrega ownership explícito:

| Campo     | Obrigatório | Descrição                   |
| --------- | ----------- | --------------------------- |
| `tenant`  | Sim         | Isolamento LGPD e políticas |
| `company` | Condicional | Null = escopo holding       |
| `brand`   | Opcional    | Default da company          |
| `site`    | Fase 2+     | Null = hub default          |
| `scope`   | Sim         | holding \| company \| site  |

### 7.2 Relacionamentos

- Preferir **relationship fields** a duplicação de texto ou mídia
- Slug único: `{tenant}:{site}:{slug}` — sem colisão cross-empresa
- Partner ≠ Company — parceiros são atores externos

### 7.3 Auditoria

- Toda transição editorial e operação sensível gera AuditLog
- Retenção conforme compliance (7 anos editorial; 90 dias IA)

### 7.4 LGPD

- Consentimento em formulários antes de CRM
- Geolocalização com consent explícito
- Direito do titular: exportação e exclusão (Sprint 16)
- PII não enviada a LLM sem política aprovada
- Dados acadêmicos CES — isolamento reforçado

---

## 8. Princípios da IA

| #    | Princípio                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------- |
| IA-1 | **Nunca substituir decisão humana** em publicação, contratos, pagamentos, aprovações               |
| IA-2 | **Sempre assistente** — sugere, corrige, resume; editor aceita ou rejeita                          |
| IA-3 | **Sempre auditável** — log de sessão, tokens, agente; sem PII em logs                              |
| IA-4 | **Sempre contextual** — agente especializado por domínio (comercial, técnico, educacional…)        |
| IA-5 | **Sempre baseada em conhecimento aprovado** — RAG só sobre conteúdo `published` e docs autorizados |

API keys server-side apenas. Rate limit por tenant. Human-in-the-loop para ações críticas.

---

## 9. Princípios da Holding

| Ator                     | Papel                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| **A Holding governa**    | Estratégia, tenant, políticas, ecossistema, BI consolidado        |
| **As empresas executam** | Serviços, educação, engenharia, IA — conteúdo e operação vertical |
| **As marcas comunicam**  | Identidade, posicionamento, campanhas, tom de voz                 |
| **Os sites apresentam**  | Presença digital — próprios ou via hub                            |
| **O Portal integra**     | Narrativa única do ecossistema; links; conversão; não substitui   |

As seis entidades do ecossistema:

1. Omnia Frigo Holding (hub)
2. Renovação Refrigeração
3. Fred do Frio Academy
4. CTE
5. Centro Educacional Sapientia
6. Neurofrigo Command IA (+ produto Neurofrigo Carga)

---

## 10. O que nunca deve acontecer

Lista **anti-padrões** explícitos — violação exige correção ou nova ADR.

| #   | Anti-padrão                                              | Por quê                                         |
| --- | -------------------------------------------------------- | ----------------------------------------------- |
| N1  | Duplicar conteúdo entre empresas/sites                   | SEO, manutenção, inconsistência                 |
| N2  | Criar páginas hardcoded com copy de marketing            | Viola CMS-First (P1)                            |
| N3  | Quebrar branding (cores/logos fora dos tokens)           | Identidade fragmentada                          |
| N4  | Misturar dados/conteúdo de empresas sem escopo           | Vazamento multiempresa                          |
| N5  | Criar autenticação paralela ad hoc                       | ADR-009; `@omnia/auth` único                    |
| N6  | Duplicar modelo de usuários sem ADR                      | Payload users ≠ Drizzle users — fronteira clara |
| N7  | CSS específico por página no portal                      | Usar blocks + tokens                            |
| N8  | Duplicar componentes fora de `@omnia/ui` / blocks        | Fragmentação DS                                 |
| N9  | Ignorar SEO em página pública                            | P3                                              |
| N10 | Ignorar auditoria em alteração editorial/operacional     | P7                                              |
| N11 | IA publicar ou alterar status sem humano                 | P8                                              |
| N12 | Portal importar Payload diretamente                      | ADR-004                                         |
| N13 | Substituir site oficial de empresa sem plano de migração | P13, P14                                        |
| N14 | Criar Company para produto (ex: Neurofrigo Carga)        | Modelo multisite                                |
| N15 | Publicar sem preview em produção                         | P4                                              |
| N16 | Slug ou domínio duplicado cross-tenant                   | Conflito roteamento                             |
| N17 | Armazenar CRM/leads apenas no Payload sem sync Drizzle   | Fronteira persistência                          |
| N18 | Feature flags ou integrações hardcoded sem config        | `@omnia/config`                                 |

---

## 11. Critérios para aceitar novas funcionalidades

Toda nova funcionalidade **deve responder "sim" ou ter justificativa documentada** nas perguntas abaixo antes de entrar no roadmap ou ser mergeada.

| #   | Pergunta                       | Esperado                                    |
| --- | ------------------------------ | ------------------------------------------- |
| Q1  | **É multiempresa?**            | tenant + company quando aplicável           |
| Q2  | **É administrável?**           | Conteúdo via CMS se marketing/institucional |
| Q3  | **É reutilizável?**            | Block, package ou API compartilhada         |
| Q4  | **Tem SEO?**                   | Meta configurável se página pública         |
| Q5  | **Tem auditoria?**             | Evento/log se dado sensível ou editorial    |
| Q6  | **É escalável?**               | Sem N+1; cache; stateless onde possível     |
| Q7  | **Integra com o ecossistema?** | Eventos, CRM, company scope, hub            |
| Q8  | **Respeita o CMS?**            | Não hardcode conteúdo administrável         |

### Gate adicional para conteúdo público

- [ ] Preview testado em staging
- [ ] Versionamento habilitado
- [ ] Access control por company
- [ ] ADR existente ou atualização deste doc se princípio novo

---

## 12. Checklist arquitetural (revisão obrigatória de PR)

Todo PR que toque `apps/`, `packages/`, `domains/` ou schema de conteúdo deve passar por este checklist. Revisor marca ✅ ou documenta exceção com link para ADR/issue.

### 12.1 CMS e conteúdo

- [ ] Nenhum texto/imagem/SEO de marketing hardcoded no portal
- [ ] Conteúdo novo usa collection/global/block apropriado
- [ ] Block renderer registrado em `blocks-map` se novo bloco
- [ ] Portal consome REST — sem import Payload em `apps/web`
- [ ] Campos `tenant`, `company`, `scope` preenchidos
- [ ] SEO fields presentes em entidades públicas

### 12.2 Multiempresa e branding

- [ ] Access control impede edição cross-company
- [ ] Tema via tokens — sem CSS inline arbitrário
- [ ] Slug único no escopo tenant/site
- [ ] Holding não tratada como empresa filha no ecossistema

### 12.3 Dados e persistência

- [ ] Conteúdo editorial no Payload; transacional no Drizzle
- [ ] `tenantId` em tabelas Drizzle de negócio
- [ ] Sem duplicação de entidades User sem ADR
- [ ] Migrations versionadas se schema alterado

### 12.4 Editorial e governança

- [ ] Drafts/versions considerados se collection editorial
- [ ] Preview funcional em staging para mudanças de página
- [ ] Hooks de auditoria se alteração sensível
- [ ] IA (se aplicável) suggestion-only — sem auto-publish

### 12.5 Técnico e qualidade

- [ ] `pnpm lint && pnpm typecheck && pnpm build` verde
- [ ] Sem violação ADR-004, ADR-008
- [ ] Dependências respeitam `DEPENDENCY_RULES.md`
- [ ] Testes mínimos conforme risco da mudança
- [ ] Documentação atualizada se novo módulo/collection

### 12.6 UX e performance

- [ ] Responsivo mobile
- [ ] Imagens via `next/image` com alt
- [ ] ISR/cache configurado para rotas públicas
- [ ] Acessibilidade: contraste e foco verificados

### 12.7 Aprovação

| Papel         | Quando obrigatório                   |
| ------------- | ------------------------------------ |
| Engenharia    | Todo PR                              |
| Produto       | Mudança de escopo ou UX público      |
| SEO/Marketing | Páginas públicas novas               |
| Arquitetura   | Novo app, package, domínio (ADR-008) |

---

## Alternativas consideradas

| Alternativa                                     | Motivo de rejeição                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Princípios implícitos apenas em docs de produto | Não vinculantes para código; drift entre squads                                       |
| Um princípio por ADR                            | Fragmentação; difícil onboarding                                                      |
| Substituir ADR-001–008 por este documento       | ADRs técnicos mantêm decisões específicas; este ADR sintetiza princípios transversais |

## Consequências

### Positivas

- Referência única e permanente para humanos e agentes de IA
- Critérios objetivos de PR e roadmap
- Alinhamento produto ↔ engenharia ↔ design
- Redução de débito CMS-First e multiempresa

### Negativas

- Rigidez — exceções exigem ADR ou revisão formal
- Checklist adiciona overhead em PRs pequenos
- Princípios ambiciosos (preview, SEO, audit em tudo) exigem implementação gradual

## Relação com ADRs existentes

| ADR                      | Relação com ADR-011                            |
| ------------------------ | ---------------------------------------------- |
| ADR-001 Monorepo modular | Reforça modular, API first                     |
| ADR-002 Drizzle          | Reforça fronteira Payload vs Drizzle           |
| ADR-004 Portal/CMS       | Reforça CMS-First, P12                         |
| ADR-005 Multi-tenant     | Reforça tenant, company, LGPD                  |
| ADR-006 IA               | Reforça P8, seção 8                            |
| ADR-007 DDD              | Reforça modular, bounded contexts              |
| ADR-008 Freeze           | Mudanças estruturais ainda exigem ADR dedicada |

**Numeração:** ADR-009 e ADR-010 reservados para decisões pendentes (dual user model, PostGIS/mapas) citadas em `S03_CMS_FOUNDATION` e `PRODUCT_REVIEW_V2`.

### Localização dos ADRs e dívida documental

Os ADRs históricos (ADR-001 a ADR-008) residem em [`docs/14-adr/`](../14-adr/). Este documento (ADR-011) reside em `docs/07-adrs/`.

> **Dívida documental (DEBT-DOC-001):** Unificar a estrutura de ADRs em um único diretório canônico em sprint futura. **Não mover arquivos** até decisão formal de reorganização. Até lá, `docs/14-adr/` é a fonte dos ADRs técnicos históricos; `docs/07-adrs/` concentra princípios arquiteturais transversais a partir do ADR-011.

## Referências

### Produto

- [PRODUCT_MASTER_V2.md](../00-product/PRODUCT_MASTER_V2.md)
- [DOMAIN_MODEL_V2.md](../00-product/DOMAIN_MODEL_V2.md)
- [MASTER_ROADMAP_V2.md](../00-product/MASTER_ROADMAP_V2.md)
- [BACKLOG_V2.md](../00-product/BACKLOG_V2.md)
- [PRODUCT_REVIEW_V2.md](../00-product/PRODUCT_REVIEW_V2.md)

### Especificações Sprint 3

- [S03_CMS_FOUNDATION.md](../01-specifications/S03_CMS_FOUNDATION.md)
- [S03_PORTAL_ARCHITECTURE.md](../01-specifications/S03_PORTAL_ARCHITECTURE.md)
- [S03_MULTISITE_BRANDING.md](../01-specifications/S03_MULTISITE_BRANDING.md)
- [S03_EDITORIAL_GOVERNANCE.md](../01-specifications/S03_EDITORIAL_GOVERNANCE.md)

### ADRs técnicos

- [ADR-001](../14-adr/ADR-001-monorepo-modular-architecture.md) a [ADR-008](../14-adr/ADR-008-architecture-freeze-governance.md)

### Governança

- `PROJECT_CONTEXT.md`, `GOVERNANCE.md`, `QUALITY_GATES.md`, `DEFINITION_OF_DONE.md`

---

## Histórico

| Versão | Data       | Alteração                                            |
| ------ | ---------- | ---------------------------------------------------- |
| 1.0    | 2026-07-10 | Criação — Sprint 3.3B documentação                   |
| 1.1    | 2026-07-10 | Aceito — princípios P16–P19; referência cruzada ADRs |

---

_Omnia Frigo Holding — ADR-011 Platform Principles — **Aceito**_
