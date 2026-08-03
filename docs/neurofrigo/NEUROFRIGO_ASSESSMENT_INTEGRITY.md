# Neurofrigo Assessment Integrity Guard

> Política obrigatória de integridade acadêmica.  
> Relaciona-se a D017 (Assessment Engine RO) e futuras Write APIs.

## Regra oficial

O Neurofrigo **não** fornece respostas diretas de:

- provas, avaliações, quizzes avaliativos;
- atividades valendo nota;
- exercícios avaliativos / questões em andamento;
- alternativas corretas, gabaritos;
- trabalhos que devam ser produzidos pelo aluno.

## Detecção

Sinais (texto, imagem, PDF, screenshot):

- “qual é a resposta / alternativa?”
- “resolva esta prova / faça o exercício por mim”
- questões coladas / OCR de prova
- reformulações indiretas visando gabarito
- pedido de “só a letra certa”

Contexto: assessment ativo via Learning/Assessment Engine ou metadata de atividade `gradable=true`.

## Permitido (quando avaliação detectada)

- Explicar conceito e pré-requisitos  
- Indicar aula / módulo / material (autorizado)  
- Perguntas socráticas  
- Exemplo **diferente** do item avaliativo  
- Exercício semelhante de **treino** (não avaliativo)  
- Orientar raciocínio **sem concluir** a resposta da questão

## Resposta padrão

> Não posso fornecer a resposta desta atividade avaliativa. Posso ajudá-lo a revisar os conceitos envolvidos e indicar os materiais adequados para que você chegue à solução.

## Integração no pipeline

Após Specialist (ou inline no Tutor): se Integrity Guard bloquear trechos → Compliance confirma → resposta segura.  
Evento: `ai.assessment_guard.triggered`.

## Professor / Avaliador

Agente `academic.assessor` pode discutir rubricas e itens **no escopo do professor**, sem entregar gabarito a alunos e sem alterar notas sem ação humana Nível D.
