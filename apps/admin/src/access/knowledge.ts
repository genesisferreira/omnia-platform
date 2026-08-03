import type { Access, FieldAccess } from 'payload';

import {
  adminsOnly,
  getUserRole,
  hasRole,
  isEditor,
  isPlatformAdmin,
  isSuperAdmin,
} from './rbac';

type AuthUser = {
  id?: string | number;
  role?: unknown;
};

/** Papéis extras do Knowledge Hub (além de PlatformRole). */
export const KNOWLEDGE_EXTRA_ROLES = ['neurofrigo_admin', 'technical_reviewer'] as const;
export type KnowledgeExtraRole = (typeof KNOWLEDGE_EXTRA_ROLES)[number];

export const KNOWLEDGE_PUBLISHER_ROLES = [
  'super_admin',
  'admin',
  'neurofrigo_admin',
] as const;

export const KNOWLEDGE_READER_ROLES = [
  'super_admin',
  'admin',
  'neurofrigo_admin',
  'technical_reviewer',
  'editor',
] as const;

function getRoleString(user: AuthUser | null | undefined): string | null {
  if (typeof user?.role === 'string' && user.role.length > 0) {
    return user.role;
  }
  return getUserRole(user);
}

export function isNeurofrigoAdmin(user: AuthUser | null | undefined): boolean {
  return getRoleString(user) === 'neurofrigo_admin';
}

export function isTechnicalReviewer(user: AuthUser | null | undefined): boolean {
  return getRoleString(user) === 'technical_reviewer';
}

export function isKnowledgePublisher(user: AuthUser | null | undefined): boolean {
  const role = getRoleString(user);
  return role != null && (KNOWLEDGE_PUBLISHER_ROLES as readonly string[]).includes(role);
}

export function isKnowledgeStaff(user: AuthUser | null | undefined): boolean {
  const role = getRoleString(user);
  return role != null && (KNOWLEDGE_READER_ROLES as readonly string[]).includes(role);
}

/** student / partner / client / instructor sem acesso ao admin Knowledge Hub. */
export function hasKnowledgeAdminAccess(user: AuthUser | null | undefined): boolean {
  return isKnowledgeStaff(user);
}

/** Leitura: staff Knowledge + papéis de publicação/revisão. */
export const knowledgeReadAccess: Access = ({ req: { user } }) => hasKnowledgeAdminAccess(user);

/** Criação: editor (rascunhos) + revisores + publishers. */
export const knowledgeCreateAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isKnowledgePublisher(user) || isTechnicalReviewer(user) || isEditor(user)) {
    return true;
  }
  return false;
};

/** Update genérico (categorias, fontes, agentes, jobs, reviews). */
export const knowledgeUpdateAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  return isKnowledgePublisher(user) || isTechnicalReviewer(user) || isEditor(user);
};

/**
 * Update de knowledge-documents:
 * publishers/reviewers livres; editor somente status=draft.
 */
export const knowledgeDocumentUpdateAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isKnowledgePublisher(user) || isTechnicalReviewer(user)) {
    return true;
  }
  if (isEditor(user)) {
    return { status: { equals: 'draft' } };
  }
  return false;
};

/** Delete: somente publishers (super_admin / admin / neurofrigo_admin). */
export const knowledgeDeleteAccess: Access = ({ req: { user } }) => isKnowledgePublisher(user);

/** Aprovar / publicar: publishers Knowledge. */
export const knowledgePublishAccess: Access = ({ req: { user } }) => isKnowledgePublisher(user);

/** Field-level: aprovação/publicação. */
export const knowledgePublishFieldAccess: FieldAccess = ({ req: { user } }) =>
  isKnowledgePublisher(user);

/** Settings / políticas: admin plataforma ou neurofrigo_admin. */
export const knowledgeSettingsAccess: Access = ({ req: { user } }) =>
  isPlatformAdmin(user) || isNeurofrigoAdmin(user);

/** Auditoria: leitura admins + neurofrigo; create via sistema (overrideAccess). */
export const knowledgeAuditReadAccess: Access = ({ req: { user } }) =>
  isPlatformAdmin(user) || isNeurofrigoAdmin(user) || isSuperAdmin(user);

export const knowledgeAuditCreateAccess: Access = () => false;

export const knowledgeAuditImmutable: Access = () => false;

/** Reexport útil para collections que reutilizam adminsOnly. */
export { adminsOnly, hasRole, isEditor, isPlatformAdmin, isSuperAdmin };
