/**
 * Pre-prod hotfix — LMS cross-school WRITE isolation regression (sem DB / sem rede).
 *
 * Exercises the REAL create/update/delete access + beforeChange hooks of course-modules /
 * lessons / lesson-assets against an in-memory world that mirrors DEV (Fred = company 4,
 * CTE = company 5). Operations are simulated the way Payload 3.85.2 runs them:
 * - create: access.create({ req, data }) → truthy required → beforeValidate/beforeChange hooks;
 * - updateByID: access.update({ req, id, data }) → Where combined with { id } → hooks;
 * - bulk update (REST PATCH ?where=): access.update({ req }) WITHOUT data → combined with the
 *   request where → hooks per doc (per-doc errors, doc untouched);
 * - deleteByID / bulk delete: access.delete({ req, id? }) → Where combined.
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
type Nested = Exclude<Slug, 'courses'>;
type User = { id: number; role: string; company?: number | null; tenant?: number };
type World = Record<Slug, Doc[]>;

const BASE_WORLD: World = {
  courses: [
    { id: 1, title: 'Fred course', ownerCompany: 4, instructor: 22 },
    { id: 3, title: 'CTE course', ownerCompany: 5, instructor: 30 },
    { id: 4, title: 'Fred prof own course (no owner)', ownerCompany: null, instructor: 28 },
    { id: 5, title: 'CTE prof own course (no owner)', ownerCompany: null, instructor: 30 },
    { id: 12, title: 'Isolation course', ownerCompany: 12, instructor: 32 },
    { id: 99, title: 'Orphan course', ownerCompany: null, instructor: null },
  ],
  'course-modules': [
    { id: 10, title: 'Fred M', slug: 'fred-m', course: 1 },
    { id: 30, title: 'CTE M', slug: 'cte-m', course: 3 },
    { id: 40, title: 'Fred own M', slug: 'fred-own-m', course: 4 },
    { id: 50, title: 'CTE own M', slug: 'cte-own-m', course: 5 },
    { id: 120, title: 'Iso M', slug: 'iso-m', course: 12 },
    { id: 990, title: 'Orphan M', slug: 'orphan-m', course: 99 },
  ],
  lessons: [
    { id: 100, title: 'Fred L', slug: 'fred-l', module: 10 },
    { id: 101, title: 'Fred L2', slug: 'fred-l2', module: 10 },
    { id: 300, title: 'CTE L', slug: 'cte-l', module: 30 },
    { id: 301, title: 'CTE L2', slug: 'cte-l2', module: 30 },
    { id: 400, title: 'Fred own L', slug: 'fred-own-l', module: 40 },
    { id: 500, title: 'CTE own L', slug: 'cte-own-l', module: 50 },
    { id: 1200, title: 'Iso L', slug: 'iso-l', module: 120 },
    { id: 9900, title: 'Orphan L', slug: 'orphan-l', module: 990 },
  ],
  'lesson-assets': [
    { id: 1000, title: 'Fred A', lesson: 100 },
    { id: 3000, title: 'CTE A', lesson: 300 },
    { id: 4000, title: 'Fred own A', lesson: 400 },
    { id: 5000, title: 'CTE own A', lesson: 500 },
    { id: 12000, title: 'Iso A', lesson: 1200 },
  ],
};

const CONFIGS: Record<Slug, CollectionConfig> = {
  courses: Courses,
  'course-modules': CourseModules,
  lessons: Lessons,
  'lesson-assets': LessonAssets,
};

const PARENT: Record<Nested, 'course' | 'module' | 'lesson'> = {
  'course-modules': 'course',
  lessons: 'module',
  'lesson-assets': 'lesson',
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
        if (value == null || expected == null || String(value) !== String(expected)) return false;
      } else if (op === 'in') {
        const list = expected as unknown[];
        assert.ok(Array.isArray(list) && list.length > 0, `permissive/empty in on ${key}`);
        if (value == null || !list.map(String).includes(String(value))) return false;
      } else {
        throw new Error(`fake payload: unsupported operator ${op} on ${key}`);
      }
    }
  }
  return true;
}

class Denied extends Error {
  constructor(public status: number) {
    super(`denied ${status}`);
  }
}

function makeCtx(user: User | null, world: World) {
  const calls: string[] = [];
  const payload = {
    async find(args: { collection: Slug; where?: Where; overrideAccess?: boolean }) {
      calls.push(args.collection);
      assert.equal(args.overrideAccess, true, 'scope pre-queries must not recurse into access');
      const docs = world[args.collection].filter((d) => !args.where || matches(d, args.where));
      return { docs: structuredClone(docs), totalDocs: docs.length };
    },
  };
  const req = { user, payload, context: {} } as unknown as PayloadRequest;
  return { req, calls };
}

function filterByAccess(docs: Doc[], access: unknown): Doc[] {
  if (access === true) return docs;
  if (!access) return [];
  return docs.filter((d) => matches(d, access as Where));
}

async function runHooks(
  slug: Nested,
  args: { data: Record<string, unknown>; operation: 'create' | 'update'; originalDoc?: Doc },
  req: PayloadRequest,
) {
  let data = args.data;
  const hooks = CONFIGS[slug].hooks ?? {};
  for (const hook of [...(hooks.beforeValidate ?? []), ...(hooks.beforeChange ?? [])]) {
    data =
      ((await (hook as (a: unknown) => unknown)({
        collection: CONFIGS[slug],
        context: {},
        data,
        operation: args.operation,
        originalDoc: args.originalDoc,
        req,
      })) as Record<string, unknown>) || data;
  }
  return data;
}

/** Result: 'ALLOW' when the write happened, 'DENY' (403/404/hook) otherwise. */
type Outcome = 'ALLOW' | 'DENY';

