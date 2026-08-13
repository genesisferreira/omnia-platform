import type { ConversationTurn } from '../domain/types';
import { decideAction } from './action-router';
import { applyStatePatch, hydrateConversationState } from './conversation-state';
import { classifyDialogueAct, normalizeUserUtterance } from './dialogue-acts';
import type {
  ClarificationDecision,
  ConversationState,
  DialogueIntent,
  PendingOfferOption,
  ResolvedDialogueTurn,
} from './dialogue-types';
import { extractAndApplyUserFacts } from './user-facts';

const AFFIRM =
  /^\s*(sim|isso|isso mesmo|pode|quero|ok|claro|beleza|vamos|pode ser|quero sim|afirmativo|sim quero|quero sim|uhum)\b[\s!.?,]*$/i;
const AFFIRM_SOFT =
  /^\s*(sim|isso|pode|quero|ok|claro|beleza|vamos)([\s,]+(quero|pode|isso|por favor|com ela|com eles|sim)?)*[\s!.?]*$/i;
const NEGATIVE = /^\s*(n[aã]o|negativo|agora n[aã]o)\b/i;

function isBareAffirmation(q: string): boolean {
  const t = q.trim();
  if (t.length > 64) return false;
  return AFFIRM.test(t) || AFFIRM_SOFT.test(t);
}

function mapOptionToIntent(option: PendingOfferOption): DialogueIntent {
  switch (option) {
    case 'courses':
      return 'course_catalog';
    case 'services':
      return 'services';
    case 'company_recommendation':
      return 'company_routing';
    case 'course_recommendation':
    case 'course_details':
      return 'course_recommendation';
    case 'explain_simpler':
      return 'teaching_rephrase';
    case 'give_example':
      return 'teaching_example';
    case 'check_understanding':
      return 'teaching_check';
    case 'continue_diagnosis':
      return 'engineering_troubleshooting';
    case 'project_help':
      return 'commercial_discovery';
    case 'contact_handoff':
    case 'confirm_handoff':
      return 'contact_handoff';
    default:
      return 'unknown';
  }
}

function detectPrimaryIntent(question: string, state: ConversationState): DialogueIntent {
  const q = question.trim();

  if (
    /contato|falar com|encaminh|quero (um )?contato|qro contato|falar com (ela|eles|algu[eé]m)/i.test(
      q,
    )
  ) {
    return 'contact_handoff';
  }
  if (
    /como\s+(voc[eê]|vc)\s+pode\s+me\s+ajudar|quem\s+[eé]\s+voc|o\s+que\s+(voc[eê]|vc)\s+faz/i.test(
      q,
    )
  ) {
    return 'capabilities';
  }
  if (
    /quais?\s+(os\s+)?cursos|que\s+cursos|cursos\s+voc|cat[aá]logo|treinamentos?\s+voc|^cursos?$/i.test(
      q,
    )
  ) {
    return 'course_catalog';
  }
  if (
    /indique|recomend|mais adequado|melhor para mim|curso ideal|qual (deles|curso).*(iniciante|mim|melhor)/i.test(
      q,
    )
  ) {
    return 'course_recommendation';
  }
  if (
    /quais?\s+(os\s+)?servi[cç]os|servi[cç]os\s+(que\s+)?(ela|voc[eê]s|a omnia)|e\s+(os\s+)?servi[cç]os|o\s+que\s+(ela\s+)?oferece/i.test(
      q,
    )
  ) {
    return 'services';
  }
  if (
    /empresa respons|qual\s+empresa|quem\s+(faz|cuida|oferece)|e\s+dos\s+cursos|e\s+da\s+forma[cç]/i.test(
      q,
    )
  ) {
    return 'company_routing';
  }
  if (/o\s+que\s+[eé]\s+(a\s+)?omnia|omnia\s+frigo|holding|ecossistema/i.test(q)) {
    return 'institutional_overview';
  }
  if (/n[aã]o entendi|explica\s+(de\s+)?outro|mais simples|reexplique/i.test(q)) {
    return 'teaching_rephrase';
  }
  if (/me d[eê]\s+um exemplo|exemplo pr[aá]tico|pode (dar|mostrar) um exemplo/i.test(q)) {
    return 'teaching_example';
  }
  if (/fa[cç]a uma pergunta|testar|ver se (eu )?entendi|me testa/i.test(q)) {
    return 'teaching_check';
  }
  if (
    /e depois|pr[oó]ximo passo/i.test(q) &&
    state.currentIntent === 'engineering_troubleshooting'
  ) {
    return 'engineering_troubleshooting';
  }
  if (
    /supermercado|consumo de energia|loja|reduzir energia|oportunidade|c[aâ]mara fria|gasto aument/i.test(
      q,
    )
  ) {
    return 'commercial_discovery';
  }
  if (
    /c[aâ]mara|n[aã]o chega|temperatura|suc[cç][aã]o|descarga|\bpsi\b|diagn|R404|fica em\s*-?\d+/i.test(
      q,
    )
  ) {
    return 'engineering_troubleshooting';
  }
  if (
    /j[aá]\s+trabalho|come[cç]ando|anos?\s+com\s+refrigera|sou iniciante|especializa|comercial|industrial|migrar/i.test(
      q,
    )
  ) {
    if (
      state.currentIntent === 'course_recommendation' ||
      state.pendingAction === 'COURSE_RECOMMENDATION' ||
      state.pendingOffer?.options.includes('course_recommendation') ||
      state.currentIntent === 'course_catalog' ||
      state.pendingQuestion
    ) {
      return 'course_recommendation';
    }
  }
  if (state.currentIntent === 'teaching' || state.tutorConcept) {
    if (/explic|conceito|aula|entendi/i.test(q)) return 'teaching';
  }
  return 'unknown';
}

