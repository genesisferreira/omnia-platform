import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveExternalVideoUrl } from './external-video';

describe('external video URL resolve', () => {
  it('embeds youtube watch urls', () => {
    const r = resolveExternalVideoUrl('https://www.youtube.com/watch?v=abc123XYZ_1');
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.kind, 'youtube');
      assert.match(r.embedUrl, /embed\/abc123XYZ_1/);
    }
  });

  it('rejects javascript and data urls', () => {
    assert.equal(resolveExternalVideoUrl('javascript:alert(1)').ok, false);
    assert.equal(resolveExternalVideoUrl('data:text/html,hi').ok, false);
  });

  it('allows direct mp4 https', () => {
    const r = resolveExternalVideoUrl('https://cdn.example.com/aula.mp4');
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.kind, 'direct');
  });
});
