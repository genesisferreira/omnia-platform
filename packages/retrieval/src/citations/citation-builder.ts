import type { CitationResult, RankedHit } from '../domain/types';
import type { CitationBuilderPort } from '../ports';

/**
 * Toda resposta de retrieval deve carregar referência estruturada.
 * Nunca retorna conteúdo sem citation.
 */
export class CitationBuilder implements CitationBuilderPort {
  build(hits: RankedHit[]): CitationResult[] {
    const out: CitationResult[] = [];
    for (const hit of hits) {
      const chunkId = hit.record.chunkId;
      if (!chunkId) continue;

      out.push({
        chunkId,
        text: hit.record.text,
        score: hit.rankScore,
        similarity: hit.similarity,
        tokenEstimate: hit.record.tokenEstimate,
        language: hit.record.language ?? null,
        tags: hit.record.tags ?? [],
        citation: {
          knowledgeDocumentId: hit.record.knowledgeDocumentId ?? null,
          courseId: hit.record.courseId ?? null,
          moduleId: hit.record.moduleId ?? null,
          lessonId: hit.record.lessonId ?? null,
          learningResourceId: hit.record.learningResourceId ?? null,
          chunkId,
          page: hit.record.page ?? null,
          version: hit.record.version ?? null,
        },
      });
    }
    return out;
  }
}
