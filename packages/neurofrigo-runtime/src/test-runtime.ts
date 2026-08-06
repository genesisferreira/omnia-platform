import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CitationResult, RetrievalResult } from '@omnia/retrieval';

import { ContextBuilder } from './context/context-builder';
import { PromptBuilder } from './prompt/prompt-builder';
import { GroundedExtractiveProvider } from './adapters/llm/grounded-extractive';
import { NeurofrigoRuntime } from './runtime/runtime';
import type { RetrievalPort } from './ports';

function citation(partial: Partial<CitationResult> & Pick<CitationResult, 'chunkId' | 'text'>): CitationResult {
  return {
    score: 0.9,
    similarity: 0.9,
    tokenEstimate: 20,
    language: 'pt-BR',
    tags: [],
    citation: {
      knowledgeDocumentId: 'd1',
      courseId: '1',
      moduleId: null,
      lessonId: '2',
      learningResourceId: '3',
      chunkId: partial.chunkId,
      page: null,
      version: '1.0.0',
    },
    ...partial,
  };
}

describe('neurofrigo-runtime', () => {
  it('context builder includes course/lesson/permissions', () => {
    const ctx = new ContextBuilder().build({
      question: 'o que é compressor?',
      identity: { userId: '9', role: 'student', language: 'pt-BR' },
      course: {
        courseId: '1',
        courseTitle: 'Fundamentos',
        lessonId: '2',
        lessonTitle: 'Ciclo',
      },
    });
    assert.equal(ctx.courseId, '1');
    assert.equal(ctx.lessonId, '2');
    assert.ok(ctx.permissions.includes('ai.ask'));
  });

  it('prompt builder never omits sources block', () => {
    const prompt = new PromptBuilder().build({
      question: 'explique a válvula',
      context: new ContextBuilder().build({
        question: 'x',
        identity: {},
        course: { courseTitle: 'Curso X' },
      }),
      chunks: [
        citation({
          chunkId: 'c1',
          text: 'A válvula de expansão controla o refrigerante.',
        }),
      ],
      limits: {
        maxContextChunks: 6,
        maxPromptTokens: 3500,
        maxCompletionTokens: 800,
        timeoutMs: 1000,
        minSimilarity: 0.3,
      },
    });
    assert.match(prompt.system, /FONTES|trechos/i);
    assert.match(prompt.user, /chunk:c1/);
    assert.deepEqual(prompt.citationIds, ['c1']);
  });

  it('runtime returns answer with citations via retrieval port', async () => {
    const retrieval: RetrievalPort = {
      async search() {
        const result: RetrievalResult = {
          query: 'válvula',
          tookMs: 5,
          provider: 'deterministic',
          model: 'm',
          dimensions: 64,
          filters: {},
          results: [
            citation({
              chunkId: '11',
              text: 'A válvula de expansão termostática regula o fluxo.',
              similarity: 0.88,
              score: 0.95,
            }),
          ],
          recoveredTokens: 40,
          candidateCount: 1,
          afterAclCount: 1,
        };
        return result;
      },
    };

    const runtime = new NeurofrigoRuntime({
      retrieval,
      llm: new GroundedExtractiveProvider(),
    });

    const answer = await runtime.ask({
      question: 'Como funciona a válvula de expansão?',
      identity: { userId: '1', role: 'student' },
      course: { courseId: '1', courseTitle: 'Fundamentos' },
    });

    assert.equal(answer.status, 'ok');
    assert.ok(answer.text.length > 10);
    assert.ok(answer.sources.length >= 1);
    assert.equal(answer.sources[0]?.chunkId, '11');
    assert.ok(answer.confidence > 0);
    assert.ok(answer.tookMs >= 0);
  });

  it('runtime returns not_found when retrieval empty', async () => {
    const retrieval: RetrievalPort = {
      async search() {
        return {
          query: 'xyz',
          tookMs: 1,
          provider: 'deterministic',
          model: 'm',
          dimensions: 64,
          filters: {},
          results: [],
          recoveredTokens: 0,
          candidateCount: 0,
          afterAclCount: 0,
        };
      },
    };

    const runtime = new NeurofrigoRuntime({
      retrieval,
      llm: new GroundedExtractiveProvider(),
    });

    const answer = await runtime.ask({
      question: 'conteúdo inexistente na base',
      identity: {},
      course: { courseId: '1' },
    });

    assert.equal(answer.status, 'not_found');
    assert.equal(answer.sources.length, 0);
  });
});
