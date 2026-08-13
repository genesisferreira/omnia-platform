/**
 * EPIC 16 R5 — Dialogue / conversation state (session-scoped).
 */

export const DIALOGUE_INTENTS = [
  'institutional_overview',
  'services',
  'course_catalog',
  'course_recommendation',
  'company_routing',
  'capabilities',
  'teaching',
  'teaching_rephrase',
  'teaching_example',
  'teaching_check',
  'commercial_discovery',
  'engineering_troubleshooting',
  'clarification',
  'affirmation_orphan',
  'unknown',
] as const;

export type DialogueIntent = (typeof DIALOGUE_INTENTS)[number];

export const CLARIFICATION_DECISIONS = [
  'CAN_ANSWER',
  'NEEDS_CLARIFICATION',
  'NEEDS_RETRIEVAL',
  'NEEDS_CATALOG',
  'NEEDS_PROFILE',
  'FORBIDDEN',
  'OUT_OF_SCOPE',
] as const;

export type ClarificationDecision = (typeof CLARIFICATION_DECISIONS)[number];

export type PendingOfferOption =
  | 'courses'
  | 'services'
  | 'company_recommendation'
  | 'course_recommendation'
  | 'course_details'
  | 'project_help'
  | 'explain_simpler'
  | 'give_example'
  | 'check_understanding'
  | 'continue_diagnosis'
  | 'compare_options';

export type PendingOffer = {
  type: 'choice' | 'confirm' | 'question';
  options: PendingOfferOption[];
  prompt?: string | null;
};

export type ConversationState = {
  currentIntent: DialogueIntent | null;
  previousIntent: DialogueIntent | null;
  currentTopic: string | null;
  previousTopic: string | null;
  activeEntity: string | null;
  referencedEntity: string | null;
  pendingOffer: PendingOffer | null;
  pendingQuestion: string | null;
  userGoal: string | null;
  userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  userInterest: string | null;
  userExperienceYears: number | null;
  selectedCourse: string | null;
  selectedService: string | null;
  selectedCompany: string | null;
  knownFacts: string[];
  unresolvedReferences: string[];
  lastAssistantText: string | null;
  commercialContext: {
    storeCount?: number | null;
    sector?: string | null;
    goal?: string | null;
  } | null;
  engineeringContext: {
    waitingFor?: string[] | null;
    suctionPsi?: number | null;
    dischargePsi?: number | null;
    symptom?: string | null;
  } | null;
  tutorConcept: string | null;
};

export function emptyConversationState(): ConversationState {
  return {
    currentIntent: null,
    previousIntent: null,
    currentTopic: null,
    previousTopic: null,
    activeEntity: null,
    referencedEntity: null,
    pendingOffer: null,
    pendingQuestion: null,
    userGoal: null,
    userLevel: null,
    userInterest: null,
    userExperienceYears: null,
    selectedCourse: null,
    selectedService: null,
    selectedCompany: null,
    knownFacts: [],
    unresolvedReferences: [],
    lastAssistantText: null,
    commercialContext: null,
    engineeringContext: null,
    tutorConcept: null,
  };
}

export type ResolvedDialogueTurn = {
  originalQuestion: string;
  effectiveQuestion: string;
  dialogueIntent: DialogueIntent;
  decision: ClarificationDecision;
  state: ConversationState;
  skipRetrieval: boolean;
  clarificationText?: string | null;
  composedHint?: string | null;
};
