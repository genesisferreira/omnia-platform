import type {
  Access,
  CollectionBeforeChangeHook,
  FieldAccess,
  PayloadRequest,
  Where,
} from 'payload';
import { Forbidden } from 'payload';

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

/** Structural parent relation of each nested level (the owner path towards `courses`). */
const NESTED_PARENT_FIELD = {
  'course-modules': 'course',
  lessons: 'module',
  'lesson-assets': 'lesson',
} as const;

/** Parent field + allowed parent ids (module → courseIds, lesson → moduleIds, asset → lessonIds). */
function parentScope(level: NestedLevel, scope: NestedScope) {
  const field = NESTED_PARENT_FIELD[level];
  const ids =
    level === 'course-modules'
      ? scope.courseIds
      : level === 'lessons'
        ? scope.moduleIds
        : scope.lessonIds;
  return { field, ids };
}

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
    const { field, ids } = parentScope(level, scope);
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

/** Relation value (number | numeric string | populated `{ id }`) → canonical id; else null. */
function normalizeRelationId(value: unknown, depth = 0): string | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return /^[1-9][0-9]*$/.test(trimmed) ? trimmed : null;
  }
  if (depth === 0 && value && typeof value === 'object' && 'id' in value) {
    return normalizeRelationId((value as { id?: unknown }).id, 1);
  }
  return null;
}

/**
 * True only when `target` (the structural parent sent by the client) resolves to a parent that
 * passes the canonical instructor ownership rule. Missing / invalid / unknown / cross-school
 * target, missing user id or a resolution error → false (fail-closed).
 */
async function instructorParentAllowed(
  req: PayloadRequest,
  user: AuthUser,
  level: NestedLevel,
  target: unknown,
): Promise<boolean> {
  if (user.id == null) return false;
  const id = normalizeRelationId(target);
  if (id == null) return false;
  try {
    const { ids } = parentScope(level, await resolveInstructorNestedScope(req, user));
    return ids.some((allowed) => String(allowed) === id);
  } catch {
    return false;
  }
}

const hasOwnValue = (data: unknown, field: string): data is Record<string, unknown> =>
  !!data &&
  typeof data === 'object' &&
  Object.prototype.hasOwnProperty.call(data, field) &&
  (data as Record<string, unknown>)[field] !== undefined;

/**
 * Modules/Lessons/Assets CREATE. Admin/editor unchanged (true); student/anon deny.
 * Instructor: with `data` (REST/Local create always passes the body) the parent relation
 * (module.course / lesson.module / asset.lesson) must resolve inside the instructor scope,
 * otherwise deny — a client-supplied ownerCompany is never consulted. Without `data` (Admin
 * UI `/access` permission build) only the boolean "has any writable parent" is returned; the
 * real operation is still enforced by `lmsNestedWriteGuardFor` (beforeChange).
 */
function lmsNestedCreateAccessFor(level: NestedLevel): Access {
  return async ({ req, data }) => {
    const user = req.user as AuthUser | null | undefined;
    if (!user) return false;
    if (isLmsPublisher(user) || isEditor(user)) return true;
    if (!isLmsInstructor(user) || user.id == null) return false;
    if (data === undefined || data === null) {
      try {
        const { ids } = parentScope(level, await resolveInstructorNestedScope(req, user));
        return ids.length > 0;
      } catch {
        return false;
      }
    }
    const field = NESTED_PARENT_FIELD[level];
    return instructorParentAllowed(req, user, level, (data as Record<string, unknown>)[field]);
  };
}

/**
 * Modules/Lessons/Assets UPDATE. Admin/editor unchanged (true); student/anon deny.
 * Instructor: Where filter restricting the CURRENT doc to the canonical scope (same filter as
 * read → updateByID 404/403 and bulk `PATCH ?where=` only touch owned docs). When `data`
 * carries the structural parent (rebind), the target must be in scope too. Bulk update
 * evaluates access without `data`, so the rebind target is also enforced by the beforeChange
 * guard for every document.
 */
function lmsNestedUpdateAccessFor(level: NestedLevel): Access {
  const read = lmsNestedReadAccessFor(level);
  return async (args) => {
    const user = args.req.user as AuthUser | null | undefined;
    if (!user) return false;
    if (isLmsPublisher(user) || isEditor(user)) return true;
    if (!isLmsInstructor(user)) return false;
    const where = await read(args);
    if (!where || where === true) return false;
    const field = NESTED_PARENT_FIELD[level];
    if (hasOwnValue(args.data, field)) {
      const ok = await instructorParentAllowed(args.req, user, level, args.data[field]);
      if (!ok) return false;
    }
    return where;
  };
}

/**
 * beforeChange guard (runs for create, updateByID and every doc of a bulk update): an
 * instructor may only create under / rebind to a parent inside the canonical scope. Create
 * without a parent → deny. Requests without an authenticated user (internal Local API
 * calls) and admin/editor keep their current behaviour.
 */
function lmsNestedWriteGuardFor(level: NestedLevel): CollectionBeforeChangeHook {
  return async ({ data, operation, req }) => {
    const user = req.user as AuthUser | null | undefined;
    if (!user || !isLmsInstructor(user) || isLmsPublisher(user) || isEditor(user)) return data;
    if (operation !== 'create' && operation !== 'update') return data;
    const field = NESTED_PARENT_FIELD[level];
    const present = hasOwnValue(data, field);
    if (operation === 'update' && !present) return data;
    const target = present ? (data as Record<string, unknown>)[field] : undefined;
    if (!(await instructorParentAllowed(req, user, level, target))) {
      throw new Forbidden(req.t);
    }
    return data;
  };
}

export const lmsModuleCreateAccess: Access = lmsNestedCreateAccessFor('course-modules');
export const lmsLessonCreateAccess: Access = lmsNestedCreateAccessFor('lessons');
export const lmsLessonAssetCreateAccess: Access = lmsNestedCreateAccessFor('lesson-assets');

export const lmsModuleUpdateAccess: Access = lmsNestedUpdateAccessFor('course-modules');
export const lmsLessonUpdateAccess: Access = lmsNestedUpdateAccessFor('lessons');
export const lmsLessonAssetUpdateAccess: Access = lmsNestedUpdateAccessFor('lesson-assets');

export const lmsModuleWriteGuard = lmsNestedWriteGuardFor('course-modules');
export const lmsLessonWriteGuard = lmsNestedWriteGuardFor('lessons');
export const lmsLessonAssetWriteGuard = lmsNestedWriteGuardFor('lesson-assets');

export const lmsContentDeleteAccess: Access = ({ req: { user } }) => isLmsPublisher(user);

/** Publicar / alterar status published|archived: só publishers (via hook). */
export const lmsPublishFieldAccess: FieldAccess = ({ req: { user } }) => isLmsPublisher(user);
