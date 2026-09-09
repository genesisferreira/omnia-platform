import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  chunkAuthorizedText,
  mergeRetrievalWithAuthorizedPassages,
  selectRelevantAuthorizedPassages,
} from './authorized-passages';
import { applyRetrievalGuardrails } from '../guardrails';
import { DEFAULT_GUARDRAIL_LIMITS } from '../domain/types';
import { resolveDialogueTurn } from '../conversation/follow-up-resolver';

describe('authorized lesson passages (RC2.3 Tutor grounding)', () => {
  it('chunks lesson text and selects condensador overlap', () => {
    const passages = chunkAuthorizedText(
      'O condensador rejeita para o ambiente o calor transportado pelo refrigerante. ' +
        'Ventilacao e sujeira afetam a operacao. Pressao isolada nao fecha diagnostico.',
      { idPrefix: 'lesson-21', title: 'Condensador', meta: { courseId: '12', lessonId: '21' } },
    );
    assert.ok(passages.length >= 1);
    const hits = selectRelevantAuthorizedPassages('O que faz o condensador?', passages);
    assert.ok(hits.length >= 1);
    assert.match(hits[0]!.text.toLowerCase(), /condensador/);
  });

  it('merges authorized passages when vector retrieval is empty', () => {
    const passages = chunkAuthorizedText(
      'Pressao sozinha nao fecha diagnostico: correlacione temperatura, ambiente e fluxo de ar. ' +
        'Primeiro passo quando nao gela: ouvir o operador, observar, seguranca e inspecao visual.',
      { idPrefix: 'lesson-21', title: 'Condensador' },
    );
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
});
