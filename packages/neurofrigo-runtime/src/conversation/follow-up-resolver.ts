import type { ConversationTurn } from '../domain/types';
import { applyStatePatch, hydrateConversationState } from './conversation-state';
import type {
  ClarificationDecision,
  ConversationState,
  DialogueIntent,
  PendingOfferOption,
  ResolvedDialogueTurn,
} from './dialogue-types';

const AFFIRM =
  /^\s*(sim|isso|pode|quero|ok|claro|pode ser|quero sim|afirmativo|uhum|ahm|pode indicar|quero que (indique|fa[cç]a)|pode fazer)\b[\s!.?]*$/i;
const AFFIRM_SOFT = /^\s*(sim|isso|pode|quero|ok|claro)([,!]|\s+por favor)?[\s!.?]*$/i;
const NEGATIVE = /^\s*(n[aã]o|negativo|agora n[aã]o)\b/i;

function isBareAffirmation(q: string): boolean {
  const t = q.trim();
  if (t.length > 48) return false;
  return AFFIRM.test(t) || AFFIRM_SOFT.test(t);
}

function detectPrimaryIntent(question: string, state: ConversationState): DialogueIntent {
  const q = question.trim();

  if (
    /como\s+(voc[eê]|vc)\s+pode\s+me\s+ajudar|quem\s+[eé]\s+voc|o\s+que\s+(voc[eê]|vc)\s+faz/i.test(
      q,
    )
  ) {
    return 'capabilities';
  }
  if (/quais?\s+cursos|que\s+cursos|cursos\s+voc|cat[aá]logo|treinamentos?\s+voc/i.test(q)) {
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
    /qual\s+empresa|quem\s+(faz|cuida|oferece|instala)|e\s+dos\s+cursos|e\s+da\s+forma[cç]|c[aâ]mara\s+frigor|montar\s+uma\s+c[aâ]mara/i.test(
      q,
    )
  ) {
    if (/e\s+dos\s+cursos|forma[cç][aã]o|educa/i.test(q)) return 'company_routing';
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
  if (/fa[cç]a uma pergunta|testar|ver se (eu )?entendi/i.test(q)) {
    return 'teaching_check';
  }
  if (/supermercado|consumo de energia|loja|reduzir energia|oportunidade/i.test(q)) {
    return 'commercial_discovery';
  }
  if (/\d+\s*lojas?/i.test(q) && state.currentIntent === 'commercial_discovery') {
    return 'commercial_discovery';
  }
  if (/c[aâ]mara|n[aã]o chega|temperatura|suc[cç][aã]o|descarga|\bpsi\b|diagn/i.test(q)) {
    return 'engineering_troubleshooting';
  }
  if (/\d+\s*psi/i.test(q) && state.currentIntent === 'engineering_troubleshooting') {
    return 'engineering_troubleshooting';
  }
  if (/j[aá]\s+trabalho|come[cç]ando|anos?\s+com\s+refrigera|sou iniciante|especializa/i.test(q)) {
    if (
      state.currentIntent === 'course_recommendation' ||
      state.pendingOffer?.options.includes('course_recommendation') ||
      state.currentIntent === 'course_catalog'
    ) {
      return 'course_recommendation';
    }
  }
  if (state.currentIntent === 'teaching' || state.tutorConcept) {
    if (/explic|conceito|aula/i.test(q)) return 'teaching';
  }
  return 'unknown';
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
    default:
      return 'unknown';
  }
}

function extractYears(q: string): number | null {
  const m = /(\d+)\s*anos?/i.exec(q);
  return m ? Number(m[1]) : null;
}

function extractStoreCount(q: string): number | null {
  const m = /(\d+)\s*lojas?/i.exec(q);
  return m ? Number(m[1]) : null;
}

function extractPsi(q: string): { suction?: number; discharge?: number } {
  const out: { suction?: number; discharge?: number } = {};
  const suc = /suc[cç][aã]o\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i.exec(q);
  const disc = /(?:descarga|condensa[cç][aã]o)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i.exec(q);
  if (suc) out.suction = Number(String(suc[1]).replace(',', '.'));
  if (disc) out.discharge = Number(String(disc[1]).replace(',', '.'));
  const bare = [...q.matchAll(/(\d+(?:[.,]\d+)?)\s*psi/gi)].map((x) =>
    Number(String(x[1]).replace(',', '.')),
  );
  if (out.suction == null && bare[0] != null) out.suction = bare[0];
  if (out.discharge == null && bare[1] != null) out.discharge = bare[1];
  return out;
}

