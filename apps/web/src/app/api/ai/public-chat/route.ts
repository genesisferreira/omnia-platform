import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { checkRateLimit, clientIpFromHeaders } from '@omnia/shared/rate-limit';

import { fetchAiPublicChat } from '@/lib/ai/connector';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const ANON_COOKIE = 'omnia_ai_anon';
const ANON_MAX_AGE = 60 * 60 * 24 * 7;

function readAnonId(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ANON_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function ensureAnonId(request: Request): { id: string; isNew: boolean } {
  const existing = readAnonId(request);
  if (existing && /^[a-zA-Z0-9_-]{16,80}$/.test(existing)) {
    return { id: existing, isNew: false };
  }
  return { id: randomBytes(24).toString('base64url'), isNew: true };
}

function withAnonCookie(response: NextResponse, anonId: string, isNew: boolean): NextResponse {
  if (!isNew) return response;
  response.cookies.set(ANON_COOKIE, anonId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ANON_MAX_AGE,
  });
  return response;
}

/**
 * Public Concierge chat — no login required.
 * Authenticated callers should use /api/ai/chat (session is not elevated from anon cookie).
 */
export async function POST(request: Request) {
  const portalToken = await getSessionToken();
  if (portalToken) {
    return NextResponse.json(
      {
        ok: false,
        error: 'USE_AUTHENTICATED_CHAT',
        message: 'Sessão autenticada detectada. Use o chat autenticado.',
      },
      { status: 409 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const question = String(body.question || '').trim();
  if (!question) {
    return NextResponse.json({ ok: false, error: 'question is required' }, { status: 400 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const rate = await checkRateLimit({
    scope: 'ai-public-chat',
    subjects: [{ value: `ip:${ip}` }],
    max: 30,
    windowMs: 15 * 60 * 1000,
    onRedisUnavailable: 'fail-closed',
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: rate.reason === 'redis_unavailable' ? 'UNAVAILABLE' : 'RATE_LIMITED' },
      { status: rate.reason === 'redis_unavailable' ? 503 : 429 },
    );
  }

  const anon = ensureAnonId(request);
  const result = await fetchAiPublicChat({
    question,
    anonymousSessionId: anon.id,
    sessionId: (body.sessionId as string | number | null) ?? null,
    assistantId: 'concierge',
    language: body.language != null ? String(body.language) : 'pt-BR',
  });

  if (!result.ok) {
    const response = NextResponse.json(
      { ok: false, error: result.error, data: result.data },
      { status: result.status },
    );
    return withAnonCookie(response, anon.id, anon.isNew);
  }

  const response = NextResponse.json(result.data, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
  return withAnonCookie(response, anon.id, anon.isNew);
}
