/**
 * Erros tipados do connector Moodle.
 * Mensagens sanitizadas — nunca incluir token, stack ou payload sensível na resposta HTTP.
 */

export type MoodleErrorCode =
  | 'MOODLE_UNAVAILABLE'
  | 'MOODLE_AUTHENTICATION'
  | 'MOODLE_PERMISSION'
  | 'MOODLE_NOT_FOUND'
  | 'MOODLE_VALIDATION'
  | 'MOODLE_RATE_LIMIT'
  | 'MOODLE_UNEXPECTED_RESPONSE'
  | 'MOODLE_TIMEOUT'
  | 'CONNECTOR_DISABLED'
  | 'CONNECTOR_READ_ONLY'
  | 'IDENTITY_NOT_LINKED'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'SESSION_LIMIT'
  | 'SESSION_STORE_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST';

export class LmsConnectorError extends Error {
  readonly code: MoodleErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly correlationId: string | null;

  constructor(
    code: MoodleErrorCode,
    message: string,
    options?: {
      httpStatus?: number;
      retryable?: boolean;
      correlationId?: string | null;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'LmsConnectorError';
    this.code = code;
    this.httpStatus = options?.httpStatus ?? 502;
    this.retryable = options?.retryable ?? false;
    this.correlationId = options?.correlationId ?? null;
  }

  toPublicJson(): { ok: false; error: { code: MoodleErrorCode; message: string } } {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export class MoodleUnavailableError extends LmsConnectorError {
  constructor(
    message = 'Moodle is temporarily unavailable',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_UNAVAILABLE', message, { httpStatus: 503, retryable: true, ...opts });
    this.name = 'MoodleUnavailableError';
  }
}

export class MoodleAuthenticationError extends LmsConnectorError {
  constructor(
    message = 'Moodle authentication failed',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_AUTHENTICATION', message, { httpStatus: 502, retryable: false, ...opts });
    this.name = 'MoodleAuthenticationError';
  }
}

export class MoodlePermissionError extends LmsConnectorError {
  constructor(
    message = 'Moodle permission denied',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_PERMISSION', message, { httpStatus: 403, retryable: false, ...opts });
    this.name = 'MoodlePermissionError';
  }
}

export class MoodleNotFoundError extends LmsConnectorError {
  constructor(
    message = 'Resource not found in Moodle',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_NOT_FOUND', message, { httpStatus: 404, retryable: false, ...opts });
    this.name = 'MoodleNotFoundError';
  }
}

export class MoodleValidationError extends LmsConnectorError {
  constructor(
    message = 'Invalid Moodle request parameters',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_VALIDATION', message, { httpStatus: 400, retryable: false, ...opts });
    this.name = 'MoodleValidationError';
  }
}

export class MoodleRateLimitError extends LmsConnectorError {
  constructor(
    message = 'Moodle rate limit exceeded',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_RATE_LIMIT', message, { httpStatus: 429, retryable: true, ...opts });
    this.name = 'MoodleRateLimitError';
  }
}

export class MoodleUnexpectedResponseError extends LmsConnectorError {
  constructor(
    message = 'Unexpected Moodle response',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_UNEXPECTED_RESPONSE', message, { httpStatus: 502, retryable: false, ...opts });
    this.name = 'MoodleUnexpectedResponseError';
  }
}

export class MoodleTimeoutError extends LmsConnectorError {
  constructor(
    message = 'Moodle request timed out',
    opts?: ConstructorParameters<typeof LmsConnectorError>[2],
  ) {
    super('MOODLE_TIMEOUT', message, { httpStatus: 504, retryable: true, ...opts });
    this.name = 'MoodleTimeoutError';
  }
}

/** Mapeia exceptionkey/errorcode do Moodle para erro tipado. */
export function mapMoodleException(
  payload: { errorcode?: string; exception?: string; message?: string },
  correlationId?: string | null,
): LmsConnectorError {
  const code = (payload.errorcode || payload.exception || '').toLowerCase();
  const opts = { correlationId: correlationId ?? null };
  if (
    code.includes('invalidtoken') ||
    code.includes('accessexception') ||
    code.includes('invalid_token')
  ) {
    return new MoodleAuthenticationError('Moodle authentication failed', opts);
  }
  if (
    code.includes('nopermission') ||
    code.includes('accesscontrol') ||
    code.includes('required_capability')
  ) {
    return new MoodlePermissionError('Moodle permission denied', opts);
  }
  if (code.includes('invalidparameter') || code.includes('invalid_parameter')) {
    return new MoodleValidationError('Invalid Moodle request parameters', opts);
  }
  if (code.includes('notfound') || code.includes('invalidrecord')) {
    return new MoodleNotFoundError('Resource not found in Moodle', opts);
  }
  if (code.includes('ratelimit') || code.includes('toomany')) {
    return new MoodleRateLimitError('Moodle rate limit exceeded', opts);
  }
  return new MoodleUnexpectedResponseError('Unexpected Moodle error response', opts);
}
