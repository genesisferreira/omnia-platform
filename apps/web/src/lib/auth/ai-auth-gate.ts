import { NextResponse } from 'next/server';

import { getSessionToken } from '@/lib/auth/session';

/**
 * Auth-before-validation gate for Portal BFF AI routes.
 * Anonymous callers must receive 401 before any business payload details.
 */
export type AiAuthGate =
  | { ok: false; status: 401; error: 'UNAUTHORIZED' }
  | { ok: false; status: 400; error: string }
  | { ok: true };

export function gateAuthenticatedAiRequest(input: {
  hasSession: boolean;
  jsonValid?: boolean;
  question?: string | null;
  requireQuestion?: boolean;
  requireCourseId?: boolean;
  courseId?: string | number | null;
  requireFeedback?: boolean;
  sessionId?: string | number | null;
  rating?: string | null;
}): AiAuthGate {
  if (!input.hasSession) {
    return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  }
  if (input.jsonValid === false) {
    return { ok: false, status: 400, error: 'INVALID_JSON' };
  }
  if (input.requireQuestion && !String(input.question || '').trim()) {
    return { ok: false, status: 400, error: 'question is required' };
  }
  if (input.requireCourseId && (input.courseId == null || input.courseId === '')) {
    return { ok: false, status: 400, error: 'courseId is required' };
  }
  if (input.requireFeedback) {
    const rating = String(input.rating || '');
    if (input.sessionId == null || (rating !== 'up' && rating !== 'down')) {
      return { ok: false, status: 400, error: 'sessionId and rating(up|down) required' };
    }
  }
  return { ok: true };
}

export async function requirePortalSession(): Promise<
  { ok: true; token: string } | { ok: false; response: NextResponse }
> {
  const token = await getSessionToken();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }
  return { ok: true, token };
}
