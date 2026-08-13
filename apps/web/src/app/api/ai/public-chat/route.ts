import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { checkRateLimit, clientIpFromHeaders } from '@omnia/shared/rate-limit';

import { fetchAiPublicChat } from '@/lib/ai/connector';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const ANON_COOKIE = 'omnia_ai_anon';
const ANON_MAX_AGE = 60 * 60 * 24 * 7;

/** Human chat: generous per anonymous session. Abuse: tighter per validated IP. */
const HUMAN_CHAT_MAX = 120;
const HUMAN_CHAT_WINDOW_MS = 15 * 60 * 1000;
const ABUSE_IP_MAX = 60;
const ABUSE_IP_WINDOW_MS = 5 * 60 * 1000;

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

function rateLimitedResponse(retryAfterSeconds?: number): NextResponse {
  const seconds = Math.max(1, retryAfterSeconds || 60);
  const body = {
    ok: false,
    error: 'RATE_LIMITED',
    message:
      'Você enviou várias mensagens em pouco tempo. Aguarde alguns instantes e tente novamente.',
    retryAfterSeconds: seconds,
  };
  return NextResponse.json(body, {
    status: 429,
    headers: {
      'Retry-After': String(seconds),
      'Cache-Control': 'no-store',
    },
  });
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

  const requestedAssistant =
    body.assistantId != null ? String(body.assistantId).trim().toLowerCase() : 'concierge';
  if (requestedAssistant !== 'concierge' && requestedAssistant !== 'auto') {
    return NextResponse.json(
      { ok: false, error: 'ASSISTANT_FORBIDDEN:public_concierge_only' },
      { status: 403 },
    );
  }

  // Resolve anon id BEFORE rate limit so legitimate multi-turn uses session key.
  const anon = ensureAnonId(request);
  const ip = clientIpFromHeaders(request.headers);

  // Dual policy: session (human) + IP (abuse). Both must pass.
  const human = await checkRateLimit({
    scope: 'ai-public-chat-human',
    subjects: [{ value: `anon:${anon.id}`, hash: true }],
    max: HUMAN_CHAT_MAX,
    windowMs: HUMAN_CHAT_WINDOW_MS,
    onRedisUnavailable: 'fail-closed',
  });
  if (!human.allowed) {
    const response = rateLimitedResponse(human.retryAfterSeconds);
    return withAnonCookie(response, anon.id, anon.isNew);
  }

  const abuse = await checkRateLimit({
    scope: 'ai-public-chat-abuse',
    subjects: [{ value: `ip:${ip || 'unknown'}` }],
    max: ABUSE_IP_MAX,
    windowMs: ABUSE_IP_WINDOW_MS,
    onRedisUnavailable: 'fail-closed',
  });
  if (!abuse.allowed) {
    const response = rateLimitedResponse(abuse.retryAfterSeconds);
    return withAnonCookie(response, anon.id, anon.isNew);
  }

  const result = await fetchAiPublicChat({
    question,
    anonymousSessionId: anon.id,
    sessionId: (body.sessionId as string | number | null) ?? null,
    assistantId: requestedAssistant,
    language: body.language != null ? String(body.language) : 'pt-BR',
  });

  if (!result.ok) {
    const response = NextResponse.json(
      {
        ok: false,
        error: result.error,
        message:
          result.error === 'RATE_LIMITED'
            ? 'Você enviou várias mensagens em pouco tempo. Aguarde alguns instantes e tente novamente.'
            : undefined,
        data: result.data,
      },
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
