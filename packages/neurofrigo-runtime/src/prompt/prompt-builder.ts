import type { CitationResult } from '@omnia/retrieval';

import type { BuiltContext, GuardrailLimits, PromptBundle } from '../domain/types';
import type { PromptBuilderPort } from '../ports';
import { classifyIntent, intentSystemAddon } from '../intent/classify-intent';

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

const BASE_SYSTEM = `Você é o Assistente Técnico Neurofrigo da plataforma Omnia.
Responda APENAS com base nos trechos fornecidos (FONTES) e no CONTEXTO da sessão.
Se a informação não estiver nas fontes, diga claramente que não encontrou no conteúdo autorizado do curso.
Não invente. Não use conhecimento externo.
Responda no idioma do contexto.
Use estrutura clara: título, listas ou passos, e observação técnica quando fizer sentido.
Ao citar, use [chunk:ID].`;

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
  }): PromptBundle {
    const intent = classifyIntent(input.question);
    const limited = input.chunks.slice(0, input.limits.maxContextChunks);
    const citationIds = limited.map((c) => c.chunkId);
    const history = input.context.conversationHistory.slice(
      -Math.max(0, input.limits.maxHistoryTurns),
    );

    const system = `${this.baseSystem}\n\nIntenção detectada: ${intent}.\n${intentSystemAddon(intent)}`;

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
                `Turno ${i + 1}\nP: ${t.question}\nR: ${t.answer.slice(0, 500)}${t.answer.length > 500 ? '…' : ''}`,
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
