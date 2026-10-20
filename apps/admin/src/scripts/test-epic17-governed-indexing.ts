/**
 * EPIC17.3 — Governed retrieval indexing regression (sem DB / sem rede).
 *
 * Exercita o caminho real approve_school → governed ingest (KI) → indexação (worker/indexing
 * port) → lastIndexedAt → busca semântica, com um Payload em memória e adapters de retrieval
 * injetados (Ports & Adapters). O vector store "PG-faithful" persiste apenas as colunas reais de
 * `retrieval_vectors`, reproduzindo o comportamento de produção (pré-filtro soft por tenant/company).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import {
  createEmbeddingProvider,
  InMemoryVectorStore,
  type EmbeddingProviderPort,
  type VectorRecord,
  type VectorSearchFilters,
  type VectorSearchHit,
} from '@omnia/retrieval';
import { applyAssessmentGuard } from '@omnia/intelligent-learning';
import type { Payload } from 'payload';

import type * as GovernanceModule from '../services/knowledge/governance';
import type * as PipelineModule from '../services/knowledge-intelligence/pipeline';
import type * as RuntimeModule from '../services/retrieval/runtime';
import type * as SearchModule from '../services/retrieval/search';
import type * as WorkerModule from '../services/retrieval/worker';

type Doc = Record<string, unknown> & { id: number };
type Where = Record<string, unknown>;

function norm(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'id' in value) {
    return (value as { id: unknown }).id;
  }
  return value;
}

function fieldMatches(raw: unknown, cond: Record<string, unknown>): boolean {
  const value = norm(raw);
  for (const [op, expected] of Object.entries(cond)) {
    switch (op) {
      case 'equals':
        if (expected == null ? value != null : String(value) !== String(expected)) return false;
        break;
      case 'not_equals':
        if (String(value) === String(expected)) return false;
        break;
      case 'in':
        if (!(expected as unknown[]).map(String).includes(String(value))) return false;
        break;
      case 'contains':
        if (value == null || !String(value).includes(String(expected))) return false;
        break;
      case 'exists':
        if (Boolean(expected) !== (value != null)) return false;
        break;
      default:
        throw new Error(`fake payload: unsupported operator ${op}`);
    }
  }
  return true;
}

function matches(doc: Doc, where?: Where | null): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'and') {
      if (!(cond as Where[]).every((w) => matches(doc, w))) return false;
    } else if (key === 'or') {
      if (!(cond as Where[]).some((w) => matches(doc, w))) return false;
    } else if (!fieldMatches(doc[key], cond as Record<string, unknown>)) {
      return false;
    }
  }
  return true;
}

class NotFound extends Error {
  status = 404;
}

/** Minimal in-memory Payload Local API (hooks are bypassed by pipeline contexts anyway). */
function createFakePayload() {
  const store = new Map<string, Map<number, Doc>>();
  const globals = new Map<string, Record<string, unknown>>();
  const seq = new Map<string, number>();
  const col = (slug: string) => {
    if (!store.has(slug)) store.set(slug, new Map());
    return store.get(slug)!;
  };
  const nextId = (slug: string) => {
    const n = (seq.get(slug) ?? 0) + 1;
    seq.set(slug, n);
    return n;
  };
  const clone = <T>(v: T): T => structuredClone(v);
  const logs: Array<Record<string, unknown>> = [];
  let tick = 0;
  const stamp = () => new Date(Date.UTC(2026, 8, 25, 12, 0, 0, tick++)).toISOString();

  const api = {
    logger: {
      info: (o: Record<string, unknown>) => logs.push({ level: 'info', ...o }),
      warn: (o: Record<string, unknown>) => logs.push({ level: 'warn', ...o }),
      error: (o: Record<string, unknown>) => logs.push({ level: 'error', ...o }),
    },
    async find(args: { collection: string; where?: Where; limit?: number; sort?: string }) {
      let docs = [...col(args.collection).values()].filter((d) => matches(d, args.where));
      if (args.sort === '-createdAt') docs = docs.reverse();
      const totalDocs = docs.length;
      if (args.limit) docs = docs.slice(0, args.limit);
      return { docs: docs.map(clone), totalDocs };
    },
    async findByID(args: { collection: string; id: string | number }) {
      const doc = col(args.collection).get(Number(args.id));
      if (!doc) throw new NotFound(`Not Found: ${args.collection}/${args.id}`);
      return clone(doc);
    },
    async count(args: { collection: string; where?: Where }) {
      return {
        totalDocs: [...col(args.collection).values()].filter((d) => matches(d, args.where)).length,
      };
    },
    async create(args: {
      collection: string;
      data: Record<string, unknown>;
      file?: { name: string };
    }) {
      const id =
        args.data.id != null && typeof args.data.id === 'number'
          ? args.data.id
          : nextId(args.collection);
      const now = stamp();
      const doc: Doc = {
        ...clone(args.data),
        ...(args.file ? { filename: args.file.name, mimeType: 'text/plain' } : {}),
        id,
        createdAt: now,
        updatedAt: now,
      };
      col(args.collection).set(id, doc);
      return clone(doc);
    },
    async update(args: { collection: string; id: string | number; data: Record<string, unknown> }) {
      const existing = col(args.collection).get(Number(args.id));
      if (!existing) throw new NotFound(`Not Found: ${args.collection}/${args.id}`);
      const updated: Doc = {
        ...existing,
        ...clone(args.data),
        id: existing.id,
        updatedAt: stamp(),
      };
      col(args.collection).set(existing.id, updated);
      return clone(updated);
    },
    async delete(args: { collection: string; id: string | number }) {
      const existing = col(args.collection).get(Number(args.id));
      col(args.collection).delete(Number(args.id));
      return existing ? clone(existing) : null;
    },
    async findGlobal(args: { slug: string }) {
      return clone(globals.get(args.slug) ?? {});
    },
    async updateGlobal(args: { slug: string; data: Record<string, unknown> }) {
      globals.set(args.slug, { ...(globals.get(args.slug) ?? {}), ...clone(args.data) });
      return clone(globals.get(args.slug)!);
    },
  };

  const seed = (slug: string, doc: Doc) => {
    col(slug).set(doc.id, { createdAt: stamp(), ...doc });
    seq.set(slug, Math.max(seq.get(slug) ?? 0, doc.id));
  };
  const all = (slug: string) => [...col(slug).values()].map(clone);
  return { payload: api as unknown as Payload, seed, all, logs };
}

