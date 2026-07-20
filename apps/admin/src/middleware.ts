import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Middleware Edge-safe (sem Redis/ioredis).
 * Rate limit Redis do login nativo fica em Users.beforeOperation (Node).
 * - Redireciona visitante de rotas de painel para /login
 *
 * Bloqueio accountStatus=blocked: hooks Users + JWT wrap (account-status).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ['/'],
};
