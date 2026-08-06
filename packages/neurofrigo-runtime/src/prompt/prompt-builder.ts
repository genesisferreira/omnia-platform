import type { CitationResult } from '@omnia/retrieval';

import type { BuiltContext, GuardrailLimits, PromptBundle } from '../domain/types';
import type { PromptBuilderPort } from '../ports';

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

const SYSTEM_PROMPT = `Você é o assistente Neurofrigo da plataforma Omnia.
Responda APENAS com base nos trechos fornecidos (FONTES).
Se a informação não estiver nas fontes, diga claramente que não encontrou na base do curso.
Não invente. Não use conhecimento externo.
Responda no idioma do contexto.
Ao final, mencione as fontes usadas pelo identificador [chunk:ID] quando citar.`;

/**
 * PromptBuilder — o Runtime nunca monta prompts manualmente.
 */
export class PromptBuilder implements PromptBuilderPort {
  build(input: {
    question: string;
    context: BuiltContext;
    chunks: CitationResult[];
    limits: GuardrailLimits;
  }): PromptBundle {
    const limited = input.chunks.slice(0, input.limits.maxContextChunks);
    const citationIds = limited.map((c) => c.chunkId);

    const contextBlock = [
      `Curso: ${input.context.courseTitle ?? input.context.courseId ?? 'n/d'}`,
      `Módulo: ${input.context.moduleTitle ?? input.context.moduleId ?? 'n/d'}`,
      `Aula: ${input.context.lessonTitle ?? input.context.lessonId ?? 'n/d'}`,
      `Idioma: ${input.context.language}`,
      `Empresa: ${input.context.ownerCompanyId ?? 'n/d'}`,
      `Permissões: ${input.context.permissions.join(', ')}`,
    ].join('\n');

    const sourcesBlock = limited
      .map((c, i) => {
        const preview = c.text.slice(0, 900);
        return `[${i + 1}] chunk:${c.chunkId} score=${c.score.toFixed(3)}\n${preview}`;
      })
      .join('\n\n');

    let user = `CONTEXTO\n${contextBlock}\n\nFONTES\n${sourcesBlock || '(nenhuma)'}\n\nPERGUNTA\n${input.question.trim()}`;

    let estimated = estimateTokens(SYSTEM_PROMPT) + estimateTokens(user);
    while (estimated > input.limits.maxPromptTokens && limited.length > 1) {
      limited.pop();
      citationIds.pop();
      const shrunk = limited
        .map((c, i) => {
          const preview = c.text.slice(0, 600);
          return `[${i + 1}] chunk:${c.chunkId} score=${c.score.toFixed(3)}\n${preview}`;
        })
        .join('\n\n');
      user = `CONTEXTO\n${contextBlock}\n\nFONTES\n${shrunk}\n\nPERGUNTA\n${input.question.trim()}`;
      estimated = estimateTokens(SYSTEM_PROMPT) + estimateTokens(user);
    }

    return {
      system: SYSTEM_PROMPT,
      user,
      citationIds,
      estimatedPromptTokens: estimated,
    };
  }
}
