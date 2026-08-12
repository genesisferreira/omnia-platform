import {
  CHAT_FORBIDDEN_CLASSIFICATIONS,
  type AgentKey,
  type SecurityClassification,
} from './constants';

export type KnowledgeAclContext = {
  role: string | null;
  agentKey?: AgentKey | null;
  companyIds?: Array<string | number>;
  enrolledCourseIds?: number[];
  channel?: 'portal_chat' | 'command' | 'admin' | 'system';
};

export type KnowledgeAclDocument = {
  securityClassification: SecurityClassification;
  allowAiUse?: boolean | null;
  requiresEnrollment?: boolean | null;
  allowedRoles?: string[] | null;
  allowedAgents?: string[] | null;
  allowedCompanies?: Array<string | number> | null;
  allowedCourses?: number[] | null;
  status?: string | null;
  publicationStatus?: string | null;
};

export type AclDecision = {
  allow: boolean;
  reason: string;
  code:
    | 'ALLOW'
    | 'DENY_UNAUTHENTICATED'
    | 'DENY_CLASSIFICATION'
    | 'DENY_AI_FLAG'
    | 'DENY_AGENT'
    | 'DENY_ROLE'
    | 'DENY_COMPANY'
    | 'DENY_ENROLLMENT'
    | 'DENY_COMMAND'
    | 'DENY_PUBLICATION'
    | 'DENY_CHAT_INTERNAL';
};

export function evaluateKnowledgeAcl(
  doc: KnowledgeAclDocument,
  ctx: KnowledgeAclContext,
): AclDecision {
  const channel = ctx.channel ?? 'portal_chat';

  if (channel === 'admin') {
    return { allow: true, reason: 'Admin channel', code: 'ALLOW' };
  }

  if (channel === 'command') {
    if (ctx.role !== 'super_admin') {
      return {
        allow: false,
        reason: 'Neurofrigo Command restrito a super_admin',
        code: 'DENY_COMMAND',
      };
    }
    return { allow: true, reason: 'Command authorized', code: 'ALLOW' };
  }

  // Portal chat / system retrieval
  if (CHAT_FORBIDDEN_CLASSIFICATIONS.includes(doc.securityClassification)) {
    return {
      allow: false,
      reason: 'INTERNAL_RESTRICTED não pode ser usado no chat/RAG',
      code: 'DENY_CHAT_INTERNAL',
    };
  }

  if (doc.allowAiUse === false) {
    return { allow: false, reason: 'allowAiUse=false', code: 'DENY_AI_FLAG' };
  }

  if (doc.publicationStatus && doc.publicationStatus !== 'published') {
    return {
      allow: false,
      reason: 'Documento não publicado',
      code: 'DENY_PUBLICATION',
    };
  }

  if (ctx.agentKey && doc.allowedAgents?.length) {
    if (!doc.allowedAgents.includes(ctx.agentKey)) {
      return { allow: false, reason: 'Agente não autorizado', code: 'DENY_AGENT' };
    }
  }

  if (ctx.agentKey === 'command' && ctx.role !== 'super_admin') {
    return {
      allow: false,
      reason: 'Agente command restrito a super_admin',
      code: 'DENY_COMMAND',
    };
  }

  if (doc.allowedRoles?.length && ctx.role) {
    if (!doc.allowedRoles.includes(ctx.role)) {
      return { allow: false, reason: 'Papel não autorizado', code: 'DENY_ROLE' };
    }
  }

  if (doc.securityClassification === 'CLIENT_PARTNER') {
    const allowed = doc.allowedCompanies ?? [];
    if (allowed.length && ctx.companyIds?.length) {
      const ok = ctx.companyIds.some((id) => allowed.map(String).includes(String(id)));
      if (!ok) {
        return { allow: false, reason: 'Empresa não autorizada', code: 'DENY_COMPANY' };
      }
    } else if (allowed.length && !ctx.companyIds?.length) {
      return { allow: false, reason: 'Empresa não autorizada', code: 'DENY_COMPANY' };
    }
  }

  if (doc.securityClassification === 'STUDENT' || doc.requiresEnrollment) {
    if (!ctx.role) {
      return { allow: false, reason: 'Autenticação obrigatória', code: 'DENY_UNAUTHENTICATED' };
    }
    const courses = doc.allowedCourses ?? [];
    if (courses.length) {
      const enrolled = ctx.enrolledCourseIds ?? [];
      const ok = courses.some((c) => enrolled.includes(c));
      if (!ok) {
        return {
          allow: false,
          reason: 'Matrícula no curso obrigatória',
          code: 'DENY_ENROLLMENT',
        };
      }
    }
  }

  if (doc.securityClassification === 'TEACHER_MANAGER') {
    if (ctx.role !== 'instructor' && ctx.role !== 'admin' && ctx.role !== 'super_admin') {
      return { allow: false, reason: 'Somente professor/gestor', code: 'DENY_ROLE' };
    }
  }

  return { allow: true, reason: 'ACL ok', code: 'ALLOW' };
}
