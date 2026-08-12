/**
 * Papéis RBAC da Omnia Platform.
 * Fonte única para Admin (Payload) e checagens server-side.
 */

export const PLATFORM_ROLES = [
  'super_admin',
  'admin',
  'editor',
  'neurofrigo_admin',
  'technical_reviewer',
  'partner',
  'instructor',
  'student',
  'client',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Papéis com acesso ao painel administrativo global (Next frontend + Payload Admin). */
export const STAFF_ROLES = [
  'super_admin',
  'admin',
  'editor',
  'neurofrigo_admin',
  'technical_reviewer',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Papéis sem painel global — áreas próprias futuras + Portal. */
export const SCOPED_PORTAL_ROLES = ['partner', 'instructor', 'student', 'client'] as const;
export type ScopedPortalRole = (typeof SCOPED_PORTAL_ROLES)[number];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  editor: 'Editor',
  neurofrigo_admin: 'Administrador Neurofrigo',
  technical_reviewer: 'Revisor técnico',
  partner: 'Parceiro',
  instructor: 'Instrutor',
  student: 'Aluno',
  client: 'Cliente',
};

export const ACCOUNT_STATUSES = ['active', 'pending', 'blocked'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  blocked: 'Bloqueado',
};

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === 'string' && (PLATFORM_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

export function isScopedPortalRole(value: unknown): value is ScopedPortalRole {
  return typeof value === 'string' && (SCOPED_PORTAL_ROLES as readonly string[]).includes(value);
}

/** Caminho stub da área própria (partner / instructor / student / client). */
export function getScopedAreaPath(role: PlatformRole): string | null {
  if (!isScopedPortalRole(role)) {
    return null;
  }
  return `/area/${role}`;
}
