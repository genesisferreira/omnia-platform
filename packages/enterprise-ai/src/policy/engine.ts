import type {
  AiPolicyRecord,
  AssistantRecord,
  PolicySubject,
} from '../domain/types';

function asIdSet(values: Array<string | number> | undefined): Set<string> {
  return new Set((values || []).map((v) => String(v)));
}

/**
 * AI Policy Engine — decide quais assistentes/modelos o subject pode usar.
 */
export function evaluatePolicies(input: {
  policies: AiPolicyRecord[];
  assistants: AssistantRecord[];
  subject: PolicySubject;
}): {
  allowedAssistants: AssistantRecord[];
  allowedModelKeys: string[];
  matchedPolicyIds: string[];
} {
  const enabled = input.policies
    .filter((p) => p.enabled)
    .sort((a, b) => b.priority - a.priority);

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
    if (
      policy.companyIds.length &&
      ![...companyIds].some((id) => policy.companyIds.includes(id))
    ) {
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
      (a) => a.status === 'active' && !a.ownerCompanyId,
    );
    const allowedModelKeys = [
      ...new Set(allowedAssistants.flatMap((a) => a.allowedModelKeys)),
    ];
    return { allowedAssistants, allowedModelKeys, matchedPolicyIds: [] };
  }

  const assistantKeys = new Set(matched.flatMap((p) => p.assistantKeys));
  const allowedModelKeys = [
    ...new Set(matched.flatMap((p) => p.allowedModelKeys)),
  ];

  const allowedAssistants = input.assistants.filter((a) => {
    if (a.status !== 'active') return false;
    if (assistantKeys.size === 0) return true;
    return assistantKeys.has(a.key);
  });

  return {
    allowedAssistants,
    allowedModelKeys,
    matchedPolicyIds: matched.map((p) => p.id),
  };
}

export function assertAssistantAllowed(
  assistantKey: string,
  allowed: AssistantRecord[],
): AssistantRecord {
  const found = allowed.find((a) => a.key === assistantKey || a.id === assistantKey);
  if (!found) {
    throw new Error(`ASSISTANT_FORBIDDEN:${assistantKey}`);
  }
  return found;
}
