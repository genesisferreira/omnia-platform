import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';

import {
  DEVICE_BLOCKING_STATES,
  DEVICE_COOKIE_MAX_AGE_SECONDS,
  DEVICE_TOKEN_HEADER,
  describeDevice,
  isWellFormedDeviceToken,
  resolveDeviceCookieConfig,
  safePortalNextPath,
  type DeviceAccessState,
} from '@omnia/shared';

import { getAdminBaseUrl } from './admin-url';

/**
 * Device Access Control — lado Portal (server-only).
 * O enforcement real está no Admin (gate canônico); aqui só: (1) encaminhar o token do
 * dispositivo em TODA chamada S2S; (2) emitir/guardar o cookie após registro; (3) UX.
 * O token nunca é logado nem exposto a JavaScript do browser (HttpOnly).
 */
export function getDeviceCookieConfig() {
  return resolveDeviceCookieConfig({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL,
    nodeEnv: process.env.NODE_ENV,
    nameOverride: process.env.OMNIA_DEVICE_COOKIE_NAME,
    domainOverride: process.env.OMNIA_DEVICE_COOKIE_DOMAIN,
  });
}

export async function getDeviceToken(): Promise<string | null> {
  try {
    const store = await cookies();
    const value = store.get(getDeviceCookieConfig().name)?.value ?? null;
    return isWellFormedDeviceToken(value) ? value : null;
  } catch {
    return null;
  }
}

/** Header S2S com o token do dispositivo (vazio quando não há cookie). */
export async function deviceHeaders(): Promise<Record<string, string>> {
  const token = await getDeviceToken();
  return token ? { [DEVICE_TOKEN_HEADER]: token } : {};
}

export function setDeviceCookie(response: NextResponse, token: string): void {
  const cfg = getDeviceCookieConfig();
  response.cookies.set(cfg.name, token, {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
    ...(cfg.domain ? { domain: cfg.domain } : {}),
  });
}

export type DeviceStatusView = {
  ok: boolean;
  state: DeviceAccessState;
  limit?: number;
  authorizedCount?: number;
  overLimit?: boolean;
  currentDevice?: SafeDevice | null;
  authorizedDevices?: SafeDevice[];
  openRequest?: { id: string; status: string; createdAt: string; reason: string } | null;
};

export type SafeDevice = {
  id: string;
  label: string;
  deviceType: string;
  status: string;
  createdAt: string;
  lastSeenAt: string | null;
  current?: boolean;
};

async function adminDeviceCall(
  path: string,
  sessionToken: string,
  init: { method?: string; body?: unknown; userAgent?: string | null } = {},
): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `JWT ${sessionToken}`,
    ...(await deviceHeaders()),
  };
  if (init.userAgent) headers['User-Agent'] = init.userAgent.slice(0, 400);
  const res = await fetch(`${getAdminBaseUrl()}/api/omnia/devices/${path}`, {
    method: init.method || 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: res.status, data };
}

export async function fetchDeviceStatus(sessionToken: string): Promise<DeviceStatusView | null> {
  try {
    const r = await adminDeviceCall('status', sessionToken);
    if (r.status !== 200 || !r.data) return null;
    return r.data as unknown as DeviceStatusView;
  } catch {
    return null;
  }
}

export async function registerDeviceForSession(sessionToken: string, userAgent: string | null) {
  const described = describeDevice(userAgent);
  return adminDeviceCall('register', sessionToken, {
    method: 'POST',
    body: { label: described.label, deviceType: described.deviceType },
    userAgent,
  });
}

export async function requestDeviceAccess(sessionToken: string, reason: unknown) {
  return adminDeviceCall('request', sessionToken, { method: 'POST', body: { reason } });
}

export function isBlockingState(state: unknown): boolean {
  return (DEVICE_BLOCKING_STATES as readonly unknown[]).includes(state);
}

export function devicePagePath(returnPath: string): string {
  return `/dispositivo?next=${encodeURIComponent(safePortalNextPath(returnPath, '/aluno'))}`;
}

/**
 * Gate de UX para páginas acadêmicas do aluno. Só alunos; política OFF / erro ⇒ segue
 * (o Admin continua sendo a barreira real de dados).
 */
export async function requireAuthorizedDevice(
  user: { role?: string | null },
  sessionToken: string | null,
  returnPath: string,
): Promise<void> {
  if (user.role !== 'student' || !sessionToken) return;
  const status = await fetchDeviceStatus(sessionToken);
  if (status && isBlockingState(status.state)) {
    redirect(devicePagePath(returnPath));
  }
}
