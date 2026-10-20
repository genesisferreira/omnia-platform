import { NextResponse } from 'next/server';

import { resolveBrowserLocation } from '@omnia/shared';

/**
 * Same-origin browser redirect with a relative Location header.
 * Never uses request.url / HOSTNAME / PORT — those leak 0.0.0.0 in Docker.
 */
export function browserRedirect(path: string, status = 303, fallback = '/'): NextResponse {
  const location = resolveBrowserLocation(path, fallback);
  return new NextResponse(null, {
    status,
    headers: { Location: location },
  });
}
