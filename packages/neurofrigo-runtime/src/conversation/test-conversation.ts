import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeConfidence, formatConfidencePercent } from './normalize-confidence';
import { looksLikeInternalLeak, sanitizeEvidenceText } from './sanitize-evidence';
import { synthesizeConversationalAnswer } from './synthesize-answer';
import { buildSuggestedActions } from './suggested-actions';
import { friendlySourceTitle } from './source-label';
import { buildCapabilityAnswer } from '../domain/capability-response';
import { GroundedExtractiveProvider } from '../adapters/llm/grounded-extractive';
import { NeurofrigoRuntime } from '../runtime/runtime';
import type { RetrievalPort } from '../ports';
import type { CitationResult, RetrievalResult } from '@omnia/retrieval';

function citation(
  partial: Partial<CitationResult> & Pick<CitationResult, 'chunkId' | 'text'>,
): CitationResult {
  return {
    score: 0.9,
    similarity: 0.9,
    tokenEstimate: 20,
    language: 'pt-BR',
    tags: [],
    citation: {
      knowledgeDocumentId: 'd1',
      courseId: null,
      moduleId: null,
      lessonId: null,
      learningResourceId: '3',
      chunkId: partial.chunkId,
      page: 1,
      version: '1.0.0',
    },
    ...partial,
  };
}

