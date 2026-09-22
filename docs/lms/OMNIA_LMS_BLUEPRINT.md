# Omnia LMS — Blueprint Executivo Oficial

> **Status:** **Aprovado** — fonte única de verdade do produto.  
> **Versão:** 1.0  
> **Data:** 2026-07-31  
> **Autoridade:** Chief Solution Architect — Omnia Frigo Holding  
> **Regra:** nenhuma Sprint futura deve contradizer este Blueprint sem RFC aprovada.  
> **Auditoria Moodle:** ver `OMNIA_LMS_FUNCTIONAL_AUDIT.md` e demais docs de auditoria neste diretório.

---

## 1. Declaração de produto

O **Omnia LMS** é a plataforma de educação profissional do ecossistema Omnia Frigo Holding: refrigeração, HVAC-R, formação técnica, certificações e educação corporativa multiempresa.

Não é “um Moodle com tema”. É um **produto Omnia** que usa o Moodle exclusivamente como **motor educacional** (engine) e o **Neurofrigo** como camada de inteligência artificial.

| Camada                            | Responsabilidade                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Omnia Platform / Omnia LMS UI** | Toda experiência do usuário (aluno, professor, gestor, parceiro), branding, marketplace, CRM educacional, mobile, white-label     |
| **Moodle Engine**                 | Fonte de verdade acadêmica: cursos, módulos, aulas, matrículas, progresso, avaliações, grades, competências, certificados nativos |
| **Neurofrigo**                    | Toda IA: tutor, professor assistente, corretor, recomendações, geração de conteúdo, analytics preditivo                           |
| **Serviços externos**             | Streaming de vídeo, salas ao vivo (ex.: Jitsi), SMTP, storage, pagamento, WhatsApp, push                                          |

---

## 2. Princípios arquiteturais

1. **Product-first:** projetar a experiência ideal; só depois mapear implementação (Moodle nativo / Omnia / Neurofrigo / externo).
2. **Sem customização do Core Moodle.** Integração via Web Services, plugins oficiais ou Connector Omnia.
3. **UI Omnia em `lms.*`.** Engine técnico em `moodle.*` (admin ops apenas).
4. **Uma identidade Omnia** (SSO futuro) — o aluno não “entra no Moodle”.
5. **Multiempresa e white-label** desde o desenho.
6. **Escalabilidade para milhares de alunos** concurrent e dezenas de tenants.
7. **LGPD by design.**
8. **HostGator Moodle = referência apenas** — instalação limpa na VPS; sem migração de dados legados como caminho oficial.
9. **Sessões concurrentes limitadas e configuráveis** — padrão aluno = 1 dispositivo/sessão; novo login revoga a anterior (Omnia + Moodle); abas do mesmo browser = uma sessão. Ver [`OMNIA_LMS_SESSION_POLICY.md`](OMNIA_LMS_SESSION_POLICY.md).
10. **Conteúdo sem download por padrão** — vídeo só streaming; documentos só viewer; URLs assinadas/TTL; proteção no backend. Ver [`OMNIA_LMS_CONTENT_PROTECTION_POLICY.md`](OMNIA_LMS_CONTENT_PROTECTION_POLICY.md). Captura de tela não é bloqueável de forma absoluta.
11. **Neurofrigo = única camada de IA** — pipeline Identity→Purpose→Intent→Security→Context→Tools→Specialist→Compliance; Tutor/Concierge (Portal MVP) ≠ Command (`super_admin`); DeepSeek só via adapter; sem LLM no domínio Omnia; ver [`../neurofrigo/README.md`](../neurofrigo/README.md) (D020, D021).

---

## 3. Missão e objetivos

**Missão:** democratizar e profissionalizar a educação em refrigeração e cadeia do frio, com experiência moderna, mensurável e assistida por IA.

**Objetivos de negócio**

- Formar e certificar profissionais e empresas do ecossistema Omnia.
- Monetizar cursos, assinaturas, mentorias e eventos.
- Capacitar parceiros e redes (Omnia Partner Network ↔ LMS).
- Gerar dados de engajamento e performance para gestores e BI.
- Diferenciar-se por UX Omnia + Neurofrigo, não por “mais um Moodle”.

---

## 4. Público e mercado

| Persona                      | Necessidade principal                                         |
| ---------------------------- | ------------------------------------------------------------- |
| Aluno técnico / profissional | Estudar no celular, retomar aula, certificado válido, tutoria |
| Professor / especialista     | Produzir conteúdo rápido, avaliar, acompanhar turmas          |
| Gestor educacional / holding | KPIs, multiempresa, compliance, receita                       |
| Empresa cliente (B2B)        | Trilhas corporativas, branding, relatórios de RH              |
| Parceiro Omnia               | Cursos exclusivos, comissões, ranking                         |

**Mercado:** educação técnica HVAC-R / refrigeração no Brasil e expansão LATAM; B2C + B2B + B2B2C via parceiros.

---

## 5. Diferenciais

