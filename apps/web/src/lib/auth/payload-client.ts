import { getAdminBaseUrl } from './admin-url';
import type {
  AuthFailure,
  AuthSuccess,
  LoginResult,
  PayloadPasswordUpdate,
  PortalOrganization,
  PortalUser,
  RegisterBody,
  UpdateProfileBody,
} from './types';

export { getAdminBaseUrl };
export { INTEREST_AREA_OPTIONS } from './constants';

type PayloadRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is PayloadRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const readStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }
      if (isRecord(entry) && typeof entry.id === 'string') {
        return entry.id;
      }
      if (isRecord(entry) && (typeof entry.id === 'number' || typeof entry.id === 'string')) {
        return String(entry.id);
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));

  return items.length > 0 ? items : [];
};

export function mapPortalUser(raw: unknown): PortalUser | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = raw.id;
  const email = readString(raw.email);
  if ((typeof id !== 'string' && typeof id !== 'number') || !email) {
    return null;
  }

  return {
    id: String(id),
    email,
    firstName: readString(raw.firstName),
    lastName: readString(raw.lastName),
    name: readString(raw.name),
    phone: readString(raw.phone),
    whatsapp: readString(raw.whatsapp),
    cpf: readString(raw.cpf),
    role: readString(raw.role),
    accountStatus: readString(raw.accountStatus),
    employerName: readString(raw.employerName),
    jobTitle: readString(raw.jobTitle),
    segment: readString(raw.segment),
    country: readString(raw.country),
    state: readString(raw.state),
    city: readString(raw.city),
    interestAreas: readStringArray(raw.interestAreas),
    groupOrganizations: readStringArray(raw.groupOrganizations),
    lgpdAccepted: typeof raw.lgpdAccepted === 'boolean' ? raw.lgpdAccepted : null,
    lgpdAcceptedAt: readString(raw.lgpdAcceptedAt),
    createdAt: readString(raw.createdAt),
    updatedAt: readString(raw.updatedAt),
  };
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `JWT ${token}`,
  };
}

function genericFailure(
  status: number,
  fallback = 'Não foi possível concluir a operação.',
): AuthFailure {
  return { ok: false, error: fallback, status };
}

async function parsePayloadError(response: Response): Promise<AuthFailure> {
  const payload = (await response.json().catch(() => null)) as PayloadRecord | null;

  if (response.status === 401 || response.status === 403) {
    return genericFailure(response.status, 'Credenciais inválidas ou sessão expirada.');
  }

  if (response.status === 409 || response.status === 400) {
    const message = readString(payload?.message);
    if (message?.toLowerCase().includes('email')) {
      return genericFailure(response.status, 'Este e-mail já está cadastrado.');
    }
    return genericFailure(response.status, 'Verifique os dados informados e tente novamente.');
  }

  return genericFailure(response.status);
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as PayloadRecord | null;

    if (!response.ok) {
      return parsePayloadError(response);
    }

    const token = readString(payload?.token);
    const user = mapPortalUser(payload?.user);
    if (!token || !user) {
      return genericFailure(502, 'Resposta de autenticação inválida.');
    }

    return { ok: true, data: { user, token } };
  } catch {
    return genericFailure(503, 'Serviço temporariamente indisponível. Tente novamente.');
  }
}

export async function registerUser(
  body: RegisterBody,
): Promise<AuthSuccess<PortalUser> | AuthFailure> {
  if (!body.lgpdAccepted) {
    return genericFailure(400, 'É necessário aceitar a política de privacidade.');
  }

  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        lgpdAccepted: true,
      }),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as PayloadRecord | null;

    if (!response.ok) {
      return parsePayloadError(response);
    }

    const user = mapPortalUser(payload?.doc ?? payload?.user);
    if (!user) {
      return genericFailure(502, 'Cadastro concluído, mas não foi possível carregar o perfil.');
    }

    return { ok: true, data: user };
  } catch {
    return genericFailure(503, 'Serviço temporariamente indisponível. Tente novamente.');
  }
}

export async function fetchMe(token: string): Promise<AuthSuccess<PortalUser> | AuthFailure> {
  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/users/me`, {
      method: 'GET',
      headers: authHeaders(token),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as PayloadRecord | null;

    if (!response.ok) {
      return parsePayloadError(response);
    }

    // Payload pode responder 200 com user:null para sessão inválida.
    const user = mapPortalUser(payload?.user ?? payload);
    if (!user) {
      return genericFailure(401, 'Sessão inválida ou expirada.');
    }

    return { ok: true, data: user };
  } catch {
    return genericFailure(503, 'Serviço temporariamente indisponível. Tente novamente.');
  }
}

export async function logoutUser(token: string): Promise<void> {
  await fetch(`${getAdminBaseUrl()}/api/users/logout`, {
    method: 'POST',
    headers: authHeaders(token),
    cache: 'no-store',
  }).catch(() => undefined);
}

export async function updateMe(
  token: string,
  userId: string,
  data: UpdateProfileBody,
): Promise<AuthSuccess<PortalUser> | AuthFailure> {
  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as PayloadRecord | null;

    if (!response.ok) {
      return parsePayloadError(response);
    }

    const user = mapPortalUser(payload?.doc ?? payload?.user ?? payload);
    if (!user) {
      return genericFailure(502, 'Perfil atualizado, mas não foi possível recarregar os dados.');
    }

    return { ok: true, data: user };
  } catch {
    return genericFailure(503, 'Serviço temporariamente indisponível. Tente novamente.');
  }
}

export async function changePassword(
  token: string,
  userId: string,
  body: PayloadPasswordUpdate,
): Promise<AuthSuccess<PortalUser> | AuthFailure> {
  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ password: body.password }),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as PayloadRecord | null;

    if (!response.ok) {
      return parsePayloadError(response);
    }

    const user = mapPortalUser(payload?.doc ?? payload?.user ?? payload);
    if (!user) {
      return genericFailure(502, 'Senha alterada, mas não foi possível recarregar o perfil.');
    }

    return { ok: true, data: user };
  } catch {
    return genericFailure(503, 'Serviço temporariamente indisponível. Tente novamente.');
  }
}

export async function fetchOrganizations(): Promise<PortalOrganization[]> {
  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/omnia/public-organizations`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as PayloadRecord | null;
    const docs = Array.isArray(payload?.docs) ? payload.docs : null;
    if (!response.ok || !payload?.ok || !docs) {
      return [];
    }

    return docs
      .map((doc) => {
        if (!isRecord(doc)) {
          return null;
        }
        const id = doc.id;
        const name = readString(doc.name);
        const slug = readString(doc.slug);
        if ((typeof id !== 'string' && typeof id !== 'number') || !name || !slug) {
          return null;
        }
        return { id: String(id), name, slug };
      })
      .filter((org): org is PortalOrganization => org !== null);
  } catch {
    return [];
  }
}
