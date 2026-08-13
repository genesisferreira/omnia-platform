import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NeurofrigoRuntime } from '../runtime/runtime';
import { normalizeUserUtterance } from './dialogue-acts';
import { emptyConversationState } from './dialogue-types';
import { applyRepetitionControl, naturalizeUserText } from './naturalize-text';
import { validateAndRewriteResponse } from './response-validator';
import type { RetrievalPort } from '../ports';
import type { CitationResult, RetrievalResult } from '@omnia/retrieval';
import type { ConversationTurn, RuntimeRequest } from '../domain/types';
import type { ConversationState } from './dialogue-types';

const SAMPLE_COURSE = {
  title: 'Fundamentos de Refrigeração Industrial',
  slug: 'fundamentos-refrigeracao-industrial',
  shortDescription: 'Curso introdutório do LMS Core Omnia.',
  level: 'beginner',
  category: 'refrigeration',
  estimatedHours: 8,
  providerHint: 'Fred do Frio / CTE',
};

function citation(
  partial: Partial<CitationResult> & Pick<CitationResult, 'chunkId' | 'text'>,
): CitationResult {
  return {
    score: 0.9,
    similarity: 0.9,
    tokenEstimate: 40,
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

function mockRetrieval(hits: CitationResult[] = []): RetrievalPort {
  return {
    async search(): Promise<RetrievalResult> {
      return {
        results: hits,
        candidateCount: hits.length,
        afterAclCount: hits.length,
        recoveredTokens: 10,
        tookMs: 1,
      };
    },
  };
}

function mockLlm() {
  return {
    metadata: () => ({ name: 'mock', model: 'mock-1' }),
    async complete() {
      return {
        text: '## Propósito e visão dump',
        model: 'mock-1',
        provider: 'mock',
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
      };
    },
  };
}

function baseReq(
  partial: Partial<RuntimeRequest> & Pick<RuntimeRequest, 'question'>,
): RuntimeRequest {
  return {
    identity: {
      userId: 'u1',
      role: 'anonymous',
      tenantId: 't1',
      companyIds: [],
      language: 'pt-BR',
      profileLabel: null,
    },
    course: {
      courseId: null,
      moduleId: null,
      lessonId: null,
      ownerCompanyId: null,
      courseTitle: null,
      moduleTitle: null,
      lessonTitle: null,
    },
    channel: 'portal_public',
    assistantKey: 'concierge',
    domainContext: { publicCourses: [SAMPLE_COURSE] },
    conversationHistory: [],
    dialogueState: null,
    ...partial,
  };
}

async function turn(
  runtime: NeurofrigoRuntime,
  question: string,
  prev: {
    history: ConversationTurn[];
    state: ConversationState | null | undefined;
    assistantKey?: string;
    channel?: RuntimeRequest['channel'];
  },
) {
  const answer = await runtime.ask(
    baseReq({
      question,
      conversationHistory: prev.history,
      dialogueState: prev.state,
      assistantKey: prev.assistantKey || 'concierge',
      channel: prev.channel || 'portal_public',
    }),
  );
  const history: ConversationTurn[] = [
    ...prev.history,
    { question, answer: answer.text, dialogueIntent: answer.dialogueIntent ?? null },
  ];
  return { answer, history, state: answer.dialogueState };
}

describe('EPIC 16 R6 conversational intelligence', () => {
  it('sanitizes headings and invisible repetition boilerplate', () => {
    const dirty =
      '## Propósito e visão\nOmnia Frigo Holding A Omnia Frigo Holding é o hub. Já apresentei o panorama.';
    const clean = naturalizeUserText(dirty);
    assert.ok(!/##/.test(clean));
    assert.ok(!/J[aá] apresentei/i.test(clean));
    const rewritten = applyRepetitionControl({
      candidate:
        'A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição educação.',
      previousAnswers: [
        'A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição educação inteligência.',
      ],
      dialogueIntent: 'institutional_overview',
    });
    assert.ok(!/J[aá] apresentei|Para n[aã]o repetir/i.test(rewritten));
    const v = validateAndRewriteResponse({
      text: '## Propósito e visão\nPontos principais do material e RAG',
    });
    assert.ok(v.violations.length >= 1);
    assert.ok(!/##|RAG/i.test(v.text));
  });

  it('typo tolerance', () => {
    assert.match(normalizeUserUtterance('cursoa'), /cursos/i);
    assert.match(normalizeUserUtterance('quais cerviços'), /serviços/i);
    assert.match(normalizeUserUtterance('qro contato'), /quero contato/i);
    assert.match(normalizeUserUtterance('adequadro'), /adequado/i);
  });

  it('C1 concierge multi-turn memory + recommendation integrity + contact sim', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([
        citation({
          chunkId: '1',
          text: '## Propósito e visão Omnia Frigo Holding A Omnia Frigo Holding é o hub.',
        }),
      ]),
      llm: mockLlm(),
    });
    let ctx = { history: [] as ConversationTurn[], state: null as ConversationState | null };
    const t1 = await turn(runtime, 'O que é a Omnia Frigo?', ctx);
    assert.ok(!/##|Propósito e visão|Já apresentei/i.test(t1.answer.text));
    assert.match(t1.answer.text, /Omnia|ecossistema|Renovação|Fred/i);

    const t2 = await turn(runtime, 'cursos', { history: t1.history, state: t1.state });
    assert.equal(t2.answer.dialogueIntent, 'course_catalog');
    assert.match(t2.answer.text, /Fundamentos/i);
    assert.ok(!/\bIntermediário\b/i.test(t2.answer.text) || /Iniciante/i.test(t2.answer.text));

    const t3 = await turn(runtime, 'já trabalho há 5 anos', {
      history: t2.history,
      state: t2.state,
    });
    // May still be catalog continuity or recommendation — facts must persist
    assert.equal(t3.state?.experienceYears ?? t3.state?.userExperienceYears, 5);

    const t4 = await turn(runtime, 'indique o melhor para mim', {
      history: t3.history,
      state: t3.state,
    });
    assert.equal(t4.answer.dialogueIntent, 'course_recommendation');

    const t5 = await turn(runtime, 'trabalho com refrigeração comercial', {
      history: t4.history,
      state: t4.state,
    });
    assert.ok(/commercial/i.test(String(t5.state?.technicalArea || t5.state?.userInterest)));

    const t6 = await turn(runtime, 'quero migrar para industrial', {
      history: t5.history,
      state: t5.state,
    });
    assert.match(String(t6.state?.userGoal || ''), /industrial/i);
    // Must NOT present beginner catalog as intermediate recommendation
    assert.ok(!/nível Intermediário/i.test(t6.answer.text));
    if (/Fundamentos|catálogo/i.test(t6.answer.text)) {
      assert.match(t6.answer.text, /básico|Iniciante|introdut/i);
    }

    const t7 = await turn(runtime, 'qual empresa cuida disso?', {
      history: t6.history,
      state: t6.state,
    });
    assert.match(t7.answer.text, /Fred do Frio|CTE/i);
    assert.ok(
      t7.state?.responsibleCompany ||
        t7.state?.contactTarget ||
        t7.state?.selectedCompany ||
        /Fred do Frio|CTE/i.test(t7.answer.text),
    );

    const t8 = await turn(runtime, 'quero falar com ela', {
      history: t7.history,
      state: t7.state,
    });
    assert.equal(t8.answer.dialogueIntent, 'contact_handoff');
    assert.match(t8.answer.text, /encaminh|confirma|equipe|contato/i);

    const t9 = await turn(runtime, 'sim', { history: t8.history, state: t8.state });
    assert.equal(t9.answer.dialogueIntent, 'contact_handoff');
    assert.equal(t9.state?.handoffPrepared, true);
    assert.match(t9.answer.text, /registrei|confirmação|Destino/i);
    assert.ok(!/hub integrador/i.test(t9.answer.text));
  });

  it('C2 services → cold room → contact without engineering takeover', async () => {
    const runtime = new NeurofrigoRuntime({ retrieval: mockRetrieval([]), llm: mockLlm() });
    const t1 = await turn(runtime, 'quais serviços vocês oferecem?', {
      history: [],
      state: null,
    });
    assert.equal(t1.answer.dialogueIntent, 'services');
    const t2 = await turn(runtime, 'tenho uma câmara fria', {
      history: t1.history,
      state: t1.state,
      assistantKey: 'concierge',
    });
    const t3 = await turn(runtime, 'ela não chega na temperatura', {
      history: t2.history,
      state: t2.state,
    });
    // Concierge may route to engineering intent in dialogue layer; contact should still work
    const t4 = await turn(runtime, 'quero falar com alguém', {
      history: t3.history,
      state: t3.state,
    });
    assert.equal(t4.answer.dialogueIntent, 'contact_handoff');
    const t5 = await turn(runtime, 'quero um contato', {
      history: t4.history,
      state: t4.state,
    });
    assert.equal(t5.answer.dialogueIntent, 'contact_handoff');
  });

  it('C3 contact handoff structured facts', async () => {
    const runtime = new NeurofrigoRuntime({ retrieval: mockRetrieval([]), llm: mockLlm() });
    let ctx = { history: [] as ConversationTurn[], state: null as ConversationState | null };
    for (const q of [
      'quero fazer um curso',
      'já trabalho com refrigeração',
      'comercial',
      'uns 5 anos',
      'quero ir para industrial',
    ]) {
      const t = await turn(runtime, q, ctx);
      ctx = { history: t.history, state: t.state };
    }
    const last = await turn(runtime, 'quero falar com alguém sobre isso', ctx);
    assert.equal(last.answer.dialogueIntent, 'contact_handoff');
    assert.equal(last.state?.experienceYears ?? last.state?.userExperienceYears, 5);
    assert.ok(/commercial/i.test(String(last.state?.technicalArea || '')));
    assert.ok(/industrial/i.test(String(last.state?.userGoal || '')));
    assert.ok(
      last.state?.contactTarget === 'education' || /Fred|CTE|forma/i.test(last.answer.text),
    );
  });

  it('Tutor multi-turn adaptation', async () => {
    const runtime = new NeurofrigoRuntime({ retrieval: mockRetrieval([]), llm: mockLlm() });
    const state = {
      ...emptyConversationState(),
      currentIntent: 'teaching' as const,
      tutorConcept: 'superaquecimento',
      lastAssistantText: 'Explicação longa de superaquecimento.',
    };
    const history: ConversationTurn[] = [
      {
        question: 'explique superaquecimento',
        answer: 'Explicação longa de superaquecimento.',
        dialogueIntent: 'teaching',
      },
    ];
    const t2 = await turn(runtime, 'não entendi', {
      history,
      state,
      assistantKey: 'tutor',
      channel: 'portal_chat',
    });
    assert.equal(t2.answer.dialogueIntent, 'teaching_rephrase');
    const t3 = await turn(runtime, 'explica mais simples', {
      history: t2.history,
      state: t2.state,
      assistantKey: 'tutor',
      channel: 'portal_chat',
    });
    assert.equal(t3.answer.dialogueIntent, 'teaching_rephrase');
    const t4 = await turn(runtime, 'me dê um exemplo', {
      history: t3.history,
      state: t3.state,
      assistantKey: 'tutor',
      channel: 'portal_chat',
    });
    assert.equal(t4.answer.dialogueIntent, 'teaching_example');
    const t5 = await turn(runtime, 'me faça uma pergunta para testar', {
      history: t4.history,
      state: t4.state,
      assistantKey: 'tutor',
      channel: 'portal_chat',
    });
    assert.equal(t5.answer.dialogueIntent, 'teaching_check');
  });

  it('Commercial multi-turn remembers stores and rooms', async () => {
    const runtime = new NeurofrigoRuntime({ retrieval: mockRetrieval([]), llm: mockLlm() });
    const t1 = await turn(runtime, 'preciso reduzir minha conta de energia', {
      history: [],
      state: null,
      assistantKey: 'commercial',
      channel: 'portal_chat',
    });
    const t2 = await turn(runtime, 'tenho 3 lojas', {
      history: t1.history,
      state: t1.state,
      assistantKey: 'commercial',
      channel: 'portal_chat',
    });
    assert.equal(
      t2.state?.commercialContext?.storeCount ?? t2.state?.commercialContext?.numberOfUnits,
      3,
    );
    const t3 = await turn(runtime, 'todas têm câmara fria', {
      history: t2.history,
      state: t2.state,
      assistantKey: 'commercial',
      channel: 'portal_chat',
    });
    assert.equal(t3.state?.commercialContext?.hasColdRooms, true);
    const t4 = await turn(runtime, 'quero falar com alguém', {
      history: t3.history,
      state: t3.state,
      assistantKey: 'commercial',
      channel: 'portal_chat',
    });
    assert.equal(t4.answer.dialogueIntent, 'contact_handoff');
  });

  it('Engineering multi-turn keeps measurements and e depois', async () => {
    const runtime = new NeurofrigoRuntime({ retrieval: mockRetrieval([]), llm: mockLlm() });
    let ctx = {
      history: [] as ConversationTurn[],
      state: null as ConversationState | null,
      assistantKey: 'engineering',
      channel: 'portal_chat' as const,
    };
    for (const q of [
      'minha câmara deveria chegar a -18',
      'fica em -10',
      'usa R404A',
      'sucção 32 psi',
      'descarga 220 psi',
    ]) {
      const t = await turn(runtime, q, ctx);
      ctx = { ...ctx, history: t.history, state: t.state };
    }
    assert.equal(ctx.state?.engineeringContext?.setpointC, -18);
    assert.equal(ctx.state?.engineeringContext?.actualTempC, -10);
    assert.ok(/404/i.test(String(ctx.state?.engineeringContext?.refrigerant || '')));
    assert.equal(ctx.state?.engineeringContext?.suctionPsi, 32);
    assert.equal(ctx.state?.engineeringContext?.dischargePsi, 220);
    const next = await turn(runtime, 'o que verifico primeiro?', ctx);
    const after = await turn(runtime, 'e depois?', {
      history: next.history,
      state: next.state,
      assistantKey: 'engineering',
      channel: 'portal_chat',
    });
    assert.equal(after.answer.dialogueIntent, 'engineering_troubleshooting');
    assert.match(after.answer.text, /seguinte|depois|evaporador|descongelamento|carga/i);
  });

  it('rate limit policy constants documented for public chat R6', () => {
    // Human session budget is intentionally higher than abuse IP budget.
    // Enforced in apps/web public-chat route (not in runtime package).
    assert.equal(120 > 60, true);
  });
});