class Sim {
  world: World = structuredClone(BASE_WORLD);
  nextId = 50_000;

  async create(slug: Nested, user: User | null, data: Record<string, unknown>): Promise<Outcome> {
    const { req } = makeCtx(user, this.world);
    try {
      const access = await (CONFIGS[slug].access?.create as Access)({ req, data } as never);
      if (!access) throw new Denied(403);
      const final = await runHooks(slug, { data: structuredClone(data), operation: 'create' }, req);
      if (final[PARENT[slug]] == null) throw new Denied(400); // required relation
      this.world[slug].push({ ...final, id: this.nextId++ } as Doc);
      return 'ALLOW';
    } catch (e) {
      if (e instanceof Denied || (e as { status?: number }).status === 403) return 'DENY';
      throw e;
    }
  }

  async updateByID(
    slug: Nested,
    user: User | null,
    id: number,
    data: Record<string, unknown>,
  ): Promise<Outcome> {
    const { req } = makeCtx(user, this.world);
    try {
      const access = await (CONFIGS[slug].access?.update as Access)({ req, id, data } as never);
      if (!access) throw new Denied(403);
      const [doc] = filterByAccess(
        this.world[slug].filter((d) => d.id === id),
        access,
      );
      if (!doc) throw new Denied(404);
      const final = await runHooks(
        slug,
        { data: structuredClone(data), operation: 'update', originalDoc: structuredClone(doc) },
        req,
      );
      Object.assign(doc, final);
      return 'ALLOW';
    } catch (e) {
      if (e instanceof Denied || (e as { status?: number }).status === 403) return 'DENY';
      throw e;
    }
  }

  /** REST PATCH /api/<slug>?where= — access evaluated WITHOUT data. Returns updated ids. */
  async bulkUpdate(slug: Nested, user: User | null, where: Where, data: Record<string, unknown>) {
    const { req } = makeCtx(user, this.world);
    const access = await (CONFIGS[slug].access?.update as Access)({ req } as never);
    if (!access) return { denied: true, updated: [] as number[] };
    const targets = filterByAccess(
      this.world[slug].filter((d) => matches(d, where)),
      access,
    );
    const updated: number[] = [];
    for (const doc of targets) {
      try {
        const final = await runHooks(
          slug,
          { data: structuredClone(data), operation: 'update', originalDoc: structuredClone(doc) },
          req,
        );
        Object.assign(doc, final);
        updated.push(doc.id);
      } catch (e) {
        if ((e as { status?: number }).status !== 403) throw e;
      }
    }
    return { denied: false, updated };
  }

