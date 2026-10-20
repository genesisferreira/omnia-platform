/**
 * EPIC17.3 — security regression: Knowledge Governance HTTP responses must not leak populated
 * users (course.instructor sessions/password/tokens/auth metadata/PII) or any non-allowlisted
 * field. Exercises the REAL endpoint handlers:
 *   POST /api/omnia/academic/teaching/lessons/:id/knowledge-submit
 *   POST /api/omnia/academic/teaching/knowledge-reviews/:id
 * with an in-memory Payload that emulates Payload's default relation population (depth ≠ 0),
 * i.e. the production behaviour of `payload.update` / `payload.create` without `depth`.
 * Sem DB / sem rede.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import type { Endpoint, PayloadRequest } from 'payload';

import {
  GOVERNANCE_SUBMISSION_RESPONSE_FIELDS,
  toGovernanceSubmissionResponse,
} from '../services/knowledge/governance-response';

type Doc = Record<string, unknown> & { id: number };
type Where = Record<string, unknown>;

const CANARY = 'CANARY-EPIC173-7f3a9c1e';

/** Instructor doc with every sensitive field a Payload auth user can carry + a canary. */
const INSTRUCTOR_FIXTURE: Doc = {
  id: 22,
  name: 'Prof. Fixture',
  firstName: 'Prof.',
  lastName: 'Fixture',
  email: 'prof.fixture@example.invalid',
  phone: '+55 00 0000-0000',
  whatsapp: '+55 00 0000-0000',
  cpf: '000.000.000-00',
  role: 'instructor',
  accountStatus: 'active',
  tenant: 5,
  company: 4,
  sessions: [{ id: 'sess-fixture', createdAt: '2026-01-01', expiresAt: '2099-01-01' }],
  password: 'plain-password-fixture',
  hash: 'hash-fixture',
  salt: 'salt-fixture',
  resetPasswordToken: 'reset-token-fixture',
  resetPasswordExpiration: '2099-01-01T00:00:00.000Z',
  apiKey: 'api-key-fixture',
  enableAPIKey: true,
  apiKeyIndex: 'api-key-index-fixture',
  loginAttempts: 3,
  lockUntil: '2099-01-01T00:00:00.000Z',
  _verified: true,
  _verificationToken: 'verification-token-fixture',
  collection: 'users',
  __secretCanary: CANARY,
};

const FORBIDDEN_KEYS = [
  'sessions',
  'password',
  'hash',
  'salt',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'apiKey',
  'enableAPIKey',
  'apiKeyIndex',
  'loginAttempts',
  'lockUntil',
  '_verified',
  '_verificationToken',
  'email',
  'phone',
  'whatsapp',
  'cpf',
  'tenant',
  'company',
  'role',
  'accountStatus',
  'collection',
  '__secretCanary',
];

/** Relation map used to emulate Payload population (relationTo per field, per collection). */
const RELATIONS: Record<string, Record<string, string>> = {
  'knowledge-governance-submissions': {
    course: 'courses',
    lesson: 'lessons',
    ownerCompany: 'companies',
    author: 'users',
    lastReviewer: 'users',
    learningResource: 'learning-resources',
    knowledgeDocument: 'knowledge-documents',
  },
  courses: { instructor: 'users', ownerCompany: 'companies' },
  lessons: { module: 'course-modules' },
  'course-modules': { course: 'courses' },
  users: { company: 'companies', tenant: 'tenants' },
  companies: { tenant: 'tenants' },
};

function matches(doc: Doc, where?: Where | null): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'and') {
      if (!(cond as Where[]).every((w) => matches(doc, w))) return false;
      continue;
    }
    const raw = doc[key];
    const value = raw && typeof raw === 'object' && 'id' in raw ? (raw as Doc).id : raw;
    const c = cond as { equals?: unknown };
    if ('equals' in c && String(value) !== String(c.equals)) return false;
  }
  return true;
}

