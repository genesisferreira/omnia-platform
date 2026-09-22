import type { RetrievalQuery, RetrievalResult, SearchSessionInput } from '../domain/types';
import { estimateTokens } from '../domain/utils';
import type {
  AclFilterPort,
  AclSubject,
  CitationBuilderPort,
  EmbeddingProviderPort,
  RankerPort,
  VectorStorePort,
} from '../ports';
import { CitationBuilder } from '../citations/citation-builder';
import { DefaultAclFilter } from '../acl/default-acl-filter';
import { WeightedRanker } from '../ranking/weighted-ranker';

export type RetrieverDeps = {
  embeddingProvider: EmbeddingProviderPort;
  vectorStore: VectorStorePort;
  aclFilter?: AclFilterPort;
  ranker?: RankerPort;
  citationBuilder?: CitationBuilderPort;
};

/**
 * Motor de retrieval — orquestra ports sem conhecer Payload/pgvector/provider.
 */
export class Retriever {
  private readonly embeddingProvider: EmbeddingProviderPort;
  private readonly vectorStore: VectorStorePort;
  private readonly aclFilter: AclFilterPort;
  private readonly ranker: RankerPort;
  private readonly citationBuilder: CitationBuilderPort;

  constructor(deps: RetrieverDeps) {
    this.embeddingProvider = deps.embeddingProvider;
    this.vectorStore = deps.vectorStore;
    this.aclFilter = deps.aclFilter ?? new DefaultAclFilter();
    this.ranker = deps.ranker ?? new WeightedRanker();
    this.citationBuilder = deps.citationBuilder ?? new CitationBuilder();
  }

  async retrieve(query: RetrievalQuery, subject: AclSubject = {}): Promise<RetrievalResult> {
    const started = Date.now();
    const topK = query.topK ?? 8;
    const multiplier = query.candidateMultiplier ?? 4;
    const meta = this.embeddingProvider.metadata();

    const embedding = await this.embeddingProvider.generate(query.text);

    const filters = {
      tenantId: query.tenantId ?? subject.tenantId ?? null,
      ownerCompanyId: query.ownerCompanyId ?? null,
      courseId: query.courseId ?? null,
      lessonId: query.lessonId ?? null,
      language: query.language ?? null,
      tags: query.tags,
    };

    const candidates = await this.vectorStore.search(
      embedding,
      filters,
      Math.max(topK * multiplier, topK),
    );

    const afterAcl = await this.aclFilter.filter(candidates, {
      ...subject,
      tenantId: subject.tenantId ?? query.tenantId,
      userId: subject.userId ?? query.userId,
    });

    const ranked = this.ranker.rank(afterAcl, {
      courseId: query.courseId,
      lessonId: query.lessonId,
      moduleId: query.moduleId,
    });

    const top = ranked.slice(0, topK);
    const results = this.citationBuilder.build(top);
    const recoveredTokens = results.reduce(
      (sum, r) => sum + (r.tokenEstimate || estimateTokens(r.text)),
      0,
    );

    return {
      query: query.text,
      tookMs: Date.now() - started,
      provider: meta.name,
      model: meta.model,
      dimensions: meta.dimensions,
      filters,
      results,
      recoveredTokens,
      candidateCount: candidates.length,
      afterAclCount: afterAcl.length,
    };
  }

  toSearchSession(
    result: RetrievalResult,
    extras: {
      tenantId?: string | null;
      userId?: string | null;
      ownerCompanyId?: string | null;
    } = {},
  ): SearchSessionInput {
    return {
      query: result.query,
      tookMs: result.tookMs,
      provider: result.provider,
      model: result.model,
      filters: result.filters,
      chunkIds: result.results.map((r) => r.chunkId),
      scores: result.results.map((r) => r.score),
      recoveredTokens: result.recoveredTokens,
      resultCount: result.results.length,
      tenantId: extras.tenantId ?? null,
      userId: extras.userId ?? null,
      ownerCompanyId: extras.ownerCompanyId ?? null,
    };
  }
}
