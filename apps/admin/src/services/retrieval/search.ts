import type { Payload } from 'payload';
import { Retriever, type RetrievalQuery, type RetrievalResult } from '@omnia/retrieval';

import { getEmbeddingProvider, getVectorStore } from './runtime';
import { refreshRetrievalDashboard } from './dashboard';

export async function runSemanticSearch(
  payload: Payload,
  query: RetrievalQuery,
  subject: {
    role?: string | null;
    userId?: string | null;
    tenantId?: string | null;
    companyIds?: Array<string | number>;
    channel?: 'portal_chat' | 'admin' | 'system' | 'command';
  } = { channel: 'system' },
): Promise<RetrievalResult> {
  const retriever = new Retriever({
    embeddingProvider: getEmbeddingProvider(),
    vectorStore: await getVectorStore(),
  });

  const result = await retriever.retrieve(query, subject);
  const session = retriever.toSearchSession(result, {
    tenantId: query.tenantId ?? subject.tenantId,
    userId: query.userId ?? subject.userId,
    ownerCompanyId: query.ownerCompanyId,
  });

  await payload.create({
    collection: 'search-sessions',
    data: {
      query: session.query,
      tookMs: session.tookMs,
      provider: session.provider,
      model: session.model,
      resultCount: session.resultCount,
      recoveredTokens: session.recoveredTokens,
      filters: session.filters,
      chunkIds: session.chunkIds.map((chunkId) => ({ chunkId })),
      scores: session.scores.map((score) => ({ score })),
      tenant: session.tenantId ? Number(session.tenantId) || session.tenantId : undefined,
      user: session.userId ? Number(session.userId) || session.userId : undefined,
      ownerCompany: session.ownerCompanyId
        ? Number(session.ownerCompanyId) || session.ownerCompanyId
        : undefined,
    },
    overrideAccess: true,
    context: { retrievalPipelineActive: true },
  });

  await refreshRetrievalDashboard(payload).catch(() => undefined);
  return result;
}