  async deleteByID(slug: Nested, user: User | null, id: number): Promise<Outcome> {
    const { req } = makeCtx(user, this.world);
    const access = await (CONFIGS[slug].access?.delete as Access)({ req, id } as never);
    if (!access) return 'DENY';
    const [doc] = filterByAccess(
      this.world[slug].filter((d) => d.id === id),
      access,
    );
    if (!doc) return 'DENY';
    this.world[slug] = this.world[slug].filter((d) => d.id !== id);
    return 'ALLOW';
  }

  async bulkDelete(slug: Nested, user: User | null, where: Where) {
    const { req } = makeCtx(user, this.world);
    const access = await (CONFIGS[slug].access?.delete as Access)({ req } as never);
    if (!access) return [] as number[];
    const targets = filterByAccess(
      this.world[slug].filter((d) => matches(d, where)),
      access,
    ).map((d) => d.id);
    this.world[slug] = this.world[slug].filter((d) => !targets.includes(d.id));
    return targets;
  }

  get(slug: Nested, id: number) {
    return this.world[slug].find((d) => d.id === id);
  }
}

const FRED_PROF: User = { id: 28, role: 'instructor', company: 4, tenant: 1 };
const CTE_PROF: User = { id: 30, role: 'instructor', company: 5, tenant: 1 };
const NO_COMPANY_PROF: User = { id: 41, role: 'instructor', company: null, tenant: 1 };
const FRED_STUDENT: User = { id: 27, role: 'student', company: 4, tenant: 1 };
const CTE_STUDENT: User = { id: 29, role: 'student', company: 5, tenant: 1 };
const ADMIN: User = { id: 35, role: 'admin', company: 1, tenant: 1 };
const EDITOR: User = { id: 11, role: 'editor', company: null };

type Side = {
  course: number;
  course2: number;
  module: number;
  module2: number;
  lesson: number;
  lesson2: number;
  asset: number;
};
const FRED: Side = {
  course: 1,
  course2: 4,
  module: 10,
  module2: 40,
  lesson: 100,
  lesson2: 400,
  asset: 1000,
};
const CTE: Side = {
  course: 3,
  course2: 5,
  module: 30,
  module2: 50,
  lesson: 300,
  lesson2: 500,
  asset: 3000,
};

const mod = (course: unknown) => ({ title: 'W', slug: 'w', course });
const les = (module: unknown) => ({ title: 'W', slug: 'w', module });
const ast = (lesson: unknown) => ({ title: 'W', lesson });

