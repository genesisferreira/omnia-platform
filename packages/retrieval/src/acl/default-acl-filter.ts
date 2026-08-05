import type { VectorSearchHit } from '../domain/types';
import type { AclFilterPort, AclSubject } from '../ports';

/**
 * ACL de retrieval — filtragem antes da resposta final.
 * Regras mínimas da EPIC 04; adapters Payload podem enriquecer via composition.
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

      if (r.status && !['published', 'ready', 'active', 'completed'].includes(r.status)) {
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

      return true;
    });
  }
}
