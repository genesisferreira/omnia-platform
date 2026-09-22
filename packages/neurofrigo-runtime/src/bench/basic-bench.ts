import { GroundedExtractiveProvider } from '../adapters/llm/grounded-extractive';
import { NeurofrigoRuntime } from '../runtime/runtime';
import type { RetrievalPort } from '../ports';
import type { CitationResult } from '@omnia/retrieval';

async function main() {
  const chunks: CitationResult[] = Array.from({ length: 20 }, (_, i) => ({
    chunkId: `c-${i}`,
    text: `Trecho ${i} sobre refrigeração industrial compressor evaporador condensador.`,
    score: 0.9 - i * 0.01,
    similarity: 0.85 - i * 0.01,
    tokenEstimate: 30,
    language: 'pt-BR',
    tags: [],
    citation: {
      knowledgeDocumentId: `d-${i}`,
      courseId: '1',
      moduleId: null,
      lessonId: null,
      learningResourceId: `lr-${i}`,
      chunkId: `c-${i}`,
      page: null,
      version: '1',
    },
  }));

  const retrieval: RetrievalPort = {
    async search() {
      return {
        query: 'q',
        tookMs: 2,
        provider: 'deterministic',
        model: 'm',
        dimensions: 64,
        filters: {},
        results: chunks.slice(0, 6),
        recoveredTokens: 180,
        candidateCount: 20,
        afterAclCount: 6,
      };
    },
  };

  const runtime = new NeurofrigoRuntime({
    retrieval,
    llm: new GroundedExtractiveProvider(),
  });

  const n = 100;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await runtime.ask({
      question: 'como funciona o compressor?',
      identity: { userId: '1' },
      course: { courseId: '1', courseTitle: 'Fundamentos' },
    });
  }
  const ms = Date.now() - t0;
  console.log(
    JSON.stringify(
      {
        asks: n,
        totalMs: ms,
        avgMs: Math.round(ms / n),
        provider: 'grounded',
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
