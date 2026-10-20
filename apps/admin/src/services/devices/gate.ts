/**
 * Device Access Control — PONTO CANÔNICO de enforcement no Admin.
 *
 * Envolve o handler REST único do Payload (`app/(payload)/api/[...slug]/route.ts`), por onde
 * passam TODAS as coleções REST e TODOS os endpoints customizados (`/api/omnia/*`,
 * `/api/retrieval/*`), inclusive as chamadas S2S do Portal (x-omnia-internal-key + user id).
 *
 * Decisão por requisição:
 *  - caminho isento (auth/logout/me, fluxo de dispositivo, endpoints públicos) ⇒ passa;
 *  - sem credencial ⇒ passa (ACL normal do Payload decide);
 *  - política desligada / ausente / com erro ⇒ passa (fail-open, auth normal continua);
 *  - usuário não-student ⇒ passa;
 *  - student com dispositivo AUTORIZADO ⇒ passa;
 *  - caso contrário: `/api/omnia/*` e `/api/retrieval/*` ⇒ 403 DEVICE_NOT_AUTHORIZED;
 *    demais rotas REST ⇒ credenciais removidas (requisição vira anônima: só o que é público).
 */
import { timingSafeEqual } from 'node:crypto';

import { getInternalApiConfig } from '@omnia/config';
import {
  DEVICE_NOT_AUTHORIZED_CODE,
  DEVICE_TOKEN_HEADER,
  readCookieFromHeader,
  resolveDeviceCookieConfig,
  type DeviceAccessState,
} from '@omnia/shared';
import type { Payload } from 'payload';

import { evaluateDeviceAccess, type DeviceStore } from './policy';

const INTERNAL_KEY_HEADERS = ['x-omnia-internal-key', 'x-omnia-internal-secret'] as const;

const EXEMPT_PREFIXES = ['/api/users', '/api/omnia/devices/', '/api/omnia/public-'];
const EXEMPT_EXACT = new Set([
  '/api/access',
  '/api/omnia/devices',
  '/api/omnia/lead-capture',
  '/api/omnia/partner-register',
  '/api/omnia/postal-code',
  '/api/omnia/resolve-site',
  '/api/omnia/ai/public-chat',
  '/api/omnia/lms/health',
  '/api/omnia/lms/sessions/logout',
]);
const JSON_DENY_PREFIXES = ['/api/omnia/', '/api/retrieval/'];

export function isDeviceGateExemptPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (EXEMPT_EXACT.has(p)) return true;
  return EXEMPT_PREFIXES.some((prefix) =>
    prefix.endsWith('/') || prefix.endsWith('-')
      ? p.startsWith(prefix)
      : p === prefix || p.startsWith(`${prefix}/`),
  );
}

export function deviceCookieConfig() {
  return resolveDeviceCookieConfig({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL,
    nodeEnv: process.env.NODE_ENV,
    nameOverride: process.env.OMNIA_DEVICE_COOKIE_NAME,
    domainOverride: process.env.OMNIA_DEVICE_COOKIE_DOMAIN,
  });
}

