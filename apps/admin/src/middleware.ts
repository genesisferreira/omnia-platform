import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 20;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function allow(key: string): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}

/**
 * Middleware complementar (não é a única proteção).
 * - Redireciona visitante de rotas de painel para /login
 * - Rate limit básico em POST /api/users/login
 *
 * A autorização definitiva ocorre no servidor (layouts/páginas + Payload access).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/users/login' && request.method === 'POST') {
    if (!allow(`login:${clientKey(request)}`)) {
      return NextResponse.json(
        { errors: [{ message: 'Muitas tentativas. Aguarde e tente novamente.' }] },
        { status: 429 },
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
