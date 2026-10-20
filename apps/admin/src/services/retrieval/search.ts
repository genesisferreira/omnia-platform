import type { Payload } from 'payload';
import { Retriever, type RetrievalQuery, type RetrievalResult } from '@omnia/retrieval';

import { asPayloadJson } from '../../lib/payload-relation-id';
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
    agentKey?: string | null;
    channel?: 'portal_chat' | 'portal_public' | 'admin' | 'system' | 'command';
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

  const userNumeric =
    session.userId && /^\d+$/.test(String(session.userId)) ? Number(session.userId) : null;
  const tenantNumeric =
    session.tenantId && /^\d+$/.test(String(session.tenantId)) ? Number(session.tenantId) : null;
  const companyNumeric =
    session.ownerCompanyId && /^\d+$/.test(String(session.ownerCompanyId))
      ? Number(session.ownerCompanyId)
      : null;

  const data = {
    query: session.query,
    tookMs: session.tookMs,
    provider: session.provider,
    model: session.model,
    resultCount: session.resultCount,
    recoveredTokens: session.recoveredTokens,
    filters: asPayloadJson(session.filters),
    chunkIds: session.chunkIds.map((chunkId) => ({ chunkId })),
    scores: session.scores.map((score) => ({ score })),
    ...(userNumeric != null ? { user: userNumeric } : {}),
    ...(tenantNumeric != null ? { tenant: tenantNumeric } : {}),
    ...(companyNumeric != null ? { ownerCompany: companyNumeric } : {}),
  };

  await payload.create({
    collection: 'search-sessions',
    data,
    overrideAccess: true,
    context: { retrievalPipelineActive: true },
  });

  await refreshRetrievalDashboard(payload).catch(() => undefined);
  return result;
}
