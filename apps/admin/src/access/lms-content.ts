import type { Access, FieldAccess, PayloadRequest, Where } from 'payload';

import { getRelationId, getUserRole, isEditor, isPlatformAdmin, isSuperAdmin } from './rbac';

type AuthUser = {
  id?: string | number;
  role?: unknown;
  company?: unknown;
  tenant?: unknown;
};

/** Staff editorial LMS + instructors (conteúdo próprio/empresa). */
export const LMS_CONTENT_STAFF_ROLES = ['super_admin', 'admin', 'editor', 'instructor'] as const;

export const LMS_PUBLISHER_ROLES = ['super_admin', 'admin'] as const;

function roleOf(user: AuthUser | null | undefined): string | null {
  if (typeof user?.role === 'string' && user.role.length > 0) return user.role;
  return getUserRole(user);
}

export function isLmsPublisher(user: AuthUser | null | undefined): boolean {
  const role = roleOf(user);
  return role != null && (LMS_PUBLISHER_ROLES as readonly string[]).includes(role);
}

export function isLmsInstructor(user: AuthUser | null | undefined): boolean {
  return roleOf(user) === 'instructor';
}

export function isLmsContentStaff(user: AuthUser | null | undefined): boolean {
  const role = roleOf(user);
  return role != null && (LMS_CONTENT_STAFF_ROLES as readonly string[]).includes(role);
}

/** student / partner / client: sem Admin LMS Core (só Portal). */
export function hasLmsAdminAccess(user: AuthUser | null | undefined): boolean {
  return isLmsContentStaff(user) || isSuperAdmin(user);
}

export const lmsContentReadAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isPlatformAdmin(user) || isEditor(user)) return true;
  if (isLmsInstructor(user)) {
    const companyId = getRelationId(user.company);
    if (companyId != null) {
      const where: Where = {
        or: [{ ownerCompany: { equals: companyId } }, { instructor: { equals: user.id } }],
      };
      return where;
    }
    const where: Where = { instructor: { equals: user.id } };
    return where;
  }
  return false;
};

/**
 * Canonical instructor course ownership (same rule as `lmsContentReadAccess`):
 * course.ownerCompany = user.company OR course.instructor = user. A missing company never
 * matches courses whose ownerCompany is NULL (only the instructor exception applies).
 */
function instructorCourseOwnership(user: AuthUser): Where {
  const companyId = getRelationId(user.company);
  return companyId != null
    ? { or: [{ ownerCompany: { equals: companyId } }, { instructor: { equals: user.id } }] }
    : { instructor: { equals: user.id } };
}

type NestedScope = {
  courseIds: Array<string | number>;
  moduleIds: Array<string | number>;
  lessonIds: Array<string | number>;
};

/** Per-request memo: population can call read access many times within one request. */
const nestedScopeCache = new WeakMap<object, Promise<NestedScope>>();

async function idsOf(
  req: PayloadRequest,
  collection: 'courses' | 'course-modules' | 'lessons',
  where: Where,
): Promise<Array<string | number>> {
  const found = await req.payload.find({
    collection,
    where,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  });
  return found.docs
    .map((d) => (d as { id?: string | number }).id)
    .filter((id): id is string | number => id != null);
}

/**
 * Allowed course → module → lesson ids for an instructor. At most 3 queries per request
 * (no N+1); only direct relationship columns are queried (no nested join paths).
 */
function resolveInstructorNestedScope(req: PayloadRequest, user: AuthUser): Promise<NestedScope> {
  const cached = nestedScopeCache.get(req);
  if (cached) return cached;
  const pending = (async (): Promise<NestedScope> => {
    const courseIds = await idsOf(req, 'courses', instructorCourseOwnership(user));
    if (courseIds.length === 0) return { courseIds, moduleIds: [], lessonIds: [] };
    const moduleIds = await idsOf(req, 'course-modules', { course: { in: courseIds } });
    if (moduleIds.length === 0) return { courseIds, moduleIds, lessonIds: [] };
    const lessonIds = await idsOf(req, 'lessons', { module: { in: moduleIds } });
    return { courseIds, moduleIds, lessonIds };
  })();
  nestedScopeCache.set(req, pending);
  return pending;
}

type NestedLevel = 'course-modules' | 'lessons' | 'lesson-assets';

/**
 * Modules/Lessons/Assets read: staff (admin/editor) = all; instructor = only content whose
 * course passes the canonical ownership rule; everyone else = deny. Fail-closed for
 * instructors: no user id, empty scope or resolution error → deny.
 */
function lmsNestedReadAccessFor(level: NestedLevel): Access {
  return async ({ req }) => {
    const user = req.user as AuthUser | null | undefined;
    if (!user) return false;
    if (isPlatformAdmin(user) || isEditor(user)) return true;
    if (!isLmsInstructor(user)) return false;
    if (user.id == null) return false;
    let scope: NestedScope;
    try {
      scope = await resolveInstructorNestedScope(req, user);
    } catch {
      return false;
    }
    const [field, ids] =
      level === 'course-modules'
        ? (['course', scope.courseIds] as const)
        : level === 'lessons'
          ? (['module', scope.moduleIds] as const)
          : (['lesson', scope.lessonIds] as const);
    if (ids.length === 0) return false;
    const where: Where = { [field]: { in: [...ids] } };
    return where;
  };
}

/** Course modules read (instructor scoped by course ownership). */
export const lmsModuleReadAccess: Access = lmsNestedReadAccessFor('course-modules');
/** Lessons read (instructor scoped via module → course ownership). */
export const lmsLessonReadAccess: Access = lmsNestedReadAccessFor('lessons');
/** Lesson assets read (instructor scoped via lesson → module → course ownership). */
export const lmsLessonAssetReadAccess: Access = lmsNestedReadAccessFor('lesson-assets');

export const lmsContentCreateAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  return isLmsPublisher(user) || isEditor(user) || isLmsInstructor(user);
};

export const lmsCourseUpdateAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isLmsPublisher(user)) return true;
  if (isEditor(user)) {
    const where: Where = { status: { in: ['draft', 'review'] } };
    return where;
  }
  if (isLmsInstructor(user)) {
    const companyId = getRelationId(user.company);
    const ownership: Where =
      companyId != null
        ? {
            or: [{ instructor: { equals: user.id } }, { ownerCompany: { equals: companyId } }],
          }
        : { instructor: { equals: user.id } };
    const where: Where = {
      and: [{ status: { in: ['draft', 'review'] } }, ownership],
    };
    return where;
  }
  return false;
};

export const lmsNestedWriteAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  return isLmsPublisher(user) || isEditor(user) || isLmsInstructor(user);
};

export const lmsContentDeleteAccess: Access = ({ req: { user } }) => isLmsPublisher(user);

/** Publicar / alterar status published|archived: só publishers (via hook). */
export const lmsPublishFieldAccess: FieldAccess = ({ req: { user } }) => isLmsPublisher(user);
