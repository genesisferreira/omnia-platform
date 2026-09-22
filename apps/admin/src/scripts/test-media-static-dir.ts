import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CANONICAL_MEDIA_PATH, resolveMediaStaticDir } from '../collections/Media';

describe('resolveMediaStaticDir', () => {
  it('prefers PAYLOAD_MEDIA_DIR when set', () => {
    const dir = resolveMediaStaticDir({ PAYLOAD_MEDIA_DIR: '/custom/media' }, () => false);
    assert.equal(dir, '/custom/media');
  });

  it('uses canonical /app/media when present and env unset', () => {
    const dir = resolveMediaStaticDir({}, (p) => p === CANONICAL_MEDIA_PATH);
    assert.equal(dir, CANONICAL_MEDIA_PATH);
  });

  it('falls back to local relative media when docker path missing', () => {
    const dir = resolveMediaStaticDir({}, () => false);
    assert.match(dir, /media$/);
    assert.notEqual(dir, CANONICAL_MEDIA_PATH);
  });
});
