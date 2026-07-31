'use client';

import { useEffect, useRef } from 'react';

const SESSION_KEY = 'omnia:lms:sessionId';
const DEVICE_KEY = 'omnia:lms:deviceId';
const HEARTBEAT_MS = 60_000;

function getOrCreateDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}`;
    window.localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'unknown';
  }
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  return res.json().catch(() => null);
}

/**
 * Cria sessão LMS no Connector, envia heartbeat e limpa no unload.
 * Tokens Moodle nunca passam pelo browser — só sessionId Omnia.
 */
export function LmsSessionLifecycle() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const deviceId = getOrCreateDeviceId();
      const data = (await postJson('/api/lms/sessions', { deviceId })) as {
        ok?: boolean;
        session?: { sessionId?: string };
      } | null;
      if (cancelled || !data?.session?.sessionId) return;
      const sessionId = data.session.sessionId;
      try {
        window.sessionStorage.setItem(SESSION_KEY, sessionId);
      } catch {
        // ignore
      }

      timer.current = setInterval(() => {
        void postJson('/api/lms/sessions/heartbeat', { sessionId });
      }, HEARTBEAT_MS);
    }

    void start();

    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return null;
}

export async function logoutLmsSession(): Promise<void> {
  try {
    const sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (sessionId) {
      await postJson('/api/lms/sessions/logout', { sessionId });
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // best-effort
  }
}
