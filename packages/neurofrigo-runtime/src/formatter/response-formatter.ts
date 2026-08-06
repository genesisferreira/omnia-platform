import type { QuestionIntent } from '../domain/types';
import { INTENT_LABELS } from '../intent/classify-intent';

/**
 * Padroniza aparência das respostas (títulos, listas, notas).
 */
export function formatResponse(input: {
  text: string;
  intent: QuestionIntent | null;
  status: string;
}): string {
  const raw = input.text.trim();
  if (!raw) return raw;

  if (input.status === 'not_found') {
    return [
      '## Conteúdo não encontrado na base',
      '',
      raw,
      '',
      '> **Observação:** a IA responde apenas com o material autorizado do curso.',
    ].join('\n');
  }

  if (input.status === 'error' || input.status === 'timeout') {
    return ['## Não foi possível concluir', '', raw].join('\n');
  }

  // Já formatado com título?
  if (/^##\s/m.test(raw)) {
    return ensureSafetyNote(raw, input.intent);
  }

  const intentLabel = input.intent ? INTENT_LABELS[input.intent] : 'Resposta';
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let body: string;
  if (/^\d+\.\s/m.test(raw) || /^[-*]\s/m.test(raw)) {
    body = raw;
  } else if (input.intent === 'procedural' || input.intent === 'troubleshooting') {
    body = lines
      .map((l, i) => {
        if (/^\d+\./.test(l)) return l;
        return `${i + 1}. ${l.replace(/^[-*•]\s*/, '')}`;
      })
      .join('\n');
  } else if (lines.length >= 2) {
    body = lines.map((l) => (l.startsWith('-') || l.startsWith('*') ? l : `- ${l}`)).join('\n');
  } else {
    body = raw;
  }

  return ensureSafetyNote([`## ${intentLabel}`, '', body].join('\n'), input.intent);
}

function ensureSafetyNote(text: string, intent: QuestionIntent | null): string {
  if (intent !== 'troubleshooting' && intent !== 'procedural') return text;
  if (/nota de seguran/i.test(text) || /\*\*seguran/i.test(text)) return text;
  return `${text}\n\n> **Nota de segurança:** siga os procedimentos e EPIs descritos no material do curso.`;
}
