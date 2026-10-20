/**
 * Pre-prod hotfix — LMS cross-school isolation regression (sem DB / sem rede).
 *
 * Exercises the REAL collection read access of courses / course-modules / lessons / lesson-assets
 * against an in-memory world that mirrors DEV (Fred = company 4, CTE = company 5). Applies the
 * returned access result the way Payload does for list (find), findByID and relation population
 * (depth), so a boolean `true` for instructors (the old behaviour) is caught as a leak.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Access, CollectionConfig, PayloadRequest, Where } from 'payload';

import { CourseModules } from '../collections/lms/CourseModules';
import { Courses } from '../collections/lms/Courses';
import { LessonAssets } from '../collections/lms/LessonAssets';
import { Lessons } from '../collections/lms/Lessons';

type Doc = Record<string, unknown> & { id: number };
type Slug = 'courses' | 'course-modules' | 'lessons' | 'lesson-assets';
type User = { id: number; role: string; company?: number | null; tenant?: number };

const WORLD: Record<Slug, Doc[]> = {
  courses: [
    { id: 1, title: 'Fred course', ownerCompany: 4, instructor: 22 },
    { id: 3, title: 'CTE course', ownerCompany: 5, instructor: 30 },
    { id: 4, title: 'Fred prof own course (no owner)', ownerCompany: null, instructor: 28 },
    { id: 5, title: 'CTE prof own course (no owner)', ownerCompany: null, instructor: 30 },
    { id: 12, title: 'Isolation course', ownerCompany: 12, instructor: 32 },
    { id: 99, title: 'Orphan course', ownerCompany: null, instructor: null },
  ],
  'course-modules': [
    { id: 10, course: 1 },
    { id: 30, course: 3 },
    { id: 40, course: 4 },
    { id: 50, course: 5 },
    { id: 120, course: 12 },
    { id: 990, course: 99 },
  ],
  lessons: [
    { id: 100, module: 10 },
    { id: 101, module: 10 },
    { id: 300, module: 30 },
    { id: 301, module: 30 },
    { id: 400, module: 40 },
    { id: 500, module: 50 },
    { id: 1200, module: 120 },
    { id: 9900, module: 990 },
  ],
  'lesson-assets': [
    { id: 1000, lesson: 100 },
    { id: 3000, lesson: 300 },
    { id: 4000, lesson: 400 },
    { id: 5000, lesson: 500 },
    { id: 12000, lesson: 1200 },
  ],
};

const RELATIONS: Record<Slug, Record<string, Slug>> = {
  courses: {},
  'course-modules': { course: 'courses' },
  lessons: { module: 'course-modules' },
  'lesson-assets': { lesson: 'lessons' },
};

const CONFIGS: Record<Slug, CollectionConfig> = {
  courses: Courses,
  'course-modules': CourseModules,
  lessons: Lessons,
  'lesson-assets': LessonAssets,
};

const rel = (v: unknown) =>
  v && typeof v === 'object' && 'id' in (v as object) ? (v as { id: unknown }).id : v;

function matches(doc: Doc, where: Where): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'or') {
      if (!(cond as Where[]).some((w) => matches(doc, w))) return false;
      continue;
    }
    if (key === 'and') {
      if (!(cond as Where[]).every((w) => matches(doc, w))) return false;
      continue;
    }
    const value = rel(doc[key]);
    for (const [op, expected] of Object.entries(cond as Record<string, unknown>)) {
      if (op === 'equals') {
        // SQL semantics: NULL never equals anything (incl. NULL).
        if (value == null || expected == null || String(value) !== String(expected)) return false;
      } else if (op === 'in') {
        if (value == null || !(expected as unknown[]).map(String).includes(String(value))) {
          return false;
        }
      } else {
        throw new Error(`fake payload: unsupported operator ${op} on ${key}`);
      }
    }
  }
  return true;
}

function makeReq(user: User | null) {
  const calls: string[] = [];
  const payload = {
    async find(args: { collection: Slug; where?: Where; overrideAccess?: boolean }) {
      calls.push(args.collection);
      assert.equal(args.overrideAccess, true, 'scope pre-queries must not recurse into access');
      const docs = WORLD[args.collection].filter((d) => !args.where || matches(d, args.where));
      return { docs: structuredClone(docs), totalDocs: docs.length };
    },
  };
  const req = { user, payload } as unknown as PayloadRequest;
  return { req, calls };
}

async function accessFor(slug: Slug, req: PayloadRequest) {
  const read = CONFIGS[slug].access?.read as Access;
  return read({ req } as never);
}

function applyAccess(docs: Doc[], access: unknown): Doc[] {
  if (access === true) return docs;
  if (!access) return [];
  return docs.filter((d) => matches(d, access as Where));
}

/** Payload-like list with population: related docs are populated only if readable. */
async function list(slug: Slug, user: User | null, depth = 0) {
  const { req, calls } = makeReq(user);
  const docs = applyAccess(WORLD[slug], await accessFor(slug, req));
  const populated = [];
  for (const d of docs) populated.push(await populate(slug, d, depth, req));
  return { docs: populated, calls };
}