/** Governance fields that `retrieval_vectors` (pgvector-store / migration) does NOT persist. */
const NON_PERSISTED_COLUMNS = [
  'schoolKey',
  'knowledgeScope',
  'retrievalEligible',
  'assessmentSecret',
  'sourceVersion',
] as const;

/** Mirrors PgVectorStore: same soft pre-filters, only real table columns survive a round-trip. */
class PgFaithfulVectorStore extends InMemoryVectorStore {
  readonly rows = new Map<string, VectorRecord>();
  private strip(record: VectorRecord): VectorRecord {
    const copy = { ...record } as Record<string, unknown>;
    for (const key of NON_PERSISTED_COLUMNS) delete copy[key];
    return copy as VectorRecord;
  }
  override async insert(record: VectorRecord) {
    this.rows.set(record.id, this.strip(record));
    await super.insert(this.strip(record));
  }
  override async update(record: VectorRecord) {
    await this.insert(record);
  }
  override async delete(id: string) {
    this.rows.delete(id);
    await super.delete(id);
  }
  override async deleteDocument(documentId: string) {
    for (const [id, r] of this.rows) if (r.knowledgeDocumentId === documentId) this.rows.delete(id);
    return super.deleteDocument(documentId);
  }
  override async deleteResource(resourceId: string) {
    for (const [id, r] of this.rows) if (r.learningResourceId === resourceId) this.rows.delete(id);
    return super.deleteResource(resourceId);
  }
  override async search(
    embedding: number[],
    filters: VectorSearchFilters,
    limit: number,
  ): Promise<VectorSearchHit[]> {
    return super.search(embedding, filters, limit);
  }
}

/** Fan-out store: same writes to a PG-faithful store and a full-governance in-memory store. */
class TeeVectorStore extends PgFaithfulVectorStore {
  readonly full = new InMemoryVectorStore();
  override async insert(record: VectorRecord) {
    await super.insert(record);
    await this.full.insert(record);
  }
  override async deleteDocument(documentId: string) {
    await this.full.deleteDocument(documentId);
    return super.deleteDocument(documentId);
  }
  override async deleteResource(resourceId: string) {
    await this.full.deleteResource(resourceId);
    return super.deleteResource(resourceId);
  }
}

class FailingProvider implements EmbeddingProviderPort {
  constructor(private readonly inner: EmbeddingProviderPort) {}
  async generate(): Promise<number[]> {
    throw new Error('EMBEDDING_PROVIDER_DOWN');
  }
  async generateBatch(): Promise<number[][]> {
    throw new Error('EMBEDDING_PROVIDER_DOWN');
  }
  health() {
    return this.inner.health();
  }
  metadata() {
    return this.inner.metadata();
  }
}

const MARKER = 'Marcador EPIC173 zeta compressor fredfrio homologacao indexacao governada';
const PRIVATE_MARKER = 'Marcador privado EPIC173 omega evaporador cursoprivado nunca recuperavel';

function lexical(text: string) {
  return { root: { children: [{ children: [{ text }] }] } };
}

