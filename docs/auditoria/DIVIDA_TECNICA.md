# Dívida Técnica — Auditoria

**Data:** 2026-07-22  
**Escopo:** identificação apenas — **sem correção** nesta tarefa  
**Classificação:** P0 (produção/segurança), P1 (alto impacto), P2 (médio), P3 (baixo/higiene)

---

## P0

| ID | Item | Evidência | Risco |
|----|------|-----------|-------|
| D-P0-1 | Sitemap/RSS 500 em **produção publicada** até deploy 2.1.1 | Auditoria HTTP prévia; código corrigido na branch `fix/release-2.1.1-seo-feeds` | SEO / distribuição |
| D-P0-2 | Conta admin única operacional (processo) | Fora do código; risco operacional documentado em RISCOS | SPOF acesso |

> D-P0-1 é **dívida de deploy/homologação**, não ausência de fix no repositório da branch 2.1.1.

---

## P1

| ID | Item | Evidência | Risco |
|----|------|-----------|-------|
| D-P1-1 | Packages críticos scaffold (`@omnia/auth`, `@omnia/security`, `@omnia/mail`, `@omnia/logger`) | `export {}` | Expectativa vs realidade; auth real está no Payload/apps |
| D-P1-2 | Reset de senha por e-mail | Adapter SMTP / forgot-password **NÃO ENCONTRADO** | Recuperação manual |
| D-P1-3 | Schema Drizzle vazio vs domínio no Payload | `packages/database` schema `export {}` | Duas verdades de dados; confusão operacional |
| D-P1-4 | Media em filesystem local | `Media.ts` staticDir `media` | Backup/escala; MinIO só infra/docs |
| D-P1-5 | Build local Windows sem CA do sistema | `next/font` + TLS Node (`NODE_USE_SYSTEM_CA`) | Dev friction; não é bug de prod necessariamente |

---

## P2

| ID | Item | Evidência | Risco |
|----|------|-----------|-------|
| D-P2-1 | Duplicidade clientes companies | `cms.ts` `fetchCompanies` e `cms-companies.ts` `fetchPublicCompanies` → mesmo endpoint | Manutenção / drift |
| D-P2-2 | `fetchGlobalSettings` tipagem frouxa | cast em `cms.ts` | Contratos inconsistentes |
| D-P2-3 | Área `/area/[role]` stub | `apps/admin/.../area/[role]/page.tsx` | Roles partner/student sem produto |
| D-P2-4 | Neurofrigo Carga / Organizations gap prod | Conteúdo; matriz auditoria | Conteúdo incompleto |
| D-P2-5 | Drift versão npm `0.3.0` vs release `2.1.x` | `package.json` vs tags/changelog | Governança de release |
| D-P2-6 | Aviso lint `useRouter` não usado | `ChangePasswordForm.tsx` | Higiene CI |
| D-P2-7 | GraphQL não documentado no config | dep presente; config graphQL NÃO ENCONTRADO | Superfície ambígua |

---

## P3

| ID | Item | Evidência | Risco |
|----|------|-----------|-------|
| D-P3-1 | 17 packages scaffold + `modules/`/`domains/` só README | inventário | Ruído cognitivo |
| D-P3-2 | Scripts raiz placeholder | `scripts/workspace-placeholder.mjs` | — |
| D-P3-3 | eslint-disable no-console em seeds/testes | múltiplos scripts | Aceitável para CLI |
| D-P3-4 | img sem next/image em posts | eslint-disable no-img-element | Perf |
| D-P3-5 | Untracked `.validation-seo-211/` | artefato local | Não versionar |
| D-P3-6 | TODO/FIXME no código apps | Grep `TODO\|FIXME` em `apps/**/*.{ts,tsx}` → **0 matches** | — |

---

## Código duplicado (identificado)

1. Clientes HTTP para `public-companies` (web).
2. Lógica de montagem de URL Admin repetida em `cms.ts` / `cms-blog.ts` / `cms-companies.ts` / `cms-feed-client.ts` (padrão similar, não necessariamente copy-paste idêntico).

---

## Collections / APIs sem consumo portal

| Recurso | Consumo portal? |
|---------|-----------------|
| `tenants` | Indireto (ownership); sem página pública dedicada |
| `crm-companies`, `contacts`, `leads`, `activities` | Via Admin UI + lead-capture; sem CRUD portal |
| `authors` | Via posts públicos (dados embutidos) |
| Endpoints omnia listados | Todos têm ao menos um consumidor web **exceto** verificação pontual lead-capture URL |

APIs REST Payload nativas (`/api/{collection}`): consumidas pelo Admin UI; inventário completo de cada operação CRUD: **não enumerado** (framework).

---

## Componentes / arquivos órfãos

Varredura sistemática de dead code (ts-prune/knip): **NÃO EXECUTADA NESTA AUDITORIA** (não instalar deps / não alterar).  
Registrar: **NÃO ENCONTRADO NO REPOSITÓRIO** como análise automatizada de órfãos.

Candidatos manuais a revisar (não prova de não-uso):

- Packages scaffold inteiros
- `modules/*`, `domains/*` (docs only)

---

## Dependências circulares

Entre apps: web ↛ admin (só HTTP); admin ↛ web.  
Entre packages implementados: ciclos **NÃO ENCONTRADOS** nesta auditoria estática limitada.

---

## Riscos arquiteturais

1. **Verdade do schema** concentrada no Payload migrations; `@omnia/database` não modela o mesmo domínio.
2. **Superfície aspiracional** (AI, queue, LMS) documentada sem código → risco comercial.
3. **Acoplamento operacional** portal→admin: disponibilidade do Admin afeta SEO/CMS público (mitigado parcialmente na 2.1.1).
4. **Sem middleware web** de auth: depende de cada página chamar `requirePortalSession` (risco de omissão em rotas futuras).

---

## Oportunidades (sem implementar)

1. Homologar/deploy 2.1.1 feeds.
2. Unificar clientes CMS web.
3. Documentar GraphQL on/off explicitamente no Payload config.
4. Plano MinIO/CDN para Media.
5. Segundo administrador + SMTP.
6. Ferramenta de dead-code (knip) em CI futura.

---

## Documentos relacionados

Baseline: [`BASELINE_PLATAFORMA_2.1.1.md`](./BASELINE_PLATAFORMA_2.1.1.md) · Riscos release: [`RISCOS_E_PENDENCIAS.md`](./RISCOS_E_PENDENCIAS.md) · Matriz: [`MATRIZ_STATUS_PLATAFORMA.csv`](./MATRIZ_STATUS_PLATAFORMA.csv)
