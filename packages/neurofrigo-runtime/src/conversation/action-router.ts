import type {
  ActionType,
  ConversationState,
  DialogueAct,
  DialogueIntent,
  HandoffRequest,
  PendingAction,
} from './dialogue-types';

export type ResponsePlan = {
  userGoal: string | null;
  dialogueAct: DialogueAct;
  knownFacts: string[];
  missingFacts: string[];
  resolvedReferences: Record<string, string>;
  actionNeeded: ActionType;
  retrievalNeeded: boolean;
  answerGoal: string;
  nextBestAction: string | null;
  nextBestQuestion: string | null;
};

export function decideAction(input: {
  dialogueAct: DialogueAct;
  dialogueIntent: DialogueIntent;
  state: ConversationState;
}): { action: ActionType; retrievalNeeded: boolean; pendingAction?: PendingAction } {
  const { dialogueAct, dialogueIntent, state } = input;

  if (dialogueAct === 'CONFIRMATION' && state.pendingAction === 'CONTACT_HANDOFF') {
    return { action: 'PREPARE_HANDOFF', retrievalNeeded: false, pendingAction: 'CONTACT_HANDOFF' };
  }
  if (dialogueAct === 'CONTACT_REQUEST' || dialogueAct === 'HANDOFF_REQUEST') {
    return { action: 'CONTACT', retrievalNeeded: false, pendingAction: 'CONTACT_HANDOFF' };
  }
  if (dialogueAct === 'RECOMMENDATION_REQUEST' || dialogueIntent === 'course_recommendation') {
    const missing = missingQualification(state);
    if (missing.length) {
      return {
        action: 'ASK_QUALIFICATION',
        retrievalNeeded: false,
        pendingAction: 'COURSE_RECOMMENDATION',
      };
    }
    return { action: 'RECOMMEND', retrievalNeeded: false, pendingAction: null };
  }
  if (dialogueAct === 'CATALOG_REQUEST' || dialogueIntent === 'course_catalog') {
    return { action: 'SHOW_CATALOG', retrievalNeeded: false };
  }
  if (dialogueAct === 'SERVICE_REQUEST' || dialogueIntent === 'services') {
    return { action: 'ANSWER', retrievalNeeded: false };
  }
  if (
    dialogueIntent === 'teaching_rephrase' ||
    dialogueIntent === 'teaching_example' ||
    dialogueIntent === 'teaching_check'
  ) {
    return { action: 'CONTINUE_TUTORING', retrievalNeeded: false };
  }
  if (dialogueIntent === 'engineering_troubleshooting') {
    return { action: 'CONTINUE_DIAGNOSTIC', retrievalNeeded: false };
  }
  if (dialogueIntent === 'commercial_discovery') {
    return { action: 'COMMERCIAL_NEXT_STEP', retrievalNeeded: false };
  }
  if (dialogueIntent === 'institutional_overview') {
    return { action: 'ANSWER', retrievalNeeded: true };
  }
  if (dialogueAct === 'CLARIFICATION_REQUEST') {
    return { action: 'ASK_CLARIFICATION', retrievalNeeded: false };
  }
  return {
    action: 'ANSWER',
    retrievalNeeded: dialogueIntent === 'unknown',
  };
}

export function missingQualification(state: ConversationState): string[] {
  const missing: string[] = [];
  if (
    state.experienceYears == null &&
    state.userExperienceYears == null &&
    !state.experienceLevel
  ) {
    missing.push('experience');
  }
  if (!state.technicalArea && !state.userInterest) {
    missing.push('technicalArea');
  }
  if (!state.userGoal && !state.conversationGoal && !state.interestArea) {
    // goal optional until area known; if area known still ask goal for integrity
    if (state.technicalArea || state.userInterest) missing.push('goal');
  }
  return missing;
}

export function buildResponsePlan(input: {
  dialogueAct: DialogueAct;
  dialogueIntent: DialogueIntent;
  state: ConversationState;
  action: ActionType;
  retrievalNeeded: boolean;
}): ResponsePlan {
  const missing = missingQualification(input.state);
  return {
    userGoal: input.state.userGoal || input.state.conversationGoal,
    dialogueAct: input.dialogueAct,
    knownFacts: input.state.knownUserFacts || input.state.knownFacts || [],
    missingFacts: missing,
    resolvedReferences: input.state.resolvedReferences || {},
    actionNeeded: input.action,
    retrievalNeeded: input.retrievalNeeded,
    answerGoal: String(input.action),
    nextBestAction: input.state.pendingAction,
    nextBestQuestion: input.state.lastAssistantQuestion,
  };
}

export function buildHandoffRequest(input: {
  source: string;
  state: ConversationState;
  sessionId?: string | number | null;
  userId?: string | null;
  tenantId?: string | null;
}): HandoffRequest {
  const target =
    input.state.contactTarget ||
    input.state.responsibleCompany ||
    input.state.selectedCompany ||
    'Omnia — área responsável';
  const dept =
    /fred|cte|forma[cç]|educa/i.test(target) || input.state.contactTarget === 'education'
      ? 'education'
      : /renova|engenharia|t[eé]cnic/i.test(target) || input.state.contactTarget === 'technical'
        ? 'technical_services'
        : /neurofrigo|ia|tech/i.test(target)
          ? 'technology'
          : 'general';

  return {
    source: input.source,
    sessionId: input.sessionId ?? null,
    userId: input.userId ?? null,
    tenantId: input.tenantId ?? null,
    profile: null,
    targetCompany: target,
    targetDepartment: dept,
    intent: input.state.currentIntent,
    userGoal: input.state.userGoal || input.state.conversationGoal,
    qualification: {
      experienceYears: input.state.experienceYears ?? input.state.userExperienceYears,
      experienceLevel: input.state.experienceLevel,
      technicalArea: input.state.technicalArea,
      interestArea: input.state.interestArea,
      numberOfUnits:
        input.state.commercialContext?.numberOfUnits ?? input.state.commercialContext?.storeCount,
      hasColdRooms: input.state.commercialContext?.hasColdRooms,
      engineering: input.state.engineeringContext,
    },
    knownUserFacts: input.state.knownUserFacts || [],
    contactData: input.state.contactData,
    conversationSummary: summarizeState(input.state),
    urgency: null,
    recommendedNextAction: 'human_follow_up',
    consent: true,
  };
}

function summarizeState(state: ConversationState): string {
  const bits = [
    state.userGoal ? `goal=${state.userGoal}` : null,
    state.technicalArea ? `area=${state.technicalArea}` : null,
    (state.experienceYears ?? state.userExperienceYears) != null
      ? `years=${state.experienceYears ?? state.userExperienceYears}`
      : null,
    state.currentCourse || state.selectedCourse
      ? `course=${state.currentCourse || state.selectedCourse}`
      : null,
    state.contactTarget ? `target=${state.contactTarget}` : null,
  ].filter(Boolean);
  return bits.join('; ').slice(0, 400);
}
