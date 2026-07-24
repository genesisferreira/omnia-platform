# Partner Network — Arquitetura de Produto

**Módulo:** Partner Network  
**Plataforma:** Omnia Platform  
**Versão do documento:** 1.0  
**Data:** 2026-07-24  
**Status:** Checkpoint 01 — modelagem admin consolidada (Portal público ainda não iniciado)  
**Audiência:** Product, Arquitetura, Engenharia, Negócio  

---

## 1. Visão

O **Partner Network** é o núcleo do ecossistema Omnia para o setor de refrigeração no Brasil: uma rede nacional de empresas e profissionais qualificados que recebem demanda, constroem reputação e se conectam ao CRM, à Academia, ao CTE, à Renovação, à Neurofrigo IA e, no futuro, ao Marketplace.

A Omnia deixa de ser apenas CMS/CRM e passa a operar como **plataforma de rede**: descoberta geográfica, confiança (certificações/selos), distribuição de leads e, depois, monetização e programas premium.

### Princípios

1. **Um domínio, várias superfícies** — o mesmo parceiro alimenta Portal, CRM, Academy e IA.  
2. **Aprovação antes de exposição** — nada público sem status aprovado.  
3. **Geografia como produto** — proximidade é critério de primeira classe.  
4. **Reputação auditável** — selos, cursos e avaliações com origem rastreável.  
5. **Escalável por fases** — MVP enxuto; extensões sem reescrever o núcleo.  
6. **LGPD e consentimento** — leads e dados de contato com finalidade clara.

---

## 2. Domínio — Entidades

### 2.1 Núcleo (MVP / Fase 1)

| Entidade | Justificativa |
|----------|----------------|
| **Partner** | Unidade central: empresa ou profissional da refrigeração. É o “perfil de negócio” da rede (não confundir com User de autenticação). |
| **PartnerProfile** | Dados públicos e comerciais do Partner (nome fantasia, bio, logo, contatos, horários). Separar de dados cadastrais sensíveis. |
| **PartnerStatus** | Ciclo de vida: rascunho, em análise, aprovado, rejeitado, suspenso, arquivado. Controla publicação e recebimento de leads. |
| **PartnerCategory** | Taxonomia estável (ex.: instalação, manutenção, automação, câmaras, VRF). Base de filtros e SEO. |
| **PartnerSpecialty** | Especialidades finas (marcas, linhas, tipos de equipamento). Complementa categoria sem explodir a taxonomia. |
| **PartnerService** | Serviços oferecidos (orçamento, visita técnica, contrato). Alimenta página pública e matching de leads. |
| **PartnerCoverageArea** | Área de atuação (UF, cidade, raios, CEPs). Define elegibilidade geográfica. |
| **PartnerLocation** | Endereço operacional + CEP + lat/lng. Fonte da busca por distância e mapa. |
| **PartnerMedia** | Logo, galeria, documentos públicos. Assets da página do parceiro. |
| **PartnerContactChannel** | WhatsApp, telefone, e-mail comercial, site. Canais de conversão controlados. |

### 2.2 Confiança e reputação

| Entidade | Justificativa |
|----------|----------------|
| **PartnerCertification** | Certificações técnicas (fabricante, curso Omnia, normas). Credibilidade B2B. |
| **PartnerBadge** | Selos Omnia (verificado, premium, destaque regional). Diferenciação editorial/comercial. |
| **PartnerReview** | Avaliação de clientes pós-serviço. Ranking e prova social. |
| **PartnerReviewModeration** | Fila de moderação de reviews (spam, abuso, conflito). |
| **PartnerTrainingRecord** | Vínculo futuro com cursos/certificados da Academy/CTE (Fase 2+). |

### 2.3 Demanda e relacionamento

| Entidade | Justificativa |
|----------|----------------|
| **PartnerLead** | Intenção comercial direcionada a um ou mais parceiros (“Solicitar orçamento”). Diferente do lead CRM genérico, mas integrável. |
| **PartnerLeadAssignment** | Regras de distribuição (único parceiro, fan-out, rodízio). Auditoria de quem recebeu o quê. |
| **PartnerLeadEvent** | Timeline (criado, visualizado, respondido, convertido, expirado). Operação e métricas. |
| **PartnerFavorite** / **PartnerFollow** *(opcional Fase 2)* | Engajamento do visitante autenticado. |

