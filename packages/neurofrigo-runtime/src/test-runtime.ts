import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CitationResult, RetrievalResult } from '@omnia/retrieval';

import { ContextBuilder } from './context/context-builder';
import { PromptBuilder } from './prompt/prompt-builder';
import { classifyIntent } from './intent/classify-intent';
import { formatResponse } from './formatter/response-formatter';
import { computeGroundingScore } from './quality/grounding-score';
import { GroundedExtractiveProvider } from './adapters/llm/grounded-extractive';
import { NeurofrigoRuntime } from './runtime/runtime';
import { DEFAULT_GUARDRAIL_LIMITS, NOT_FOUND_MESSAGE } from './domain/types';
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
      page: 2,
      version: '1.0.0',
    },
    ...partial,
  };
}

describe('neurofrigo-runtime experience v2', () => {
  it('classifies intents', () => {
    assert.equal(classifyIntent('O que é um compressor scroll?'), 'definition');
    assert.equal(classifyIntent('Como instalar a válvula passo a passo?'), 'procedural');
    assert.equal(classifyIntent('Diferença entre expansão termostática e eletrônica'), 'comparative');
    assert.equal(classifyIntent('O equipamento não liga, qual a causa?'), 'troubleshooting');
  });

  it('context builder v2 includes profile and objectives', () => {
    const ctx = new ContextBuilder().build({
      question: 'x',
      identity: { userId: '9', role: 'student', language: 'pt-BR', tenantId: 't1' },
      course: {
        courseId: '1',
        courseTitle: 'Fundamentos',
        lessonId: '2',
        lessonTitle: 'Ciclo',
        lessonObjectives: 'Compreender o ciclo de refrigeração',
      },
      conversationHistory: [{ question: 'q1', answer: 'a1' }],
    });
    assert.equal(ctx.profileLabel, 'Aluno');
    assert.equal(ctx.lessonObjectives, 'Compreender o ciclo de refrigeração');
    assert.equal(ctx.tenantId, 't1');
    assert.ok(ctx.permissions.includes('ai.session_followup'));
  });

  it('prompt builder adapts by intent and includes history', () => {
    const prompt = new PromptBuilder().build({
      question: 'Como medir a pressão passo a passo?',
      context: new ContextBuilder().build({
        question: 'x',
        identity: { role: 'student' },
        course: { courseTitle: 'Curso X', lessonObjectives: 'Medições' },
        conversationHistory: [
          { question: 'O que é manômetro?', answer: 'Instrumento de pressão.' },
        ],
      }),
      chunks: [citation({ chunkId: 'c1', text: 'Meça a pressão no serviço alto.' })],
      limits: {
        maxContextChunks: 6,
        maxPromptTokens: 3500,
        maxCompletionTokens: 800,
        timeoutMs: 1000,
        minSimilarity: 0.3,
        maxHistoryTurns: 4,
      },
    });
    assert.equal(prompt.intent, 'procedural');
    assert.match(prompt.system, /passos numerados/i);
    assert.match(prompt.user, /HISTÓRICO DA SESSÃO/);
    assert.match(prompt.user, /manômetro/);
  });

  it('formatter and grounding score work', () => {
    const formatted = formatResponse({
      text: 'Passo A\nPasso B',
      intent: 'procedural',
      status: 'ok',
    });
    assert.match(formatted, /## /);
    assert.match(formatted, /Nota de segurança/);

    const g = computeGroundingScore({
      chunks: [
        citation({ chunkId: '1', text: 'abc'.repeat(100), similarity: 0.8, score: 0.85 }),
        citation({ chunkId: '2', text: 'def'.repeat(100), similarity: 0.7, score: 0.75 }),
      ],
      confidence: 0.75,
      contextChars: 600,
    });
    assert.ok(g.score > 0.4);
    assert.equal(g.sourceCount, 2);
  });

  it('guardrail rejects off-topic chunks despite similarity', async () => {
    const { applyRetrievalGuardrails } = await import('./guardrails');
    const decision = applyRetrievalGuardrails(
      'Qual o placar do Flamengo contra Vasco em 2099?',
      [
        citation({
          chunkId: 'x',
          text: 'A válvula de expansão termostática regula o fluxo de refrigerante no evaporador.',
          similarity: 0.55,
          score: 0.6,
        }),
      ],
      { ...DEFAULT_GUARDRAIL_LIMITS, minSimilarity: 0.3 },
    );
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.code, 'OFF_TOPIC');
  });

  it('runtime follow-up + explainability + not_found message', async () => {
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
      conversationHistory: [
        { question: 'O que é refrigerante?', answer: 'Fluido do ciclo.' },
      ],
    });

    assert.equal(answer.status, 'ok');
    assert.ok(answer.formattedText.includes('##'));
    assert.ok(answer.sources.length >= 1);
    assert.ok(answer.explainability);
    assert.ok((answer.grounding?.score ?? 0) > 0);
    assert.ok(answer.intent);

    const empty: RetrievalPort = {
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
    const nf = await new NeurofrigoRuntime({
      retrieval: empty,
      llm: new GroundedExtractiveProvider(),
    }).ask({
      question: 'conteúdo inexistente',
      identity: {},
      course: { courseId: '1' },
    });
    assert.equal(nf.status, 'not_found');
    assert.equal(nf.text, NOT_FOUND_MESSAGE);
  });
});
