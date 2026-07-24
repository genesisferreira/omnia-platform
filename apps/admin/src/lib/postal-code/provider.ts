/**
 * Consulta de CEP (Brasil) — ViaCEP com fallback BrasilAPI.
 *
 * Env:
 * - POSTAL_CODE_PROVIDER=viacep|brasilapi|auto (default: auto)
 * - POSTAL_CODE_API_TIMEOUT_MS=5000
 */

export type PostalCodeLookupResult = {
  postalCode: string;
  street: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  country: string;
  source: 'viacep' | 'brasilapi';
};

export function normalizeBrazilianPostalCode(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

function timeoutMs(): number {
  const n = Number(process.env.POSTAL_CODE_API_TIMEOUT_MS || 5000);
  return Number.isFinite(n) && n >= 1000 ? Math.min(n, 15000) : 5000;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs()),
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

async function lookupViaCep(cep: string): Promise<PostalCodeLookupResult | null> {
  const data = (await fetchJson(`https://viacep.com.br/ws/${cep}/json/`)) as
    | {
        erro?: boolean;
        cep?: string;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      }
    | null;
  if (!data || data.erro || !data.localidade || !data.uf) {
    return null;
  }
  return {
    postalCode: cep,
    street: data.logradouro?.trim() || null,
    neighborhood: data.bairro?.trim() || null,
    city: data.localidade.trim(),
    state: data.uf.trim().toUpperCase(),
    country: 'Brasil',
    source: 'viacep',
  };
}

async function lookupBrasilApi(cep: string): Promise<PostalCodeLookupResult | null> {
  const data = (await fetchJson(`https://brasilapi.com.br/api/cep/v1/${cep}`)) as
    | {
        cep?: string;
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
      }
    | null;
  if (!data?.city || !data?.state) {
    return null;
  }
  return {
    postalCode: cep,
    street: data.street?.trim() || null,
    neighborhood: data.neighborhood?.trim() || null,
    city: data.city.trim(),
    state: data.state.trim().toUpperCase(),
    country: 'Brasil',
    source: 'brasilapi',
  };
}

export async function lookupPostalCode(postalCode: unknown): Promise<PostalCodeLookupResult | null> {
  const cep = normalizeBrazilianPostalCode(postalCode);
  if (!cep) {
    return null;
  }

  const mode = (process.env.POSTAL_CODE_PROVIDER || 'auto').trim().toLowerCase();
  if (mode === 'brasilapi') {
    return lookupBrasilApi(cep);
  }
  if (mode === 'viacep') {
    return lookupViaCep(cep);
  }

  const primary = await lookupViaCep(cep);
  if (primary) {
    return primary;
  }
  return lookupBrasilApi(cep);
}
