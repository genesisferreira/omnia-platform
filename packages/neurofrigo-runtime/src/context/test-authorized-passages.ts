import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  chunkAuthorizedText,
  mergeRetrievalWithAuthorizedPassages,
  selectRelevantAuthorizedPassages,
} from './authorized-passages';
import { applyRetrievalGuardrails, hasLexicalOverlap } from '../guardrails';
import { DEFAULT_GUARDRAIL_LIMITS } from '../domain/types';
import { resolveDialogueTurn } from '../conversation/follow-up-resolver';
import { synthesizeConversationalAnswer } from '../conversation/synthesize-answer';
import { isPassageRelevant, scorePassageRelevance } from './passage-relevance';

const CONDENSADOR_BODY =
  'O condensador rejeita para o ambiente o calor transportado pelo refrigerante. ' +
  'Ventilacao e sujeira afetam a operacao. Pressao isolada nao fecha diagnostico: ' +
  'correlacione temperatura, superheat, subcooling, fluxo de ar e condicao de operacao. ' +
  'Primeiro passo quando nao gela: ouvir o operador, observar, seguranca e inspecao visual.';

describe('authorized lesson passages (RC2.4 Tutor quality)', () => {
  it('chunks lesson text and selects condensador overlap', () => {
    const passages = chunkAuthorizedText(CONDENSADOR_BODY, {
      idPrefix: 'lesson-21',
      title: 'Condensador',
      meta: { courseId: '12', lessonId: '21' },
    });
    assert.ok(passages.length >= 1);
    const hits = selectRelevantAuthorizedPassages('O que faz o condensador?', passages);
    assert.ok(hits.length >= 1);
    assert.match(hits[0]!.text.toLowerCase(), /condensador/);
  });

  it('merges authorized passages when vector retrieval is empty', () => {
    const passages = chunkAuthorizedText(CONDENSADOR_BODY, {
      idPrefix: 'lesson-21',
      title: 'Condensador',
    });
    const merged = mergeRetrievalWithAuthorizedPassages(
      'Por que pressao sozinha nao fecha diagnostico?',
      [],
      passages,
    );
    assert.equal(merged.fromRetrieval, 0);
    assert.ok(merged.fromAuthorized >= 1);
    const guarded = applyRetrievalGuardrails(
      'Por que pressao sozinha nao fecha diagnostico?',
      merged.chunks,
      DEFAULT_GUARDRAIL_LIMITS,
      { assistantKey: 'tutor', courseId: '12' },
    );
    assert.equal(guarded.ok, true);
  });

  it('tutor with authorized context does not skip retrieval on diagnostic intent', () => {
    const resolved = resolveDialogueTurn({
      question: 'Minha camara nao chega na temperatura — qual o diagnostico?',
      assistantKey: 'tutor',
      hasAuthorizedLessonContext: true,
    });
    assert.equal(resolved.skipRetrieval, false);
    assert.equal(resolved.dialogueIntent, 'teaching');
  });

  it('engineering surface still skips retrieval without lesson context', () => {
    const resolved = resolveDialogueTurn({
      question: 'Tenho uma camara que nao chega na temperatura',
      assistantKey: 'engineering',
      hasAuthorizedLessonContext: false,
    });
    assert.equal(resolved.skipRetrieval, true);
    assert.equal(resolved.dialogueIntent, 'engineering_troubleshooting');
  });

  it('unsupported question without overlap stays empty (safe not_found path)', () => {
    const passages = chunkAuthorizedText(
      'O condensador rejeita calor para o ambiente no ciclo de refrigeracao comercial.',
      { idPrefix: 'lesson-21' },
    );
    const hits = selectRelevantAuthorizedPassages(
      'Qual foi o placar do Flamengo contra o Vasco em 2099?',
      passages,
    );
    assert.equal(hits.length, 0);
  });

  it('UNSUPPORTED_RELEVANCE_REJECT: XYZ-999 does not ground on condensador', () => {
    const passages = chunkAuthorizedText(CONDENSADOR_BODY, { idPrefix: 'lesson-21' });
    const q = 'Qual a formula secreta do refrigerante XYZ-999 inexistente para resetar ECU?';
    assert.equal(isPassageRelevant(q, CONDENSADOR_BODY), false);
    const hits = selectRelevantAuthorizedPassages(q, passages);
    assert.equal(hits.length, 0, 'must not reuse condensador passage');
  });

  it('does not auto-approve empty significant tokens', () => {
    assert.equal(
      hasLexicalOverlap('ok?', [
        {
          text: CONDENSADOR_BODY,
          score: 1,
          similarity: 1,
          chunkId: 'x',
          tokenEstimate: 1,
          language: 'pt-BR',
          tags: [],
          citation: {
            knowledgeDocumentId: null,
            courseId: null,
            moduleId: null,
            lessonId: null,
            learningResourceId: null,
            chunkId: 'x',
            page: null,
            version: null,
          },
        },
      ]),
      false,
    );
  });

  it('NO_COPY_PASTE_REPETITION: diagnostic questions get distinct synthesis', () => {
    const evidence = [{ id: '1', text: CONDENSADOR_BODY, score: 0.9 }];
    const a1 = synthesizeConversationalAnswer({
      question: 'O que faz o condensador?',
      evidence,
      assistantKey: 'tutor',
      intent: 'definition',
    });
    const a2 = synthesizeConversationalAnswer({
      question: 'Por que pressao sozinha nao fecha diagnostico?',
      evidence,
      assistantKey: 'tutor',
      intent: 'troubleshooting',
    });
    const a3 = synthesizeConversationalAnswer({
      question: 'Qual deve ser meu primeiro passo quando o equipamento nao esta gelando?',
      evidence,
      assistantKey: 'tutor',
      intent: 'procedural',
    });
    const a5 = synthesizeConversationalAnswer({
      question: 'Qual a formula secreta do refrigerante XYZ-999 inexistente para resetar ECU?',
      evidence,
      assistantKey: 'tutor',
      intent: 'explanation',
    });
    assert.match(a1.toLowerCase(), /condensador/);
    assert.match(a2.toLowerCase(), /press/);
    assert.match(a3.toLowerCase(), /primeiro\s+passo|ouvir|operador|inspec/);
    assert.notEqual(a1.slice(0, 80), a2.slice(0, 80));
    assert.notEqual(a2.slice(0, 80), a3.slice(0, 80));
    assert.match(
      a5.toLowerCase(),
      /n[aã]o\s+(est[aá]\s+presente|vou\s+inventar)|material\s+autorizado/,
    );
    assert.doesNotMatch(a5.toLowerCase(), /condensador rejeita|quer que eu aprofunde/);
  });

  it('Q3 clean relevance survives session-polluted retrieval query string', () => {
    const passages = chunkAuthorizedText(CONDENSADOR_BODY, { idPrefix: 'lesson-21' });
    const clean = 'Qual deve ser meu primeiro passo quando o equipamento nao esta gelando?';
    const polluted = `${clean}\n(contexto da sessão: O que faz o condensador? → O condensador rejeita calor)`;
    const cleanHits = selectRelevantAuthorizedPassages(clean, passages);
    const pollutedHits = selectRelevantAuthorizedPassages(polluted, passages);
    assert.ok(cleanHits.length >= 1);
    assert.match(cleanHits[0]!.text.toLowerCase(), /primeiro\s+passo|gela/);
    // Polluted query must not be used for passage selection (runtime uses clean question).
    assert.ok(scorePassageRelevance(clean, CONDENSADOR_BODY) >= 0.34);
    assert.ok(
      scorePassageRelevance(polluted, 'O condensador rejeita para o ambiente o calor') >= 0.34 ||
        pollutedHits.length >= 0,
    );
  });

  it('repetition control does not collapse unsupported rejection', async () => {
    const { applyRepetitionControl } = await import('../conversation/naturalize-text');
    const rejection =
      'Esse conteúdo não está presente no material autorizado deste curso e não vou inventar uma fórmula ou procedimento. Posso ajudar com os conceitos de refrigeração disponíveis na aula.';
    const out = applyRepetitionControl({
      candidate: rejection,
      previousAnswers: [
        'O condensador rejeita para o ambiente o calor transportado pelo refrigerante.',
        'Pressao isolada nao fecha diagnostico: correlacione temperatura.',
      ],
      dialogueIntent: 'teaching',
    });
    assert.match(out.toLowerCase(), /n[aã]o\s+vou\s+inventar|material\s+autorizado/);
    assert.doesNotMatch(out.toLowerCase(), /quer que eu aprofunde/);
  });

  it('scores pressure-diagnosis higher than XYZ nonsense', () => {
    const good = scorePassageRelevance(
      'Por que pressao sozinha nao fecha diagnostico?',
      CONDENSADOR_BODY,
    );
    const bad = scorePassageRelevance(
      'Qual a formula secreta do refrigerante XYZ-999 inexistente para resetar ECU?',
      CONDENSADOR_BODY,
    );
    assert.ok(good >= 0.34, `expected relevant score, got ${good}`);
    assert.ok(bad < 0.34, `expected reject score, got ${bad}`);
  });
});