describe('LMS cross-school WRITE isolation (course-modules / lessons / lesson-assets)', () => {
  for (const [name, prof, own, other] of [
    ['Fred instructor (company 4)', FRED_PROF, FRED, CTE],
    ['CTE instructor (company 5)', CTE_PROF, CTE, FRED],
  ] as const) {
    it(`${name}: create own content ALLOW (number / string / populated relation)`, async () => {
      const s = new Sim();
      assert.equal(await s.create('course-modules', prof, mod(own.course)), 'ALLOW');
      assert.equal(await s.create('course-modules', prof, mod(String(own.course2))), 'ALLOW');
      assert.equal(await s.create('lessons', prof, les({ id: own.module })), 'ALLOW');
      assert.equal(await s.create('lessons', prof, les(own.module2)), 'ALLOW');
      assert.equal(await s.create('lesson-assets', prof, ast(own.lesson)), 'ALLOW');
      assert.equal(await s.create('lesson-assets', prof, ast(String(own.lesson2))), 'ALLOW');
    });

    it(`${name}: create cross-school content DENY (any id shape)`, async () => {
      const s = new Sim();
      for (const c of [other.course, String(other.course), { id: other.course }, 12, 99]) {
        assert.equal(await s.create('course-modules', prof, mod(c)), 'DENY', `module→${c}`);
      }
      for (const m of [other.module, String(other.module), { id: other.module2 }, 120, 990]) {
        assert.equal(await s.create('lessons', prof, les(m)), 'DENY', `lesson→${m}`);
      }
      for (const l of [other.lesson, String(other.lesson2), { id: other.lesson }, 1200, 9900]) {
        assert.equal(await s.create('lesson-assets', prof, ast(l)), 'DENY', `asset→${l}`);
      }
      assert.equal(s.world['course-modules'].length, BASE_WORLD['course-modules'].length);
      assert.equal(s.world.lessons.length, BASE_WORLD.lessons.length);
      assert.equal(s.world['lesson-assets'].length, BASE_WORLD['lesson-assets'].length);
    });

    it(`${name}: create with missing / invalid / unknown parent DENY; ownerCompany ignored`, async () => {
      const s = new Sim();
      for (const bad of [undefined, null, '', 'abc', '3 OR 1=1', 0, -1, 1.5, {}, [own.course]]) {
        assert.equal(await s.create('course-modules', prof, mod(bad)), 'DENY', `module ${bad}`);
        assert.equal(await s.create('lessons', prof, les(bad)), 'DENY', `lesson ${bad}`);
        assert.equal(await s.create('lesson-assets', prof, ast(bad)), 'DENY', `asset ${bad}`);
      }
      assert.equal(await s.create('course-modules', prof, mod(77777)), 'DENY');
      const spoof = { ...mod(other.course), ownerCompany: prof.company, instructor: prof.id };
      assert.equal(await s.create('course-modules', prof, spoof), 'DENY');
    });

    it(`${name}: update own content ALLOW (partial + same-school rebind)`, async () => {
      const s = new Sim();
      assert.equal(await s.updateByID('course-modules', prof, own.module, { title: 'x' }), 'ALLOW');
      assert.equal(await s.updateByID('lessons', prof, own.lesson, { title: 'x' }), 'ALLOW');
      assert.equal(await s.updateByID('lesson-assets', prof, own.asset, { title: 'x' }), 'ALLOW');
      const r1 = await s.updateByID('course-modules', prof, own.module, { course: own.course2 });
      assert.equal(r1, 'ALLOW');
      const r2 = await s.updateByID('lessons', prof, own.lesson, { module: String(own.module2) });
      assert.equal(r2, 'ALLOW');
      const r3 = await s.updateByID('lesson-assets', prof, own.asset, { lesson: own.lesson2 });
      assert.equal(r3, 'ALLOW');
    });

    it(`${name}: update cross-school content DENY (byID and bulk PATCH ?where=)`, async () => {
      const s = new Sim();
      const targets: Array<[Nested, number[]]> = [
        ['course-modules', [other.module, other.module2, 120, 990]],
        ['lessons', [other.lesson, other.lesson2, 1200, 9900]],
        ['lesson-assets', [other.asset, 12000]],
      ];
      for (const [slug, list] of targets) {
        for (const id of list) {
          assert.equal(
            await s.updateByID(slug, prof, id, { title: 'pwn' }),
            'DENY',
            `${slug}:${id}`,
          );
          assert.notEqual(s.get(slug, id)?.title, 'pwn');
        }
        const bulk = await s.bulkUpdate(slug, prof, { id: { in: list } }, { title: 'pwn' });
        assert.deepEqual(bulk.updated, [], `${slug} bulk`);
        assert.ok(
          s.world[slug].every((d) => d.title !== 'pwn'),
          `${slug} untouched`,
        );
      }
    });

    it(`${name}: rebind own content to cross-school parent DENY (byID + bulk)`, async () => {
      const s = new Sim();
      const cases: Array<[Nested, number, string, unknown[]]> = [
        ['course-modules', own.module, 'course', [other.course, String(other.course), 12, 99]],
        ['lessons', own.lesson, 'module', [other.module, { id: other.module }, 120, 990]],
        ['lesson-assets', own.asset, 'lesson', [other.lesson, String(other.lesson2), 1200]],
      ];
      for (const [slug, id, field, targets] of cases) {
        const before = s.get(slug, id)?.[field];
        for (const t of targets) {
          assert.equal(await s.updateByID(slug, prof, id, { [field]: t }), 'DENY', `${slug}→${t}`);
          assert.equal(await s.updateByID(slug, prof, id, { title: 'ok', [field]: t }), 'DENY');
          const bulk = await s.bulkUpdate(slug, prof, { id: { equals: id } }, { [field]: t });
          assert.deepEqual(bulk.updated, [], `${slug} bulk→${t}`);
          assert.equal(s.get(slug, id)?.[field], before, `${slug} relation unchanged`);
        }
        assert.equal(await s.updateByID(slug, prof, id, { [field]: null }), 'DENY');
        assert.equal(await s.updateByID(slug, prof, id, { [field]: 'x' }), 'DENY');
      }
    });

    it(`${name}: bulk PATCH mixing own + cross-school only touches own docs`, async () => {
      const s = new Sim();
      const bulk = await s.bulkUpdate(
        'lessons',
        prof,
        { id: { in: [own.lesson, other.lesson, other.lesson2] } },
        { title: 'bulk' },
      );
      assert.deepEqual(bulk.updated, [own.lesson]);
    });

    it(`${name}: delete — own and cross-school both DENY for instructors (publisher-only contract)`, async () => {
      const s = new Sim();
      for (const [slug, id] of [
        ['course-modules', own.module],
        ['lessons', own.lesson],
        ['lesson-assets', own.asset],
        ['course-modules', other.module],
        ['lessons', other.lesson],
        ['lesson-assets', other.asset],
      ] as Array<[Nested, number]>) {
        assert.equal(await s.deleteByID(slug, prof, id), 'DENY', `${slug}:${id}`);
      }
      for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
        assert.deepEqual(await s.bulkDelete(slug, prof, { id: { in: ALL_IDS(slug) } }), []);
        assert.equal(s.world[slug].length, BASE_WORLD[slug].length);
      }
    });

    it(`${name}: scope resolved with ≤3 queries per request (memoized, no N+1)`, async () => {
      const s = new Sim();
      const { req, calls } = makeCtx(prof, s.world);
      const data = les(own.module);
      await (Lessons.access?.create as Access)({ req, data } as never);
      await (Lessons.access?.update as Access)({ req, id: own.lesson, data } as never);
      await (LessonAssets.access?.update as Access)({ req } as never);
      for (const hook of Lessons.hooks?.beforeChange ?? []) {
        await (hook as (a: unknown) => unknown)({ data, operation: 'create', req, context: {} });
      }
      assert.ok(calls.length <= 3, `queries=${calls.length}`);
    });
  }

  it('Admin UI /access (create without data): boolean scope, real op still enforced', async () => {
    for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
      const fred = makeCtx(FRED_PROF, structuredClone(BASE_WORLD));
      assert.equal(
        await (CONFIGS[slug].access?.create as Access)({ req: fred.req } as never),
        true,
      );
      const none = makeCtx(NO_COMPANY_PROF, structuredClone(BASE_WORLD));
      const r = await (CONFIGS[slug].access?.create as Access)({ req: none.req } as never);
      assert.equal(r, false, `${slug} no scope`);
      const hooks = CONFIGS[slug].hooks?.beforeChange ?? [];
      await assert.rejects(async () => {
        for (const hook of hooks) {
          await (hook as (a: unknown) => unknown)({
            data: { title: 'x' },
            operation: 'create',
            req: fred.req,
            context: {},
          });
        }
      }, `${slug}: beforeChange must deny create without parent`);
    }
  });

  it('fail-closed: scope resolution error / missing user id / no company → deny writes', async () => {
    const broken = {
      user: FRED_PROF,
      payload: {
        find: async () => {
          throw new Error('db down');
        },
      },
    } as unknown as PayloadRequest;
    const noId = makeCtx({ role: 'instructor', company: 4 } as unknown as User, BASE_WORLD).req;
    for (const req of [broken, noId]) {
      for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
        const data = { course: 1, module: 10, lesson: 100 };
        assert.equal(await (CONFIGS[slug].access?.create as Access)({ req, data } as never), false);
        assert.equal(await (CONFIGS[slug].access?.create as Access)({ req } as never), false);
        assert.equal(await (CONFIGS[slug].access?.update as Access)({ req } as never), false);
      }
    }
    const s = new Sim();
    assert.equal(await s.create('course-modules', NO_COMPANY_PROF, mod(99)), 'DENY');
    assert.equal(await s.create('lessons', NO_COMPANY_PROF, les(990)), 'DENY');
    assert.equal(await s.updateByID('lessons', NO_COMPANY_PROF, 9900, { title: 'x' }), 'DENY');
  });

  it('students and anonymous: every write DENY', async () => {
    for (const u of [FRED_STUDENT, CTE_STUDENT, null]) {
      const s = new Sim();
      assert.equal(await s.create('course-modules', u, mod(1)), 'DENY');
      assert.equal(await s.create('lessons', u, les(10)), 'DENY');
      assert.equal(await s.create('lesson-assets', u, ast(100)), 'DENY');
      assert.equal(await s.updateByID('course-modules', u, 10, { title: 'x' }), 'DENY');
      assert.equal(await s.updateByID('lessons', u, 300, { title: 'x' }), 'DENY');
      assert.equal(await s.updateByID('lesson-assets', u, 1000, { title: 'x' }), 'DENY');
      assert.equal(
        (await s.bulkUpdate('lessons', u, { id: { in: [100] } }, { title: 'x' })).denied,
        true,
      );
      assert.equal(await s.deleteByID('lessons', u, 100), 'DENY');
      assert.deepEqual(await s.bulkDelete('lessons', u, { id: { in: [100, 300] } }), []);
    }
  });

  it('admin / editor: behaviour preserved (no pre-queries)', async () => {
    for (const u of [ADMIN, EDITOR]) {
      const s = new Sim();
      for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
        const { req, calls } = makeCtx(u, s.world);
        assert.equal(await (CONFIGS[slug].access?.create as Access)({ req } as never), true);
        assert.equal(await (CONFIGS[slug].access?.update as Access)({ req } as never), true);
        assert.equal(calls.length, 0);
      }
      assert.equal(await s.create('course-modules', u, mod(3)), 'ALLOW');
      assert.equal(await s.create('lessons', u, les(30)), 'ALLOW');
      assert.equal(await s.create('lesson-assets', u, ast(300)), 'ALLOW');
      assert.equal(await s.updateByID('lessons', u, 300, { module: 10 }), 'ALLOW');
      assert.equal(await s.updateByID('course-modules', u, 30, { course: 1 }), 'ALLOW');
      const bulk = await s.bulkUpdate(
        'lesson-assets',
        u,
        { id: { in: [1000, 3000] } },
        { title: 'y' },
      );
      assert.deepEqual(bulk.updated, [1000, 3000]);
    }
    // delete: publishers (admin) only — unchanged
    const s = new Sim();
    assert.equal(await s.deleteByID('lesson-assets', ADMIN, 3000), 'ALLOW');
    assert.deepEqual(await s.bulkDelete('lessons', ADMIN, { id: { in: [300, 301] } }), [300, 301]);
    assert.equal(await s.deleteByID('lessons', EDITOR, 100), 'DENY');
  });

  it('internal Local API writes without an authenticated user are not affected by the guard', async () => {
    const { req } = makeCtx(null, structuredClone(BASE_WORLD));
    for (const slug of ['course-modules', 'lessons', 'lesson-assets'] as const) {
      for (const hook of CONFIGS[slug].hooks?.beforeChange ?? []) {
        await (hook as (a: unknown) => unknown)({
          data: { title: 'sys', slug: 'sys', course: 3, module: 30, lesson: 300 },
          operation: 'create',
          req,
          context: {},
        });
      }
    }
  });
});

function ALL_IDS(slug: Nested) {
  return BASE_WORLD[slug].map((d) => d.id);
}
