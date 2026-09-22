import { NextResponse } from 'next/server';

import { resolveBrowserLocation } from '@omnia/shared';

/** Same-origin browser redirect. Never uses request.url (leaks HOSTNAME=0.0.0.0). */
export function browserRedirect(path: string, status = 303, fallback = '/login'): NextResponse {
  const location = resolveBrowserLocation(path, fallback);
  return new NextResponse(null, {
    status,
    headers: { Location: location },
  });
}
