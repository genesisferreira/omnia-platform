import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export const COOKIE_NAME = 'omnia_payload_token';

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 8;

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    ...baseCookieOptions,
    maxAge: 0,
  });
}
