# Omnia LMS — Roadmap Oficial (Sprint 2.4 → 3.0)

> Alinhado ao Blueprint v1.0. Datas são de sequência de produto, não compromissos comerciais fixos.

---

## Visão da sequência

```text
2.4 Infra + Blueprint + Auditoria Moodle
  → 2.5 Connector + Auth bridge + Catálogo read-only
    → 2.6 Área do Aluno MVP (estudo + progresso)
      → 2.7 Avaliações UX + Certificados
        → 2.8 Professor authoring + Vídeo/Live
          → 2.9 Gestor + Marketplace + Parceiros
            → 3.0 Mobile + IA profunda + White-label maduro
```

---

## Sprint 2.4 — Fundação engine + Blueprint

| Item | Entrega |
| --- | --- |
| 2.4.1 | Infra Docker Moodle engine (DEV) — **feito** |
| 2.4.2 | Instalação limpa validada + HTTPS — **em curso / baseline OK** |
| 2.4.3 | Blueprint aprovado + Auditoria Funcional Moodle + desenho Connector |
| Fora | UI produto, SSO, IA, migração HostGator |

**Saída:** Blueprint oficial + mapa “nativo / config / Omnia / Neurofrigo / Ext”.

---

## Sprint 2.5 — Connector e identidade

- Omnia LMS Connector (service-to-service → Moodle WS)
- Mapeamento usuário Omnia ↔ Moodle (provisionamento)
- Leitura: cursos, categorias, matrículas, progresso
- Feature flags; ambientes `lms.dev` shell mínimo (read-only)
- Segurança: tokens, scopes, auditoria de chamadas

**Saída:** Aluno autenticado Omnia vê lista de cursos (dados Moodle) sem UI Moodle.

---

## Sprint 2.6 — Área do Aluno MVP

- Dashboard, meus cursos, continuar estudando
- Player de conteúdo básico (PDF/SCORM ou página + vídeo simples)
- Progresso visual
- Notificações email essenciais
- Acessibilidade baseline

**Saída:** Jornada estudar ponta a ponta no `lms.*`.

---

## Sprint 2.7 — Avaliações e certificados

- UX de questionário Omnia → Moodle quiz
- Histórico de notas
- Certificados: emissão + galeria + validação pública
- Neurofrigo: tutor MVP (chat com contexto de curso)

**Saída:** Aluno conclui curso e valida certificado.

---

## Sprint 2.8 — Professor + mídia

- Authoring: criar/editar curso/módulo/aula via Omnia
- Upload + VOD (CDN)
- Player avançado (velocidade, retomada, progresso)
- Live MVP (Jitsi) + presença
- IA Professor: gerador de questões/roteiro (revisão humana)

**Saída:** Professor produz e publica sem Moodle UI.

---

## Sprint 2.9 — Gestor, monetização, parceiros

- Dashboard gestor + exportações
- Marketplace MVP + PIX/gateway
- Entitlement → matrícula automática
- Parceiros: cursos exclusivos + indicadores
- CRM educacional: funil lead → matrícula
- Multiempresa fase 1 (tenant branding leve)

**Saída:** Receita e operação B2B/B2C no LMS.

---

## Sprint 3.0 — Escala e IA plena

- Apps Android/iOS + push
- Offline seletivo
- White-label completo
- Gamificação
- Neurofrigo: corretor, plano de estudos, recomendações, BI preditivo
- Avaliações práticas de campo
- Hardening LGPD, 2FA, SSO enterprise

**Saída:** Produto Omnia LMS em escala nacional.

---

## Dependências críticas entre sprints

| Antes | Depois |
| --- | --- |
| 2.4 Auditoria | 2.5 Connector (não inventar o que Moodle já faz) |
| 2.5 Connector | 2.6 Aluno |
| 2.6 Progresso | 2.7 Certificados |
| 2.8 Vídeo | 3.0 Offline vídeo |
| 2.9 Billing | 3.0 Assinaturas avançadas |

---

## Explicitamente fora até 3.0 (salvo RFC)

- Customização Core Moodle
- Migrar base HostGator como caminho oficial
- Blockchain de certificados (pós-3.0)
- ERP completo
