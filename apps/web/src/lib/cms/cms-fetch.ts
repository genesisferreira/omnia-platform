/**
 * Fetch HTTP para APIs CMS públicas do Admin, com timeout explícito.
 * AbortError deve ser tratado pelo caller como fallback (não erro fatal).
 */

/** Default alinhado ao timeout do site-resolver (5s). */
export const DEFAULT_CMS_FETCH_TIMEOUT_MS = 5000;

const MIN_CMS_FETCH_TIMEOUT_MS = 100;
const MAX_CMS_FETCH_TIMEOUT_MS = 60_000;

/**
 * Lê `CMS_FETCH_TIMEOUT_MS` do ambiente.
 * Valores inválidos / fora da faixa caem no default seguro.
 */
export function getCmsFetchTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.CMS_FETCH_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_CMS_FETCH_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CMS_FETCH_TIMEOUT_MS;
  }

  if (parsed < MIN_CMS_FETCH_TIMEOUT_MS || parsed > MAX_CMS_FETCH_TIMEOUT_MS) {
    return DEFAULT_CMS_FETCH_TIMEOUT_MS;
  }

  return parsed;
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function createAbortError(): Error {
  if (typeof DOMException === 'function') {
    return new DOMException('The operation was aborted.', 'AbortError');
  }
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

export type CmsFetchInit = RequestInit & {
  /** Override do timeout (ms). Default: getCmsFetchTimeoutMs(). */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * `fetch` com AbortController + timeout.
 * Rejeita com AbortError no timeout ou abort externo mesmo se `fetchImpl`
 * ignorar `signal` (ex.: conexão que nunca responde).
 * Propaga AbortError (e outras falhas de rede) para o caller tratar como soft-fail.
 */
export async function fetchWithCmsTimeout(
  input: string | URL,
  init: CmsFetchInit = {},
): Promise<Response> {
  const { timeoutMs = getCmsFetchTimeoutMs(), fetchImpl = globalThis.fetch.bind(globalThis), ...rest } =
    init;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const upstream = rest.signal;
  const onUpstreamAbort = () => {
    controller.abort();
  };

  if (upstream) {
    if (upstream.aborted) {
      controller.abort();
    } else {
      upstream.addEventListener('abort', onUpstreamAbort);
    }
  }

  let onAbort: (() => void) | undefined;

  try {
    if (controller.signal.aborted) {
      throw createAbortError();
    }

    return await new Promise<Response>((resolve, reject) => {
      let settled = false;

      const settleResolve = (response: Response) => {
        if (settled) {
          return;
        }
        settled = true;
        if (onAbort) {
          controller.signal.removeEventListener('abort', onAbort);
          onAbort = undefined;
        }
        resolve(response);
      };

      const settleReject = (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        if (onAbort) {
          controller.signal.removeEventListener('abort', onAbort);
          onAbort = undefined;
        }
        reject(error);
      };

      onAbort = () => {
        settleReject(createAbortError());
      };
      controller.signal.addEventListener('abort', onAbort);

      Promise.resolve(
        fetchImpl(input, {
          ...rest,
          signal: controller.signal,
        }),
      ).then(
        (response) => {
          settleResolve(response);
        },
        (error: unknown) => {
          if (controller.signal.aborted || isAbortError(error)) {
            settleReject(createAbortError());
            return;
          }
          settleReject(error);
        },
      );
    });
  } finally {
    clearTimeout(timeoutId);
    if (upstream) {
      upstream.removeEventListener('abort', onUpstreamAbort);
    }
    if (onAbort) {
      controller.signal.removeEventListener('abort', onAbort);
      onAbort = undefined;
    }
  }
}
