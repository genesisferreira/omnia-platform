import type { UserAiContext } from '@/components/ai/types';
import type { PortalUser } from '@/lib/auth/types';

export function displayNameFromUser(user: PortalUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user.name?.trim()) return user.name.trim();
  return user.email.split('@')[0] || 'Usuário';
}

/** Map Payload portal role to AI capability role (server + UI labels). */
export function mapPortalRoleToAiRole(role: string | null | undefined): string {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'editor' || role === 'publisher') return 'manager';
  if (role === 'instructor') return 'teacher';
  if (role === 'partner') return 'partner';
  if (role === 'client') return 'client';
  return 'student';
}

export function buildUserAiContext(
  user: PortalUser,
  extras: {
    currentRoute?: string | null;
    currentPortalArea?: string | null;
    tenantId?: string | null;
    companyId?: string | null;
  } = {},
): UserAiContext {
  const role = mapPortalRoleToAiRole(user.role);
  return {
    userId: String(user.id),
    email: user.email,
    displayName: displayNameFromUser(user),
    role,
    roles: [role, ...(user.role ? [String(user.role)] : [])].filter(
      (v, i, a) => a.indexOf(v) === i,
    ),
    tenantId: extras.tenantId ?? null,
    companyId: extras.companyId ?? null,
    currentPortalArea: extras.currentPortalArea ?? null,
    currentRoute: extras.currentRoute ?? null,
  };
}
