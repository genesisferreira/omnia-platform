# Omnia LMS — Gap Analysis (Blueprint × Moodle 4.5 LTS)

> Lacunas = o que o Blueprint exige e o Moodle **não** entrega sozinho na instalação limpa auditada.

---

## 1. Resumo executivo de gaps

| Categoria de gap | Gravidade | Dono da solução |
| --- | --- | --- |
| UX completa (Aluno/Professor/Gestor) | Crítica (esperada) | 🟦 Omnia |
| Connector / Web Services endurecidos | Crítica | 🟦 Omnia |
| Player VOD + CDN + progresso fino | Crítica | 🟦+🟠 |
| Certificado PDF + validação pública | Alta | 🟢 plugin e/ou 🟦 |
| IA (tutor, geradores, corretor) | Alta | 🟣 |
| Marketplace / pagamento / entitlement | Alta | 🟦+🟠 |
| Multiempresa / white-label UX | Alta | 🟦 |
| Mobile Omnia / offline / push | Alta | 🟦+🟠 |
| CRM educacional / parceiros LMS | Média–Alta | 🟦 (Platform) |
| Live Jitsi (vs BBB) | Média | 🟦+🟠 |
| Trilhas comerciais | Média | 🟦 |
| Gamificação de marca | Média | 🟦 |
| BI executivo | Média | 🟦+🟣 |
| WhatsApp / push | Média | 🟠 |

**Não-gaps (Moodle já resolve como SoR):** categorias, cursos, seções, atividades core, matrículas, papéis, grupos/coortes, completion, gradebook, quiz/question bank, fórum, SCORM/H5P, calendário acadêmico, logs, competencies (com config).

---

## 2. Gaps detalhados

### G1 — Experiência de produto
- **Gap:** Blueprint exige Omnia LMS em `lms.*`; Moodle UI é inaceitável como produto.  
- **Impacto:** 100% das jornadas de usuário.  
- **Solução:** BFF + apps web/mobile Omnia.  
- **Não fazer:** tema Moodle “bonito”.

### G2 — Integração programática
- **Gap:** WS existem, mas serviço/token/allowlist/observabilidade **não** estão prontos para Omnia.  
- **Solução:** Sprint Connector; habilitar REST com hardening.  
- **Não fazer:** acesso DB direto ao MariaDB Moodle pela Platform.

### G3 — Mídia
- **Gap:** Sem player Omnia-grade; servir vídeo pelo Moodle não escala.  
- **Solução:** VOD Ext + player Omnia + completion Moodle.  
- **Não fazer:** plugin player Moodle como solução final.

### G4 — Certificados
- **Gap:** Sem `customcert` instalado; badges ≠ certificado formal Omnia.  
- **Solução:** RFC plugin **ou** emissão Omnia a partir de `course_completed`; validação pública Omnia obrigatória.

### G5 — IA
- **Gap:** Zero cobertura nativa alinhada ao Neurofrigo.  
- **Solução:** APIs Neurofrigo; contexto via Connector; humano no loop em notas.

### G6 — Monetização e parceiros
- **Gap:** Moodle não é marketplace/CRM/comissões.  
- **Solução:** Platform já parcial (partners/CRM) + LMS entitlement.

### G7 — Multiempresa
- **Gap:** Categories/cohorts ≠ white-label.  
- **Solução:** Tenancy Omnia; Moodle como backend com isolamento lógico (categorias/cohorts/roles).

### G8 — Mobile
- **Gap:** Moodle App ≠ produto Omnia.  
- **Solução:** Apps próprios; WS/mobile endpoints só como apoio técnico se útil.

### G9 — Live
- **Gap:** BBB no core não é a escolha Blueprint (Jitsi).  
- **Solução:** Jitsi Ext; desabilitar BBB na UX.

### G10 — Authoring
- **Gap:** WS de criação de atividades é incompleto/complexo vs UI Moodle.  
- **Solução:** Authoring Omnia faseado; começar por page/resource/url/quiz import; evoluir.

---

## 3. O que aproveitar sem desenvolvimento de produto (só config)

1. Estrutura acadêmica core.  
2. Enrol manual + cohort.  
3. Completion policies.  
4. Quiz + question bank.  
5. Gradebook.  
6. Forum.  
7. SCORM/H5P.  
8. Competency frameworks (desenho pedagógico).  
9. SMTP outbound (já previsto).  
10. REST WS (habilitar/hardening).

---

## 4. Riscos se ignorarmos os gaps

| Risco | Consequência |
| --- | --- |
| Usar UI Moodle como produto | Quebra Blueprint e marca |
| Instalar dezenas de plugins | Dívida e superfície de ataque |
| Duplicar notas fora do Moodle | Inconsistência acadêmica |
| Vídeo no Moodledata | Custo/IO/VPS |
| IA dentro do Moodle | Conflito com Neurofrigo |

---

## 5. Conclusão

O gap **não** invalida o Moodle 4.5 como Academic System of Record.  
O gap **confirma** a arquitetura aprovada: Omnia + Neurofrigo + Externos em torno de um engine Moodle limpo.
