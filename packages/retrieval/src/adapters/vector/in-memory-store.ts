import type {
  HealthStatus,
  VectorRecord,
  VectorSearchFilters,
  VectorSearchHit,
} from '../../domain/types';
import { cosineSimilarity } from '../../domain/utils';
import type { VectorStorePort } from '../../ports';

function matchesFilters(record: VectorRecord, filters: VectorSearchFilters): boolean {
  if (filters.tenantId && record.tenantId && record.tenantId !== filters.tenantId) return false;
  if (filters.ownerCompanyId && record.ownerCompanyId && record.ownerCompanyId !== filters.ownerCompanyId)
    return false;
  if (filters.courseId && record.courseId && record.courseId !== filters.courseId) return false;
  if (filters.lessonId && record.lessonId && record.lessonId !== filters.lessonId) return false;
  if (filters.moduleId && record.moduleId && record.moduleId !== filters.moduleId) return false;
  if (filters.language && record.language && record.language !== filters.language) return false;
  if (filters.allowAiUse === true && record.allowAiUse === false) return false;
  if (filters.publicationStatus && record.publicationStatus !== filters.publicationStatus)
    return false;
  if (filters.visibility && record.visibility !== filters.visibility) return false;
  if (filters.status && record.status !== filters.status) return false;
  if (filters.tags?.length) {
    const tags = record.tags ?? [];
    if (!filters.tags.every((t) => tags.includes(t))) return false;
  }
  return true;
}

/** Vector store em memória — testes e benchmarks. */
export class InMemoryVectorStore implements VectorStorePort {
  private readonly records = new Map<string, VectorRecord>();

  async insert(record: VectorRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async update(record: VectorRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async search(
    embedding: number[],
    filters: VectorSearchFilters,
    limit: number,
  ): Promise<VectorSearchHit[]> {
    const hits: VectorSearchHit[] = [];
    for (const record of this.records.values()) {
      if (!matchesFilters(record, filters)) continue;
      hits.push({
        record,
        similarity: cosineSimilarity(embedding, record.embedding),
      });
    }
    hits.sort((a, b) => b.similarity - a.similarity);
    return hits.slice(0, limit);
  }

  async deleteDocument(documentId: string): Promise<number> {
    let n = 0;
    for (const [id, rec] of this.records) {
      if (rec.knowledgeDocumentId === documentId) {
        this.records.delete(id);
        n++;
      }
    }
    return n;
  }

  async deleteResource(resourceId: string): Promise<number> {
    let n = 0;
    for (const [id, rec] of this.records) {
      if (rec.learningResourceId === resourceId) {
        this.records.delete(id);
        n++;
      }
    }
    return n;
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, detail: `in-memory records=${this.records.size}` };
  }

  size(): number {
    return this.records.size;
  }
}
