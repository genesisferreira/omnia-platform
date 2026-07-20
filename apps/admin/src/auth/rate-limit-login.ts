import type { CollectionBeforeOperationHook } from 'payload';
import { APIError } from 'payload';

import { checkRateLimit, clientIpFromHeaders } from '@omnia/shared/rate-limit';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 20;

/**
 * Rate limit Redis no login nativo Payload (runtime Node — não Edge middleware).
 */
export const rateLimitNativeLogin: CollectionBeforeOperationHook = async ({
  operation,
  args,
  req,
}) => {
  if (operation !== 'login') {
    return args;
  }

  const ip = clientIpFromHeaders(req.headers);
  const emailRaw =
    args && typeof args === 'object' && 'data' in args
      ? (args as { data?: { email?: unknown } }).data?.email
      : undefined;
  const email = typeof emailRaw === 'string' ? emailRaw.trim() : '';

  const decision = await checkRateLimit({
    scope: 'login-native',
    subjects: [{ value: `ip:${ip}` }, ...(email ? [{ value: email, hash: true as const }] : [])],
    max: LOGIN_MAX,
    windowMs: LOGIN_WINDOW_MS,
    onRedisUnavailable: 'fail-closed',
  });

  if (!decision.allowed) {
    req.payload.logger.warn({
      msg: 'auth: login rate limited',
      code: decision.reason === 'redis_unavailable' ? 'REDIS_UNAVAILABLE' : 'RATE_LIMITED',
    });
    throw new APIError(
      decision.reason === 'redis_unavailable'
        ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
        : 'Muitas tentativas. Aguarde e tente novamente.',
      decision.reason === 'redis_unavailable' ? 503 : 429,
    );
  }

  return args;
};