/**
 * Resolve short / dependent follow-ups into an actionable dialogue intent (R6).
 */
export function resolveDialogueTurn(input: {
  question: string;
  history?: ConversationTurn[] | null;
  persistedState?: ConversationState | null;
  assistantKey?: string | null;
}): ResolvedDialogueTurn {
  const originalQuestion = input.question.trim();
  const normalized = normalizeUserUtterance(originalQuestion);
  let state = hydrateConversationState({
    persisted: input.persistedState,
    history: input.history,
  });
  state = extractAndApplyUserFacts(state, normalized);
  const dialogueAct = classifyDialogueAct({ question: normalized, state });

  // Orphan affirmation
  if (
    isBareAffirmation(normalized) &&
    !state.pendingOffer &&
    !state.pendingAction &&
    !state.pendingConfirmation &&
    !state.currentIntent
  ) {
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'affirmation_orphan',
      dialogueAct,
      decision: 'NEEDS_CLARIFICATION',
      state,
      skipRetrieval: true,
      clarificationText:
        'Claro — sobre o que você gostaria de continuar? Posso falar de cursos, serviços ou indicar a empresa mais adequada.',
    };
  }

  // YES against pendingAction CONTACT
  if (
    isBareAffirmation(normalized) &&
    (state.pendingAction === 'CONTACT_HANDOFF' ||
      state.pendingOffer?.options.includes('confirm_handoff') ||
      state.pendingOffer?.options.includes('contact_handoff') ||
      state.pendingConfirmation === 'contact')
  ) {
    state = applyStatePatch(state, {
      currentIntent: 'contact_handoff',
      handoffPrepared: true,
      pendingConfirmation: 'handoff_done',
      pendingAction: null,
      pendingOffer: null,
      lastDialogueAct: dialogueAct,
      lastAssistantAction: 'PREPARE_HANDOFF',
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'contact_handoff',
      dialogueAct,
      actionType: 'PREPARE_HANDOFF',
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  // Affirmation against pending offer
  if (isBareAffirmation(normalized) && state.pendingOffer) {
    const offer = state.pendingOffer;
    if (offer.options.includes('confirm_handoff') || offer.options.includes('contact_handoff')) {
      state = applyStatePatch(state, {
        currentIntent: 'contact_handoff',
        handoffPrepared: true,
        pendingConfirmation: 'handoff_done',
        pendingOffer: null,
        pendingAction: null,
      });
      return {
        originalQuestion,
        effectiveQuestion: originalQuestion,
        dialogueIntent: 'contact_handoff',
        dialogueAct,
        actionType: 'PREPARE_HANDOFF',
        decision: 'CAN_ANSWER',
        state,
        skipRetrieval: true,
      };
    }
    if (offer.type === 'choice' && offer.options.length > 1) {
      // If user said only "sim" to multi-choice, ask once — unless soft-affirmed a single path in text
      state = applyStatePatch(state, {
        previousIntent: state.currentIntent,
        currentIntent: 'clarification',
        pendingQuestion: 'choice_after_yes',
      });
      return {
        originalQuestion,
        effectiveQuestion: originalQuestion,
        dialogueIntent: 'clarification',
        dialogueAct,
        decision: 'NEEDS_CLARIFICATION',
        state,
        skipRetrieval: true,
        clarificationText:
          'Claro. O que você prefere agora: cursos, serviços técnicos ou falar com a empresa responsável?',
      };
    }
    if (offer.options.length === 1) {
      const intent = mapOptionToIntent(offer.options[0]!);
      state = applyStatePatch(state, {
        previousIntent: state.currentIntent,
        currentIntent: intent,
        pendingOffer: null,
        pendingAction:
          intent === 'course_recommendation'
            ? 'COURSE_RECOMMENDATION'
            : intent === 'contact_handoff'
              ? 'CONTACT_HANDOFF'
              : null,
        pendingQuestion: intent === 'course_recommendation' ? 'level' : null,
      });
      return {
        originalQuestion,
        effectiveQuestion:
          intent === 'course_catalog'
            ? 'Quais cursos vocês oferecem?'
            : intent === 'services'
              ? 'Quais serviços vocês oferecem?'
              : originalQuestion,
        dialogueIntent: intent,
        dialogueAct,
        decision: intent === 'course_recommendation' ? 'NEEDS_CLARIFICATION' : 'CAN_ANSWER',
        state,
        skipRetrieval: true,
        clarificationText:
          intent === 'course_recommendation' &&
          state.experienceYears == null &&
          !state.experienceLevel
            ? 'Posso indicar. Você já trabalha com refrigeração ou está começando?'
            : null,
      };
    }
  }

  if (NEGATIVE.test(normalized) && state.pendingAction) {
    state = applyStatePatch(state, {
      pendingAction: null,
      pendingOffer: null,
      pendingConfirmation: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'clarification',
      dialogueAct,
      decision: 'NEEDS_CLARIFICATION',
      state,
      skipRetrieval: true,
      clarificationText: 'Tudo bem. Como prefere continuar?',
    };
  }

  // Continuity: "e dos cursos?" / references before pending-offer option match
  if (/^e\s+(dos\s+)?cursos\b|^e\s+da\s+forma[cç]/i.test(normalized)) {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'company_routing',
      activeEntity: 'education',
      currentEntity: 'education',
      selectedCompany: 'Fred do Frio / CTE',
      responsibleCompany: 'Fred do Frio / CTE',
      contactTarget: 'education',
      pendingOffer: null,
      resolvedReferences: { ela: 'Fred do Frio / CTE', eles: 'Fred do Frio / CTE' },
    });
    return {
      originalQuestion,
      effectiveQuestion: 'Qual empresa oferece cursos e formação?',
      dialogueIntent: 'company_routing',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  // Reference: empresa responsável / ela / eles
  if (
    /empresa respons|como falo com ela|falar com ela|quero falar com ela|falar com eles|quero falar com eles|\bela\b.*contato|contato.*\bela\b/i.test(
      normalized,
    ) ||
    ((/^(como falo com ela|quero falar com ela|ela)$/i.test(normalized) ||
      /quero falar com ela/i.test(normalized)) &&
      (state.responsibleCompany || state.contactTarget || state.selectedCompany))
  ) {
    const target =
      state.responsibleCompany ||
      state.contactTarget ||
      state.selectedCompany ||
      (/curso|forma[cç]|educa|catalog|recommendation/i.test(
        `${state.currentIntent} ${state.activeEntity} ${state.selectedCourse}`,
      )
        ? 'education'
        : state.currentIntent === 'services' ||
            state.currentIntent === 'engineering_troubleshooting'
          ? 'technical'
          : 'education');
    const label =
      target === 'education' || /fred|cte/i.test(String(target))
        ? 'Fred do Frio / CTE'
        : target === 'technical' || /renova/i.test(String(target))
          ? 'Renovação Refrigeração'
          : String(target);
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: /falar|contato/i.test(normalized) ? 'contact_handoff' : 'company_routing',
      responsibleCompany: label,
      contactTarget: /fred|cte|educa/i.test(label) ? 'education' : 'technical',
      selectedCompany: label,
      activeEntity: 'company',
      resolvedReferences: { ela: label, eles: label, 'empresa responsável': label },
      pendingAction: /falar|contato/i.test(normalized) ? 'CONTACT_HANDOFF' : state.pendingAction,
      pendingConfirmation: /falar|contato/i.test(normalized)
        ? 'contact'
        : state.pendingConfirmation,
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: state.currentIntent || 'company_routing',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (state.pendingOffer?.type === 'choice') {
    if (/^(quero\s+)?(ver\s+)?(os\s+)?cursos?\b|^cursos?$/i.test(normalized)) {
      state = applyStatePatch(state, {
        currentIntent: 'course_catalog',
        pendingOffer: null,
        activeEntity: 'course',
        currentEntity: 'course',
      });
      return {
        originalQuestion,
        effectiveQuestion: 'Quais cursos vocês oferecem?',
        dialogueIntent: 'course_catalog',
        dialogueAct,
        decision: 'NEEDS_CATALOG',
        state,
        skipRetrieval: true,
      };
    }
    if (/servi[cç]|contato|empresa/i.test(normalized)) {
      const intent = /contato/i.test(normalized)
        ? 'contact_handoff'
        : /servi[cç]/i.test(normalized)
          ? 'services'
          : 'company_routing';
      state = applyStatePatch(state, {
        currentIntent: intent,
        pendingOffer: null,
        pendingAction: intent === 'contact_handoff' ? 'CONTACT_HANDOFF' : null,
      });
      return {
        originalQuestion,
        effectiveQuestion: originalQuestion,
        dialogueIntent: intent,
        dialogueAct,
        decision: 'CAN_ANSWER',
        state,
        skipRetrieval: true,
      };
    }
  }

  // Engineering "e depois"
  if (/^e depois\??$/i.test(normalized) && state.currentIntent === 'engineering_troubleshooting') {
    state = applyStatePatch(state, {
      engineeringContext: { ...(state.engineeringContext || {}), nextStep: 'after_first' },
      pendingQuestion: 'eng_next',
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'engineering_troubleshooting',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  let dialogueIntent = detectPrimaryIntent(normalized, state);

  // Contact as action — never retrieval
  if (
    dialogueIntent === 'contact_handoff' ||
    dialogueAct === 'CONTACT_REQUEST' ||
    dialogueAct === 'HANDOFF_REQUEST'
  ) {
    if (!state.contactTarget && !state.responsibleCompany) {
      if (
        state.currentIntent === 'course_catalog' ||
        state.currentIntent === 'course_recommendation' ||
        state.selectedCourse ||
        state.userGoal
      ) {
        state = applyStatePatch(state, {
          contactTarget: 'education',
          responsibleCompany: 'Fred do Frio / CTE',
        });
      } else if (
        state.currentIntent === 'commercial_discovery' ||
        state.commercialContext?.storeCount
      ) {
        state = applyStatePatch(state, { contactTarget: 'commercial' });
      } else if (state.engineeringContext?.symptom || state.currentIntent === 'services') {
        state = applyStatePatch(state, {
          contactTarget: 'technical',
          responsibleCompany: 'Renovação Refrigeração',
        });
      }
    }
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'contact_handoff',
      pendingAction: 'CONTACT_HANDOFF',
      pendingConfirmation: 'contact',
      pendingOffer: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'contact_handoff',
      dialogueAct,
      actionType: 'CONTACT',
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  // Course recommendation continuity + qualification facts
  if (
    dialogueIntent === 'course_recommendation' ||
    dialogueAct === 'RECOMMENDATION_REQUEST' ||
    dialogueAct === 'QUALIFICATION_INFORMATION' ||
    (state.pendingAction === 'COURSE_RECOMMENDATION' &&
      /anos|trabalho|comercial|industrial|migrar|iniciante|come[cç]/i.test(normalized))
  ) {
    dialogueIntent = 'course_recommendation';
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'course_recommendation',
      activeEntity: 'course',
      currentEntity: 'course',
      pendingAction: 'COURSE_RECOMMENDATION',
      pendingOffer: null,
      pendingQuestion: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'course_recommendation',
      dialogueAct,
      actionType: 'ASK_QUALIFICATION',
      decision: 'NEEDS_CATALOG',
      state,
      skipRetrieval: true,
    };
  }

  if (dialogueIntent === 'commercial_discovery' || state.currentIntent === 'commercial_discovery') {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'commercial_discovery',
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'commercial_discovery',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (
    dialogueIntent === 'engineering_troubleshooting' ||
    state.currentIntent === 'engineering_troubleshooting'
  ) {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'engineering_troubleshooting',
      engineeringContext: {
        ...(state.engineeringContext || {}),
        symptom:
          state.engineeringContext?.symptom ||
          (/c[aâ]mara|temperatura/i.test(normalized) ? normalized : null),
      },
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'engineering_troubleshooting',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (
    dialogueIntent === 'teaching_rephrase' ||
    dialogueIntent === 'teaching_example' ||
    dialogueIntent === 'teaching_check'
  ) {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: dialogueIntent,
      tutorConcept: state.tutorConcept || state.activeEntity || 'conceito',
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent,
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (dialogueIntent === 'services') {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'services',
      activeEntity: 'service',
      currentEntity: 'service',
      pendingOffer: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: 'Quais serviços o ecossistema Omnia oferece?',
      dialogueIntent: 'services',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (dialogueIntent === 'course_catalog') {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'course_catalog',
      activeEntity: 'course',
      currentEntity: 'course',
      currentCourse: state.currentCourse || state.selectedCourse,
      pendingOffer: null,
      pendingAction: 'COURSE_CATALOG',
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'course_catalog',
      dialogueAct,
      decision: 'NEEDS_CATALOG',
      state,
      skipRetrieval: true,
    };
  }

  if (dialogueIntent === 'company_routing') {
    const aboutCourses =
      /curso|forma[cç]|educa|fred|cte|disso/i.test(normalized) ||
      state.currentIntent === 'course_recommendation' ||
      state.currentIntent === 'course_catalog' ||
      !!state.selectedCourse ||
      !!state.userGoal ||
      !!state.technicalArea;
    const company = aboutCourses ? 'Fred do Frio / CTE' : 'Renovação Refrigeração';
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'company_routing',
      activeEntity: aboutCourses ? 'education' : 'company',
      selectedCompany: company,
      responsibleCompany: company,
      contactTarget: aboutCourses ? 'education' : 'technical',
      currentCompany: company,
      resolvedReferences: { ela: company, 'empresa responsável': company },
      pendingOffer: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: aboutCourses
        ? 'Qual empresa oferece cursos e formação?'
        : originalQuestion,
      dialogueIntent: 'company_routing',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (dialogueIntent === 'institutional_overview') {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'institutional_overview',
      activeEntity: 'omnia',
      currentEntity: 'omnia',
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'institutional_overview',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (dialogueIntent === 'capabilities') {
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'capabilities',
      dialogueAct,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  if (state.currentIntent && dialogueIntent === 'unknown') {
    dialogueIntent = state.currentIntent;
  }

  const decision = decideAction({
    dialogueAct,
    dialogueIntent: state.currentIntent || dialogueIntent,
    state,
  });

  state = applyStatePatch(state, {
    previousIntent: state.currentIntent,
    currentIntent: dialogueIntent === 'unknown' ? state.currentIntent : dialogueIntent,
    lastDialogueAct: dialogueAct,
  });

  return {
    originalQuestion,
    effectiveQuestion: originalQuestion,
    dialogueIntent: state.currentIntent || 'unknown',
    dialogueAct,
    actionType: decision.action,
    decision: (decision.retrievalNeeded
      ? 'NEEDS_RETRIEVAL'
      : 'CAN_ANSWER') as ClarificationDecision,
    state,
    skipRetrieval: !decision.retrievalNeeded,
  };
}
