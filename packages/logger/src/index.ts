/**
 * @omnia/logger — Logging estruturado sanitizado (LGPD).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

const SECRET_KEYS =
  /token|password|cookie|authorization|secret|wstoken|payload_secret|database_url|api[_-]?key/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SECRET_KEYS.test(key)) return '[redacted]';
  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 120)}…[truncated]`;
  }
  return value;
}

export function sanitizeLogFields(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = sanitizeLogFields(v as LogFields);
    } else {
      out[k] = sanitizeValue(k, v);
    }
  }
  return out;
}

export type LoggerOptions = {
  service: string;
  environment?: string;
};

export type StructuredLogger = {
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
  child: (fields: LogFields) => StructuredLogger;
};

function write(
  level: LogLevel,
  service: string,
  environment: string,
  event: string,
  fields: LogFields,
  base: LogFields,
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    environment,
    service,
    event,
    ...sanitizeLogFields({ ...base, ...fields }),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export function createLogger(options: LoggerOptions): StructuredLogger {
  const environment =
    options.environment ||
    process.env.APP_ENV ||
    process.env.OMNIA_ENV ||
    process.env.NODE_ENV ||
    'development';

  const make = (base: LogFields): StructuredLogger => ({
    debug: (event, fields = {}) =>
      write('debug', options.service, environment, event, fields, base),
    info: (event, fields = {}) => write('info', options.service, environment, event, fields, base),
    warn: (event, fields = {}) => write('warn', options.service, environment, event, fields, base),
    error: (event, fields = {}) =>
      write('error', options.service, environment, event, fields, base),
    child: (fields) => make({ ...base, ...fields }),
  });

  return make({});
}
