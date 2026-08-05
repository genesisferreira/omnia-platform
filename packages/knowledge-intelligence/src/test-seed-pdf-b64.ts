import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractPdf } from './extract';

const KI_SEED_PDF_BASE64 =
  'JVBERi0xLjQKMSAwIG9iajw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PmVuZG9iagoyIDAgb2JqPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj5lbmRvYmoKMyAwIG9iajw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0gL0NvbnRlbnRzIDUgMCBSIC9SZXNvdXJjZXM8PCAvRm9udDw8IC9GMSA0IDAgUiA+PiA+PiA+PmVuZG9iago0IDAgb2JqPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+ZW5kb2JqCjUgMCBvYmo8PCAvTGVuZ3RoIDY4ID4+c3RyZWFtCkJUIC9GMSAxMiBUZiA3MiA3MjAgVGQgKE9tbmlhIEtub3dsZWRnZSBJbnRlbGxpZ2VuY2UgU2VlZCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTYgMDAwMDAgbiAKMDAwMDAwMDExMSAwMDAwMCBuIAowMDAwMDAwMjMzIDAwMDAwIG4gCjAwMDAwMDAzMDEgMDAwMDAgbiAKdHJhaWxlcjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQxNwolJUVPRgo=';

describe('seed pdf base64', () => {
  it('extracts fixture used by admin seed', async () => {
    const result = await extractPdf(Buffer.from(KI_SEED_PDF_BASE64, 'base64'));
    assert.ok(result.text.includes('Omnia Knowledge Intelligence'));
  });
});
