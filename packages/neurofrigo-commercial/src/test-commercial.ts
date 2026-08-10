import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSalesContext } from './context/sales-context-builder';
import {
  buildProposalMarkdown,
  wantsProposal,
} from './proposal/proposal-builder';
import { buildCommercialRecommendations } from './recommendations';
import type { CommercialProfile } from './domain/types';
import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

const profile: CommercialProfile = {
  id: '1',
  key: 'omnia-frigo-holding',
  companyName: 'Omnia Frigo Holding',
  companyId: null,
  segment: 'refrigeracao-industrial',
  region: 'BR',
  language: 'pt-BR',
  allowedCatalog: ['Neurofrigo', 'Omnia LMS', 'Treinamentos'],
  businessLines: ['Controle CO2', 'Plataforma Omnia'],
  commercialPolicy: 'Não inventar preços.',
  allowedModelKeys: ['grounded-default'],
  status: 'active',
};

const answerOk: RuntimeAnswer = {
  text: 'A plataforma Omnia e o Controle CO2 Neurofrigo apoiam a operação.',
  formattedText: 'A plataforma Omnia e o Controle CO2 Neurofrigo apoiam a operação.',
  sources: [
    {
      chunkId: '1',
      text: 'Plataforma Omnia e Controle CO2. Treinamento de implantação e suporte.',
      score: 0.8,
      similarity: 0.7,
      citation: {
        knowledgeDocumentId: '22',
        courseId: null,
        moduleId: null,
        lessonId: null,
        learningResourceId: '31',
        chunkId: '1',
        page: null,
        version: '1.0.0',
      },
    },
  ],
  confidence: 0.8,
  tookMs: 10,
  model: 'grounded',
  provider: 'grounded',
  promptTokens: 1,
  completionTokens: 1,
  totalTokens: 2,
  estimatedCostUsd: 0,
  status: 'ok',
  errorCode: null,
  intent: null,
  grounding: {
    score: 0.8,
    sourceCount: 1,
    avgSimilarity: 0.7,
    coverage: 1,
    contextChars: 100,
    confidence: 0.8,
  },
  explainability: null,
};

describe('neurofrigo-commercial', () => {
  it('builds sales context from profile', () => {
    const ctx = buildSalesContext({ profile, clientHint: { companyName: 'Cliente X' } });
    assert.ok(ctx.summaryText.includes('Omnia Frigo Holding'));
    assert.ok(ctx.summaryText.includes('Cliente X'));
    assert.ok(ctx.summaryText.includes('nunca inventar'));
  });

  it('detects proposal intent', () => {
    assert.equal(wantsProposal('Gere uma proposta comercial'), true);
    assert.equal(wantsProposal('O que é o ciclo?'), false);
    assert.equal(wantsProposal('oi', true), true);
  });

  it('builds grounded proposal markdown', () => {
    const ctx = buildSalesContext({ profile });
    const md = buildProposalMarkdown({
      question: 'Proposta para túnel de congelamento',
      answer: answerOk,
      salesContext: ctx,
    });
    assert.ok(md.includes('# Proposta Comercial'));
    assert.ok(md.includes('Resumo executivo'));
    assert.ok(md.includes('Fontes utilizadas'));
  });

  it('builds recommendations only from sources', () => {
    const ctx = buildSalesContext({ profile });
    const recs = buildCommercialRecommendations({
      answer: answerOk,
      salesContext: ctx,
      publishedCourseTitles: ['Fundamentos Refrigeração Industrial'],
    });
    assert.ok(recs.products.length + recs.services.length + recs.trainings.length > 0);
  });

  it('returns empty recommendations without sources', () => {
    const ctx = buildSalesContext({ profile });
    const recs = buildCommercialRecommendations({
      answer: { ...answerOk, sources: [], status: 'not_found' },
      salesContext: ctx,
    });
    assert.equal(recs.products.length, 0);
    assert.equal(recs.courses.length, 0);
  });
});