function createPopulatingPayload() {
  const store = new Map<string, Map<number, Doc>>();
  const seq = new Map<string, number>();
  const col = (slug: string) => {
    if (!store.has(slug)) store.set(slug, new Map());
    return store.get(slug)!;
  };
  const clone = <T>(v: T): T => structuredClone(v);

  /** Payload default depth is 2; populate generously (3) to model the worst case. */
  function populate(slug: string, doc: Doc, depth: number): Doc {
    const out: Doc = clone(doc);
    if (depth <= 0) return out;
    for (const [field, target] of Object.entries(RELATIONS[slug] ?? {})) {
      const v = out[field];
      if (typeof v === 'number' || typeof v === 'string') {
        const rel = col(target).get(Number(v));
        if (rel) out[field] = populate(target, rel, depth - 1);
      }
    }
    return out;
  }
  const depthOf = (d: unknown) => (typeof d === 'number' ? d : 3);

  const payload = {
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    async find(args: { collection: string; where?: Where; limit?: number; depth?: number }) {
      let docs = [...col(args.collection).values()].filter((d) => matches(d, args.where));
      const totalDocs = docs.length;
      if (args.limit) docs = docs.slice(0, args.limit);
      return {
        docs: docs.map((d) => populate(args.collection, d, depthOf(args.depth))),
        totalDocs,
      };
    },
    async findByID(args: { collection: string; id: string | number; depth?: number }) {
      const doc = col(args.collection).get(Number(args.id));
      if (!doc) throw Object.assign(new Error('Not Found'), { status: 404 });
      return populate(args.collection, doc, depthOf(args.depth));
    },
    async create(args: { collection: string; data: Record<string, unknown>; depth?: number }) {
      const id = (seq.get(args.collection) ?? 0) + 1;
      seq.set(args.collection, id);
      const now = new Date().toISOString();
      const doc: Doc = { ...clone(args.data), id, createdAt: now, updatedAt: now };
      col(args.collection).set(id, doc);
      return populate(args.collection, doc, depthOf(args.depth));
    },
    async update(args: {
      collection: string;
      id: string | number;
      data: Record<string, unknown>;
      depth?: number;
    }) {
      const existing = col(args.collection).get(Number(args.id));
      if (!existing) throw Object.assign(new Error('Not Found'), { status: 404 });
      const doc: Doc = {
        ...existing,
        ...clone(args.data),
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };
      col(args.collection).set(existing.id, doc);
      return populate(args.collection, doc, depthOf(args.depth));
    },
  };
  const seed = (slug: string, doc: Doc) => col(slug).set(doc.id, clone(doc));
  return { payload, seed };
}

function makeReq(
  payload: unknown,
  user: Record<string, unknown>,
  id: number,
  body: unknown,
): PayloadRequest {
  return {
    payload,
    user,
    routeParams: { id: String(id) },
    headers: new Headers(),
    json: async () => body,
  } as unknown as PayloadRequest;
}

function collectKeys(value: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, acc));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      acc.add(k);
      collectKeys(v, acc);
    }
  }
  return acc;
}

const ALLOWED_TOP_LEVEL = new Set<string>([
  'ok',
  ...GOVERNANCE_SUBMISSION_RESPONSE_FIELDS,
  'course',
  'lesson',
  'lessonAsset',
  'learningResource',
  'knowledgeDocument',
  'ownerCompany',
  'author',
  'lastReviewer',
  'decisions',
]);

function assertSanitized(body: Record<string, unknown>, expectPopulated = true) {
  const raw = JSON.stringify(body);
  assert.equal(raw.includes(CANARY), false, 'canary leaked');
  for (const secret of [
    'plain-password-fixture',
    'hash-fixture',
    'salt-fixture',
    'reset-token-fixture',
    'api-key-fixture',
    'verification-token-fixture',
    'sess-fixture',
    'prof.fixture@example.invalid',
    '000.000.000-00',
  ]) {
    assert.equal(raw.includes(secret), false, `secret value leaked: ${secret}`);
  }
  for (const k of Object.keys(body)) {
    assert.ok(ALLOWED_TOP_LEVEL.has(k), `non-allowlisted top-level key: ${k}`);
  }
  const keys = collectKeys(body);
  for (const k of FORBIDDEN_KEYS) assert.equal(keys.has(k), false, `forbidden key present: ${k}`);

  const course = body.course as Record<string, unknown> | number | undefined;
  assert.ok(course != null, 'course expected in response');
  if (expectPopulated) {
    assert.equal(typeof course, 'object', 'fixture must populate course (worst case)');
  }
  if (typeof course === 'object') {
    assert.deepEqual(Object.keys(course).sort(), ['id', 'instructor', 'slug', 'title']);
    const instructor = course.instructor as Record<string, unknown>;
    assert.deepEqual(Object.keys(instructor).sort(), ['id', 'name'], 'instructor key-set');
    assert.deepEqual(instructor, { id: 22, name: 'Prof. Fixture' });
  }
  if (body.ownerCompany && typeof body.ownerCompany === 'object') {
    assert.deepEqual(Object.keys(body.ownerCompany).sort(), ['id', 'name', 'slug']);
  }
  for (const u of ['author', 'lastReviewer'] as const) {
    const v = body[u];
    if (v && typeof v === 'object') assert.deepEqual(Object.keys(v).sort(), ['id', 'name']);
  }
}

