import type { QuestionIntent } from '../domain/types';

/**
 * Response formatter V2 — experiência conversacional.
 * Não envolve a resposta em títulos de "pipeline RAG" para o usuário final.
 */
export function formatResponse(input: {
  text: string;
  intent: QuestionIntent | null;
  status: string;
}): string {
  const raw = input.text.trim();
  if (!raw) return raw;

  if (input.status === 'not_found') {
    return raw;
  }

  if (input.status === 'error' || input.status === 'timeout') {
    return raw;
  }

  // Já formatado com título técnico legado? preservar conteúdo sem forçar novo wrapper.
  if (/^##\s/m.test(raw)) {
    return ensureSafetyNote(raw, input.intent);
  }

  return ensureSafetyNote(raw, input.intent);
}

function ensureSafetyNote(text: string, intent: QuestionIntent | null): string {
  if (intent !== 'troubleshooting' && intent !== 'procedural') return text;
  if (/nota de seguran/i.test(text) || /\*\*seguran/i.test(text)) return text;
  return `${text}\n\n> **Nota de segurança:** siga os procedimentos e EPIs descritos no material autorizado.`;
}
