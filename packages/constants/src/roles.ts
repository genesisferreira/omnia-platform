/**
 * Papéis RBAC da Omnia Platform.
 * Fonte única para Admin (Payload) e checagens server-side.
 */

export const PLATFORM_ROLES = [
  'super_admin',
  'admin',
  'editor',
  'partner',
  'instructor',
  'student',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Papéis com acesso ao painel administrativo global (Next frontend + Payload Admin). */
export const STAFF_ROLES = ['super_admin', 'admin', 'editor'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Papéis sem painel global — áreas próprias futuras. */
export const SCOPED_PORTAL_ROLES = ['partner', 'instructor', 'student'] as const;
export type ScopedPortalRole = (typeof SCOPED_PORTAL_ROLES)[number];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  editor: 'Editor',
  partner: 'Parceiro',
  instructor: 'Instrutor',
  student: 'Aluno',
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

/** Caminho stub da área própria (partner / instructor / student). */
export function getScopedAreaPath(role: PlatformRole): string | null {
  if (!isScopedPortalRole(role)) {
    return null;
  }
  return `/area/${role}`;
}