1. UX nativa Omnia (não UI Moodle).
2. Neurofrigo como tutor/professor/corretor integrado ao progresso real.
3. Integração com Rede de Parceiros, CRM e marketplace da Platform.
4. Multiempresa / white-label.
5. Player e aulas ao vivo como experiência de produto (não plugin solto).
6. Certificados com validação pública e evolução para assinatura/QR.
7. Mobile-first + offline seletivo.

---

## 6. Arquitetura geral (lógica)

```text
                    ┌─────────────────────────────┐
                    │     Clientes (Web/Mobile)   │
                    │         lms.*               │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │     Omnia LMS (BFF/API)     │
                    │  Auth · UX · Orquestração   │
                    └───┬──────────┬──────────┬───┘
                        │          │          │
           ┌────────────▼──┐  ┌────▼────┐  ┌──▼──────────┐
           │ Moodle Engine │  │Neurofrigo│  │ Externos    │
           │  WS / Connector│  │  IA APIs │  │ Vídeo/Live  │
           └───────────────┘  └─────────┘  │ Pay/CRM/Msg │
                                           └─────────────┘
```

Detalhamento: [`OMNIA_LMS_ARCHITECTURE_FUNCTIONAL.md`](OMNIA_LMS_ARCHITECTURE_FUNCTIONAL.md).

---

## 7. Posicionamento dos domínios

| Domínio                                    | Papel                           |
| ------------------------------------------ | ------------------------------- |
| `lms.omniafrigo.com.br` / `lms.dev…`       | Produto Omnia LMS (UI)          |
| `moodle.omniafrigo.com.br` / `moodle.dev…` | Engine (ops / WS)               |
| `omniafrigo.com.br`                        | Hub holding / marketing         |
| Platform Admin                             | CMS, CRM, parceiros, governança |

---

## 8. Documentos oficiais deste Blueprint

| Documento                                                                          | Conteúdo                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`OMNIA_LMS_BLUEPRINT.md`](OMNIA_LMS_BLUEPRINT.md)                                 | Este sumário executivo                                              |
| [`OMNIA_LMS_ARCHITECTURE_FUNCTIONAL.md`](OMNIA_LMS_ARCHITECTURE_FUNCTIONAL.md)     | Módulos 1–18 (metodologia completa)                                 |
| [`OMNIA_LMS_RESPONSIBILITY_MATRIX.md`](OMNIA_LMS_RESPONSIBILITY_MATRIX.md)         | Matriz RACI de responsabilidades                                    |
| [`OMNIA_LMS_ROADMAP.md`](OMNIA_LMS_ROADMAP.md)                                     | Roadmap Sprint 2.4 → 3.0                                            |
| [`OMNIA_LMS_USER_JOURNEYS.md`](OMNIA_LMS_USER_JOURNEYS.md)                         | Jornadas de usuário                                                 |
| [`OMNIA_LMS_INFORMATION_ARCHITECTURE.md`](OMNIA_LMS_INFORMATION_ARCHITECTURE.md)   | IA de informação / navegação                                        |
| [`OMNIA_LMS_API_MAP.md`](OMNIA_LMS_API_MAP.md)                                     | Mapa de APIs lógicas                                                |
| [`OMNIA_LMS_SESSION_POLICY.md`](OMNIA_LMS_SESSION_POLICY.md)                       | Sessões concurrentes (adendo)                                       |
| [`OMNIA_LMS_CONTENT_PROTECTION_POLICY.md`](OMNIA_LMS_CONTENT_PROTECTION_POLICY.md) | Proteção de conteúdo (adendo)                                       |
| [`OMNIA_LMS_INTEGRATION_SPEC.md`](OMNIA_LMS_INTEGRATION_SPEC.md)                   | Contratos Connector / sessão / mídia                                |
| [`OMNIA_LMS_SECURITY_CHECKLIST.md`](OMNIA_LMS_SECURITY_CHECKLIST.md)               | Checklist de segurança                                              |
| [`OMNIA_LMS_DECISION_LOG.md`](OMNIA_LMS_DECISION_LOG.md)                           | Log de decisões                                                     |
| [`../neurofrigo/README.md`](../neurofrigo/README.md)                               | **Neurofrigo Runtime** (Sprint 3.1) — agentes, guards, RAG, roadmap |

Infra Docker já existente (engine): `docs/09-infrastructure/OMNIA_LMS_*.md` — **não substitui** este Blueprint de produto.

---

## 9. Próximo passo após aprovação

**Auditoria Funcional do Moodle** — comparar este Blueprint com capacidades nativas do Moodle 4.5 LTS e classificar cada item:

- existe nativo;
- configurar;
- desenvolver na Omnia;
- Neurofrigo;
- integrar serviço externo.

Até lá: **não implementar telas, APIs de produto, plugins ou SSO.**

---

## 10. Critérios de aprovação do Blueprint

- [ ] Missão e fronteiras Omnia / Moodle / Neurofrigo / Externo validadas pela direção
- [ ] Módulos 2–4 (Aluno / Professor / Gestor) alinhados ao go-to-market
- [ ] Roadmap 2.4–3.0 aceito como sequência oficial
- [ ] Matriz de responsabilidades sem ambiguidades críticas
- [ ] Autorização formal para iniciar Auditoria Funcional do Moodle