async function findByID(slug: Slug, id: number, user: User | null) {
  const { req } = makeReq(user);
  const docs = applyAccess(
    WORLD[slug].filter((d) => d.id === id),
    await accessFor(slug, req),
  );
  return docs[0] ?? null; // Payload → 404
}

async function populate(slug: Slug, doc: Doc, depth: number, req: PayloadRequest): Promise<Doc> {
  const out: Doc = structuredClone(doc);
  if (depth <= 0) return out;
  for (const [field, target] of Object.entries(RELATIONS[slug])) {
    const id = rel(out[field]);
    const candidate = WORLD[target].filter((d) => String(d.id) === String(id));
    const readable = applyAccess(candidate, await accessFor(target, req));
    if (readable[0]) out[field] = await populate(target, readable[0], depth - 1, req);
  }
  return out;
}

const ids = (docs: Doc[]) => docs.map((d) => d.id).sort((a, b) => a - b);

/** Recursively collect every (collection,id) that appears as a populated object. */
function populatedIds(doc: unknown, slug: Slug, acc: Array<[Slug, number]> = []) {
  if (doc && typeof doc === 'object') {
    const d = doc as Doc;
    acc.push([slug, d.id]);
    for (const [field, target] of Object.entries(RELATIONS[slug])) {
      if (d[field] && typeof d[field] === 'object') populatedIds(d[field], target, acc);
    }
  }
  return acc;
}

const FRED_PROF: User = { id: 28, role: 'instructor', company: 4, tenant: 1 };
const CTE_PROF: User = { id: 30, role: 'instructor', company: 5, tenant: 1 };
const NO_COMPANY_PROF: User = { id: 41, role: 'instructor', company: null, tenant: 1 };
const FRED_STUDENT: User = { id: 27, role: 'student', company: 4, tenant: 1 };
const CTE_STUDENT: User = { id: 29, role: 'student', company: 5, tenant: 1 };
const ADMIN: User = { id: 35, role: 'admin', company: 1, tenant: 1 };
const EDITOR: User = { id: 11, role: 'editor', company: null };

const FRED_CONTENT = {
  courses: [1, 4],
  modules: [10, 40],
  lessons: [100, 101, 400],
  assets: [1000, 4000],
};
const CTE_CONTENT = {
  courses: [3, 5],
  modules: [30, 50],
  lessons: [300, 301, 500],
  assets: [3000, 5000],
};
const ALL = (slug: Slug) => ids(WORLD[slug]);