/**
 * Resolve short / dependent follow-ups into an actionable dialogue intent.
 */
export function resolveDialogueTurn(input: {
  question: string;
  history?: ConversationTurn[] | null;
  persistedState?: ConversationState | null;
  assistantKey?: string | null;
}): ResolvedDialogueTurn {
  const originalQuestion = input.question.trim();
  let state = hydrateConversationState({
    persisted: input.persistedState,
    history: input.history,
  });

  // Orphan "sim" with no context
  if (isBareAffirmation(originalQuestion) && !state.pendingOffer && !state.currentIntent) {
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'affirmation_orphan',
      decision: 'NEEDS_CLARIFICATION',
      state,
      skipRetrieval: true,
      clarificationText:
        'Claro — sobre o que você gostaria de continuar? Posso falar de cursos, serviços do ecossistema ou indicar a empresa mais adequada.',
    };
  }

  // Affirmation against pending offer
  if (isBareAffirmation(originalQuestion) && state.pendingOffer) {
    const offer = state.pendingOffer;
    if (offer.type === 'choice' && offer.options.length > 1) {
      state = applyStatePatch(state, {
        previousIntent: state.currentIntent,
        currentIntent: 'clarification',
        pendingQuestion: 'choice_after_yes',
      });
      return {
        originalQuestion,
        effectiveQuestion: originalQuestion,
        dialogueIntent: 'clarification',
        decision: 'NEEDS_CLARIFICATION',
        state,
        skipRetrieval: true,
        clarificationText:
          'Claro. O que você gostaria de conhecer primeiro: os cursos, os serviços técnicos ou qual empresa do grupo atende cada necessidade?',
      };
    }
    if (offer.options.length === 1) {
      const intent = mapOptionToIntent(offer.options[0]!);
      state = applyStatePatch(state, {
        previousIntent: state.currentIntent,
        currentIntent: intent,
        pendingOffer: null,
        pendingQuestion: intent === 'course_recommendation' ? 'level' : null,
      });
      if (intent === 'course_recommendation' && !state.userLevel && !state.userExperienceYears) {
        return {
          originalQuestion,
          effectiveQuestion: 'Indique o curso mais adequado para mim',
          dialogueIntent: 'course_recommendation',
          decision: 'NEEDS_CLARIFICATION',
          state,
          skipRetrieval: true,
          clarificationText:
            'Posso indicar. Para acertar na recomendação, me diga: você está começando na refrigeração, já trabalha na área ou procura uma especialização específica?',
        };
      }
      return {
        originalQuestion,
        effectiveQuestion:
          intent === 'course_catalog'
            ? 'Quais cursos vocês oferecem?'
            : intent === 'services'
              ? 'Quais serviços vocês oferecem?'
              : intent === 'company_routing'
                ? 'Qual empresa procurar para engenharia?'
                : originalQuestion,
        dialogueIntent: intent,
        decision: intent === 'course_catalog' ? 'NEEDS_CATALOG' : 'CAN_ANSWER',
        state,
        skipRetrieval: intent !== 'unknown',
      };
    }
  }

  // Continuity: "e dos cursos?" after company/services — before pending-offer option match
  if (/^e\s+(dos\s+)?cursos\b|^e\s+da\s+forma[cç]/i.test(originalQuestion)) {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'company_routing',
      activeEntity: 'education',
      selectedCompany: 'Fred do Frio / CTE',
      pendingOffer: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: 'Qual empresa oferece cursos e formação?',
      dialogueIntent: 'company_routing',
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  // Explicit option after choice offer
  if (state.pendingOffer?.type === 'choice') {
    if (/^(quero\s+)?(ver\s+)?(os\s+)?cursos?\b/i.test(originalQuestion)) {
      state = applyStatePatch(state, {
        previousIntent: state.currentIntent,
        currentIntent: 'course_catalog',
        pendingOffer: null,
        activeEntity: 'course',
      });
      return {
        originalQuestion,
        effectiveQuestion: 'Quais cursos vocês oferecem?',
        dialogueIntent: 'course_catalog',
        decision: 'NEEDS_CATALOG',
        state,
        skipRetrieval: true,
      };
    }
    if (/servi[cç]/i.test(originalQuestion)) {
      state = applyStatePatch(state, {
        previousIntent: state.currentIntent,
        currentIntent: 'services',
        pendingOffer: null,
        activeEntity: 'service',
      });
      return {
        originalQuestion,
        effectiveQuestion: 'Quais serviços vocês oferecem?',
        dialogueIntent: 'services',
        decision: 'CAN_ANSWER',
        state,
        skipRetrieval: false,
      };
    }
    if (/empresa/i.test(originalQuestion)) {
      state = applyStatePatch(state, {
        previousIntent: state.currentIntent,
        currentIntent: 'company_routing',
        pendingOffer: null,
        activeEntity: 'company',
      });
      return {
        originalQuestion,
        effectiveQuestion: 'Qual empresa procurar conforme a necessidade?',
        dialogueIntent: 'company_routing',
        decision: 'CAN_ANSWER',
        state,
        skipRetrieval: true,
      };
    }
  }

  let dialogueIntent = detectPrimaryIntent(originalQuestion, state);

  // Continuity: recommendation after catalog
  if (
    dialogueIntent === 'course_recommendation' ||
    (/indique|mais adequado|melhor para|recomend/i.test(originalQuestion) &&
      (state.currentIntent === 'course_catalog' ||
        state.activeEntity === 'course' ||
        /curso/i.test(state.lastAssistantText || '')))
  ) {
    dialogueIntent = 'course_recommendation';
    const years = extractYears(originalQuestion);
    if (years != null) {
      state = applyStatePatch(state, {
        userExperienceYears: years,
        userLevel: years >= 3 ? 'intermediate' : 'beginner',
        userInterest: /comercial/i.test(originalQuestion)
          ? 'commercial_refrigeration'
          : state.userInterest,
      });
    }
    if (/iniciante|come[cç]ando/i.test(originalQuestion)) {
      state = applyStatePatch(state, { userLevel: 'beginner' });
    }
    if (/j[aá]\s+trabalho|anos?\s+com/i.test(originalQuestion) && years == null) {
      state = applyStatePatch(state, { userLevel: 'intermediate' });
    }

    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'course_recommendation',
      activeEntity: 'course',
      pendingOffer: null,
    });

    if (
      !state.userLevel &&
      !state.userExperienceYears &&
      !/iniciante|trabalho|anos/i.test(originalQuestion)
    ) {
      return {
        originalQuestion,
        effectiveQuestion: originalQuestion,
        dialogueIntent: 'course_recommendation',
        decision: 'NEEDS_CLARIFICATION',
        state: applyStatePatch(state, { pendingQuestion: 'level' }),
        skipRetrieval: true,
        clarificationText:
          'Posso indicar. Para acertar na recomendação, me diga uma coisa: você está começando na refrigeração, já trabalha na área ou procura uma especialização específica?',
      };
    }

    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'course_recommendation',
      decision: 'NEEDS_CATALOG',
      state,
      skipRetrieval: true,
    };
  }

  // Profile answer while waiting for course level
  if (
    state.pendingQuestion === 'level' ||
    (state.currentIntent === 'course_recommendation' &&
      /trabalho|iniciante|come[cç]|especializa|anos/i.test(originalQuestion))
  ) {
    const years = extractYears(originalQuestion);
    state = applyStatePatch(state, {
      userExperienceYears: years ?? state.userExperienceYears,
      userLevel:
        years != null && years >= 3
          ? 'intermediate'
          : /iniciante|come[cç]/i.test(originalQuestion)
            ? 'beginner'
            : /especializa|avan[cç]/i.test(originalQuestion)
              ? 'advanced'
              : state.userLevel || 'intermediate',
      userInterest: /comercial/i.test(originalQuestion)
        ? 'commercial_refrigeration'
        : /industrial/i.test(originalQuestion)
          ? 'industrial_refrigeration'
          : state.userInterest,
      pendingQuestion: null,
      currentIntent: 'course_recommendation',
      previousIntent: state.currentIntent,
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'course_recommendation',
      decision: 'NEEDS_CATALOG',
      state,
      skipRetrieval: true,
    };
  }

  // Commercial continuity
  if (dialogueIntent === 'commercial_discovery' || state.currentIntent === 'commercial_discovery') {
    const stores = extractStoreCount(originalQuestion);
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'commercial_discovery',
      commercialContext: {
        storeCount: stores ?? state.commercialContext?.storeCount ?? null,
        sector: /supermercado/i.test(originalQuestion)
          ? 'supermarket'
          : (state.commercialContext?.sector ?? null),
        goal: /energia|consumo/i.test(originalQuestion)
          ? 'energy_reduction'
          : (state.commercialContext?.goal ?? null),
      },
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'commercial_discovery',
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  // Engineering continuity
  if (
    dialogueIntent === 'engineering_troubleshooting' ||
    state.currentIntent === 'engineering_troubleshooting'
  ) {
    const psi = extractPsi(originalQuestion);
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'engineering_troubleshooting',
      engineeringContext: {
        waitingFor: null,
        suctionPsi: psi.suction ?? state.engineeringContext?.suctionPsi ?? null,
        dischargePsi: psi.discharge ?? state.engineeringContext?.dischargePsi ?? null,
        symptom: /n[aã]o chega|temperatura|c[aâ]mara/i.test(originalQuestion)
          ? originalQuestion
          : (state.engineeringContext?.symptom ?? null),
      },
    });
    const hasData =
      state.engineeringContext?.suctionPsi != null ||
      state.engineeringContext?.dischargePsi != null;
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'engineering_troubleshooting',
      decision:
        hasData || /psi|suc[cç]|descarga/i.test(originalQuestion)
          ? 'CAN_ANSWER'
          : 'NEEDS_CLARIFICATION',
      state,
      skipRetrieval: true,
    };
  }

  // Teaching follow-ups
  if (
    dialogueIntent === 'teaching_rephrase' ||
    dialogueIntent === 'teaching_example' ||
    dialogueIntent === 'teaching_check'
  ) {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: dialogueIntent,
      tutorConcept: state.tutorConcept || state.activeEntity,
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent,
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  // Services follow-up ("ela" = Omnia)
  if (dialogueIntent === 'services') {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'services',
      activeEntity: 'service',
      pendingOffer: null,
      referencedEntity: state.activeEntity === 'omnia' ? 'omnia' : state.referencedEntity,
    });
    return {
      originalQuestion,
      effectiveQuestion: 'Quais serviços o ecossistema Omnia oferece?',
      dialogueIntent: 'services',
      decision: 'NEEDS_RETRIEVAL',
      state,
      skipRetrieval: false,
    };
  }

  if (dialogueIntent === 'course_catalog') {
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'course_catalog',
      activeEntity: 'course',
      pendingOffer: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'course_catalog',
      decision: 'NEEDS_CATALOG',
      state,
      skipRetrieval: true,
    };
  }

  if (dialogueIntent === 'company_routing') {
    const aboutCourses = /curso|forma[cç]|educa|fred|cte/i.test(originalQuestion);
    state = applyStatePatch(state, {
      previousIntent: state.currentIntent,
      currentIntent: 'company_routing',
      activeEntity: aboutCourses ? 'education' : 'company',
      selectedCompany: aboutCourses ? 'Fred do Frio / CTE' : 'Renovação Refrigeração',
      pendingOffer: null,
    });
    return {
      originalQuestion,
      effectiveQuestion: aboutCourses
        ? 'Qual empresa oferece cursos e formação?'
        : originalQuestion,
      dialogueIntent: 'company_routing',
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
    });
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'institutional_overview',
      decision: 'NEEDS_RETRIEVAL',
      state,
      skipRetrieval: false,
    };
  }

  if (dialogueIntent === 'capabilities') {
    return {
      originalQuestion,
      effectiveQuestion: originalQuestion,
      dialogueIntent: 'capabilities',
      decision: 'CAN_ANSWER',
      state,
      skipRetrieval: true,
    };
  }

  // Default: keep continuity topic for retrieval query enrichment
  if (state.currentIntent && dialogueIntent === 'unknown') {
    dialogueIntent = state.currentIntent;
  }

  state = applyStatePatch(state, {
    previousIntent: state.currentIntent,
    currentIntent: dialogueIntent === 'unknown' ? state.currentIntent : dialogueIntent,
  });

  return {
    originalQuestion,
    effectiveQuestion: originalQuestion,
    dialogueIntent: state.currentIntent || 'unknown',
    decision: 'NEEDS_RETRIEVAL' as ClarificationDecision,
    state,
    skipRetrieval: false,
  };
}