describe('EPIC17.3 knowledge governance response sanitization', () => {
  const { payload, seed } = createPopulatingPayload();
  let submitEp: Endpoint;
  let reviewEp: Endpoint;
  const reviewer = { id: 1, name: 'Admin Fixture', role: 'admin', __secretCanary: CANARY };
  let submissionId: number;

  before(async () => {
    const { academicEndpoints } = await import('../endpoints/academic');
    submitEp = academicEndpoints.find(
      (e) => e.path === '/omnia/academic/teaching/lessons/:id/knowledge-submit',
    )!;
    reviewEp = academicEndpoints.find(
      (e) => e.path === '/omnia/academic/teaching/knowledge-reviews/:id',
    )!;
    assert.ok(submitEp && reviewEp, 'endpoints registered');

    seed('tenants', { id: 5, name: 'Fred do Frio', __secretCanary: CANARY });
    seed('companies', {
      id: 4,
      name: 'Fred do Frio',
      slug: 'fred-do-frio',
      tenant: 5,
      __secretCanary: CANARY,
    });
    seed('users', INSTRUCTOR_FIXTURE);
    seed('users', { ...INSTRUCTOR_FIXTURE, ...reviewer, email: 'x@example.invalid' });
    seed('courses', {
      id: 30,
      title: 'Curso Fixture',
      slug: 'curso-fixture',
      schoolKey: 'fred',
      ownerCompany: 4,
      instructor: 22,
      __secretCanary: CANARY,
    });
    seed('course-modules', { id: 50, title: 'Módulo', course: 30 });
    seed('lessons', {
      id: 100,
      title: 'Aula Fixture',
      slug: 'aula-fixture',
      module: 50,
      summary: 'Resumo',
      updatedAt: '2026-09-25T12:00:00.000Z',
      __secretCanary: CANARY,
    });
  });

  it('knowledge-submit (create) returns only allowlisted fields; instructor = {id,name}', async () => {
    const res = await submitEp.handler(
      makeReq(payload, INSTRUCTOR_FIXTURE, 100, { requestedScope: 'SCHOOL_APPROVED' }),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.governanceState, 'PENDING_SCHOOL_REVIEW');
    assert.equal(typeof body.id, 'number');
    submissionId = body.id as number;
    assertSanitized(body);
  });

  it('knowledge-submit (already pending) stays sanitized', async () => {
    const res = await submitEp.handler(
      makeReq(payload, INSTRUCTOR_FIXTURE, 100, { requestedScope: 'SCHOOL_APPROVED' }),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.id, submissionId);
    assertSanitized(body, false);
  });

  it('knowledge-review (request_correction) stays sanitized', async () => {
    const res = await reviewEp.handler(
      makeReq(payload, reviewer, submissionId, { action: 'request_correction', reason: 'fix' }),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.governanceState, 'COURSE_PRIVATE');
    assertSanitized(body);
  });

  it('knowledge-submit (resubmit after correction → update path) stays sanitized', async () => {
    const res = await submitEp.handler(
      makeReq(payload, INSTRUCTOR_FIXTURE, 100, { requestedScope: 'SCHOOL_APPROVED' }),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.governanceState, 'PENDING_SCHOOL_REVIEW');
    assertSanitized(body);
  });

  it('knowledge-review (reject) returns only allowlisted fields; instructor = {id,name}', async () => {
    const res = await reviewEp.handler(
      makeReq(payload, reviewer, submissionId, { action: 'reject', reason: 'fixture' }),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.governanceState, 'REJECTED');
    assertSanitized(body);
  });

  it('projection is an allowlist: unknown fields anywhere are dropped (exact key sets)', () => {
    const out = toGovernanceSubmissionResponse({
      id: 7,
      governanceState: 'SCHOOL_APPROVED',
      __secretCanary: CANARY,
      newUnreviewedField: CANARY,
      course: { id: 30, title: 'C', slug: 'c', schoolKey: 'fred', instructor: INSTRUCTOR_FIXTURE },
      author: INSTRUCTOR_FIXTURE,
      lastReviewer: { ...INSTRUCTOR_FIXTURE, id: 1 },
      ownerCompany: { id: 4, name: 'F', slug: 'f', tenant: { id: 5, __secretCanary: CANARY } },
      lesson: { id: 100, title: 'A', slug: 'a', course: { instructor: INSTRUCTOR_FIXTURE } },
      learningResource: 35,
      knowledgeDocument: { id: 42, title: 'KD', createdBy: INSTRUCTOR_FIXTURE },
      decisions: [
        { id: 'd1', action: 'approved', actorId: '1', at: 'x', actor: INSTRUCTOR_FIXTURE },
      ],
    });
    assert.equal(JSON.stringify(out).includes(CANARY), false);
    assert.deepEqual(Object.keys(out).sort(), [
      'author',
      'course',
      'decisions',
      'governanceState',
      'id',
      'knowledgeDocument',
      'lastReviewer',
      'learningResource',
      'lesson',
      'ownerCompany',
    ]);
    assert.deepEqual(out.course, {
      id: 30,
      title: 'C',
      slug: 'c',
      instructor: { id: 22, name: 'Prof. Fixture' },
    });
    assert.deepEqual(out.author, { id: 22, name: 'Prof. Fixture' });
    assert.deepEqual(out.lastReviewer, { id: 1, name: 'Prof. Fixture' });
    assert.deepEqual(out.ownerCompany, { id: 4, name: 'F', slug: 'f' });
    assert.deepEqual(out.lesson, { id: 100, title: 'A', slug: 'a' });
    assert.equal(out.learningResource, 35);
    assert.deepEqual(out.knowledgeDocument, { id: 42, title: 'KD' });
    assert.deepEqual(out.decisions, [{ id: 'd1', action: 'approved', actorId: '1', at: 'x' }]);
    // depth-0 shape (ids) is preserved untouched
    assert.deepEqual(toGovernanceSubmissionResponse({ id: 1, course: 30, author: 22 }), {
      id: 1,
      course: 30,
      author: 22,
    });
  });
});
