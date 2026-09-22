import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMaterialsFromLesson,
  createStubSecurityPorts,
  findMaterialNeighbors,
  resolveMaterial,
} from '../lib/lms/material';

describe('MaterialProvider resolveMaterial', () => {
  it('resolves ready state and renderer key', () => {
    const resolved = resolveMaterial({
      descriptor: {
        id: 'm1',
        courseId: 1,
        activityId: 2,
        type: 'text',
        metadata: {
          id: 'm1',
          name: 'Texto',
          type: 'text',
          statusLabel: 'Disponível',
        },
        source: { body: 'Olá' },
        permissions: { canView: true, canDownload: false, canComplete: true },
      },
    });
    assert.equal(resolved.state, 'ready');
    assert.equal(resolved.rendererKey, 'text');
    assert.equal(resolved.previewAvailable, false);
  });

  it('maps forbidden / offline / empty', () => {
    const forbidden = resolveMaterial({
      descriptor: {
        id: 'm2',
        courseId: 1,
        activityId: 2,
        type: 'html',
        metadata: {
          id: 'm2',
          name: 'X',
          type: 'html',
          statusLabel: '',
        },
        source: { body: '<p>a</p>' },
        permissions: { canView: false, canDownload: false, canComplete: false },
      },
    });
    assert.equal(forbidden.state, 'forbidden');

    const offline = resolveMaterial({
      descriptor: {
        id: 'm3',
        courseId: 1,
        activityId: 2,
        type: 'text',
        metadata: { id: 'm3', name: 'Y', type: 'text', statusLabel: '' },
        source: { body: 'x' },
        permissions: { canView: true, canDownload: false, canComplete: true },
      },
      offline: true,
    });
    assert.equal(offline.state, 'offline');

    const empty = resolveMaterial({
      descriptor: {
        id: 'm4',
        courseId: 1,
        activityId: 2,
        type: 'text',
        metadata: { id: 'm4', name: 'Z', type: 'text', statusLabel: '' },
        source: { body: '' },
        permissions: { canView: true, canDownload: false, canComplete: true },
      },
    });
    assert.equal(empty.state, 'empty');
  });
});

describe('buildMaterialsFromLesson + neighbors', () => {
  it('builds materials and navigates prev/next', () => {
    const materials = buildMaterialsFromLesson({
      courseId: 9,
      sectionId: 1,
      sectionSummary: '<p>Intro</p>',
      activity: {
        moodleActivityId: 44,
        name: 'Vídeo aula',
        modName: 'resource',
        visible: true,
      },
    });
    assert.ok(materials.length >= 2);
    assert.equal(materials[0]!.type, 'html');
    const { prev, next, index } = findMaterialNeighbors(materials, materials[0]!.id);
    assert.equal(index, 0);
    assert.equal(prev, null);
    assert.ok(next);
  });

  it('blocks moodle external urls', () => {
    const materials = buildMaterialsFromLesson({
      courseId: 1,
      activity: {
        moodleActivityId: 1,
        name: 'Link',
        modName: 'url',
        visible: true,
        url: 'https://moodle.example/mod/url/view.php?id=1',
      },
    });
    const link = materials.find((m) => m.type === 'external_link');
    assert.equal(link?.source.externalUrl, null);
  });
});

describe('security ports stubs', () => {
  it('returns NOT_IMPLEMENTED without calling Moodle', async () => {
    const ports = createStubSecurityPorts();
    const auth = await ports.mediaAuthorization.authorize({
      assetId: 'a1',
      omniaUserId: 'u',
      courseId: 1,
      purpose: 'view',
    });
    assert.equal(auth.ok, false);
    if (!auth.ok) assert.equal(auth.code, 'NOT_IMPLEMENTED');

    const signed = await ports.signedUrl.issue({ assetId: 'a1', grantId: 'g' });
    assert.equal(signed.ok, false);
  });
});
