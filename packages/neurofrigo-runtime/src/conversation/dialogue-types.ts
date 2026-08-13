/**
 * EPIC 16 R6 — Semantic conversation state + dialogue vocabulary.
 * Extends R5; fields are additive and session-scoped.
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
  'contact_handoff',
  'clarification',
  'affirmation_orphan',
  'unknown',
] as const;

export type DialogueIntent = (typeof DIALOGUE_INTENTS)[number];

export const DIALOGUE_ACTS = [
  'INFORMATION_REQUEST',
  'CAPABILITY_REQUEST',
  'CATALOG_REQUEST',
  'SERVICE_REQUEST',
  'RECOMMENDATION_REQUEST',
  'QUALIFICATION_INFORMATION',
  'CONTACT_REQUEST',
  'HANDOFF_REQUEST',
  'NAVIGATION_REQUEST',
  'CONFIRMATION',
  'DENIAL',
  'FOLLOW_UP',
  'REFERENCE',
  'CLARIFICATION_REQUEST',
  'TECHNICAL_DIAGNOSTIC',
  'EDUCATIONAL_EXPLANATION',
  'COMMERCIAL_DISCOVERY',
  'OFF_TOPIC',
] as const;

export type DialogueAct = (typeof DIALOGUE_ACTS)[number];

export const ACTION_TYPES = [
  'ANSWER',
  'ASK_CLARIFICATION',
  'ASK_QUALIFICATION',
  'SHOW_CATALOG',
  'RECOMMEND',
  'NAVIGATE',
  'CONTACT',
  'PREPARE_HANDOFF',
  'HUMAN_HANDOFF',
  'CONTINUE_TUTORING',
  'CONTINUE_DIAGNOSTIC',
  'COMMERCIAL_NEXT_STEP',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

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
  | 'compare_options'
  | 'contact_handoff'
  | 'confirm_handoff';

export type PendingOffer = {
  type: 'choice' | 'confirm' | 'question';
  options: PendingOfferOption[];
  prompt?: string | null;
};

export type PendingAction =
  | 'CONTACT_HANDOFF'
  | 'COURSE_RECOMMENDATION'
  | 'COURSE_CATALOG'
  | 'SHOW_SERVICES'
  | 'COMPANY_ROUTING'
  | 'CONTINUE_DIAGNOSIS'
  | 'CONTINUE_TUTORING'
  | 'COMMERCIAL_NEXT'
  | null;

export type ConversationState = {
  currentIntent: DialogueIntent | null;
  previousIntent: DialogueIntent | null;
  currentTopic: string | null;
  previousTopic: string | null;
  activeEntity: string | null;
  referencedEntity: string | null;
  /** Alias semantic fields (R6). */
  currentEntity: string | null;
  previousEntity: string | null;
  currentCourse: string | null;
  currentService: string | null;
  currentCompany: string | null;
  pendingOffer: PendingOffer | null;
  pendingQuestion: string | null;
  pendingAction: PendingAction;
  pendingConfirmation: string | null;
  userGoal: string | null;
  conversationGoal: string | null;
  journeyStage: string | null;
  userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  userInterest: string | null;
  userExperienceYears: number | null;
  experienceYears: number | null;
  technicalArea: string | null;
  interestArea: string | null;
  selectedCourse: string | null;
  selectedService: string | null;
  selectedCompany: string | null;
  recommendedItem: string | null;
  recommendationReason: string | null;
  responsibleCompany: string | null;
  contactTarget: string | null;
  knownFacts: string[];
  knownUserFacts: string[];
  unresolvedReferences: string[];
  resolvedReferences: Record<string, string>;
  lastAssistantText: string | null;
  lastAssistantAction: ActionType | null;
  lastAssistantQuestion: string | null;
  lastDialogueAct: DialogueAct | null;
  commercialContext: {
    storeCount?: number | null;
    sector?: string | null;
    goal?: string | null;
    companyType?: string | null;
    companySize?: string | null;
    numberOfUnits?: number | null;
    hasColdRooms?: boolean | null;
    pain?: string | null;
  } | null;
  engineeringContext: {
    waitingFor?: string[] | null;
    suctionPsi?: number | null;
    dischargePsi?: number | null;
    symptom?: string | null;
    refrigerant?: string | null;
    setpointC?: number | null;
    actualTempC?: number | null;
    nextStep?: string | null;
    equipment?: string | null;
  } | null;
  tutorConcept: string | null;
  contactData: {
    name?: string | null;
    channel?: string | null;
    value?: string | null;
  } | null;
  handoffPrepared: boolean;
};

export function emptyConversationState(): ConversationState {
  return {
    currentIntent: null,
    previousIntent: null,
    currentTopic: null,
    previousTopic: null,
    activeEntity: null,
    referencedEntity: null,
    currentEntity: null,
    previousEntity: null,
    currentCourse: null,
    currentService: null,
    currentCompany: null,
    pendingOffer: null,
    pendingQuestion: null,
    pendingAction: null,
    pendingConfirmation: null,
    userGoal: null,
    conversationGoal: null,
    journeyStage: null,
    userLevel: null,
    experienceLevel: null,
    userInterest: null,
    userExperienceYears: null,
    experienceYears: null,
    technicalArea: null,
    interestArea: null,
    selectedCourse: null,
    selectedService: null,
    selectedCompany: null,
    recommendedItem: null,
    recommendationReason: null,
    responsibleCompany: null,
    contactTarget: null,
    knownFacts: [],
    knownUserFacts: [],
    unresolvedReferences: [],
    resolvedReferences: {},
    lastAssistantText: null,
    lastAssistantAction: null,
    lastAssistantQuestion: null,
    lastDialogueAct: null,
    commercialContext: null,
    engineeringContext: null,
    tutorConcept: null,
    contactData: null,
    handoffPrepared: false,
  };
}

export type ResolvedDialogueTurn = {
  originalQuestion: string;
  effectiveQuestion: string;
  dialogueIntent: DialogueIntent;
  dialogueAct?: DialogueAct;
  actionType?: ActionType;
  decision: ClarificationDecision;
  state: ConversationState;
  skipRetrieval: boolean;
  clarificationText?: string | null;
  composedHint?: string | null;
  handoffRequest?: HandoffRequest | null;
};

/** Decoupled handoff contract — ready for future CRM, not wired to CRM now. */
export type HandoffRequest = {
  source: 'concierge' | 'tutor' | 'commercial' | 'engineering' | 'portal' | string;
  sessionId?: string | number | null;
  userId?: string | null;
  tenantId?: string | null;
  profile?: string | null;
  targetCompany?: string | null;
  targetDepartment?: string | null;
  intent?: string | null;
  userGoal?: string | null;
  qualification?: Record<string, unknown>;
  knownUserFacts?: string[];
  contactData?: Record<string, unknown> | null;
  conversationSummary?: string | null;
  urgency?: string | null;
  recommendedNextAction?: string | null;
  consent?: boolean | null;
};
