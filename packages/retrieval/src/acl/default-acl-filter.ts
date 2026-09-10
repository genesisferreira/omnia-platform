import { evaluateRetrievalEligibility } from '@omnia/knowledge-governance';

import type { VectorSearchHit } from '../domain/types';
import type { AclFilterPort, AclSubject } from '../ports';

/**
 * Map portal assistant keys → allowed agent:* tags on vectors.
 * Keeps specialist tagging without silently dropping Engineering/Tutor.
 */
function agentTagAllowed(agentKey: string, tags: string[]): boolean {
  const key = agentKey.toLowerCase();
  const aliasMap: Record<string, string[]> = {
    engineering: [
      'engineering',
      'neurofrigo-technology',
      'refrigeration',
      'electrical-controls',
      'projects-lab',
    ],
    commercial: ['commercial', 'support'],
    tutor: [
      'tutor',
      'refrigeration',
      'neurofrigo-technology',
      'electrical-controls',
      'evaluator',
      'content-production',
    ],
    concierge: ['concierge', 'support'],
    support: ['support', 'concierge'],
    refrigeration: ['refrigeration', 'tutor'],
    'neurofrigo-technology': ['neurofrigo-technology', 'engineering', 'tutor'],
  };
  const accepted = aliasMap[key] ?? [key];
  return accepted.some((alias) => tags.includes(`agent:${alias}`));
}

/**
 * ACL de retrieval — filtragem antes da resposta final.
 * EPIC 04 regras mínimas + EPIC 10 filtro por agente (tags agent:*).
 */
export class DefaultAclFilter implements AclFilterPort {
  async filter(hits: VectorSearchHit[], subject: AclSubject): Promise<VectorSearchHit[]> {
    if (subject.channel === 'admin' || subject.channel === 'system') {
      return hits;
    }

    return hits.filter((hit) => {
      const r = hit.record;

      // Epic 17 — scope/school/tenant/assessment gate BEFORE returning evidence.
      if (
        r.knowledgeScope != null ||
        r.schoolKey != null ||
        r.retrievalEligible != null ||
        r.assessmentSecret === true
      ) {
        const gov = evaluateRetrievalEligibility(
          {
            knowledgeScope: r.knowledgeScope,
            schoolKey: r.schoolKey,
            tenantId: r.tenantId,
            courseId: r.courseId,
            retrievalEligible: r.retrievalEligible,
            allowAiUse: r.allowAiUse,
            assessmentSecret: r.assessmentSecret,
            tags: r.tags,
          },
          {
            role: subject.role,
            tenantId: subject.tenantId,
            schoolKey: subject.schoolKey,
            enrolledCourseIds: subject.enrolledCourseIds,
            agentKey: subject.agentKey,
            channel: subject.channel,
            activeCourseId: subject.activeCourseId,
          },
        );
        if (!gov.allow) return false;
      }

      if (r.allowAiUse === false) return false;

      if (r.publicationStatus && r.publicationStatus !== 'published') return false;

      if (
        r.status &&
        !['published', 'ready', 'active', 'completed', 'indexed'].includes(r.status)
      ) {
        return false;
      }

      if (r.visibility === 'private' || r.visibility === 'internal_restricted') {
        return false;
      }

      // Public Concierge channel: only explicitly public (or unset legacy) published AI content.
      if (subject.channel === 'portal_public') {
        if (r.visibility === 'internal' || r.visibility === 'private') return false;
        if (r.visibility && r.visibility !== 'public') return false;
      }

      if (subject.tenantId && r.tenantId && r.tenantId !== subject.tenantId) {
        return false;
      }

      // Company on vectors is often the publishing org of shared catalog content.
      // Enforce company ACL only for non-shared visibilities (not enrolled/public).
      if (
        r.ownerCompanyId &&
        subject.companyIds?.length &&
        r.visibility !== 'enrolled' &&
        r.visibility !== 'public'
      ) {
        const allowed = subject.companyIds.map(String);
        if (!allowed.includes(String(r.ownerCompanyId))) return false;
      }

      if (
        subject.agentKey &&
        (subject.channel === 'portal_chat' || subject.channel === 'portal_public')
      ) {
        const agentTags = (r.tags || []).filter((t) => t.startsWith('agent:'));
        if (agentTags.length > 0) {
          if (!agentTagAllowed(subject.agentKey, r.tags || []) && subject.agentKey !== 'command') {
            return false;
          }
        }
      }

      return true;
    });
  }
}