### 2.4 Comercial e programas (futuro)

| Entidade | Justificativa |
|----------|----------------|
| **PartnerProgram** | Programas (Básico, Verificado, Premium). |
| **PartnerSubscription** | Adesão a programa (período, benefícios). |
| **PartnerHighlight** | Destaque pago/editorial (peso na ordenação). |
| **PartnerOffer** / **PartnerListing** | Ofertas marketplace (Fase 3+). |
| **PartnerCommissionRule** | Regras financeiras de lead/venda (Fase 4). |

### 2.5 Identidade e vínculo

| Entidade | Justificativa |
|----------|----------------|
| **User ↔ Partner Membership** | Quem administra o perfil (owner, editor). Um User pode gerir N Partners; um Partner tem N membros. |
| **Organization ↔ Partner** *(opcional)* | Alinhamento com Organizations já existentes no ecossistema Omnia, sem acoplar demais no MVP. |

### 2.6 Entidades auxiliares de geo

| Entidade | Justificativa |
|----------|----------------|
| **GeoPlace** | Normalização de cidade/UF/CEP (cache de geocode). Evita reprocessar CEP a cada busca. |
| **GeoQueryLog** *(opcional)* | Telemetria agregada de buscas (produto/analytics), sem PII desnecessária. |

---

## 3. Fluxos de negócio

### 3.1 Onboarding do parceiro

```
Interesse / Convite
        ↓
Cadastro (dados mínimos + LGPD)
        ↓
Completar perfil (serviços, área, mídia, geo)
        ↓
Submissão para análise
        ↓
Análise (moderador/admin)
        ↓
Aprovação ──→ Publicação (visível na rede)
   ou
Rejeição / Solicitação de ajustes
        ↓
Recebimento de leads (se elegível)
        ↓
Avaliações e certificações (contínuo)
        ↓
Programa Premium / Destaque (futuro)
```

### 3.2 Fluxo de publicação

1. Partner em status **aprovado**.  
2. Perfil com campos mínimos obrigatórios preenchidos.  
3. Localização geocodificada válida.  
4. Flag **publicado** = sim.  
5. Indexação na busca geográfica e listagens.  

Se status ≠ aprovado **ou** publicado = não → **não renderizar** em Home, busca ou diretório.

### 3.3 Fluxo de lead (“Solicitar orçamento”)

```
Visitante na página do parceiro / resultado de busca
        ↓
Formulário (necessidade, contato, consentimento)
        ↓
Criação de PartnerLead
        ↓
Matching / Assignment (1 ou N parceiros)
        ↓
Notificação ao parceiro (e-mail / painel / futuro WhatsApp)
        ↓
Espelho opcional no CRM (Lead/Contact/Activity)
        ↓
Acompanhamento (eventos) e SLA
```

### 3.4 Fluxo de avaliação

```
Serviço realizado (sinal manual ou CRM)
        ↓
Convite de review (opcional)
        ↓
Cliente envia PartnerReview
        ↓
Moderação
        ↓
Publicação no perfil + recálculo de score
```

### 3.5 Fluxo de certificação / selo

```
Origem (Academy, fabricante, auditoria Omnia)
        ↓
Registro PartnerCertification / PartnerBadge
        ↓
Validação (automática ou manual)
        ↓
Exibição no perfil + filtros de busca
```

### 3.6 Fluxo de suspensão

```
Incidente / denúncia / inadimplência (futuro)
        ↓
Suspensão (admin/moderador)
        ↓
Remoção imediata da Home e da busca
        ↓
Bloqueio de novos leads
        ↓
Reativação após remediação
```

---

## 4. Perfis (atores)

| Perfil | Papel no módulo |
|--------|------------------|
| **Administrador** | Governança total: taxonomia, programas, suspensões, destaque, regras de matching. |
| **Moderador** | Fila de aprovação de parceiros e reviews; sem necessariamente alterar programas financeiros. |
| **Parceiro** | Dono/operador do perfil: editar dados permitidos, ver leads, responder demanda. |
| **Visitante** | Busca, visualiza páginas públicas, solicita orçamento (com LGPD). |
| **Cliente** | Visitante autenticado; histórico de solicitações e reviews. |
| **Professor / Instrutor** *(futuro)* | Emite ou valida certificações ligadas a cursos. |
| **Operador CRM** | Consome PartnerLead espelhado; não edita perfil público sem papel de moderação. |

