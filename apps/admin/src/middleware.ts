import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { checkRateLimit, clientIpFromHeaders } from '@omnia/shared';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 20;

/**
 * Middleware complementar (não é a única proteção).
 * - Redireciona visitante de rotas de painel para /login
 * - Rate limit Redis em POST /api/users/login (fail-closed)
 *
 * A autorização definitiva ocorre no servidor (layouts/páginas + Payload access).
 * Bloqueio accountStatus=blocked: hooks Users + JWT wrap (account-status).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/users/login' && request.method === 'POST') {
    const ip = clientIpFromHeaders(request.headers);
    const decision = await checkRateLimit({
      scope: 'login',
      subjects: [{ value: `ip:${ip}` }],
      max: LOGIN_MAX,
      windowMs: LOGIN_WINDOW_MS,
      onRedisUnavailable: 'fail-closed',
    });

    if (!decision.allowed) {
      return NextResponse.json(
        {
          errors: [
            {
              message:
                decision.reason === 'redis_unavailable'
                  ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
                  : 'Muitas tentativas. Aguarde e tente novamente.',
            },
          ],
        },
        { status: decision.reason === 'redis_unavailable' ? 503 : 429 },
      );
    }
    return NextResponse.next();
  }

  const isPanelRoot = pathname === '/' || pathname === '';
  const hasSession = Boolean(request.cookies.get('payload-token')?.value);

  if (isPanelRoot && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/api/users/login'],
};
