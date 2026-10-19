import { checkRateLimit } from '@omnia/shared/rate-limit';

function rateLimitRedisMode(): 'fail-closed' | 'memory-fallback' {
  const env = (process.env.APP_ENV || process.env.OMNIA_ENV || '').toLowerCase();
  return env === 'production' ? 'fail-closed' : 'memory-fallback';
}

/** Limite por usuário autenticado. Retorna a resposta 429/503 pronta ou `null` quando liberado. */
export async function enforceMarketplaceRateLimit(options: {
  scope: string;
  userId: string | number;
  max: number;
  windowMs: number;
}): Promise<Response | null> {
  const quota = await checkRateLimit({
    scope: options.scope,
    subjects: [{ value: String(options.userId) }],
    max: options.max,
    windowMs: options.windowMs,
    onRedisUnavailable: rateLimitRedisMode(),
  });
  if (quota.allowed) return null;

  const retryAfter = quota.retryAfterSeconds ?? 600;
  const unavailable = quota.reason === 'redis_unavailable';
  const code = unavailable ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED';
  const message = unavailable
    ? 'Serviço temporariamente indisponível.'
    : `Muitas operações em pouco tempo. Tente novamente em ${Math.max(1, Math.ceil(retryAfter / 60))} min.`;
  return Response.json(
    { ok: false, code, message, retryAfter, error: { code, message } },
    {
      status: unavailable ? 503 : 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) },
    },
  );
}