---

## 5. Permissões (matriz conceitual)

| Ação | Admin | Moderador | Parceiro | Visitante | Cliente |
|------|:-----:|:---------:|:--------:|:---------:|:-------:|
| Criar Partner (próprio cadastro) | ✓ | ✓ | ✓* | ✓* | ✓* |
| Criar Partner (em nome de outrem) | ✓ | ✓ | — | — | — |
| Editar perfil próprio | ✓ | ✓ | ✓ | — | — |
| Editar qualquer perfil | ✓ | limitado | — | — | — |
| Excluir / arquivar | ✓ | — | solicitar | — | — |
| Aprovar / rejeitar | ✓ | ✓ | — | — | — |
| Suspender | ✓ | ✓ | — | — | — |
| Destacar / Premium | ✓ | — | solicitar | — | — |
| Publicar na Home/busca | automático se aprovado+publicado | — | — | — | — |
| Receber leads | se elegível | — | ✓ | — | — |
| Criar lead (orçamento) | ✓ | ✓ | — | ✓ | ✓ |
| Moderar reviews | ✓ | ✓ | — | — | — |
| Emitir review | — | — | — | — | ✓ |
| Gerir categorias/selos | ✓ | leitura | — | — | — |

\*Cadastro público cria Partner em status **em análise**, nunca publicado.

### Regras de elegibilidade a leads

- Status **aprovado** + **publicado**.  
- Localização válida.  
- Canais de contato ativos.  
- Não suspenso.  
- *(Futuro)* programa/assinatura em dia.

---

## 6. Geolocalização

### 6.1 Fase A — CEP → coordenadas → distância (MVP)

1. Parceiro informa **CEP** (+ número/complemento opcional).  
2. Serviço de geocode (provedor a definir na implementação) resolve **latitude/longitude**.  
3. Persistência em `PartnerLocation` + cache em `GeoPlace`.  
4. Visitante informa CEP (ou cidade/UF) na busca.  
5. Sistema calcula distância (Haversine ou equivalente) entre ponto do visitante e cada parceiro elegível.  
6. Ordena por distância (e depois destaque/avaliação).  
7. Retorna “parceiros próximos” e/ou o mais próximo por especialidade.

**Requisitos de produto**

- CEP inválido → mensagem clara, sem falha silenciosa.  
- Geocode indisponível → fila de retry; perfil pode ficar “pendente de geo” sem publicar.  
- Precisão suficiente para “próximo de você”, não navegação turn-by-turn.

### 6.2 Fase B — GPS do navegador

1. Visitante autoriza geolocalização no browser.  
2. Coordenadas do dispositivo viram origem da busca.  
3. Fallback: CEP/cidade se GPS negado ou indisponível.  
4. Transparência: “Usamos sua localização apenas para ordenar parceiros próximos.”

### 6.3 Fase C — refinamentos

- Polígonos de cobertura (além de raio).  
- Preferência “atende no local do cliente” vs “cliente vai até a base”.  
- Heatmaps internos (ops), não públicos.

---

## 7. Busca e filtros

### Filtros previstos

| Filtro | MVP | Depois |
|--------|:---:|:------:|
| Estado (UF) | ✓ | |
| Cidade | ✓ | |
| CEP / origem | ✓ | |
| Raio (km) | ✓ | |
| Categoria | ✓ | |
| Especialidade | ✓ | |
| Marcas atendidas | parcial | ✓ |
| Avaliação mínima | | ✓ |
| Selos / verificado | | ✓ |
| Aberto agora | | ✓ |
| Programa Premium | | ✓ |
| Texto livre | | ✓ |

### Ordenação padrão (Home e busca “próximos”)

1. **Distância** (menor primeiro)  
2. **Destaque** (highlight/programa)  
3. **Avaliação** (score + volume mínimo)

Empates: mais recente atualizado / maior completude de perfil.

### Regras de renderização da Home

Seção **“Parceiros próximos de você”**:

- **Só aparece** se existir **pelo menos um** Partner `aprovado` + `publicado` + geo válida.  
- Caso contrário: **não renderizar** a seção (sem empty state promocional obrigatório no MVP).  
- Se o visitante não informar origem: pedir CEP ou usar GPS (Fase B); sem origem, a seção pode omitir-se ou pedir input — **preferência de produto:** pedir CEP antes de listar.

---

