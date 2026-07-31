# Omnia LMS — User Journeys

> Jornadas oficiais do Blueprint. UI sempre Omnia (`lms.*`); Moodle é backend.

---

## J1 — Aluno: primeiro acesso até primeira aula

1. Descobre curso no hub/marketplace Omnia.  
2. Cria/entra na conta Omnia (**cria sessão S1**; se já havia outra, é revogada conforme limite).  
3. Conclui pagamento ou recebe matrícula B2B.  
4. Omnia cria/sincroniza usuário e enrollment no Moodle.  
5. Dashboard mostra curso e CTA **Começar**.  
6. Abre aula no player Omnia (**media authorize** com URL assinada; sem download).  
7. Progresso gravado no Moodle; Neurofrigo (opcional) dá dica de estudo.

**Sucesso:** aluno completa ≥1 atividade com progresso visível; mídia sem URL permanente.

---

## J2 — Aluno: continuar estudando

1. Abre app/web → “Continuar de onde parei”.  
2. BFF resolve última posição (Moodle + player state Omnia).  
3. Retoma vídeo/material; marca conclusão.  
4. Notificação se houver prazo de avaliação.

---

## J3 — Aluno: avaliação e certificado

1. Entra em avaliação via Omnia.  
2. Respostas enviadas ao Moodle quiz.  
3. Feedback imediato (objetivas) ou pendente (discursivas).  
4. Neurofrigo pode explicar erros (não altera nota sozinho).  
5. Completion atingido → certificado disponível na galeria Omnia.  
6. Terceiro valida em página pública Omnia.

---

## J4 — Professor: publicar um módulo

1. Login área professor Omnia.  
2. Seleciona curso → novo módulo/aula.  
3. Upload PDF / vincula vídeo VOD.  
4. Define atividade Moodle (resource/assign/quiz) via Connector.  
5. Publica; alunos enxergam no catálogo do curso.  
6. IA sugere questões; professor aprova.

---

## J5 — Professor: corrigir e acompanhar turma

1. Fila de correções no dashboard.  
2. Abre entrega; vê rubrica.  
3. Neurofrigo sugere feedback/nota.  
4. Professor confirma → writeback Moodle gradebook.  
5. Relatório de engajamento da turma.

---

## J6 — Gestor: operação semanal

1. Dashboard KPIs (matrículas, conclusão, receita, churn risk).  
2. Filtra por tenant/parceiro/curso.  
3. Exporta relatório.  
4. Dispara campanha CRM para inativos.  
5. Audita emissão de certificados.

---

## J7 — Empresa cliente (B2B)

1. Contrato / tenant white-label.  
2. RH importa colaboradores (Omnia).  
3. Atribui trilha.  
4. Acompanha % conclusão.  
5. Baixa certificados consolidados.

---

## J8 — Parceiro Omnia

1. Parceiro aprovado na Rede.  
2. Acessa dashboard parceiro LMS.  
3. Indica alunos / vê cursos exclusivos.  
4. Acompanha comissões e ranking.

---

## J9 — Aula ao vivo

1. Evento no calendário Omnia.  
2. Aluno entra na sala (Jitsi).  
3. Presença registrada.  
4. Gravação disponível depois no player.  
5. Completion opcional no Moodle.

---

## J10 — Suporte e LGPD

1. Aluno solicita exportação/exclusão de dados.  
2. Omnia orquestra purge/anonimização.  
3. Propaga ao Moodle via APIs/admin jobs.  
4. Registra auditoria.

---

## J11 — Segundo dispositivo (sessão única)

1. Aluno estuda no Device A (sessão S1).  
2. Faz login no Device B.  
3. Sistema cria S2 e **revoga S1** (Omnia + Moodle + tokens de mídia).  
4. Device A no próximo heartbeat/API recebe: *“Sua conta foi acessada em outro dispositivo…”* e volta ao login.  
5. Abas extras no Device B **não** geram novas sessões (mesmo `sessionFamilyId`).

---

## J12 — Tentativa de download bloqueada

1. Aluno em material `view_only` tenta download (UI ou URL direta).  
2. BFF retorna 403 `MEDIA_DOWNLOAD_FORBIDDEN`.  
3. Evento `download_attempt` auditado.  
4. Conteúdo permanece apenas no viewer/player com token temporário.
