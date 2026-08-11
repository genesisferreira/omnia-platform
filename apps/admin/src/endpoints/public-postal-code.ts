import type { Endpoint, PayloadRequest } from 'payload';

import { checkRateLimit, clientIpFromHeaders } from '@omnia/shared/rate-limit';

import { isTrustedPartnerOrigin } from '../lib/partner-register';
import { lookupPostalCode, normalizeBrazilianPostalCode } from '../lib/postal-code/provider';

const json = (status: number, body: unknown, cache = true): Response =>
  Response.json(body, {
    status,
    headers: cache
      ? { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' }
      : { 'Cache-Control': 'no-store' },
  });

/**
 * GET /api/omnia/postal-code?cep=30110012
 */
export const publicPostalCodeEndpoint: Endpoint = {
  path: '/omnia/postal-code',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const origin = req.headers.get('origin');
      if (origin && !isTrustedPartnerOrigin(origin)) {
        return json(
          403,
          {
            ok: false,
            error: { code: 'FORBIDDEN', message: 'Origem não autorizada.' },
          },
          false,
        );
      }

      const url = new URL(req.url || 'http://local', 'http://local');
      const cep = normalizeBrazilianPostalCode(
        url.searchParams.get('cep') || url.searchParams.get('postalCode') || '',
      );
      if (!cep) {
        return json(
          400,
          {
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'Informe um CEP válido com 8 dígitos.' },
          },
          false,
        );
      }

      const ip = clientIpFromHeaders(req.headers) || 'unknown';
      const rate = await checkRateLimit({
        scope: 'postal-code',
        subjects: [{ value: ip }],
        max: 30,
        windowMs: 60_000,
        onRedisUnavailable:
          process.env.NODE_ENV === 'production' ? 'fail-closed' : 'memory-fallback',
      });
      if (!rate.allowed) {
        return json(
          429,
          {
            ok: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Muitas consultas. Tente novamente em breve.',
            },
          },
          false,
        );
      }

      const result = await lookupPostalCode(cep);
      if (!result) {
        return json(
          404,
          {
            ok: false,
            error: { code: 'NOT_FOUND', message: 'CEP não encontrado.' },
          },
          false,
        );
      }

      return json(200, {
        ok: true,
        address: {
          zipCode: result.postalCode,
          address: result.street,
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.state,
          country: result.country,
          source: result.source,
        },
      });
    } catch {
      req.payload.logger.error('postal-code: failed');
      return json(
        500,
        {
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Não foi possível consultar o CEP.' },
        },
        false,
      );
    }
  },
};