## 8. Página pública do parceiro

### Blocos obrigatórios (MVP)

- Logo / identidade visual  
- Nome fantasia + categorias  
- Descrição / sobre  
- Especialidades e serviços  
- Área de atuação (texto + mapa se geo OK)  
- WhatsApp / canais de contato  
- Botão **Solicitar orçamento**  
- Selos/certificações (se houver)  

### Blocos recomendados

- Galeria de fotos  
- Avaliações  
- Marcas atendidas  
- Horário de atendimento  
- Cursos / formação Omnia (quando houver vínculo)  

### Blocos futuros

- Catálogo de ofertas  
- Agenda de disponibilidade  
- Chat assistido por IA (Neurofrigo)  
- Cases e portfólio estruturado  

### SEO e confiança

- URL estável (`/parceiros/{slug}`)  
- Dados estruturados (organização/local)  
- Prova de verificação Omnia quando aplicável  

---

## 9. Home — especificação “Parceiros próximos de você”

| Item | Definição |
|------|-----------|
| **Nome da seção** | Parceiros próximos de você |
| **Condição de existência** | ≥ 1 parceiro aprovado, publicado e geocodificado |
| **Origem geográfica** | CEP informado ou GPS (Fase B) |
| **Card** | Logo, nome, cidade/UF, distância, categorias, CTA |
| **CTA principal** | Ver perfil / Solicitar orçamento |
| **Limite** | N cards (ex.: 6–12) + link “Ver todos” |
| **Ordenação** | 1 distância → 2 destaque → 3 avaliação |
| **Sem resultados no raio** | Ampliar raio sugerido ou listar mais próximos nacionalmente (configurável) |
| **Parceiro suspenso** | Nunca listar |

---

## 10. Integrações futuras (contratos de domínio)

### 10.1 CRM

- `PartnerLead` → espelho em Lead/Contact/Activity.  
- Status do parceiro influencia roteamento comercial Omnia.  
- Operadores CRM não publicam perfil sem papel de moderação.

### 10.2 Cursos / Fred do Frio Academy / CTE

- Conclusão de curso → elegibilidade a `PartnerCertification` / badge.  
- Perfil público exibe formação Omnia.  
- Campanhas: “parceiros formados em X”.

### 10.3 Certificados

- Emissor confiável (Academy, fabricante, auditoria).  
- Validade e renovação.  
- Filtro “somente certificados vigentes”.

### 10.4 Neurofrigo Command IA

- Contexto de parceiros próximos para recomendações.  
- Assistente sugere técnico por geo + especialidade + reputação.  
- Nunca expor dados internos de lead a modelos sem política clara.

### 10.5 Marketplace

- Partner como seller.  
- Catálogo de serviços/produtos.  
- Checkout e pós-venda (Fase 3–4).

### 10.6 Financeiro

- Assinatura de programas.  
- Cobrança por lead / destaque.  
- Comissões e repasses.  
- Bloqueio automático por inadimplência → suspensão.

### 10.7 Renovação / empresas do grupo

- Parceiros preferenciais por vertical.  
- Co-branding e campanhas regionais.

---

## 11. Roadmap de desenvolvimento

### Fase 1 — Fundação do diretório (MVP)

**Objetivo:** parceiro cadastra, Omnia aprova, aparece na busca por CEP/distância, página pública e lead básico.

- Entidades núcleo + status + geo CEP.  
- Fluxos cadastro → análise → aprovação → publicação.  
- Busca UF/cidade/CEP/raio/categoria.  
- Home “Parceiros próximos de você” (condicional).  
- Solicitar orçamento → PartnerLead (+ espelho CRM mínimo).  
- Painel admin/moderação essencial.  

**Fora de escopo Fase 1:** GPS, reviews públicos, marketplace, pagamentos, IA.

### Fase 2 — Confiança e engajamento

- Reviews + moderação.  
- Certificações/selos Omnia e vínculo Academy/CTE.  
- GPS do navegador.  
- Filtros por avaliação e selos.  
- Melhor notificação e SLA de leads.  

### Fase 3 — Monetização e marketplace inicial

- Programas Premium / destaque pago.  
- Ofertas e listagens.  
- Relatórios para o parceiro.  
- APIs estáveis para Portal e apps do grupo.  

### Fase 4 — Rede inteligente e escala nacional

