import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLessonContentBlocks,
  estimateMinutes,
  findLessonNeighbors,
  flattenVisibleLessons,
  resolveContentKind,
  resolveLessonUiStatus,
} from '../lib/lms/lesson-nav';

const sections = [
  {
    sectionId: 1,
    name: 'Módulo 1',
    summary: '<p>Introdução <script>x()</script></p>',
    activities: [
      { moodleActivityId: 10, name: 'Aula A', modName: 'page', visible: true },
      { moodleActivityId: 11, name: 'Vídeo B', modName: 'resource', visible: true },
      { moodleActivityId: 12, name: 'Oculta', modName: 'page', visible: false },
    ],
  },
  {
    sectionId: 2,
    name: 'Módulo 2',
    activities: [
      { moodleActivityId: 20, name: 'Quiz', modName: 'quiz', visible: true },
      {
        moodleActivityId: 21,
        name: 'Link',
        modName: 'url',
        visible: true,
        url: 'https://example.com/doc',
      },
    ],
  },
];

describe('flattenVisibleLessons + neighbors', () => {
  it('flattens only visible activities in order', () => {
    const flat = flattenVisibleLessons(5, sections);
    assert.deepEqual(
      flat.map((l) => l.activityId),
      [10, 11, 20, 21],
    );
  });

  it('resolves prev/next for SPA navigation', () => {
    const flat = flattenVisibleLessons(5, sections);
    const mid = findLessonNeighbors(flat, 11);
    assert.equal(mid.prev?.activityId, 10);
    assert.equal(mid.next?.activityId, 20);

    const first = findLessonNeighbors(flat, 10);
    assert.equal(first.prev, null);
    assert.equal(first.next?.activityId, 11);

    const last = findLessonNeighbors(flat, 21);
    assert.equal(last.next, null);
  });
});

describe('content kinds + blocks', () => {
  it('maps modName to content kinds', () => {
    assert.equal(resolveContentKind('page'), 'html');
    assert.equal(resolveContentKind('quiz'), 'quiz');
    assert.equal(resolveContentKind('h5p'), 'h5p');
    assert.equal(resolveContentKind('resource', 'guia.pdf'), 'pdf');
    assert.equal(resolveContentKind('url'), 'external_link');
  });

  it('builds blocks with section HTML and authorized external link', () => {
    const blocks = buildLessonContentBlocks({
      activity: {
        moodleActivityId: 21,
        name: 'Link',
        modName: 'url',
        visible: true,
        url: 'https://example.com/doc',
      },
      sectionSummary: '<p>OK</p>',
    });
    assert.ok(blocks.some((b) => b.kind === 'html' && b.bodyHtml === '<p>OK</p>'));
    assert.ok(blocks.some((b) => b.kind === 'external_link' && b.externalUrl));
  });

  it('blocks moodle URLs as external links', () => {
    const blocks = buildLessonContentBlocks({
      activity: {
        moodleActivityId: 1,
        name: 'Bad',
        modName: 'url',
        visible: true,
        url: 'https://moodle.example.com/mod/url/view.php?id=1',
      },
    });
    const link = blocks.find((b) => b.kind === 'external_link');
    assert.equal(link?.externalUrl, null);
  });
});

describe('lesson status + estimate', () => {
  it('resolves UI statuses', () => {
    assert.equal(resolveLessonUiStatus({ loading: true }), 'loading');
    assert.equal(resolveLessonUiStatus({ forbidden: true }), 'forbidden');
    assert.equal(resolveLessonUiStatus({ blocked: true }), 'blocked');
    assert.equal(resolveLessonUiStatus({ moodleState: 1 }), 'completed');
    assert.equal(resolveLessonUiStatus({ locallyCompleted: true }), 'completed');
    assert.equal(resolveLessonUiStatus({ moodleState: 0 }), 'in_progress');
  });

  it('estimates minutes by mod', () => {
    assert.equal(estimateMinutes('quiz'), 20);
    assert.ok(estimateMinutes('page') > 0);
  });
});
