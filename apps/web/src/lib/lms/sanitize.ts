const MOODLE_URL_RE = /https?:\/\/[^\s"'<>]*moodle[^\s"'<>]*/gi;
const WSTOKEN_RE = /([?&]wstoken=)[^&\s"'<>]+/gi;

/** Remove URLs Moodle / wstoken de payloads destinados ao browser. */
export function scrubMoodleLeakage<T>(value: T): T {
  return scrubValue(value) as T;
}

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(MOODLE_URL_RE, '[redacted-moodle-url]')
      .replace(WSTOKEN_RE, '$1[redacted]');
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (key.includes('wstoken') || (key === 'token' && typeof v === 'string')) {
        out[k] = '[redacted]';
        continue;
      }
      out[k] = scrubValue(v);
    }
    return out;
  }
  return value;
}

/** HTML de summary/descrição: sem script e sem href/src Moodle. */
export function sanitizeLmsHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\s(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(MOODLE_URL_RE, '#')
    .replace(/href\s*=\s*(["'])[^"']*moodle[^"']*\1/gi, 'href="#"')
    .replace(/src\s*=\s*(["'])[^"']*moodle[^"']*\1/gi, 'src=""');
}
