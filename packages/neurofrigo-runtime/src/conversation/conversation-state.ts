import type { ConversationTurn } from '../domain/types';
import {
  emptyConversationState,
  type ConversationState,
  type DialogueIntent,
  type PendingOffer,
  type PendingOfferOption,
} from './dialogue-types';

function lastAssistant(history: ConversationTurn[] | null | undefined): string {
  if (!history?.length) return '';
  return String(history[history.length - 1]?.answer || '');
}

function lastUser(history: ConversationTurn[] | null | undefined): string {
  if (!history?.length) return '';
  return String(history[history.length - 1]?.question || '');
}

/**
 * Infer pending offer from the last assistant message (when state not persisted).
 */
export function inferPendingOfferFromAnswer(answer: string): PendingOffer | null {
  const text = String(answer || '');
  if (!text.trim()) return null;

  if (
    /cursos,\s*servi[cç]os|servi[cç]os\s+ou\s+indicar|detalhar cursos|conhecer primeiro/i.test(text)
  ) {
    return {
      type: 'choice',
      options: ['courses', 'services', 'company_recommendation'],
      prompt: 'cursos, serviços ou empresa',
    };
  }

  if (
    /indicar o (curso )?mais adequado|encontrar o curso ideal|recomend/i.test(text) &&
    /curso/i.test(text)
  ) {
    return {
      type: 'confirm',
      options: ['course_recommendation'],
      prompt: 'indicar o curso mais adequado',
    };
  }

  if (/posso detalhar|quer que eu (indique|detalhe|explique)/i.test(text) && /curso/i.test(text)) {
    return {
      type: 'confirm',
      options: ['course_recommendation'],
      prompt: 'detalhar curso',
    };
  }

  if (/press[aã]o|suc[cç][aã]o|descarga|temperatura|condi[cç][aã]o operacional/i.test(text)) {
    return {
      type: 'question',
      options: ['continue_diagnosis'],
      prompt: 'dados de diagnóstico',
    };
  }

  if (
    /come[cç]ando|j[aá] trabalha|especializa[cç][aã]o|n[ií]vel/i.test(text) &&
    /curso|recom/i.test(text)
  ) {
    return {
      type: 'question',
      options: ['course_recommendation'],
      prompt: 'nível do aluno',
    };
  }

  return null;
}

export function inferIntentFromAnswer(answer: string, question: string): DialogueIntent | null {
  const a = `${question} ${answer}`.toLowerCase();
  if (/curso|cat[aá]logo|fundamentos de refrigera/i.test(a)) return 'course_catalog';
  if (/servi[cç]o|renova[cç][aã]o refriger/i.test(a)) return 'services';
  if (
    /empresa|renova[cç][aã]o|fred do frio|cte|neurofrigo/i.test(a) &&
    /procurar|cuida|oferece/i.test(a)
  ) {
    return 'company_routing';
  }
  if (/omnia frigo holding|hub integrador/i.test(a)) return 'institutional_overview';
  if (/supermercado|consumo de energia|loja/i.test(a)) return 'commercial_discovery';
  if (/c[aâ]mara|suc[cç][aã]o|psi|diagn/i.test(a)) return 'engineering_troubleshooting';
  if (/explic|conceito|exemplo|compreens/i.test(a)) return 'teaching';
  return null;
}

/**
 * Hydrate dialogue state from persisted snapshot + recent turns.
 */
export function hydrateConversationState(input: {
  persisted?: ConversationState | null;
  history?: ConversationTurn[] | null;
}): ConversationState {
  const base = { ...emptyConversationState(), ...(input.persisted || {}) };
  const history = input.history || [];
  const answer = lastAssistant(history);
  const question = lastUser(history);

  if (!base.lastAssistantText && answer) base.lastAssistantText = answer;
  if (!base.pendingOffer && answer) {
    base.pendingOffer = inferPendingOfferFromAnswer(answer);
  }
  if (!base.currentIntent && (answer || question)) {
    base.currentIntent = inferIntentFromAnswer(answer, question);
  }
  if (!base.currentTopic && base.currentIntent) {
    base.currentTopic = base.currentIntent;
  }
  if (!base.activeEntity) {
    if (/curso/i.test(answer)) base.activeEntity = 'course';
    else if (/servi[cç]/i.test(answer)) base.activeEntity = 'service';
    else if (/empresa|renova[cç]/i.test(answer)) base.activeEntity = 'company';
    else if (/omnia/i.test(answer)) base.activeEntity = 'omnia';
  }
  if (/fundamentos de refrigera[cç][aã]o industrial/i.test(answer) && !base.selectedCourse) {
    base.selectedCourse = 'Fundamentos de Refrigeração Industrial';
  }
  return base;
}

export function applyStatePatch(
  state: ConversationState,
  patch: Partial<ConversationState>,
): ConversationState {
  return {
    ...state,
    ...patch,
    knownFacts: patch.knownFacts ?? state.knownFacts,
    unresolvedReferences: patch.unresolvedReferences ?? state.unresolvedReferences,
    commercialContext:
      patch.commercialContext === undefined
        ? state.commercialContext
        : { ...(state.commercialContext || {}), ...(patch.commercialContext || {}) },
    engineeringContext:
      patch.engineeringContext === undefined
        ? state.engineeringContext
        : { ...(state.engineeringContext || {}), ...(patch.engineeringContext || {}) },
  };
}

export function pendingOfferFromOptions(
  options: PendingOfferOption[],
  type: PendingOffer['type'] = 'choice',
): PendingOffer {
  return { type, options, prompt: null };
}
