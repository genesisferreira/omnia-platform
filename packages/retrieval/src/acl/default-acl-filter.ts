import type { VectorSearchHit } from '../domain/types';
import type { AclFilterPort, AclSubject } from '../ports';

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

      if (r.allowAiUse === false) return false;

      if (r.publicationStatus && r.publicationStatus !== 'published') return false;

      if (r.status && !['published', 'ready', 'active', 'completed', 'indexed'].includes(r.status)) {
        return false;
      }

      if (r.visibility === 'private' || r.visibility === 'internal_restricted') {
        return false;
      }

      if (subject.tenantId && r.tenantId && r.tenantId !== subject.tenantId) {
        return false;
      }

      if (r.ownerCompanyId && subject.companyIds?.length) {
        const allowed = subject.companyIds.map(String);
        if (!allowed.includes(String(r.ownerCompanyId))) return false;
      }

      if (subject.agentKey && subject.channel === 'portal_chat') {
        const agentTags = (r.tags || []).filter((t) => t.startsWith('agent:'));
        if (agentTags.length > 0) {
          const needed = `agent:${subject.agentKey}`;
          if (!agentTags.includes(needed) && subject.agentKey !== 'command') {
            return false;
          }
        }
      }

      return true;
    });
  }
}
