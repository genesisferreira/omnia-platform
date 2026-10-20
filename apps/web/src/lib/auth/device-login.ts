import type { NextResponse } from 'next/server';

import { isWellFormedDeviceToken } from '@omnia/shared';

import {
  devicePagePath,
  isBlockingState,
  registerDeviceForSession,
  setDeviceCookie,
} from './device';

/**
 * Após login válido de um ALUNO: registra/reconhece o navegador. Qualquer falha ⇒ segue o
 * fluxo normal (o Admin continua sendo a barreira real). Não-alunos: nenhuma chamada.
 */
export async function establishStudentDevice(
  role: string | null | undefined,
  sessionToken: string,
  userAgent: string | null,
  nextPath: string,
): Promise<{ state: string | null; redirectTo: string | null; apply: (r: NextResponse) => void }> {
  const noop = { state: null, redirectTo: null, apply: () => undefined };
  if (role !== 'student') return noop;
  try {
    const r = await registerDeviceForSession(sessionToken, userAgent);
    const data = r.data ?? {};
    const state = typeof data.state === 'string' ? data.state : null;
    const token = data.deviceToken;
    return {
      state,
      redirectTo: isBlockingState(state) ? devicePagePath(nextPath) : null,
      apply: (response) => {
        if (isWellFormedDeviceToken(token)) setDeviceCookie(response, token);
      },
    };
  } catch {
    return noop;
  }
}