- Matching avançado e rodízio justo.  
- Neurofrigo IA recomendando parceiros.  
- Financeiro completo (assinatura, lead fee, comissão).  
- Cobertura por polígonos, franquias, multi-unidades.  
- Observabilidade e anti-fraude de reviews/leads.  

---

## 12. Critérios de sucesso (produto)

| Indicador | Intenção |
|-----------|----------|
| Parceiros aprovados ativos | Densidade mínima por praça estratégica |
| % buscas com resultado no raio | Utilidade geográfica |
| Taxa de conversão orçamento → resposta | Valor para o visitante e para o parceiro |
| Tempo médio de aprovação | Eficiência operacional |
| Score médio de reviews (Fase 2+) | Confiança da rede |
| % leads com espelho CRM íntegro | Integração ecossistema |

---

## 13. Riscos e decisões em aberto

| Tema | Risco | Direção recomendada |
|------|-------|---------------------|
| Qualidade do geocode | Distâncias erradas | Cache + validação manual em praças piloto |
| Spam de cadastro | Perfis falsos | Aprovação humana no MVP; rate limit |
| Concorrência entre parceiros | Conflito por lead | Regras claras de assignment desde Fase 1 |
| Sobreposição CRM × PartnerLead | Duplicidade | Um ID de correlação; espelho unidirecional inicial |
| LGPD em leads | Uso indevido de contato | Consentimento + finalidade + retenção |
| Densidade baixa no início | Home vazia | Seção oculta (já especificado) — não inventar conteúdo |

### Decisões a fechar antes da implementação

1. Geocoder oficial (provedor e orçamento).  
2. Escopo exato do espelho CRM na Fase 1.  
3. Campos mínimos obrigatórios para aprovação.  
4. Política de exclusividade de lead (1×1 vs fan-out).  
5. Naming público (“Parceiros Omnia” vs “Rede de Refrigeração”).  

---

## 14. Entrega desta fase (documento original)

Este documento definiu a **arquitetura de produto** do Partner Network.

**Não incluía (na v1.0):** código, collections Payload, migrations, UI React/Next, schema SQL.

### 14.1 Checkpoint 01 — modelagem admin consolidada (2026-07-24)

Implementação admin (sem Portal público / geo / CRM / IA):

| Estrutura Payload | Papel |
|-------------------|--------|
| `partners` | Collection núcleo |
| `partner-categories` | Taxonomia N:N |
| `partner-network-dashboard` | Global placeholder do menu |

**Status implementados:** `draft` (rascunho interno, alinhado à arquitetura), `pending`, `approved`, `rejected`, `suspended`. Status **arquivado** permanece futuro.

**Campos estruturais consolidados em `partners`:** slug, featured, verified, plan (`free` \| `professional` \| `premium` \| `enterprise`), coverageRadius, serviceCities[], approvalNotes (interno), ownerUser, publishedAt, além de identificação, contato, mídia, endereço/CEP/cidade/UF/país, lat/lng, active, approvedAt, approvedBy.

**Permissões nesta fase:** Admin CRUD; Moderador (`editor`) somente leitura; Parceiro sem acesso. Campos de governança (status, featured, verified, plan, approvalNotes, approvedAt, approvedBy, publishedAt) com `access.update` restrito a admin.

### 14.2 Macroentrega 02 — experiência pública (2026-07-24)

Entregue no Portal (`apps/web`) e APIs públicas (`/api/omnia/public-partners*`, `partner-register`):

- Rotas `/parceiros`, `/parceiros/cadastro`, `/parceiros/[slug]`
- Collection `partner-specialties` (N:N)
- Geolocalização GPS + fallback manual; Haversine; GeocodingProvider opcional
- Home: seção condicional “Parceiros próximos de você”
- Cadastro público com rate limit, honeypot e mass-assignment block
- WhatsApp como CTA de orçamento (PartnerLead = próxima evolução)

Detalhes: `docs/releases/PARTNER_NETWORK_MACRO_02.md`.

---

## 15. Resumo executivo

O Partner Network é o módulo âncora da Omnia Platform: uma rede nacional de parceiros de refrigeração com ciclo **cadastro → aprovação → publicação → proximidade → lead → reputação → programas**.

A Fase 1 entrega o **diretório geográfico aprovável** e a **captação de orçamento**, já desenhada para CRM, Academy, CTE, IA e Marketplace sem retrabalho estrutural.
