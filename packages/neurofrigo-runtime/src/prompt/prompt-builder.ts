import type { CitationResult } from '@omnia/retrieval';

import type { BuiltContext, GuardrailLimits, PromptBundle } from '../domain/types';
import type { PromptBuilderPort } from '../ports';
import { classifyIntent, intentSystemAddon } from '../intent/classify-intent';

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

const BASE_SYSTEM = `Você é um especialista do ecossistema Omnia Frigo.
Responda de forma natural, clara e profissional — como um atendente/consultor experiente.
Use APENAS os fatos das FONTES e do CONTEXTO. Não invente.
Não mencione RAG, chunks, vetores, pipelines, policy, routing ou IDs internos.
Não comece com "Pontos principais do material".
Não inclua marcadores de fixture nem [chunk:ID] na resposta ao usuário.
Organize a resposta: responda primeiro, depois detalhes, depois próximo passo útil.
Responda no idioma do contexto.`;

/**
 * PromptBuilder V2 — adapta o prompt pela intenção detectada.
 * baseSystem pode vir do Prompt Registry (Enterprise AI).
 */
export class PromptBuilder implements PromptBuilderPort {
  private readonly baseSystem: string;

  constructor(baseSystem: string = BASE_SYSTEM) {
    this.baseSystem = baseSystem;
  }

  build(input: {
    question: string;
    context: BuiltContext;
    chunks: CitationResult[];
    limits: GuardrailLimits;
    assistantKey?: string | null;
  }): PromptBundle {
    const intent = classifyIntent(input.question);
    const limited = input.chunks.slice(0, input.limits.maxContextChunks);
    const citationIds = limited.map((c) => c.chunkId);
    const history = input.context.conversationHistory.slice(
      -Math.max(0, input.limits.maxHistoryTurns),
    );

    const assistantLine = input.assistantKey ? `Assistente: ${input.assistantKey}` : 'Assistente: omnia';
    const system = `${this.baseSystem}\n\n${assistantLine}\nIntenção detectada: ${intent}.\n${intentSystemAddon(intent)}`;

    const contextBlock = [
      `Curso: ${input.context.courseTitle ?? input.context.courseId ?? 'n/d'}`,
      `Módulo: ${input.context.moduleTitle ?? input.context.moduleId ?? 'n/d'}`,
      `Aula: ${input.context.lessonTitle ?? input.context.lessonId ?? 'n/d'}`,
      `Objetivos da aula: ${input.context.lessonObjectives ?? 'n/d'}`,
      `Idioma: ${input.context.language}`,
      `Tenant: ${input.context.tenantId ?? 'n/d'}`,
      `Empresa: ${input.context.ownerCompanyId ?? 'n/d'}`,
      `Perfil: ${input.context.profileLabel ?? input.context.role ?? 'n/d'}`,
      `Permissões: ${input.context.permissions.join(', ')}`,
    ].join('\n');

    const historyBlock =
      history.length === 0
        ? '(sem turnos anteriores nesta sessão)'
        : history
            .map(
              (t, i) =>
                `Usuário: ${t.question}\nAssistente: ${t.answer.slice(0, 500)}${t.answer.length > 500 ? '…' : ''}`,
            )
            .join('\n\n');

    const sourcesBlock = limited
      .map((c, i) => {
        const preview = c.text.slice(0, 900);
        return `[${i + 1}] chunk:${c.chunkId} score=${c.score.toFixed(3)}\n${preview}`;
      })
      .join('\n\n');

    let user = `CONTEXTO\n${contextBlock}\n\nHISTÓRICO DA SESSÃO\n${historyBlock}\n\nFONTES\n${sourcesBlock || '(nenhuma)'}\n\nPERGUNTA\n${input.question.trim()}`;

    let estimated = estimateTokens(system) + estimateTokens(user);
    while (estimated > input.limits.maxPromptTokens && limited.length > 1) {
      limited.pop();
      citationIds.pop();
      const shrunk = limited
        .map((c, i) => {
          const preview = c.text.slice(0, 600);
          return `[${i + 1}] chunk:${c.chunkId} score=${c.score.toFixed(3)}\n${preview}`;
        })
        .join('\n\n');
      user = `CONTEXTO\n${contextBlock}\n\nHISTÓRICO DA SESSÃO\n${historyBlock}\n\nFONTES\n${shrunk}\n\nPERGUNTA\n${input.question.trim()}`;
      estimated = estimateTokens(system) + estimateTokens(user);
    }

    return {
      system,
      user,
      citationIds,
      estimatedPromptTokens: estimated,
      intent,
    };
  }
}
