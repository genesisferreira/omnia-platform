import type { LmsProfileRole } from '@omnia/shared/lms';

/**
 * Policy Engine — resolução centralizada.
 * Nesta entrega: políticas de sessão global/por perfil.
 * Estrutura preparada para course/material/user override (precedência futura).
 */

export type LmsPolicyScope = {
  global?: Partial<LmsResolvedPolicy>;
  course?: Partial<LmsResolvedPolicy> | null;
  material?: Partial<LmsResolvedPolicy> | null;
  userException?: Partial<LmsResolvedPolicy> | null;
};

export type LmsPolicyContext = {
  role: LmsProfileRole;
  courseId?: number | null;
  materialId?: number | null;
  userId?: string | null;
  /** Defaults de ambiente / Global Settings */
  defaults: {
    studentSessions: number;
    teacherSessions: number;
    managerSessions: number;
    adminSessions: number;
    sessionTtlSeconds: number;
    sessionHeartbeatSeconds: number;
    revokeOldestOnExceed: boolean;
    downloadsAllowed: boolean;
    watermarkEnabled: boolean;
    mediaTtlSeconds: number | null;
    sessionPolicyEnabled: boolean;
  };
  overrides?: LmsPolicyScope;
};

export type LmsResolvedPolicy = {
  maxSessions: number;
  sessionTtlSeconds: number;
  sessionHeartbeatSeconds: number;
  revokeOldestOnExceed: boolean;
  downloadsAllowed: boolean;
  watermarkEnabled: boolean;
  mediaTtlSeconds: number | null;
  sessionPolicyEnabled: boolean;
  source: 'global' | 'course' | 'material' | 'user';
};

function clampSessions(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(10, Math.floor(n));
}

function roleDefaultSessions(
  role: LmsProfileRole,
  defaults: LmsPolicyContext['defaults'],
): number {
  switch (role) {
    case 'student':
      return defaults.studentSessions;
    case 'teacher':
      return defaults.teacherSessions;
    case 'manager':
      return defaults.managerSessions;
    case 'admin':
      return defaults.adminSessions;
    default:
      return defaults.studentSessions;
  }
}

/**
 * Precedência futura: material > curso > global; exceção de usuário vence campos definidos.
 * Nesta entrega, course/material normalmente null — efetivo = global por perfil.
 */
export function resolveLmsPolicy(context: LmsPolicyContext): LmsResolvedPolicy {
  const base: LmsResolvedPolicy = {
    maxSessions: clampSessions(roleDefaultSessions(context.role, context.defaults)),
    sessionTtlSeconds: context.defaults.sessionTtlSeconds,
    sessionHeartbeatSeconds: context.defaults.sessionHeartbeatSeconds,
    revokeOldestOnExceed: context.defaults.revokeOldestOnExceed,
    downloadsAllowed: context.defaults.downloadsAllowed,
    watermarkEnabled: context.defaults.watermarkEnabled,
    mediaTtlSeconds: context.defaults.mediaTtlSeconds,
    sessionPolicyEnabled: context.defaults.sessionPolicyEnabled,
    source: 'global',
  };

  const merge = (
    current: LmsResolvedPolicy,
    partial: Partial<LmsResolvedPolicy> | null | undefined,
    source: LmsResolvedPolicy['source'],
  ): LmsResolvedPolicy => {
    if (!partial) return current;
    const next = { ...current, source };
    if (partial.maxSessions != null) next.maxSessions = clampSessions(partial.maxSessions);
    if (partial.sessionTtlSeconds != null) next.sessionTtlSeconds = partial.sessionTtlSeconds;
    if (partial.sessionHeartbeatSeconds != null) {
      next.sessionHeartbeatSeconds = partial.sessionHeartbeatSeconds;
    }
    if (partial.revokeOldestOnExceed != null) {
      next.revokeOldestOnExceed = partial.revokeOldestOnExceed;
    }
    if (partial.downloadsAllowed != null) next.downloadsAllowed = partial.downloadsAllowed;
    if (partial.watermarkEnabled != null) next.watermarkEnabled = partial.watermarkEnabled;
    if (partial.mediaTtlSeconds !== undefined) next.mediaTtlSeconds = partial.mediaTtlSeconds;
    if (partial.sessionPolicyEnabled != null) {
      next.sessionPolicyEnabled = partial.sessionPolicyEnabled;
    }
    return next;
  };

  let resolved = merge(base, context.overrides?.global, 'global');
  resolved = merge(resolved, context.overrides?.course, 'course');
  resolved = merge(resolved, context.overrides?.material, 'material');
  resolved = merge(resolved, context.overrides?.userException, 'user');
  return resolved;
}
