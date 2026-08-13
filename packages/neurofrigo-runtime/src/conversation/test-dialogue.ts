import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NeurofrigoRuntime } from '../runtime/runtime';
import { resolveDialogueTurn } from './follow-up-resolver';
import type { ConversationTurn, RuntimeRequest } from '../domain/types';
import type { ConversationState } from './dialogue-types';
import { emptyConversationState } from './dialogue-types';
import { applyRepetitionControl, naturalizeUserText } from './naturalize-text';
import type { RetrievalPort } from '../ports';
import type { CitationResult, RetrievalResult } from '@omnia/retrieval';

const SAMPLE_COURSE = {
  title: 'Fundamentos de Refrigeração Industrial',
  slug: 'fundamentos-refrigeracao-industrial',
  shortDescription: 'Base técnica para quem está começando ou consolidando fundamentos.',
  level: 'beginner',
  category: 'refrigeration',
  estimatedHours: 20,
  providerHint: 'Fred do Frio / CTE',
};

function citation(
  partial: Partial<CitationResult> & Pick<CitationResult, 'chunkId' | 'text'>,
): CitationResult {
  return {
    score: 0.92,
    similarity: 0.91,
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
        recoveredTokens: hits.reduce((n, h) => n + (h.tokenEstimate || 0), 0),
        tookMs: 1,
      };
    },
  };
}

