import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { resolveBrowserLocation } from '@omnia/shared';

/**
 * Middleware Edge-safe (sem Redis/ioredis).
 * Rate limit Redis do login nativo fica em Users.beforeOperation (Node).
 * - Redireciona visitante de rotas de painel para /login
 *
 * Bloqueio accountStatus=blocked: hooks Users + JWT wrap (account-status).
 *
 * Location is relative: cloning request.nextUrl would leak HOSTNAME=0.0.0.0.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPanelRoot = pathname === '/' || pathname === '';
  const hasSession = Boolean(request.cookies.get('payload-token')?.value);

  if (isPanelRoot && !hasSession) {
    return new NextResponse(null, {
      status: 307,
      headers: { Location: resolveBrowserLocation('/login', '/login') },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