/** Token do dispositivo: header S2S do Portal ou cookie compartilhado (browser → Admin). */
export function readDeviceToken(headers: Headers): string | null {
  const header = headers.get(DEVICE_TOKEN_HEADER)?.trim();
  if (header) return header;
  return readCookieFromHeader(headers.get('cookie'), deviceCookieConfig().name);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hasValidInternalKeyHeader(headers: Headers): boolean {
  let secret: string;
  try {
    secret = getInternalApiConfig().secret;
  } catch {
    return false;
  }
  for (const name of INTERNAL_KEY_HEADERS) {
    const v = headers.get(name)?.trim();
    if (v && safeEqual(v, secret)) return true;
  }
  return false;
}

function hasPayloadCredential(headers: Headers, cookiePrefix: string): boolean {
  const auth = headers.get('authorization') || '';
  if (/^(JWT|Bearer)\s+\S+/i.test(auth)) return true;
  return Boolean(readCookieFromHeader(headers.get('cookie'), `${cookiePrefix}-token`));
}

export type GateDecision =
  | { kind: 'pass'; reason: string }
  | { kind: 'deny'; state: DeviceAccessState; userId: string }
  | { kind: 'downgrade'; state: DeviceAccessState; userId: string };

export type GateDeps = {
  payload: Payload;
  store: DeviceStore;
  /** Resolve o usuário de sessão Payload (JWT/cookie); injetável em testes. */
  authenticate?: (headers: Headers) => Promise<{ id?: unknown; collection?: string } | null>;
  internalKeyValid?: (headers: Headers) => boolean;
};

export async function decideDeviceGate(request: Request, deps: GateDeps): Promise<GateDecision> {
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS') return { kind: 'pass', reason: 'OPTIONS' };
  const pathname = new URL(request.url).pathname;
  if (isDeviceGateExemptPath(pathname)) return { kind: 'pass', reason: 'EXEMPT' };

  const headers = request.headers;
  const prefix = deps.payload.config?.cookiePrefix || 'payload';
  const internalValid = (deps.internalKeyValid ?? hasValidInternalKeyHeader)(headers);
  const internalUserId = internalValid ? headers.get('x-omnia-user-id')?.trim() || null : null;
  const payloadCred = hasPayloadCredential(headers, prefix);
  if (!internalUserId && !payloadCred) return { kind: 'pass', reason: 'NO_CREDENTIAL' };

  // Política primeiro (barata, cacheada): OFF ⇒ nenhum custo extra por requisição.
  let enabled = false;
  try {
    const raw = (await deps.store.loadSettings()) as { enabled?: unknown } | null;
    enabled = raw?.enabled === true;
  } catch {
    return { kind: 'pass', reason: 'CONFIG_UNAVAILABLE' };
  }
  if (!enabled) return { kind: 'pass', reason: 'DISABLED' };

  let userId: string | null = internalUserId;
  if (!userId && payloadCred) {
    const authenticate =
      deps.authenticate ??
      (async (h: Headers) => {
        const res = await deps.payload.auth({ headers: h });
        return (res?.user as { id?: unknown; collection?: string } | null) ?? null;
      });
    const user = await authenticate(headers);
    if (user && (user.collection == null || user.collection === 'users') && user.id != null) {
      userId = String(user.id);
    }
  }
  if (!userId) return { kind: 'pass', reason: 'NO_USER' };

  const ev = await evaluateDeviceAccess(deps.store, {
    userId,
    rawToken: readDeviceToken(headers),
    touch: true,
  });
  if (!ev.enforced || ev.state === 'ALLOWED') return { kind: 'pass', reason: ev.state };
  const json = JSON_DENY_PREFIXES.some((p) => pathname.startsWith(p));
  return { kind: json ? 'deny' : 'downgrade', state: ev.state, userId };
}

const STRIP_HEADERS = [
  'authorization',
  'x-omnia-internal-key',
  'x-omnia-internal-secret',
  'x-omnia-user-id',
  'x-omnia-lms-role',
  DEVICE_TOKEN_HEADER,
];

/** Remove toda credencial (Payload cookie/JWT e S2S) — a requisição segue como anônima. */
export function stripCredentials(request: Request, cookiePrefix: string): Request {
  const headers = new Headers(request.headers);
  for (const h of STRIP_HEADERS) headers.delete(h);
  const cookie = headers.get('cookie');
  if (cookie) {
    const kept = cookie
      .split(';')
      .map((c) => c.trim())
      .filter((c) => c && !c.startsWith(`${cookiePrefix}-token=`));
    if (kept.length) headers.set('cookie', kept.join('; '));
    else headers.delete('cookie');
  }
  const method = request.method.toUpperCase();
  const init: RequestInit & { duplex?: 'half' } = { method, headers };
  if (method !== 'GET' && method !== 'HEAD' && request.body) {
    init.body = request.body;
    init.duplex = 'half';
  }
  return new Request(request.url, init);
}

export function deviceDeniedResponse(state: DeviceAccessState): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: DEVICE_NOT_AUTHORIZED_CODE,
        state,
        message:
          'Este dispositivo ainda não está autorizado para acessar a área acadêmica. Solicite a liberação em /dispositivo.',
      },
    },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  );
}