function mockLlm(text = 'resposta genérica') {
  return {
    metadata: () => ({ name: 'mock', model: 'mock-1' }),
    async complete() {
      return {
        text,
        model: 'mock-1',
        provider: 'mock',
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
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
    {
      question,
      answer: answer.text,
      dialogueIntent: answer.dialogueIntent ?? null,
    },
  ];
  return { answer, history, state: answer.dialogueState };
}

describe('EPIC 16 R5 dialogue benches C1-C10', () => {
  const institutionalHit = citation({
    chunkId: '191',
    text: 'Omnia Frigo Holding A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição, educação e inteligência artificial aplicada.',
  });

  it('C1 — sim after institutional offer asks choice (no repeat)', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([institutionalHit]),
      llm: mockLlm('dump institucional repetido'),
    });
    let ctx = { history: [] as ConversationTurn[], state: null as ConversationState | null };
    const t1 = await turn(runtime, 'O que é a Omnia Frigo?', ctx);
    assert.match(t1.answer.text, /Omnia/i);
    assert.ok(t1.state?.pendingOffer?.options.includes('courses'));
    const t2 = await turn(runtime, 'sim', {
      history: t1.history,
      state: t1.state,
    });
    assert.ok(!/hub integrador/i.test(t2.answer.text), 'must not repeat overview');
    assert.match(t2.answer.text, /cursos|serviços|empresa/i);
    assert.equal(t2.answer.dialogueIntent, 'clarification');
  });

  it('C2 — services follow-up after Omnia', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([institutionalHit]),
      llm: mockLlm(),
    });
    const t1 = await turn(runtime, 'O que é a Omnia?', {
      history: [],
      state: null,
    });
    const t2 = await turn(runtime, 'e quais os serviços que ela oferece?', {
      history: t1.history,
      state: t1.state,
    });
    assert.equal(t2.answer.dialogueIntent, 'services');
    assert.match(t2.answer.text, /Renovação|serviços/i);
    assert.ok(!/hub integrador/i.test(t2.answer.text));
  });

  it('C3 — course catalog then recommend asks level', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([]),
      llm: mockLlm(),
    });
    const t1 = await turn(runtime, 'Quais cursos vocês oferecem?', {
      history: [],
      state: null,
    });
    assert.equal(t1.answer.dialogueIntent, 'course_catalog');
    assert.match(t1.answer.text, /Fundamentos/i);
    assert.ok(!/\bbeginner\b/i.test(t1.answer.text));
    const t2 = await turn(runtime, 'indique o melhor para mim', {
      history: t1.history,
      state: t1.state,
    });
    assert.equal(t2.answer.dialogueIntent, 'course_recommendation');
    assert.match(t2.answer.text, /começando|trabalha|especializa/i);
  });

  it('C4 — profile answer continues recommendation', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([]),
      llm: mockLlm(),
    });
    const t1 = await turn(runtime, 'Quais cursos vocês oferecem?', { history: [], state: null });
    const t2 = await turn(runtime, 'quero que indique o mais adequado', {
      history: t1.history,
      state: t1.state,
    });
    const t3 = await turn(runtime, 'Já trabalho há 5 anos com refrigeração comercial.', {
      history: t2.history,
      state: t2.state,
    });
    assert.equal(t3.answer.dialogueIntent, 'course_recommendation');
    assert.equal(t3.state?.userExperienceYears ?? t3.state?.experienceYears, 5);
    assert.ok(
      /Fundamentos|recomend|comercial|anos|área|migrar|básico|Iniciante/i.test(t3.answer.text),
    );
  });

  it('C5 — company then courses follow-up', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([]),
      llm: mockLlm(),
    });
    const t1 = await turn(runtime, 'Qual empresa cuida dos serviços técnicos?', {
      history: [],
      state: null,
    });
    assert.match(t1.answer.text, /Renovação/i);
    const t2 = await turn(runtime, 'e dos cursos?', {
      history: t1.history,
      state: t1.state,
    });
    assert.equal(t2.answer.dialogueIntent, 'company_routing');
    assert.match(t2.answer.text, /Fred do Frio|CTE/i);
  });

  it('C6 — commercial multi-turn remembers 3 stores', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([]),
      llm: mockLlm(),
      // commercial path
    });
    const t1 = await turn(runtime, 'Quero reduzir consumo de energia do meu supermercado.', {
      history: [],
      state: null,
      assistantKey: 'commercial',
      channel: 'portal_chat',
    });
    assert.equal(t1.answer.dialogueIntent, 'commercial_discovery');
    const t2 = await turn(runtime, 'temos 3 lojas.', {
      history: t1.history,
      state: t1.state,
      assistantKey: 'commercial',
      channel: 'portal_chat',
    });
    assert.match(t2.answer.text, /3 lojas/i);
    assert.equal(t2.state?.commercialContext?.storeCount, 3);
  });

  it('C7 — engineering uses prior pressure data', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([]),
      llm: mockLlm(),
    });
    const t1 = await turn(runtime, 'Minha câmara não chega na temperatura.', {
      history: [],
      state: null,
      assistantKey: 'engineering',
      channel: 'portal_chat',
    });
    assert.match(t1.answer.text, /sucção|pressão/i);
    const t2 = await turn(runtime, 'Sucção 32 psi e condensação 220 psi.', {
      history: t1.history,
      state: t1.state,
      assistantKey: 'engineering',
      channel: 'portal_chat',
    });
    assert.match(t2.answer.text, /32|220/);
    assert.equal(t2.state?.engineeringContext?.suctionPsi, 32);
    assert.equal(t2.state?.engineeringContext?.dischargePsi, 220);
  });

  it('C8 — tutor rephrase does not clone previous answer', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([
        citation({
          chunkId: 't1',
          text: 'O superaquecimento é a diferença entre a temperatura do vapor e o ponto de saturação na sucção.',
        }),
      ]),
      llm: mockLlm(
        'O superaquecimento é a diferença entre a temperatura do vapor e o ponto de saturação na sucção. O superaquecimento é a diferença entre a temperatura do vapor e o ponto de saturação na sucção.',
      ),
    });
    const prevAnswer =
      'O superaquecimento é a diferença entre a temperatura do vapor e o ponto de saturação na sucção.';
    const state = {
      ...emptyConversationState(),
      currentIntent: 'teaching' as const,
      tutorConcept: 'superaquecimento',
      lastAssistantText: prevAnswer,
    };
    const history: ConversationTurn[] = [
      { question: 'O que é superaquecimento?', answer: prevAnswer, dialogueIntent: 'teaching' },
    ];
    const t2 = await turn(runtime, 'não entendi', {
      history,
      state,
      assistantKey: 'tutor',
      channel: 'portal_chat',
    });
    assert.equal(t2.answer.dialogueIntent, 'teaching_rephrase');
    assert.ok(t2.answer.text !== prevAnswer);
    assert.match(t2.answer.text, /simples|outro|exemplo/i);
  });

  it('C9 — tutor example after explanation', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([]),
      llm: mockLlm(),
    });
    const state = {
      ...emptyConversationState(),
      currentIntent: 'teaching' as const,
      tutorConcept: 'superaquecimento',
      lastAssistantText: 'Explicação do superaquecimento.',
    };
    const history: ConversationTurn[] = [
      {
        question: 'Explique superaquecimento',
        answer: 'Explicação do superaquecimento.',
        dialogueIntent: 'teaching',
      },
    ];
    const t2 = await turn(runtime, 'me dê um exemplo', {
      history,
      state,
      assistantKey: 'tutor',
      channel: 'portal_chat',
    });
    assert.equal(t2.answer.dialogueIntent, 'teaching_example');
    assert.match(t2.answer.text, /exemplo|superaquecimento/i);
  });

  it('C10 — orphan sim asks politely', async () => {
    const runtime = new NeurofrigoRuntime({
      retrieval: mockRetrieval([]),
      llm: mockLlm(),
    });
    const t1 = await turn(runtime, 'sim', { history: [], state: null });
    assert.equal(t1.answer.dialogueIntent, 'affirmation_orphan');
    assert.match(t1.answer.text, /sobre o que|cursos|serviços/i);
  });

  it('markers — natural language + repetition + follow-up resolver', () => {
    const natural = naturalizeUserText(
      'Omnia Frigo Holding A Omnia Frigo Holding é o hub. nível beginner. RAG Citations Routing',
    );
    assert.ok(!/beginner/i.test(natural));
    assert.ok(!/\bRAG\b/i.test(natural));
    assert.ok(!/Omnia Frigo Holding A Omnia Frigo Holding/i.test(natural));

    const rewritten = applyRepetitionControl({
      candidate:
        'A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição, educação e inteligência artificial aplicada. No ecossistema estão Renovação.',
      previousAnswers: [
        'A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição, educação e inteligência artificial aplicada. No ecossistema estão Renovação Refrigeração, Fred do Frio, CTE.',
      ],
      dialogueIntent: 'institutional_overview',
    });
    assert.match(rewritten, /formação|serviço|tecnologia|direcion/i);

    const resolved = resolveDialogueTurn({
      question: 'quero que indique o mais adequado',
      history: [
        {
          question: 'Quais cursos vocês oferecem?',
          answer:
            'Atualmente temos publicado o curso Fundamentos. Se quiser, indico o mais adequado ao seu nível.',
        },
      ],
    });
    assert.equal(resolved.dialogueIntent, 'course_recommendation');
    assert.ok(
      resolved.decision === 'NEEDS_CLARIFICATION' ||
        resolved.decision === 'NEEDS_CATALOG' ||
        resolved.skipRetrieval,
    );
  });
});
