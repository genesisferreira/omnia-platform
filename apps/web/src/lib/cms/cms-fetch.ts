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

export type CmsFetchInit = RequestInit & {
  /** Override do timeout (ms). Default: getCmsFetchTimeoutMs(). */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * `fetch` com AbortController + timeout.
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
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      upstream.addEventListener('abort', onUpstreamAbort, { once: true });
    }
  }

  try {
    return await fetchImpl(input, {
      ...rest,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    if (upstream) {
      upstream.removeEventListener('abort', onUpstreamAbort);
    }
  }
}