describe('EPIC17.3 governed retrieval indexing', { concurrency: false }, () => {
  const fake = createFakePayload();
  const { payload, seed, all } = fake;
  const provider = createEmbeddingProvider({ RETRIEVAL_EMBEDDING_PROVIDER: 'deterministic' });
  const vectors = new TeeVectorStore();

  let governance: typeof GovernanceModule;
  let worker: typeof WorkerModule;
  let search: typeof SearchModule;
  let runtime: typeof RuntimeModule;
  let pipeline: typeof PipelineModule;

  const admin = { id: 1, role: 'admin' };
  const instructor = { id: 2, role: 'instructor' };
  let submissionId: number;
  let kdId: number;
  let lrId: number;

  async function waitForAsyncOutcome(subId: number, afterCount: number) {
    for (let i = 0; i < 400; i += 1) {
      const events = all('knowledge-audit-events').filter(
        (e) =>
          String(e.entityId) === String(subId) &&
          (e.nextState as { async?: boolean } | null)?.async === true,
      );
      if (events.length > afterCount) return events[events.length - 1]!;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error('timeout waiting for governed async ingest outcome');
  }
  const asyncEventCount = (subId: number) =>
    all('knowledge-audit-events').filter(
      (e) =>
        String(e.entityId) === String(subId) &&
        (e.nextState as { async?: boolean } | null)?.async === true,
    ).length;

  /** Same query/subject shape as POST /api/retrieval/search for a non-staff user. */
  async function portalSearch(
    text: string,
    user: { id: number; role: string; tenant: number; company: number },
  ) {
    return search.runSemanticSearch(
      payload,
      {
        text,
        tenantId: String(user.tenant),
        userId: String(user.id),
        ownerCompanyId: String(user.company),
        topK: 8,
      },
      {
        channel: 'portal_chat',
        role: user.role,
        userId: String(user.id),
        tenantId: String(user.tenant),
        companyIds: [String(user.company)],
      },
    );
  }

  const fredStudent = { id: 10, role: 'student', tenant: 5, company: 4 };
  const cteStudent = { id: 11, role: 'student', tenant: 7, company: 5 };

  before(async () => {
    runtime = await import('../services/retrieval/runtime');
    runtime.overrideRetrievalRuntime({ vectorStore: vectors, embeddingProvider: provider });
    governance = await import('../services/knowledge/governance');
    worker = await import('../services/retrieval/worker');
    search = await import('../services/retrieval/search');
    pipeline = await import('../services/knowledge-intelligence/pipeline');

    seed('tenants', { id: 1, name: 'Holding' });
    seed('tenants', { id: 5, name: 'Fred do Frio' });
    seed('tenants', { id: 7, name: 'CTE' });
    // Synthetic id-space fixture (NOT the product model — see the canonical suite below): company
    // ids ≠ tenant ids so a company-id-as-tenant regression is caught (company 5 == tenant id 5).
    seed('companies', { id: 4, name: 'Fred do Frio', tenant: 5 });
    seed('companies', { id: 5, name: 'CTE', tenant: 7 });
    seed('companies', { id: 9, name: 'Sem tenant' });
    seed('courses', { id: 10, title: 'Curso Fred', schoolKey: 'fred-do-frio', ownerCompany: 4 });
    seed('course-modules', { id: 100, course: 10 });
    seed('lessons', {
      id: 16,
      module: 100,
      title: 'Aula Homolog LMS PC',
      summary: '',
      content: lexical(MARKER),
      updatedAt: '2026-09-20T00:00:00.000Z',
    });
    seed('lessons', {
      id: 17,
      module: 100,
      title: 'Aula privada do curso',
      summary: '',
      content: lexical(PRIVATE_MARKER),
      updatedAt: '2026-09-20T00:00:00.000Z',
    });
    seed('lessons', {
      id: 18,
      module: 100,
      title: 'Gabarito da prova final',
      summary: '',
      content: lexical('respostas'),
      updatedAt: '2026-09-20T00:00:00.000Z',
    });
  });

  after(() => {
    runtime.overrideRetrievalRuntime(null);
  });

  it('instructor cannot approve_school (403 path preserved)', async () => {
    const sub = await governance.submitLessonForKnowledgeReview({
      payload,
      lessonId: 16,
      user: instructor,
    });
    submissionId = sub.id as number;
    await assert.rejects(
      governance.reviewGovernanceSubmission({
        payload,
        submissionId,
        user: instructor,
        action: 'approve_school',
      }),
      /FORBIDDEN/,
    );
  });

  it('SCHOOL_APPROVED → governed ingest → indexed with lastIndexedAt (SCHOOL_APPROVED_INDEX_TEST)', async () => {
    const before = asyncEventCount(submissionId);
    const updated = await governance.reviewGovernanceSubmission({
      payload,
      submissionId,
      user: admin,
      action: 'approve_school',
    });
    assert.equal(updated.governanceState, 'SCHOOL_APPROVED');
    // Approval ≠ indexed: never eligible synchronously.
    assert.equal(updated.retrievalEligible, false);

    const outcome = await waitForAsyncOutcome(submissionId, before);
    const state = outcome.nextState as Record<string, unknown>;
    assert.equal(outcome.action, 'ingestion_completed', JSON.stringify(state));
    assert.equal(state.indexed, true);
    assert.ok(typeof state.lastIndexedAt === 'string');

    const sub = all('knowledge-governance-submissions').find((d) => d.id === submissionId)!;
    assert.equal(sub.retrievalEligible, true);
    kdId = Number(sub.knowledgeDocument);
    lrId = Number(sub.learningResource);

    const kd = all('knowledge-documents').find((d) => d.id === kdId)!;
    assert.equal(kd.knowledgeScope, 'SCHOOL_APPROVED');
    assert.equal(kd.schoolKey, 'fred-do-frio');
    assert.equal(kd.retrievalEligible, true);
    assert.equal(kd.processingStatus, 'succeeded');
    assert.equal(kd.indexingError, null);

    const chunks = all('knowledge-chunks').filter((c) => Number(c.learningResource) === lrId);
    assert.ok(chunks.length >= 1);
    for (const chunk of chunks) {
      assert.equal(Number(chunk.ownerCompany), 4);
      const row = vectors.rows.get(`chunk:${chunk.id}`);
      assert.ok(row, `vector for chunk ${chunk.id}`);
      // Tenant id space (companies.tenant), not company id.
      assert.equal(row!.tenantId, '5');
      assert.equal(row!.ownerCompanyId, '4');
      assert.equal(row!.allowAiUse, true);
    }
    const ready = all('embedding-records').filter(
      (r) => r.status === 'ready' && chunks.some((c) => c.id === Number(r.chunk)),
    );
    assert.equal(ready.length, chunks.length);
    const pendingForLr = all('embedding-queue').filter(
      (q) => Number(q.learningResource) === lrId && q.status === 'pending',
    );
    assert.equal(pendingForLr.length, 0, 'queue items of the resource are settled');
  });

  it('lastIndexedAt reflects real indexing (LAST_INDEXED_AT_TEST)', async () => {
    const kd = all('knowledge-documents').find((d) => d.id === kdId)!;
    assert.ok(kd.lastIndexedAt, 'lastIndexedAt must be set after verified indexing');
    assert.ok(!Number.isNaN(Date.parse(String(kd.lastIndexedAt))));
  });

  it('authorized Fred student retrieves the marker (FRED_RETRIEVAL_TEST)', async () => {
    const result = await portalSearch(MARKER, fredStudent);
    const chunkIds = new Set(
      all('knowledge-chunks')
        .filter((c) => Number(c.learningResource) === lrId)
        .map((c) => String(c.id)),
    );
    assert.ok(result.candidateCount >= 1);
    assert.ok(
      result.results.some((r) => chunkIds.has(String(r.chunkId))),
      `marker not retrieved: ${JSON.stringify({ c: result.candidateCount, a: result.afterAclCount })}`,
    );

    // Full governance gate (school-aware Tutor subject on a store that keeps scope fields).
    const { Retriever } = await import('@omnia/retrieval');
    const retriever = new Retriever({ embeddingProvider: provider, vectorStore: vectors.full });
    const tutor = await retriever.retrieve(
      { text: MARKER, tenantId: '5', ownerCompanyId: '4', topK: 8 },
      {
        channel: 'portal_chat',
        role: 'student',
        tenantId: '5',
        companyIds: ['4'],
        schoolKey: 'fred-do-frio',
        agentKey: 'tutor',
      },
    );
    assert.ok(tutor.results.some((r) => chunkIds.has(String(r.chunkId))));
  });

  it('same marker is not retrievable for CTE (CTE_ISOLATION_TEST)', async () => {
    const result = await portalSearch(MARKER, cteStudent);
    const chunkIds = new Set(
      all('knowledge-chunks')
        .filter((c) => Number(c.learningResource) === lrId)
        .map((c) => String(c.id)),
    );
    assert.ok(!result.results.some((r) => chunkIds.has(String(r.chunkId))));

    const { Retriever } = await import('@omnia/retrieval');
    const retriever = new Retriever({ embeddingProvider: provider, vectorStore: vectors.full });
    const cteTutor = await retriever.retrieve(
      { text: MARKER, tenantId: '7', ownerCompanyId: '5', topK: 8 },
      {
        channel: 'portal_chat',
        role: 'student',
        tenantId: '7',
        companyIds: ['5'],
        schoolKey: 'cte',
        agentKey: 'tutor',
      },
    );
    assert.ok(!cteTutor.results.some((r) => chunkIds.has(String(r.chunkId))));
    // Even a CTE subject spoofing the Fred company filter is blocked by tenant.
    const spoof = await search.runSemanticSearch(
      payload,
      { text: MARKER, tenantId: '7', ownerCompanyId: '4', topK: 8 },
      { channel: 'portal_chat', role: 'student', tenantId: '7', companyIds: ['5'] },
    );
    assert.ok(!spoof.results.some((r) => chunkIds.has(String(r.chunkId))));
  });

  it('unapproved COURSE_PRIVATE content is never retrievable (COURSE_PRIVATE_TEST)', async () => {
    // Pending review: no ingest at all.
    const pending = await governance.submitLessonForKnowledgeReview({
      payload,
      lessonId: 17,
      user: instructor,
    });
    assert.equal(pending.governanceState, 'PENDING_SCHOOL_REVIEW');
    assert.equal(pending.retrievalEligible, false);
    const r1 = await portalSearch(PRIVATE_MARKER, fredStudent);
    assert.ok(!r1.results.some((r) => r.text.includes('omega evaporador')));

    // Un-governed KI run of a COURSE_PRIVATE LMS resource + global worker drain: the vector exists
    // but is gated (allow_ai_use=false) — no improper visibility.
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'private' },
      file: { data: Buffer.from(PRIVATE_MARKER), name: 'p.txt', size: 1, mimetype: 'text/plain' },
    } as never);
    const lr = await payload.create({
      collection: 'learning-resources',
      data: {
        title: 'Recurso privado',
        media: media.id,
        lesson: 17,
        course: 10,
        ownerCompany: 4,
        resourceType: 'txt',
        origin: 'lms_lesson_asset',
        processingStatus: 'pending',
        knowledgeScope: 'COURSE_PRIVATE',
        retrievalEligible: false,
        governanceState: 'COURSE_PRIVATE',
        schoolKey: 'fred-do-frio',
      },
    } as never);
    const processed = await pipeline.processLearningResource({
      payload,
      learningResourceId: lr.id,
      sourceBuffer: Buffer.from(PRIVATE_MARKER),
      sourceMimeType: 'text/plain',
      preExtracted: { text: PRIVATE_MARKER, meta: {} },
    });
    assert.equal(processed.ok, true);
    await worker.processEmbeddingQueue(payload, { limit: 500 });
    const privateVectors = [...vectors.rows.values()].filter(
      (v) => v.learningResourceId === String(lr.id),
    );
    assert.ok(privateVectors.length >= 1);
    assert.ok(privateVectors.every((v) => v.allowAiUse === false));
    const r2 = await portalSearch(PRIVATE_MARKER, fredStudent);
    assert.ok(!r2.results.some((r) => r.text.includes('omega evaporador')));
    const r3 = await portalSearch(PRIVATE_MARKER, cteStudent);
    assert.ok(!r3.results.some((r) => r.text.includes('omega evaporador')));
  });

  it('retry/re-index is idempotent: no duplicate chunks/vectors/records (IDEMPOTENCY_TEST)', async () => {
    const chunksBefore = all('knowledge-chunks').filter((c) => Number(c.learningResource) === lrId);
    const r1 = await worker.indexLearningResource(payload, {
      learningResourceId: lrId,
      knowledgeDocumentId: kdId,
    });
    const r2 = await worker.indexLearningResource(payload, {
      learningResourceId: lrId,
      knowledgeDocumentId: kdId,
    });
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    const chunksAfter = all('knowledge-chunks').filter((c) => Number(c.learningResource) === lrId);
    assert.equal(chunksAfter.length, chunksBefore.length);
    const lrVectors = [...vectors.rows.values()].filter(
      (v) => v.learningResourceId === String(lrId),
    );
    assert.equal(lrVectors.length, chunksAfter.length);
    for (const chunk of chunksAfter) {
      const recs = all('embedding-records').filter((r) => Number(r.chunk) === chunk.id);
      assert.equal(recs.length, 1, `one embedding record per chunk (${chunk.id})`);
    }

    // Full governed retry (revoke → resubmit → approve): chunks are regenerated, stale vectors of
    // the previous generation must not survive.
    await governance.reviewGovernanceSubmission({
      payload,
      submissionId,
      user: admin,
      action: 'revoke',
      reason: 'retry',
    });
    await governance.submitLessonForKnowledgeReview({ payload, lessonId: 16, user: instructor });
    const before = asyncEventCount(submissionId);
    await governance.reviewGovernanceSubmission({
      payload,
      submissionId,
      user: admin,
      action: 'approve_school',
    });
    const outcome = await waitForAsyncOutcome(submissionId, before);
    assert.equal(outcome.action, 'ingestion_completed');
    const regenerated = all('knowledge-chunks').filter((c) => Number(c.learningResource) === lrId);
    assert.equal(regenerated.length, chunksBefore.length, 'no duplicate chunks after retry');
    const vectorsAfterRetry = [...vectors.rows.values()].filter(
      (v) => v.learningResourceId === String(lrId),
    );
    assert.equal(vectorsAfterRetry.length, regenerated.length, 'no duplicate/stale vectors');
    const currentIds = new Set(regenerated.map((c) => String(c.id)));
    assert.ok(vectorsAfterRetry.every((v) => currentIds.has(v.chunkId)));
    const kd = all('knowledge-documents').filter((d) => d.id === kdId);
    assert.equal(kd.length, 1);
    assert.ok(kd[0]!.lastIndexedAt);
  });

  it('revocation removes vectors and clears lastIndexedAt', async () => {
    await governance.reviewGovernanceSubmission({
      payload,
      submissionId,
      user: admin,
      action: 'revoke',
      reason: 'revogado',
    });
    const lrVectors = [...vectors.rows.values()].filter(
      (v) => v.learningResourceId === String(lrId),
    );
    assert.equal(lrVectors.length, 0);
    const kd = all('knowledge-documents').find((d) => d.id === kdId)!;
    assert.equal(kd.lastIndexedAt, null);
    assert.equal(kd.retrievalEligible, false);
    const result = await portalSearch(MARKER, fredStudent);
    assert.ok(!result.results.some((r) => r.text.includes('zeta compressor')));
  });

  it('indexing failure is recorded, not reported as completed', async () => {
    await governance.submitLessonForKnowledgeReview({ payload, lessonId: 16, user: instructor });
    runtime.overrideRetrievalRuntime({ embeddingProvider: new FailingProvider(provider) });
    try {
      const before = asyncEventCount(submissionId);
      await governance.reviewGovernanceSubmission({
        payload,
        submissionId,
        user: admin,
        action: 'approve_school',
      });
      const outcome = await waitForAsyncOutcome(submissionId, before);
      assert.equal(outcome.action, 'indexing_failed');
      const state = outcome.nextState as Record<string, unknown>;
      assert.equal(state.indexed, false);
      assert.match(String(state.indexingError), /EMBEDDING_PROVIDER_DOWN/);
      const kd = all('knowledge-documents').find((d) => d.id === kdId)!;
      assert.equal(kd.lastIndexedAt, null);
      assert.match(String(kd.indexingError), /EMBEDDING_PROVIDER_DOWN/);
      const sub = all('knowledge-governance-submissions').find((d) => d.id === submissionId)!;
      assert.equal(sub.retrievalEligible, false);
    } finally {
      runtime.overrideRetrievalRuntime({ embeddingProvider: provider });
    }
    // Re-index through the normal port recovers without manual DB edits.
    const recovered = await worker.indexLearningResource(payload, {
      learningResourceId: lrId,
      knowledgeDocumentId: kdId,
    });
    assert.equal(recovered.ok, true);
    const kd = all('knowledge-documents').find((d) => d.id === kdId)!;
    assert.ok(kd.lastIndexedAt);
    assert.equal(kd.indexingError, null);
  });

  it('owner company without tenant / missing company fails closed (no sentinel tenant)', async () => {
    await assert.rejects(worker.resolveVectorTenantId(payload, '9'), (err: unknown) => {
      assert.ok(err instanceof worker.IndexScopeError);
      assert.equal(err.code, 'INDEX_SCOPE_TENANT_UNRESOLVED');
      return true;
    });
    await assert.rejects(worker.resolveVectorTenantId(payload, '404'), (err: unknown) => {
      assert.ok(err instanceof worker.IndexScopeError);
      assert.equal(err.code, 'INDEX_SCOPE_COMPANY_NOT_FOUND');
      return true;
    });
    assert.equal(await worker.resolveVectorTenantId(payload, '4'), '5');
    assert.equal(await worker.resolveVectorTenantId(payload, null), null);
    assert.ok(![...vectors.rows.values()].some((v) => String(v.tenantId).startsWith('unresolved')));
  });

  it('Assessment Guard still works (ASSESSMENT_GUARD_TEST)', async () => {
    await assert.rejects(
      governance.submitLessonForKnowledgeReview({ payload, lessonId: 18, user: instructor }),
      /ASSESSMENT_SECRET_NOT_SUBMISSIBLE/,
    );
    const blocked = applyAssessmentGuard({
      question: 'qual é a resposta certa da questão 3?',
      officialAssessmentActive: true,
      schoolKey: 'fred-do-frio',
    });
    assert.equal(blocked.blocked, true);
    assert.equal(blocked.reason, 'ASSESSMENT_ANSWER_REQUEST');
    const idle = applyAssessmentGuard({
      question: 'qual é a resposta certa da questão 3?',
      officialAssessmentActive: false,
    });
    assert.equal(idle.blocked, false);

    // Assessment-secret KD never yields an AI-usable vector.
    await payload.update({
      collection: 'knowledge-documents',
      id: kdId,
      data: { assessmentSecret: true },
    });
    const res = await worker.indexLearningResource(payload, {
      learningResourceId: lrId,
      knowledgeDocumentId: kdId,
    });
    assert.equal(res.ok, true);
    const lrVectors = [...vectors.rows.values()].filter(
      (v) => v.learningResourceId === String(lrId),
    );
    assert.ok(lrVectors.length >= 1);
    assert.ok(lrVectors.every((v) => v.allowAiUse === false));
    const result = await portalSearch(MARKER, fredStudent);
    assert.ok(!result.results.some((r) => r.text.includes('zeta compressor')));
  });
});