describe('LMS cross-school isolation (instructor native read access)', () => {
  for (const [name, prof, own, other] of [
    ['Fred instructor (company 4)', FRED_PROF, FRED_CONTENT, CTE_CONTENT],
    ['CTE instructor (company 5)', CTE_PROF, CTE_CONTENT, FRED_CONTENT],
  ] as const) {
    it(`${name}: list shows only own-school content (courses/modules/lessons/assets)`, async () => {
      assert.deepEqual(ids((await list('courses', prof)).docs), own.courses);
      assert.deepEqual(ids((await list('course-modules', prof)).docs), own.modules);
      assert.deepEqual(ids((await list('lessons', prof)).docs), own.lessons);
      assert.deepEqual(ids((await list('lesson-assets', prof)).docs), own.assets);
    });

    it(`${name}: findByID allows own content`, async () => {
      for (const id of own.courses) assert.ok(await findByID('courses', id, prof), `course ${id}`);
      for (const id of own.modules) assert.ok(await findByID('course-modules', id, prof));
      for (const id of own.lessons) assert.ok(await findByID('lessons', id, prof), `lesson ${id}`);
      for (const id of own.assets) assert.ok(await findByID('lesson-assets', id, prof));
    });

    it(`${name}: findByID denies other-school content (404)`, async () => {
      for (const id of other.courses) assert.equal(await findByID('courses', id, prof), null);
      for (const id of other.modules)
        assert.equal(await findByID('course-modules', id, prof), null);
      for (const id of other.lessons) assert.equal(await findByID('lessons', id, prof), null);
      for (const id of other.assets) assert.equal(await findByID('lesson-assets', id, prof), null);
      for (const id of [12, 99]) assert.equal(await findByID('courses', id, prof), null);
      for (const id of [1200, 9900]) assert.equal(await findByID('lessons', id, prof), null);
    });

    it(`${name}: depth 0/1/2/5 never populates or lists other-school docs`, async () => {
      const allowed = new Set([
        ...own.courses.map((i) => `courses:${i}`),
        ...own.modules.map((i) => `course-modules:${i}`),
        ...own.lessons.map((i) => `lessons:${i}`),
        ...own.assets.map((i) => `lesson-assets:${i}`),
      ]);
      for (const depth of [0, 1, 2, 5]) {
        for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
          const { docs } = await list(slug, prof, depth);
          for (const d of docs) {
            for (const [s, i] of populatedIds(d, slug)) {
              assert.ok(allowed.has(`${s}:${i}`), `depth ${depth} ${slug} leaked ${s}:${i}`);
            }
          }
        }
      }
      // own chain is fully populated at depth 3 (asset → lesson → module → course)
      const { docs } = await list('lesson-assets', prof, 3);
      for (const d of docs) assert.equal(populatedIds(d, 'lesson-assets').length, 4);
    });

    it(`${name}: scope resolved with ≤3 queries per request (no N+1), memoized`, async () => {
      const { req, calls } = makeReq(prof);
      await accessFor('lesson-assets', req);
      await accessFor('lessons', req);
      await accessFor('course-modules', req);
      await accessFor('lesson-assets', req);
      assert.ok(calls.length <= 3, `queries=${calls.length}`);
    });
  }

  it('fail-closed: instructor without company sees no course-less/NULL-owner content', async () => {
    for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
      const { req } = makeReq(NO_COMPANY_PROF);
      assert.equal(await accessFor(slug, req), false, slug);
      assert.deepEqual((await list(slug, NO_COMPANY_PROF)).docs, []);
    }
    assert.deepEqual(ids((await list('courses', NO_COMPANY_PROF)).docs), []);
    assert.equal(await findByID('lessons', 9900, NO_COMPANY_PROF), null);
  });

  it('fail-closed: instructor without id or scope resolution error → deny', async () => {
    const { req } = makeReq({ role: 'instructor', company: 4 } as unknown as User);
    assert.equal(await accessFor('lessons', req), false);
    const broken = {
      user: FRED_PROF,
      payload: {
        find: async () => {
          throw new Error('db down');
        },
      },
    } as unknown as PayloadRequest;
    for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
      assert.equal(await accessFor(slug, broken), false, slug);
    }
  });

  it('students: unchanged (no native LMS content read)', async () => {
    for (const u of [FRED_STUDENT, CTE_STUDENT, null]) {
      for (const slug of ['courses', 'course-modules', 'lessons', 'lesson-assets'] as const) {
        const { req } = makeReq(u);
        assert.equal(await accessFor(slug, req), false, `${u?.id ?? 'anon'} ${slug}`);
      }
    }
  });

  it('admin / editor: unchanged (read everything, boolean true, no pre-queries)', async () => {
    for (const u of [ADMIN, EDITOR]) {
      for (const slug of ['courses', 'course-modules', 'lessons', 'lesson-assets'] as const) {
        const { req, calls } = makeReq(u);
        assert.equal(await accessFor(slug, req), true, `${u.role} ${slug}`);
        assert.equal(calls.length, 0);
        assert.deepEqual(ids((await list(slug, u)).docs), ALL(slug));
      }
    }
  });
});
