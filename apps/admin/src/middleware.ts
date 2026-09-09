import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { resolvePublicAbsoluteRedirect } from '@omnia/shared';

/**
 * Middleware Edge-safe (sem Redis/ioredis).
 * Rate limit Redis do login nativo fica em Users.beforeOperation (Node).
 * - Redireciona visitante de rotas de painel para /login
 *
 * Bloqueio accountStatus=blocked: hooks Users + JWT wrap (account-status).
 *
 * Location MUST be absolute: Next middleware re-parses Location via NextURL;
 * relative `/login` throws TypeError: Invalid URL (input: '/login').
 * Never use request.url / nextUrl as base (HOSTNAME=0.0.0.0 leak).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPanelRoot = pathname === '/' || pathname === '';
  const hasSession = Boolean(request.cookies.get('payload-token')?.value);

  if (isPanelRoot && !hasSession) {
    const absolute = resolvePublicAbsoluteRedirect({
      path: '/login',
      configuredOrigin: process.env.NEXT_PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_APP_URL,
      forwardedHost: request.headers.get('x-forwarded-host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      nodeEnv: process.env.NODE_ENV,
    });
    if (absolute) {
      return NextResponse.redirect(absolute, 307);
    }
    // Last resort: relative path without NextResponse.redirect internals
    // (still may 500 on some Next builds — env must set NEXT_PUBLIC_ADMIN_URL).
    return new NextResponse(null, {
      status: 307,
      headers: { Location: '/login' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
