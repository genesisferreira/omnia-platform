import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sanitizeLmsHtml, scrubMoodleLeakage } from '../lib/lms/sanitize';

describe('scrubMoodleLeakage', () => {
  it('redacts moodle host URLs in nested payloads', () => {
    const scrubbed = scrubMoodleLeakage({
      ok: true,
      activities: [
        {
          name: 'Fórum',
          url: 'https://moodle.dev.omniafrigo.com.br/mod/forum/view.php?id=1',
        },
      ],
    });
    assert.equal(scrubbed.ok, true);
    assert.ok(scrubbed.activities[0]);
    assert.equal(scrubbed.activities[0]!.url, '[redacted-moodle-url]');
  });

  it('redacts wstoken query values', () => {
    const scrubbed = scrubMoodleLeakage({
      href: 'https://example.com/x?wstoken=supersecret&foo=1',
    });
    assert.match(scrubbed.href, /wstoken=\[redacted\]/);
    assert.doesNotMatch(scrubbed.href, /supersecret/);
  });
});

describe('sanitizeLmsHtml', () => {
  it('strips scripts and moodle hrefs', () => {
    const html = sanitizeLmsHtml(
      '<p>Oi</p><script>alert(1)</script><a href="https://moodle.dev.omniafrigo.com.br/x">x</a>',
    );
    assert.doesNotMatch(html, /script/i);
    assert.doesNotMatch(html, /moodle\.dev/);
    assert.match(html, /href="#"/);
  });
});
