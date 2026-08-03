# Neurofrigo Portal Chat Journey

## Canal MVP

**Único canal de chat no MVP:** Portal Omnia (`/ai` e/ou widget).

| Fora do MVP | Notas |
|-------------|--------|
| WhatsApp | Roadmap futuro — **não** implementar agora |
| Telegram / app nativo | Roadmap futuro |
| n8n como inbox | Proibido — n8n ≠ canal inicial |

Neurofrigo Command é **outra superfície** (não esta jornada).

---

## Fluxo UX

1. Usuário abre chat Portal  
2. Omnia Auth / sessão (ou visitante)  
3. Mensagem → Runtime  
4. **Purpose Guard** — se fora do ecossistema Omnia → recusa padrão, fim  
5. Intent Classifier → Security Guard  
6. Se conteúdo acadêmico: matrícula + autorização  
7. Context Builder → Tool Router → Specialist  
8. Compliance → resposta + CTA Continuação Learning Engine (quando aplicável)  
9. Observabilidade

---

## Visitante

FAQ, catálogo, leads, navegação. Sem conteúdo restrito. Sem Command.

## Aluno

Tutor se matrícula + material autorizado. Continuação Learning Engine. Sem gabaritos.

## Professor

Suporte pedagógico / conteúdo (rascunho). Sem Command via Portal.

## Empresa / parceiro

Comercial e relacionamento no vínculo. Sem dados acadêmicos de terceiros.

## Recusa Purpose Guard (UX)

Texto padrão (Runtime Spec §4.4). Não oferecer “modo generalista”. Oferecer redirecionamento para temas Omnia.

## Recusa Security / Integrity

Mensagem segura sem vazar metadados; CTA humano se `ESCALATE_HUMAN`.

## CTA Continuação Learning Engine

Após resposta acadêmica autorizada: próximo módulo, revisão, prática, avaliação (quando liberada).

## Fora desta jornada

- Neurofrigo Command (`super_admin`)  
- WhatsApp (futuro)  
- Execução LMS via chat
