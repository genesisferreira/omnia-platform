import type {
  AiPolicyRecord,
  AssistantRecord,
  PolicyDecision,
  PolicySubject,
} from '../domain/types';

function asIdSet(values: Array<string | number> | undefined): Set<string> {
  return new Set((values || []).map((v) => String(v)));
}

export type PolicyEvaluation = {
  allowedAssistants: AssistantRecord[];
  allowedModelKeys: string[];
  matchedPolicyIds: string[];
  requireGrounding: boolean;
  requireExplainability: boolean;
  maxTokensPerDay: number | null;
};

/**
 * AI Policy Engine — decide quais assistentes/modelos o subject pode usar.
 */
export function evaluatePolicies(input: {
  policies: AiPolicyRecord[];
  assistants: AssistantRecord[];
  subject: PolicySubject;
}): PolicyEvaluation {
  const enabled = input.policies.filter((p) => p.enabled).sort((a, b) => b.priority - a.priority);

  const companyIds = asIdSet(input.subject.companyIds);
  const role = (input.subject.role || 'anonymous').toLowerCase();
  const tenantId = input.subject.tenantId ? String(input.subject.tenantId) : null;
  const courseId = input.subject.courseId ? String(input.subject.courseId) : null;

  const matched: AiPolicyRecord[] = [];
  for (const policy of enabled) {
    if (policy.roles.length && !policy.roles.map((r) => r.toLowerCase()).includes(role)) {
      continue;
    }
    if (policy.tenantIds.length && (!tenantId || !policy.tenantIds.includes(tenantId))) {
      continue;
    }
    if (policy.companyIds.length && ![...companyIds].some((id) => policy.companyIds.includes(id))) {
      continue;
    }
    if (policy.courseIds.length && (!courseId || !policy.courseIds.includes(courseId))) {
      continue;
    }
    matched.push(policy);
  }

  // Sem política específica: assistentes ativos públicos (ownerCompany null)
  if (!matched.length) {
    const allowedAssistants = input.assistants.filter(
      (a) =>
        a.status === 'active' && !a.ownerCompanyId && (a.visibility === 'public' || !a.visibility),
    );
    const allowedModelKeys = [...new Set(allowedAssistants.flatMap((a) => a.allowedModelKeys))];
    return {
      allowedAssistants,
      allowedModelKeys,
      matchedPolicyIds: [],
      requireGrounding: true,
      requireExplainability: true,
      maxTokensPerDay: null,
    };
  }

  // Prioridade efetiva: só a faixa de maior prioridade (não unir policies conflitantes).
  const topPriority = matched[0]!.priority;
  const effective = matched.filter((p) => p.priority === topPriority);

  const assistantKeys = new Set(effective.flatMap((p) => p.assistantKeys));
  const allowedModelKeys = [...new Set(effective.flatMap((p) => p.allowedModelKeys))];

  const allowedAssistants = input.assistants.filter((a) => {
    if (a.status !== 'active') return false;
    if (assistantKeys.size === 0) return true;
    return assistantKeys.has(a.key) || assistantKeys.has(a.slug);
  });

  const requireGrounding = effective.every((p) => p.requireGrounding !== false);
  const requireExplainability = effective.every((p) => p.requireExplainability !== false);
  const tokenLimits = effective
    .map((p) => p.maxTokensPerDay)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const maxTokensPerDay = tokenLimits.length ? Math.min(...tokenLimits) : null;

  return {
    allowedAssistants,
    allowedModelKeys,
    matchedPolicyIds: effective.map((p) => p.id),
    requireGrounding,
    requireExplainability,
    maxTokensPerDay,
  };
}

export function assertAssistantAllowed(
  assistantKey: string,
  allowed: AssistantRecord[],
): AssistantRecord {
  const found = allowed.find(
    (a) => a.key === assistantKey || a.slug === assistantKey || a.id === assistantKey,
  );
  if (!found) {
    throw new Error(`ASSISTANT_FORBIDDEN:${assistantKey}`);
  }
  return found;
}

export function buildPolicyDecision(input: {
  allowed: boolean;
  assistantKey: string | null;
  modelKey: string | null;
  evaluation: Pick<
    PolicyEvaluation,
    'matchedPolicyIds' | 'requireGrounding' | 'requireExplainability' | 'maxTokensPerDay'
  >;
  reason: string;
}): PolicyDecision {
  return {
    allowed: input.allowed,
    assistantKey: input.assistantKey,
    modelKey: input.modelKey,
    matchedPolicyIds: input.evaluation.matchedPolicyIds,
    requireGrounding: input.evaluation.requireGrounding,
    requireExplainability: input.evaluation.requireExplainability,
    maxTokensPerDay: input.evaluation.maxTokensPerDay,
    reason: input.reason,
    at: new Date().toISOString(),
  };
}
