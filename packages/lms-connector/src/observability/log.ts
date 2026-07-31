type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SECRET_KEYS = /token|password|cookie|authorization|secret|wstoken/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SECRET_KEYS.test(key)) return '[redacted]';
  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 120)}…[truncated]`;
  }
  return value;
}

function sanitizeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitizeFields(v as Record<string, unknown>);
    } else {
      out[k] = sanitizeValue(k, v);
    }
  }
  return out;
}

/** Log estruturado sanitizado do LMS connector. */
export function lmsLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    module: 'lms-connector',
    event,
    ...sanitizeFields(fields),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}
