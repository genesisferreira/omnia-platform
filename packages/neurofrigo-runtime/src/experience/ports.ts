import type { CitationResult } from '@omnia/retrieval';

import type {
  BuiltContext,
  ConversationTurn,
  GuardrailLimits,
  PromptBundle,
  QuestionIntent,
  RuntimeRequest,
} from '../domain/types';
import type { ContextBuilderPort, PromptBuilderPort } from '../ports';

export type { ContextBuilderPort, PromptBuilderPort };

/** Re-export ports with V2 signatures via ports/index update. */
export type IntentClassifierPort = {
  classify(question: string): QuestionIntent;
};

export type ResponseFormatterPort = {
  format(input: { text: string; intent: QuestionIntent | null; status: string }): string;
};

export type GroundingScorerPort = {
  score(input: {
    chunks: CitationResult[];
    confidence: number;
    contextChars: number;
  }): import('../domain/types').GroundingScore;
};
