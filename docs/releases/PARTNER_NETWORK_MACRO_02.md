# Partner Network — Macroentrega 02

**Data:** 2026-07-24  
**Branch:** `feature/2.3-partner-network`  
**Commit base Checkpoint 01:** `33955c92a441985f9e188a0ba9f5fda6f0b1101f`

---

## Escopo entregue

Experiência pública integrada do Partner Network:

- cadastro público (`/parceiros/cadastro`);
- busca e filtros (`/parceiros`);
- perfil público (`/parceiros/[slug]`);
- geolocalização (GPS + fallback manual);
- distância Haversine;
- seção condicional na Home;
- especialidades (`partner-specialties`);
- APIs públicas com whitelist de campos;
- indicadores de confiança reais;
- WhatsApp “Solicitar orçamento”.

**Não incluído:** pagamentos, avaliações, CRM, PartnerLead persistido, área autenticada do parceiro, IA, LMS, certificados reais, Google Maps obrigatório.

---

## Arquitetura adotada

| Camada | Responsabilidade |
|--------|------------------|
| `@omnia/shared/partners` | Contratos públicos, Haversine, CPF/CNPJ, publicação, map DTO |
| `apps/admin` endpoints `/api/omnia/*` | Listagem, detalhe, taxonomias, register |
| `apps/web` | UI Portal, SEO, nav, Home |
| GeocodingProvider | Abstração (`none` \| `nominatim`) |

Padrões reutilizados: lead-capture (rate limit + honeypot + CORS), `buildPageMetadata`, soft-fail fetch, `nav-items`.

---

## Rotas públicas

| Rota | Função |
|------|--------|
| `/parceiros` | Busca + filtros |
| `/parceiros/cadastro` | Formulário (noindex) |
| `/parceiros/[slug]` | Perfil (404 se não publicável) |

Menu: **Parceiros** → Encontrar parceiros / Seja um parceiro.

---

## Collections / Globals

| Slug | Alteração |
|------|-----------|
| `partner-specialties` | **Nova** |
| `partners` | specialties, endereço detalhado, brandsServed, servicesDescription; `active` default false |
| `partner-categories` | Sem mudança estrutural |
| `partner-network-dashboard` | Sem mudança |

---

## Endpoints

| Método | Path |
|--------|------|
| GET | `/api/omnia/public-partners` |
| GET | `/api/omnia/public-partner?slug=` |
| GET | `/api/omnia/public-partner-categories` |
| GET | `/api/omnia/public-partner-specialties` |
| POST | `/api/omnia/partner-register` |

---

## Regras de publicação

Visível somente se: `status=approved` **e** `active=true` **e** `publishedAt` preenchido.

Cadastro público força: pending, active false, featured/verified false, plan free; bloqueia campos admin (mass assignment).

---

## Segurança

- Whitelist de campos no map público (sem document, email, approvalNotes, ownerUser, approvedBy, plan, status…).
- Rate limit Redis (`partner-register`, 5 / 15 min).
- Honeypot `companyWebsite`.
- Origin allowlist.
- Sem upload público de mídia nesta fase (logo/galeria via Admin).

---

## Geolocalização / Geocodificação

- **GPS:** botão na busca; permissão negada → fallback manual.
- **Manual:** cidade, UF, CEP/`q`.
- **Haversine** no shared; ordenação no servidor.
- **Geocode:** `GEOCODING_PROVIDER=none|nominatim` + `GEOCODING_USER_AGENT`. Sem chave no repo. Sem provedor: cadastro OK sem lat/lng; busca por cidade/estado OK.

---

## Home

`NearbyPartnersSection`: só renderiza se ≥1 parceiro publicável; soft-fail se API cair; CTA “Ver todos os parceiros”.

---

## Variáveis de ambiente

| Var | Uso |
|-----|-----|
| `GEOCODING_PROVIDER` | `none` (default) ou `nominatim` |
| `GEOCODING_USER_AGENT` | Obrigatório para Nominatim |
| `GEOCODING_API_KEY` | Reservado |
| `NEXT_PUBLIC_PARTNER_GEO_ENABLED` | Documentado (UI pode usar depois) |
| Existentes | `NEXT_PUBLIC_ADMIN_URL`, SMTP (e-mail confirmação best-effort) |

---

## Migration

**Atualizada in-place:** `20260724_120000_partner_network` (nunca aplicada em ambiente).

---

## Testes

```bash
pnpm --filter @omnia/shared test:partners
pnpm --filter @omnia/admin test:partner-register
```

---

## Validação manual (com Postgres)

1. `pnpm --filter @omnia/admin migrate`
2. Subir Admin + Portal
3. Criar categorias e especialidades no Admin
4. Enviar `/parceiros/cadastro` → pending / active false / ausente na busca
5. Aprovar + ativar + confirmar publishedAt
6. Conferir busca, perfil, Home, GPS ok/negado, mobile, ausência de documento/e-mail

## Homologação DEV

Relatório operacional: [`PARTNER_NETWORK_DEV_HOMOLOGATION.md`](./PARTNER_NETWORK_DEV_HOMOLOGATION.md).

Em 2026-07-24 a Sprint 2.3 foi **publicada e homologada** no DEV (`3408937`): migration aplicada, Admin/Web healthy, fluxo cadastro→aprovação→público OK.

---

## Próxima evolução

- PartnerLead
- Avaliações
- Certificações / CTE / Academy
- Área autenticada do parceiro
- Planos / cobrança
- CRM espelho
- LMS
- Neurofrigo IA

---

## Especialidades — exemplos (sem seed automático)

Instalação, Manutenção Preventiva/Corretiva, PMOC, Retrofit, Automação, Câmara Fria, Chiller, VRF, Rack, Amônia, CO₂, Glicol, Split, HVAC, Elétrica Industrial, Painéis, Eficiência Energética, Comissionamento, Balanceamento, Termografia, Detecção de Vazamentos.