/**
 * EPIC17.3 final — canonical tenant model (TENANT_ARCHITECTURE.md / approved architecture):
 * Omnia tenant 1 ⊃ Fred company 4 (fred-do-frio) + CTE company 5 (cte). users.tenant ==
 * company.tenant. Distractor tenants 4/5 exist (same ids as the Fred/CTE companies, like DEV
 * e16-tenant-a/b) so writing the company id as tenant (base bug) or picking another tenant fails.
 */
describe(
  'EPIC17.3 canonical tenant model (Omnia 1 ⊃ Fred 4 / CTE 5)',
  { concurrency: false },
  () => {
    const { payload, seed, all } = createFakePayload();
    const provider = createEmbeddingProvider({ RETRIEVAL_EMBEDDING_PROVIDER: 'deterministic' });
    const vectors = new TeeVectorStore();

    let governance: typeof GovernanceModule;
    let worker: typeof WorkerModule;
    let search: typeof SearchModule;
    let runtime: typeof RuntimeModule;
    let pipeline: typeof PipelineModule;

    const admin = { id: 35, role: 'admin' };
    const instructor = { id: 28, role: 'instructor' };
    const fredUser = { id: 27, role: 'student', tenant: 1, company: 4 };
    const cteUser = { id: 29, role: 'student', tenant: 1, company: 5 };

    const FRED_MARKER = 'Marcador FRED canonico kappa condensadora fredfrio tenantomnia isolamento';
    const CTE_MARKER = 'Marcador CTE canonico sigma evaporadora ctescola tenantomnia isolamento';
    const NULL_OWNER_MARKER = 'Marcador escola sem dono lambda valvula donoausente';
    const NO_TENANT_MARKER = 'Marcador empresa sem tenant theta termostato tenantausente';

    const lesson = { fred: 40, cte: 41, nullOwner: 42, noTenant: 43 };
    const outcomes = new Map<number, { submissionId: number; lrId: number; kdId: number }>();

    const asyncEvents = (subId: number) =>
      all('knowledge-audit-events').filter(
        (e) =>
          String(e.entityId) === String(subId) &&
          (e.nextState as { async?: boolean } | null)?.async === true,
      );

    async function approveLesson(lessonId: number) {
      const sub = await governance.submitLessonForKnowledgeReview({
        payload,
        lessonId,
        user: instructor,
      });
      const submissionId = sub.id as number;
      const before = asyncEvents(submissionId).length;
      const approved = await governance.reviewGovernanceSubmission({
        payload,
        submissionId,
        user: admin,
        action: 'approve_school',
      });
      assert.equal(approved.governanceState, 'SCHOOL_APPROVED');
      for (let i = 0; i < 400; i += 1) {
        const events = asyncEvents(submissionId);
        if (events.length > before) {
          const stored = all('knowledge-governance-submissions').find(
            (d) => d.id === submissionId,
          )!;
          const lrId = Number(stored.learningResource);
          const kdId = Number(stored.knowledgeDocument);
          outcomes.set(lessonId, { submissionId, lrId, kdId });
          return { outcome: events[events.length - 1]!, submissionId, lrId, kdId };
        }
        await new Promise((r) => setTimeout(r, 5));
      }
      throw new Error(`timeout waiting for governed ingest of lesson ${lessonId}`);
    }

    const lrVectors = (lrId: number) =>
      [...vectors.rows.values()].filter((v) => v.learningResourceId === String(lrId));
    const lrChunkIds = (lrId: number) =>
      new Set(
        all('knowledge-chunks')
          .filter((c) => Number(c.learningResource) === lrId)
          .map((c) => String(c.id)),
      );

    /** Same query/subject shape as POST /api/retrieval/search for a non-staff session. */
    async function portalSearch(
      text: string,
      user: { id: number; role: string; tenant: number; company: number },
    ) {
      return search.runSemanticSearch(
        payload,
        {
          text,
          tenantId: String(user.tenant),
          userId: String(user.id),
          ownerCompanyId: String(user.company),
          topK: 20,
        },
        {
          channel: 'portal_chat',
          role: user.role,
          userId: String(user.id),
          tenantId: String(user.tenant),
          companyIds: [String(user.company)],
        },
      );
    }

    function assertFailedClosed(lrId: number, kdId: number, submissionId: number, code: RegExp) {
      assert.equal(lrVectors(lrId).length, 0, 'no vectors for a resource that failed scope');
      const kd = all('knowledge-documents').find((d) => d.id === kdId)!;
      assert.equal(kd.lastIndexedAt, null);
      assert.match(String(kd.indexingError), code);
      const sub = all('knowledge-governance-submissions').find((d) => d.id === submissionId)!;
      assert.equal(sub.retrievalEligible, false);
      assert.ok(
        !all('knowledge-audit-events').some(
          (e) => String(e.entityId) === String(submissionId) && e.action === 'ingestion_completed',
        ),
        'no ingestion_completed for a failed index',
      );
      const chunkIds = lrChunkIds(lrId);
      assert.ok(chunkIds.size >= 1);
      assert.ok(
        !all('embedding-records').some(
          (r) => chunkIds.has(String(r.chunk)) && r.status === 'ready',
        ),
        'no ready embedding records',
      );
      // Never a NULL/wildcard/sentinel scope on school content anywhere in the index.
      for (const v of vectors.rows.values()) {
        assert.ok(v.ownerCompanyId, `vector ${v.id} has owner company`);
        assert.ok(v.tenantId && /^\d+$/.test(v.tenantId), `vector ${v.id} has a real tenant id`);
      }
    }

    before(async () => {
      runtime = await import('../services/retrieval/runtime');
      runtime.overrideRetrievalRuntime({ vectorStore: vectors, embeddingProvider: provider });
      governance = await import('../services/knowledge/governance');
      worker = await import('../services/retrieval/worker');
      search = await import('../services/retrieval/search');
      pipeline = await import('../services/knowledge-intelligence/pipeline');

      seed('tenants', { id: 1, name: 'Omnia Frigo Holding', slug: 'omnia-holding' });
      seed('tenants', { id: 4, name: 'E2E Staging Tenant A', slug: 'e16-tenant-a' });
      seed('tenants', { id: 5, name: 'E2E Staging Tenant B', slug: 'e16-tenant-b' });
      seed('companies', { id: 1, name: 'Omnia Frigo Holding', tenant: 1 });
      seed('companies', { id: 4, name: 'Fred do Frio', tenant: 1, schoolKey: 'fred-do-frio' });
      seed('companies', { id: 5, name: 'CTE', tenant: 1, schoolKey: 'cte' });
      seed('companies', { id: 12, name: 'Escola sem tenant', schoolKey: 'fred-do-frio' });
      seed('courses', { id: 20, title: 'Curso Fred', schoolKey: 'fred-do-frio', ownerCompany: 4 });
      seed('courses', { id: 21, title: 'Curso CTE', schoolKey: 'cte', ownerCompany: 5 });
      seed('courses', { id: 22, title: 'Curso Fred sem dono', schoolKey: 'fred-do-frio' });
      seed('courses', {
        id: 23,
        title: 'Curso empresa sem tenant',
        schoolKey: 'fred-do-frio',
        ownerCompany: 12,
      });
      const modules: Array<[number, number]> = [
        [200, 20],
        [201, 21],
        [202, 22],
        [203, 23],
      ];
      for (const [id, course] of modules) seed('course-modules', { id, course });
      const lessons: Array<[number, number, string]> = [
        [lesson.fred, 200, FRED_MARKER],
        [lesson.cte, 201, CTE_MARKER],
        [lesson.nullOwner, 202, NULL_OWNER_MARKER],
        [lesson.noTenant, 203, NO_TENANT_MARKER],
      ];
      for (const [id, module, text] of lessons) {
        seed('lessons', {
          id,
          module,
          title: `Aula ${id}`,
          summary: '',
          content: lexical(text),
          updatedAt: '2026-09-20T00:00:00.000Z',
        });
      }
    });

    after(() => {
      runtime.overrideRetrievalRuntime(null);
    });

    it('Fred content → vector tenant_id=1 owner_company_id=4 (FRED_VECTOR_TEST)', async () => {
      const { outcome, lrId } = await approveLesson(lesson.fred);
      assert.equal(outcome.action, 'ingestion_completed', JSON.stringify(outcome.nextState));
      const rows = lrVectors(lrId);
      assert.ok(rows.length >= 1);
      for (const row of rows) {
        assert.equal(row.tenantId, '1', 'companies.tenant, not company id 4 nor tenant 4/5');
        assert.equal(row.ownerCompanyId, '4');
      }
    });

    it('CTE content → vector tenant_id=1 owner_company_id=5 (CTE_VECTOR_TEST)', async () => {
      const { outcome, lrId } = await approveLesson(lesson.cte);
      assert.equal(outcome.action, 'ingestion_completed', JSON.stringify(outcome.nextState));
      const rows = lrVectors(lrId);
      assert.ok(rows.length >= 1);
      for (const row of rows) {
        assert.equal(row.tenantId, '1', 'companies.tenant, not company id 5 nor tenant 5');
        assert.equal(row.ownerCompanyId, '5');
      }
    });

    it('Fred user (tenant 1, company 4): Fred PASS, CTE DENY (FRED_TO_CTE_ISOLATION_TEST)', async () => {
      const fredChunks = lrChunkIds(outcomes.get(lesson.fred)!.lrId);
      const cteChunks = lrChunkIds(outcomes.get(lesson.cte)!.lrId);
      const own = await portalSearch(FRED_MARKER, fredUser);
      assert.ok(
        own.results.some((r) => fredChunks.has(String(r.chunkId))),
        'Fred marker PASS',
      );
      const cross = await portalSearch(CTE_MARKER, fredUser);
      assert.ok(!cross.results.some((r) => cteChunks.has(String(r.chunkId))), 'CTE marker DENY');
      assert.ok(!own.results.some((r) => cteChunks.has(String(r.chunkId))));
    });

    it('CTE user (tenant 1, company 5): CTE PASS, Fred DENY (CTE_TO_FRED_ISOLATION_TEST)', async () => {
      const fredChunks = lrChunkIds(outcomes.get(lesson.fred)!.lrId);
      const cteChunks = lrChunkIds(outcomes.get(lesson.cte)!.lrId);
      const own = await portalSearch(CTE_MARKER, cteUser);
      assert.ok(
        own.results.some((r) => cteChunks.has(String(r.chunkId))),
        'CTE marker PASS',
      );
      const cross = await portalSearch(FRED_MARKER, cteUser);
      assert.ok(!cross.results.some((r) => fredChunks.has(String(r.chunkId))), 'Fred marker DENY');
      assert.ok(!own.results.some((r) => fredChunks.has(String(r.chunkId))));
    });

    it('fixture-bug user (tenant 5 ≠ company tenant 1) does not retrieve — data issue, not code', async () => {
      const fredChunks = lrChunkIds(outcomes.get(lesson.fred)!.lrId);
      const buggy = await portalSearch(FRED_MARKER, { ...fredUser, tenant: 5 });
      assert.ok(!buggy.results.some((r) => fredChunks.has(String(r.chunkId))));
    });

    it('school content with ownerCompany NULL → indexing_failed, no vectors (NULL_OWNER_TEST)', async () => {
      const { outcome, lrId, kdId, submissionId } = await approveLesson(lesson.nullOwner);
      assert.equal(outcome.action, 'indexing_failed', JSON.stringify(outcome.nextState));
      const state = outcome.nextState as Record<string, unknown>;
      assert.equal(state.indexed, false);
      assert.equal(state.lastIndexedAt, null);
      assert.match(String(state.indexingError), /INDEX_SCOPE_OWNER_COMPANY_REQUIRED/);
      assertFailedClosed(lrId, kdId, submissionId, /INDEX_SCOPE_OWNER_COMPANY_REQUIRED/);
      // Global queue drain must not sneak NULL-scope vectors in either.
      await worker.processEmbeddingQueue(payload, { limit: 500 });
      assertFailedClosed(lrId, kdId, submissionId, /INDEX_SCOPE_OWNER_COMPANY_REQUIRED/);
      const r = await portalSearch(NULL_OWNER_MARKER, cteUser);
      assert.ok(!r.results.some((x) => x.text.includes('lambda valvula')));
    });

    it('company tenant unresolved → indexing_failed, no vectors (UNRESOLVED_TENANT_TEST)', async () => {
      const { outcome, lrId, kdId, submissionId } = await approveLesson(lesson.noTenant);
      assert.equal(outcome.action, 'indexing_failed', JSON.stringify(outcome.nextState));
      const state = outcome.nextState as Record<string, unknown>;
      assert.equal(state.indexed, false);
      assert.match(String(state.indexingError), /INDEX_SCOPE_TENANT_UNRESOLVED:12/);
      assertFailedClosed(lrId, kdId, submissionId, /INDEX_SCOPE_TENANT_UNRESOLVED/);
      await worker.processEmbeddingQueue(payload, { limit: 500 });
      assertFailedClosed(lrId, kdId, submissionId, /INDEX_SCOPE_TENANT_UNRESOLVED/);
    });

    it('non-school catalog content without owner keeps legacy NULL scope (unchanged)', async () => {
      const text = 'Catalogo Omnia global mu compressor catalogoglobal sem escola';
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'catalog' },
        file: { data: Buffer.from(text), name: 'c.txt', size: 1, mimetype: 'text/plain' },
      } as never);
      const lr = await payload.create({
        collection: 'learning-resources',
        data: {
          title: 'Catálogo Omnia',
          media: media.id,
          resourceType: 'txt',
          origin: 'knowledge_hub',
          processingStatus: 'pending',
          knowledgeScope: 'OMNIA_APPROVED',
          retrievalEligible: true,
        },
      } as never);
      const processed = await pipeline.processLearningResource({
        payload,
        learningResourceId: lr.id,
        sourceBuffer: Buffer.from(text),
        sourceMimeType: 'text/plain',
        preExtracted: { text, meta: {} },
      });
      assert.equal(processed.ok, true);
      const res = await worker.indexLearningResource(payload, { learningResourceId: lr.id });
      assert.equal(res.ok, true, String(res.error));
      const rows = lrVectors(lr.id as number);
      assert.ok(rows.length >= 1);
      assert.ok(rows.every((v) => v.ownerCompanyId == null && v.tenantId == null));
      // Remove so the global "no NULL school vectors" invariant stays about school content.
      await worker.deindexLearningResource(payload, { learningResourceId: lr.id, reason: 'test' });
    });

    it('re-index after company loses its tenant removes existing vectors (no leftovers)', async () => {
      const { lrId, kdId } = outcomes.get(lesson.fred)!;
      assert.ok(lrVectors(lrId).length >= 1);
      await payload.update({ collection: 'companies', id: 4, data: { tenant: null } });
      try {
        const res = await worker.indexLearningResource(payload, {
          learningResourceId: lrId,
          knowledgeDocumentId: kdId,
        });
        assert.equal(res.ok, false);
        assert.match(String(res.error), /INDEX_SCOPE_TENANT_UNRESOLVED:4/);
        assert.equal(res.lastIndexedAt, null);
        assert.equal(lrVectors(lrId).length, 0);
        const kd = all('knowledge-documents').find((d) => d.id === kdId)!;
        assert.equal(kd.lastIndexedAt, null);
        const chunkIds = lrChunkIds(lrId);
        assert.ok(
          !all('embedding-records').some(
            (r) => chunkIds.has(String(r.chunk)) && r.status === 'ready',
          ),
        );
      } finally {
        await payload.update({ collection: 'companies', id: 4, data: { tenant: 1 } });
      }
      const recovered = await worker.indexLearningResource(payload, {
        learningResourceId: lrId,
        knowledgeDocumentId: kdId,
      });
      assert.equal(recovered.ok, true);
      assert.ok(lrVectors(lrId).every((v) => v.tenantId === '1' && v.ownerCompanyId === '4'));
    });
  },
);
