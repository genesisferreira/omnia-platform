import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DefaultAclFilter } from './acl/default-acl-filter';
import { DeterministicEmbeddingProvider } from './adapters/embedding/deterministic-provider';
import { InMemoryVectorStore } from './adapters/vector/in-memory-store';
import { CitationBuilder } from './citations/citation-builder';
import { WeightedRanker } from './ranking/weighted-ranker';
import { Retriever } from './retriever/retriever';
import { chunkChecksum, cosineSimilarity } from './domain/utils';
import type { VectorRecord } from './domain/types';

function sampleRecord(
  partial: Partial<VectorRecord> & Pick<VectorRecord, 'id' | 'chunkId' | 'text' | 'embedding'>,
): VectorRecord {
  return {
    tokenEstimate: 10,
    allowAiUse: true,
    publicationStatus: 'published',
    status: 'published',
    visibility: 'public',
    ...partial,
  };
}

describe('retrieval domain', () => {
  it('deterministic embeddings are stable and similar for related text', async () => {
    const provider = new DeterministicEmbeddingProvider({ dimensions: 64 });
    const a = await provider.generate('compressor scroll refrigeração industrial');
    const b = await provider.generate('compressor scroll refrigeração industrial');
    const c = await provider.generate('receita de bolo de chocolate');
    assert.equal(a.length, 64);
    assert.deepEqual(a, b);
    assert.ok(cosineSimilarity(a, b) > 0.99);
    assert.ok(cosineSimilarity(a, c) < cosineSimilarity(a, b));
  });

  it('ranker boosts course/lesson matches', () => {
    const ranker = new WeightedRanker();
    const ranked = ranker.rank(
      [
        {
          similarity: 0.8,
          record: sampleRecord({
            id: '1',
            chunkId: 'c1',
            text: 'a',
            embedding: [1],
            courseId: '10',
            lessonId: '20',
          }),
        },
        {
          similarity: 0.82,
          record: sampleRecord({
            id: '2',
            chunkId: 'c2',
            text: 'b',
            embedding: [1],
            courseId: '99',
          }),
        },
      ],
      { courseId: '10', lessonId: '20' },
    );
    assert.equal(ranked[0]?.record.chunkId, 'c1');
    assert.ok((ranked[0]?.rankScore ?? 0) > (ranked[1]?.rankScore ?? 0));
  });

  it('citation builder never omits reference', () => {
    const builder = new CitationBuilder();
    const results = builder.build([
      {
        similarity: 0.9,
        rankScore: 1,
        rankReasons: [],
        record: sampleRecord({
          id: 'v1',
          chunkId: 'chunk-1',
          text: 'conteúdo',
          embedding: [1],
          knowledgeDocumentId: 'doc-1',
          learningResourceId: 'lr-1',
          courseId: 'c-1',
          moduleId: 'm-1',
          lessonId: 'l-1',
          page: 2,
          version: '1.0.0',
        }),
      },
    ]);
    assert.equal(results.length, 1);
    assert.equal(results[0]?.citation.chunkId, 'chunk-1');
    assert.equal(results[0]?.citation.knowledgeDocumentId, 'doc-1');
    assert.equal(results[0]?.citation.page, 2);
  });

  it('acl filter blocks cross-tenant hits for portal users', async () => {
    const acl = new DefaultAclFilter();
    const filtered = await acl.filter(
      [
        {
          similarity: 1,
          record: sampleRecord({
            id: '1',
            chunkId: 'tenant-a-doc',
            text: 'a',
            embedding: [1],
            tenantId: 'tenant-a',
          }),
        },
        {
          similarity: 1,
          record: sampleRecord({
            id: '2',
            chunkId: 'tenant-b-doc',
            text: 'b',
            embedding: [1],
            tenantId: 'tenant-b',
          }),
        },
      ],
      { channel: 'portal_chat', tenantId: 'tenant-a' },
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.record.chunkId, 'tenant-a-doc');
  });

  it('acl filter blocks foreign ownerCompany for non-shared visibility', async () => {
    const acl = new DefaultAclFilter();
    const filtered = await acl.filter(
      [
        {
          similarity: 1,
          record: sampleRecord({
            id: '1',
            chunkId: 'co-a',
            text: 'a',
            embedding: [1],
            ownerCompanyId: 'company-a',
            visibility: 'internal',
          }),
        },
        {
          similarity: 1,
          record: sampleRecord({
            id: '2',
            chunkId: 'co-b',
            text: 'b',
            embedding: [1],
            ownerCompanyId: 'company-b',
            visibility: 'internal',
          }),
        },
      ],
      { channel: 'portal_chat', companyIds: ['company-a'] },
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.record.chunkId, 'co-a');
  });

  it('acl filter blocks allowAiUse=false and unpublished', async () => {
    const acl = new DefaultAclFilter();
    const filtered = await acl.filter(
      [
        {
          similarity: 1,
          record: sampleRecord({
            id: '1',
            chunkId: 'a',
            text: 'ok',
            embedding: [1],
            allowAiUse: true,
            publicationStatus: 'published',
          }),
        },
        {
          similarity: 1,
          record: sampleRecord({
            id: '2',
            chunkId: 'b',
            text: 'blocked',
            embedding: [1],
            allowAiUse: false,
          }),
        },
        {
          similarity: 1,
          record: sampleRecord({
            id: '3',
            chunkId: 'c',
            text: 'draft',
            embedding: [1],
            publicationStatus: 'draft',
          }),
        },
      ],
      { channel: 'portal_chat' },
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.record.chunkId, 'a');
  });

  it('portal_public ACL keeps only public visibility', async () => {
    const { DefaultAclFilter } = await import('./acl/default-acl-filter');
    const filter = new DefaultAclFilter();
    const filtered = await filter.filter(
      [
        {
          similarity: 1,
          record: sampleRecord({
            id: '1',
            chunkId: 'pub',
            text: 'omnia',
            embedding: [1],
            visibility: 'public',
            allowAiUse: true,
            publicationStatus: 'published',
          }),
        },
        {
          similarity: 1,
          record: sampleRecord({
            id: '2',
            chunkId: 'int',
            text: 'secret',
            embedding: [1],
            visibility: 'internal',
            allowAiUse: true,
            publicationStatus: 'published',
          }),
        },
      ],
      { channel: 'portal_public' },
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.record.chunkId, 'pub');
  });

  it('engineering assistant can read neurofrigo-technology tagged chunks', async () => {
    const { DefaultAclFilter } = await import('./acl/default-acl-filter');
    const filter = new DefaultAclFilter();
    const filtered = await filter.filter(
      [
        {
          similarity: 1,
          record: sampleRecord({
            id: '1',
            chunkId: 'tech',
            text: 'CO2',
            embedding: [1],
            visibility: 'enrolled',
            allowAiUse: true,
            publicationStatus: 'published',
            tags: ['agent:neurofrigo-technology'],
          }),
        },
      ],
      { channel: 'portal_chat', agentKey: 'engineering' },
    );
    assert.equal(filtered.length, 1);
  });

  it('shared enrolled catalog is readable across company membership', async () => {
    const { DefaultAclFilter } = await import('./acl/default-acl-filter');
    const filter = new DefaultAclFilter();
    const filtered = await filter.filter(
      [
        {
          similarity: 1,
          record: sampleRecord({
            id: '1',
            chunkId: 'shared',
            text: 'curso',
            embedding: [1],
            visibility: 'enrolled',
            allowAiUse: true,
            publicationStatus: 'published',
            ownerCompanyId: '3',
          }),
        },
      ],
      { channel: 'portal_chat', companyIds: ['10'], agentKey: 'tutor' },
    );
    assert.equal(filtered.length, 1);
  });

  it('soft scope keeps shared catalog rows when tenant/company/course are set', async () => {
    const provider = new DeterministicEmbeddingProvider({ dimensions: 64 });
    const store = new InMemoryVectorStore();
    const emb = await provider.generate('controle CO2 transcrítico refrigeração');
    await store.insert(
      sampleRecord({
        id: 'shared-1',
        chunkId: 'shared-chunk',
        text: 'Controle CO2 transcrítico em sistemas de refrigeração industrial.',
        embedding: emb,
        tenantId: null,
        ownerCompanyId: null,
        courseId: null,
        visibility: 'enrolled',
        allowAiUse: true,
        publicationStatus: 'published',
      }),
    );
    const retriever = new Retriever({ embeddingProvider: provider, vectorStore: store });
    const result = await retriever.retrieve(
      {
        text: 'controle CO2 transcrítico',
        tenantId: '4',
        ownerCompanyId: '10',
        courseId: '1',
        topK: 3,
      },
      { channel: 'portal_chat', tenantId: '4' },
    );
    assert.ok(result.candidateCount >= 1);
    assert.ok(result.afterAclCount >= 1);
    assert.ok(result.results.length >= 1);
  });

  it('end-to-end retriever returns structured JSON without LLM', async () => {
    const provider = new DeterministicEmbeddingProvider({ dimensions: 64 });
    const store = new InMemoryVectorStore();
    const emb = await provider.generate('válvula de expansão termostática');
    await store.insert(
      sampleRecord({
        id: 'vec-1',
        chunkId: 'chunk-1',
        text: 'A válvula de expansão termostática controla o fluxo de refrigerante.',
        embedding: emb,
        knowledgeDocumentId: 'doc-1',
        learningResourceId: 'lr-1',
        courseId: 'course-1',
        lessonId: 'lesson-1',
      }),
    );
    assert.ok(chunkChecksum('x').length === 64);

    const retriever = new Retriever({ embeddingProvider: provider, vectorStore: store });
    const result = await retriever.retrieve(
      { text: 'como funciona a válvula de expansão?', courseId: 'course-1', topK: 3 },
      { channel: 'portal_chat' },
    );

    assert.ok(result.results.length >= 1);
    assert.ok(result.results[0]?.citation.chunkId);
    assert.equal(result.provider, 'deterministic');
    const session = retriever.toSearchSession(result, { userId: 'u1' });
    assert.equal(session.query, result.query);
    assert.ok(session.chunkIds.length >= 1);
    assert.ok(session.tookMs >= 0);
  });
});