describe('conversation experience r4', () => {
  it('normalizes confidence — never NaN', () => {
    assert.equal(normalizeConfidence(NaN), null);
    assert.equal(normalizeConfidence(Infinity), null);
    assert.equal(normalizeConfidence(undefined), null);
    assert.equal(normalizeConfidence(0.595), 0.595);
    assert.equal(formatConfidencePercent(NaN), null);
    assert.equal(formatConfidencePercent(0.5), '50%');
  });

  it('sanitizes evidence and detects leaks', () => {
    const raw = 'EPIC16_PUBLIC_INSTITUTIONAL_V1 # Omnia Frigo Holding é o hub. [chunk:191]';
    const clean = sanitizeEvidenceText(raw);
    assert.ok(!/EPIC16/i.test(clean));
    assert.ok(!/chunk:/i.test(clean));
    assert.ok(looksLikeInternalLeak('Pontos principais do material sobre X'));
    assert.ok(looksLikeInternalLeak('Posso ajudar com: RAG'));
  });

  it('capability presentation never exposes RAG/Citations/Routing', () => {
    const text = buildCapabilityAnswer({
      assistantKey: 'concierge',
      channel: 'portal_public',
      capabilities: ['rag', 'citations', 'routing'],
      description: 'Assistente institucional',
    });
    assert.ok(!/\bRAG\b/i.test(text));
    assert.ok(!/\bCitations\b/i.test(text));
    assert.ok(!/\bRouting\b/i.test(text));
    assert.match(text, /cursos|serviços|empresas/i);
  });

  it('synthesizes natural answer without raw chunks', () => {
    const text = synthesizeConversationalAnswer({
      question: 'O que é a Omnia Frigo?',
      evidence: [
        {
          id: '191',
          text: 'EPIC16_PUBLIC_INSTITUTIONAL_V1 # Omnia Frigo Holding A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição, educação e inteligência artificial aplicada.',
        },
        {
          id: '192',
          text: 'As empresas incluem Renovação Refrigeração, Fred do Frio, CTE e Neurofrigo Command IA.',
        },
      ],
      channel: 'portal_public',
      assistantKey: 'concierge',
    });
    assert.ok(!/Pontos principais do material/i.test(text));
    assert.ok(!/EPIC16_PUBLIC/i.test(text));
    assert.ok(!/\[chunk:/i.test(text));
    assert.match(text, /Omnia Frigo|hub integrador/i);
  });

  it('uses public catalog for course discovery', () => {
    const text = synthesizeConversationalAnswer({
      question: 'Quais cursos vocês oferecem?',
      evidence: [],
      publicCourses: [
        {
          title: 'Fundamentos de Refrigeração Industrial',
          level: 'beginner',
          shortDescription: 'Introdução prática ao ciclo e segurança.',
          providerHint: 'Fred do Frio / CTE',
        },
      ],
      channel: 'portal_public',
      assistantKey: 'concierge',
    });
    assert.match(text, /Fundamentos de Refrigeração Industrial/);
    assert.ok(!/Pontos principais/i.test(text));
  });

  it('follow-up keeps course context', () => {
    const text = synthesizeConversationalAnswer({
      question: 'Qual é melhor para iniciante?',
      evidence: [],
      publicCourses: [
        {
          title: 'Fundamentos de Refrigeração Industrial',
          level: 'beginner',
          shortDescription: 'Porta de entrada.',
        },
        {
          title: 'Sistemas avançados com CO2',
          level: 'advanced',
        },
      ],
      history: [
        {
          question: 'Quais cursos vocês oferecem?',
          answer: 'Listamos Fundamentos e CO2.',
        },
      ],
      channel: 'portal_public',
      assistantKey: 'concierge',
    });
    assert.match(text, /Fundamentos de Refrigeração Industrial/);
  });

  it('suggested actions and friendly source titles', () => {
    const actions = buildSuggestedActions({
      assistantKey: 'concierge',
      channel: 'portal_public',
      question: 'O que é a Omnia Frigo?',
      status: 'ok',
      hasSources: true,
    });
    assert.ok(actions.length >= 1);
    assert.ok(actions.every((a) => a.label && a.question));

    const title = friendlySourceTitle({
      text: 'EPIC16_PUBLIC_INSTITUTIONAL_V1 A Omnia Frigo Holding é o hub integrador.',
      page: 1,
      index: 0,
    });
    assert.ok(!/EPIC16/i.test(title));
    assert.ok(!/^chunk:/i.test(title));
  });

  it('grounded provider no longer dumps chunks', async () => {
    const llm = new GroundedExtractiveProvider();
    const completion = await llm.complete({
      system: 'Assistente: concierge\nIntenção detectada: definition.',
      user: `CONTEXTO\nx\n\nHISTÓRICO DA SESSÃO\n(sem turnos)\n\nFONTES\n[1] chunk:191 score=0.900\nEPIC16_PUBLIC_INSTITUTIONAL_V1 A Omnia Frigo Holding é o hub integrador do ecossistema.\n\nPERGUNTA\nO que é a Omnia Frigo?`,
      maxTokens: 400,
    });
    assert.ok(!/Pontos principais do material/i.test(completion.text));
    assert.ok(!/\[chunk:191\]/.test(completion.text));
    assert.ok(!/EPIC16_PUBLIC/i.test(completion.text));
  });

  it('runtime catalog path skips retrieval for course list', async () => {
    let searched = false;
    const retrieval: RetrievalPort = {
      async search() {
        searched = true;
        return {
          query: '',
          tookMs: 0,
          provider: 't',
          model: 't',
          dimensions: 1,
          filters: {},
          results: [],
          recoveredTokens: 0,
          candidateCount: 0,
          afterAclCount: 0,
        } satisfies RetrievalResult;
      },
    };
    const runtime = new NeurofrigoRuntime({
      retrieval,
      llm: new GroundedExtractiveProvider(),
    });
    const answer = await runtime.ask({
      question: 'Quais cursos vocês oferecem?',
      assistantKey: 'concierge',
      channel: 'portal_public',
      identity: { role: 'anonymous' },
      course: {},
      domainContext: {
        publicCourses: [{ title: 'Fundamentos de Refrigeração Industrial', level: 'beginner' }],
      },
    });
    assert.equal(searched, false);
    assert.equal(answer.status, 'ok');
    assert.match(answer.text, /Fundamentos/);
    assert.ok((answer.suggestedActions?.length ?? 0) >= 1);
  });

  it('company routing answers without retrieval dump', async () => {
    let searched = false;
    const retrieval: RetrievalPort = {
      async search() {
        searched = true;
        return {
          query: '',
          tookMs: 0,
          provider: 't',
          model: 't',
          dimensions: 1,
          filters: {},
          results: [],
          recoveredTokens: 0,
          candidateCount: 0,
          afterAclCount: 0,
        } satisfies RetrievalResult;
      },
    };
    const answer = await new NeurofrigoRuntime({
      retrieval,
      llm: new GroundedExtractiveProvider(),
    }).ask({
      question: 'Preciso montar uma câmara frigorífica.',
      assistantKey: 'concierge',
      channel: 'portal_public',
      identity: { role: 'anonymous' },
      course: {},
    });
    assert.equal(searched, false);
    assert.equal(answer.status, 'ok');
    assert.match(answer.text, /Renovação Refrigeração/i);
    assert.ok(!/Pontos principais|EPIC16|\[chunk:/i.test(answer.text));
  });
});
