import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTechnicalContext } from './context/technical-context-builder';
import {
  buildTroubleshootingMarkdown,
  wantsTroubleshooting,
} from './troubleshooting/troubleshooting-mode';
import { buildComparisonMarkdown, wantsComparison } from './comparison/technical-comparison';
import { buildEngineeringRecommendations } from './recommendations';
import type { EngineeringProfile } from './domain/types';
import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

const profile: EngineeringProfile = {
  id: '1',
  key: 'omnia-frigo-holding-engineering',
  companyName: 'Omnia Frigo Holding',
  companyId: null,
  technicalArea: 'refrigeracao-industrial',
  specialty: 'HVAC-R',
  language: 'pt-BR',
  permissions: ['published', 'allowAiUse'],
  technologyLines: ['CO2', 'HFC', 'condensacao-ar', 'valvula-eletronica'],
  engineeringPolicy:
    'Nunca inventar normas. Sem diagnóstico definitivo. Sempre exigir inspeção técnica.',
  allowedModelKeys: ['grounded-default'],
  status: 'active',
};

const answerOk: RuntimeAnswer = {
  text: 'Comparação entre CO2 e HFC conforme material técnico. Procedimento de manutenção e norma ASHRAE referida.',
  formattedText:
    'Comparação entre CO2 e HFC conforme material técnico. Procedimento de manutenção e norma ASHRAE referida.',
  sources: [
    {
      chunkId: '1',
      text: 'CO2 versus HFC em refrigeração industrial. Procedimento de manutenção. Norma ASHRAE. Treinamento de comissionamento.',
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

describe('neurofrigo-engineering', () => {
  it('builds technical context from profile', () => {
    const ctx = buildTechnicalContext({
      profile,
      technicalHint: { equipment: 'rack CO2' },
    });
    assert.ok(ctx.summaryText.includes('Omnia Frigo Holding'));
    assert.ok(ctx.summaryText.includes('rack CO2'));
    assert.ok(ctx.summaryText.includes('nunca inventar'));
  });

  it('detects troubleshooting intent', () => {
    assert.equal(wantsTroubleshooting('Diagnóstico de falha no compressor'), true);
    assert.equal(wantsTroubleshooting('O que é ciclo de Carnot?'), false);
    assert.equal(wantsTroubleshooting('oi', true), true);
  });

  it('detects comparison intent', () => {
    assert.equal(wantsComparison('Compare CO2 × HFC'), true);
    assert.equal(wantsComparison('Explique evaporação'), false);
  });

  it('builds troubleshooting markdown with disclaimer', () => {
    const ctx = buildTechnicalContext({ profile });
    const md = buildTroubleshootingMarkdown({
      question: 'Alarme de alta pressão no rack',
      answer: answerOk,
      technicalContext: ctx,
    });
    assert.ok(md.includes('# Modo Troubleshooting'));
    assert.ok(md.includes('diagnóstico definitivo'));
    assert.ok(md.includes('inspeção técnica'));
    assert.ok(md.includes('Referências utilizadas'));
  });

  it('builds comparison markdown grounded', () => {
    const ctx = buildTechnicalContext({ profile });
    const md = buildComparisonMarkdown({
      question: 'Compare condensação a ar × água',
      answer: answerOk,
      technicalContext: ctx,
    });
    assert.ok(md.includes('# Comparação técnica'));
    assert.ok(md.includes('FONTES'));
  });

  it('builds recommendations only from sources', () => {
    const ctx = buildTechnicalContext({ profile });
    const recs = buildEngineeringRecommendations({
      answer: answerOk,
      technicalContext: ctx,
      publishedCourseTitles: ['Fundamentos Refrigeração Industrial'],
    });
    assert.ok(
      recs.norms.length + recs.procedures.length + recs.trainings.length + recs.documents.length >
        0,
    );
  });

  it('returns empty recommendations without sources', () => {
    const ctx = buildTechnicalContext({ profile });
    const recs = buildEngineeringRecommendations({
      answer: { ...answerOk, sources: [], status: 'not_found' },
      technicalContext: ctx,
    });
    assert.equal(recs.courses.length, 0);
    assert.equal(recs.norms.length, 0);
  });
});
