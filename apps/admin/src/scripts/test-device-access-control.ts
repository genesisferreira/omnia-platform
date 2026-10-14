/**
 * Device Access Control — suíte específica (sem DB / sem rede).
 * Exercita o núcleo real (`services/devices/policy`), o gate canônico real
 * (`services/devices/gate`) e a configuração real das coleções/global/migration,
 * sobre um store em memória com lock por aluno (mesma semântica do advisory lock).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  DEVICE_TOKEN_HEADER,
  describeDevice,
  isWellFormedDeviceToken,
  readCookieFromHeader,
  resolveDeviceCookieConfig,
} from '@omnia/shared';

import { DeviceAccessRequests } from '../collections/devices/DeviceAccessRequests';
import { StudentDevices } from '../collections/devices/StudentDevices';
import { DeviceAccessSettings } from '../globals/DeviceAccessSettings';
import {
  decideDeviceGate,
  deviceCookieConfig,
  isDeviceGateExemptPath,
  stripCredentials,
  type GateDeps,
} from '../services/devices/gate';
import {
  adminStudentDeviceView,
  approveDeviceRequest,
  canChangeDevicePolicy,
  canManageDevices,
  createDeviceRequest,
  DEVICE_AUDIT_ACTIONS,
  DeviceAccessError,
  denyDeviceRequest,
  evaluateDeviceAccess,
  hashDeviceToken,
  MAX_PENDING_CANDIDATES,
  normalizeDeviceSettings,
  registerDevice,
  replaceDevice,
  revokeDevice,
  settingsChangeEvents,
  studentDeviceView,
  type DeviceAuditEvent,
  type DeviceRecord,
  type DeviceRequestRecord,
  type DeviceStore,
  type StudentRef,
} from '../services/devices/policy';
import {
  getCachedDeviceSettings,
  invalidateDeviceSettingsCache,
} from '../services/devices/settings-cache';

// ---------------------------------------------------------------------------------------------
// In-memory world (espelha DEV: Fred = company 4, CTE = company 5)
// ---------------------------------------------------------------------------------------------

type World = {
  settings: unknown;
  settingsError?: boolean;
  users: Map<string, StudentRef>;
  devices: DeviceRecord[];
  requests: DeviceRequestRecord[];
  audit: DeviceAuditEvent[];
  seq: number;
  clock: number;
  locks: Map<string, Promise<void>>;
  /** Nº de operações que rodaram dentro de um lock (prova de serialização). */
  maxConcurrentInLock: number;
  inLock: Map<string, number>;
};

const yieldTick = () => new Promise<void>((r) => setImmediate(r));

function makeWorld(settings: unknown = { enabled: false, defaultMaxDevices: 2 }): World {
  const users = new Map<string, StudentRef>();
  const add = (id: string, role: string, company: string | null) =>
    users.set(id, { id, role, maxDevicesOverride: null, company, tenant: '1' });
  add('11', 'student', '4'); // Fred student
  add('12', 'student', '4'); // Fred student 2
  add('21', 'student', '5'); // CTE student
  add('22', 'instructor', '4'); // Fred instructor
  add('30', 'instructor', '5'); // CTE instructor
  add('1', 'super_admin', null);
  add('2', 'admin', null);
  add('3', 'editor', null);
  return {
    settings,
    users,
    devices: [],
    requests: [],
    audit: [],
    seq: 100,
    clock: Date.parse('2026-09-25T15:00:00Z'),
    locks: new Map(),
    maxConcurrentInLock: 0,
    inLock: new Map(),
  };
}

function memStore(w: World): DeviceStore {
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const store: DeviceStore = {
    now: () => new Date(w.clock),
    async loadSettings() {
      await yieldTick();
      if (w.settingsError) throw new Error('db down');
      return clone(w.settings);
    },
    async getStudent(id) {
      await yieldTick();
      const u = w.users.get(String(id));
      return u ? clone(u) : null;
    },
    async findDeviceByTokenHash(hash) {
      await yieldTick();
      const d = w.devices.find((x) => x.tokenHash === hash);
      return d ? clone(d) : null;
    },
    async getDevice(id) {
      await yieldTick();
      const d = w.devices.find((x) => x.id === String(id));
      return d ? clone(d) : null;
    },
    async listDevices(studentId) {
      await yieldTick();
      return clone(w.devices.filter((d) => d.student === String(studentId)));
    },
    async createDevice(input) {
      await yieldTick();
      if (w.devices.some((d) => d.tokenHash === input.tokenHash)) throw new Error('unique');
      const d: DeviceRecord = {
        ...input,
        id: String(++w.seq),
        createdAt: new Date(w.clock + w.seq).toISOString(),
      };
      w.devices.push(d);
      return clone(d);
    },
    async updateDevice(id, patch) {
      await yieldTick();
      const d = w.devices.find((x) => x.id === String(id));
      if (!d) throw new Error('nf');
      Object.assign(d, patch);
      return clone(d);
    },
    async getRequest(id) {
      await yieldTick();
      const r = w.requests.find((x) => x.id === String(id));
      return r ? clone(r) : null;
    },
    async listRequests(f) {
      await yieldTick();
      return clone(
        w.requests.filter(
          (r) =>
            (!f.studentId || r.student === f.studentId) &&
            (!f.deviceId || r.device === f.deviceId) &&
            (!f.status || r.status === f.status),
        ),
      );
    },
    async createRequest(input) {
      await yieldTick();
      if (
        input.status === 'PENDING' &&
        w.requests.some((r) => r.device === input.device && r.status === 'PENDING')
      ) {
        throw new Error('unique pending');
      }
      const r: DeviceRequestRecord = {
        ...input,
        id: String(++w.seq),
        createdAt: new Date(w.clock).toISOString(),
      };
      w.requests.push(r);
      return clone(r);
    },
    async updateRequest(id, patch) {
      await yieldTick();
      const r = w.requests.find((x) => x.id === String(id));
      if (!r) throw new Error('nf');
      Object.assign(r, patch);
      return clone(r);
    },
    async audit(ev) {
      w.audit.push(clone(ev));
    },
    async withStudentLock(studentId, fn) {
      const key = String(studentId);
      const prev = w.locks.get(key) ?? Promise.resolve();
      let release!: () => void;
      const mine = new Promise<void>((r) => (release = r));
      w.locks.set(
        key,
        prev.then(() => mine),
      );
      await prev;
      const n = (w.inLock.get(key) ?? 0) + 1;
      w.inLock.set(key, n);
      w.maxConcurrentInLock = Math.max(w.maxConcurrentInLock, n);
      try {
        return await fn(store);
      } finally {
        w.inLock.set(key, (w.inLock.get(key) ?? 1) - 1);
        release();
      }
    },
  };
  return store;
}

const SUPER = { id: '1', role: 'super_admin' };
const ADMIN = { id: '2', role: 'admin' };
const INSTRUCTOR = { id: '22', role: 'instructor' };

async function reg(store: DeviceStore, userId: string, token: string | null = null) {
  return registerDevice(store, {
    userId,
    rawToken: token,
    label: 'Chrome em Windows',
    deviceType: 'desktop',
  });
}

function on(w: World, max = 2) {
  w.settings = { enabled: true, defaultMaxDevices: max };
}

// ---------------------------------------------------------------------------------------------

describe('Device Access Control — defaults, config e contrato', () => {
  it('global persiste enabled=false por default; limite configurável (sem hardcode na lógica)', () => {
    const enabled = DeviceAccessSettings.fields.find(
      (f) => 'name' in f && f.name === 'enabled',
    ) as { defaultValue?: unknown };
    assert.equal(enabled.defaultValue, false);
    const max = DeviceAccessSettings.fields.find(
      (f) => 'name' in f && f.name === 'defaultMaxDevices',
    ) as {
      validate: (v: unknown) => unknown;
    };
    assert.equal(max.validate(0), 'Informe um inteiro entre 1 e 100.');
    assert.equal(max.validate(1.5), 'Informe um inteiro entre 1 e 100.');
    assert.equal(max.validate(3), true);
  });

  it('config ausente / inválida / erro de carga ⇒ fail-open (nunca bloqueia)', async () => {
    assert.deepEqual(normalizeDeviceSettings(null), { ok: false, reason: 'CONFIG_UNAVAILABLE' });
    assert.deepEqual(normalizeDeviceSettings({ enabled: true, defaultMaxDevices: 0 }), {
      ok: false,
      reason: 'CONFIG_INVALID',
    });
    assert.equal(
      normalizeDeviceSettings({ enabled: 'true', defaultMaxDevices: 2 }).ok &&
        (
          normalizeDeviceSettings({ enabled: 'true', defaultMaxDevices: 2 }) as {
            settings: { enabled: boolean };
          }
        ).settings.enabled,
      false,
    );
    const w = makeWorld(undefined);
    const s = memStore(w);
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: null })).state,
      'NOT_ENFORCED',
    );
    w.settings = { enabled: true, defaultMaxDevices: 'abc' };
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: null })).state,
      'NOT_ENFORCED',
    );
    w.settings = { enabled: true, defaultMaxDevices: 1 };
    w.settingsError = true;
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: null })).state,
      'NOT_ENFORCED',
    );
  });

  it('coleções: tokenHash nunca legível pela API; mutações só via serviço; leitura só Master/Admin', () => {
    const tokenField = StudentDevices.fields.find((f) => 'name' in f && f.name === 'tokenHash') as {
      access: { read: () => boolean };
      unique?: boolean;
    };
    assert.equal(tokenField.access.read(), false);
    assert.equal(tokenField.unique, true);
    for (const c of [StudentDevices, DeviceAccessRequests]) {
      const a = c.access as Record<string, (args: unknown) => unknown>;
      assert.equal(a.create({}), false);
      assert.equal(a.update({}), false);
      assert.equal(a.delete({}), false);
      assert.equal(a.read({ req: { user: SUPER } }), true);
      assert.equal(a.read({ req: { user: ADMIN } }), true);
      assert.equal(a.read({ req: { user: INSTRUCTOR } }), false);
      assert.equal(a.read({ req: { user: { id: '11', role: 'student' } } }), false);
      assert.equal(a.read({ req: { user: null } }), false);
    }
    const ga = DeviceAccessSettings.access as Record<string, (args: unknown) => unknown>;
    assert.equal(ga.update({ req: { user: SUPER } }), true);
    assert.equal(ga.update({ req: { user: ADMIN } }), false);
    assert.equal(ga.update({ req: { user: INSTRUCTOR } }), false);
    assert.equal(canChangeDevicePolicy(SUPER), true);
    assert.equal(canManageDevices(ADMIN), true);
    assert.equal(canManageDevices({ role: 'editor' }), false);
  });

  it('token forte (256 bits base64url), só o hash é persistido; cookie seguro por ambiente', () => {
    const w = makeWorld();
    on(w, 3);
    return reg(memStore(w), '11').then((r) => {
      assert.ok(isWellFormedDeviceToken(r.issuedToken));
      assert.equal(w.devices[0]!.tokenHash, hashDeviceToken(r.issuedToken!));
      assert.notEqual(w.devices[0]!.tokenHash, r.issuedToken);
      assert.ok(
        !JSON.stringify(w.audit).includes(r.issuedToken!),
        'audit nunca contém token bruto',
      );
      assert.ok(
        !JSON.stringify(w.audit).includes(w.devices[0]!.tokenHash),
        'audit nunca contém hash',
      );
      const prod = resolveDeviceCookieConfig({
        appUrl: 'https://omniafrigo.com.br',
        adminUrl: 'https://admin.omniafrigo.com.br',
        nodeEnv: 'production',
      });
      const dev = resolveDeviceCookieConfig({
        appUrl: 'https://dev.omniafrigo.com.br',
        adminUrl: 'https://admin.dev.omniafrigo.com.br',
        nodeEnv: 'production',
      });
      assert.equal(prod.domain, 'omniafrigo.com.br');
      assert.equal(dev.domain, 'dev.omniafrigo.com.br');
      assert.notEqual(prod.name, dev.name, 'nomes distintos por ambiente (sem colisão prod/dev)');
      assert.equal(prod.secure, true);
      assert.equal(
        resolveDeviceCookieConfig({
          appUrl: 'http://localhost:3000',
          adminUrl: 'http://localhost:3001',
          nodeEnv: 'development',
        }).domain,
        undefined,
      );
      assert.equal(readCookieFromHeader(`a=1; ${prod.name}=abc; b=2`, prod.name), 'abc');
      assert.deepEqual(
        describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari/604.1'),
        { label: 'Safari em iOS', deviceType: 'mobile' },
      );
    });
  });

  it('migration: aditiva/idempotente, default enabled=false, sem DML em dados existentes', () => {
    const src = readFileSync(
      path.resolve(process.cwd(), 'src/migrations/20260925_150000_device_access_control.ts'),
      'utf8',
    );
    const up = src.slice(
      src.indexOf('export async function up'),
      src.indexOf('export async function down'),
    );
    assert.match(up, /"enabled" boolean DEFAULT false/);
    assert.match(up, /SELECT false, 2, now\(\), now\(\)\s*WHERE NOT EXISTS/);
    assert.doesNotMatch(
      up,
      /\bUPDATE\s+"|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDROP\s+(TABLE|COLUMN|INDEX|TYPE|CONSTRAINT)\b/i,
    );
    assert.doesNotMatch(
      up,
      /"(sessions|users_sessions|lms_enrollments|lms_lesson_progress|ils_onboarding|courses|lessons|knowledge_documents)"/,
    );
    assert.match(up, /ADD COLUMN IF NOT EXISTS "max_devices_override" numeric;/);
    for (const m of up.matchAll(/CREATE (UNIQUE )?(TABLE|INDEX) (?!IF NOT EXISTS)/g))
      assert.fail(`sem IF NOT EXISTS: ${m[0]}`);
    assert.match(up, /one_pending_per_device_idx[\s\S]*WHERE "status" = 'PENDING'/);
  });
});

describe('FEATURE OFF (default) — zero regressão', () => {
  it('aluno existente acessa de vários dispositivos, sem cookie, com sessão existente; nada é registrado', async () => {
    const w = makeWorld();
    const s = memStore(w);
    for (const token of [null, 'x'.repeat(43), undefined]) {
      const ev = await evaluateDeviceAccess(s, { userId: '11', rawToken: token });
      assert.equal(ev.state, 'NOT_ENFORCED');
    }
    for (let i = 0; i < 5; i++) assert.equal((await reg(s, '11')).state, 'NOT_ENFORCED');
    assert.equal(w.devices.length, 0);
    assert.equal(w.audit.length, 0);
    await assert.rejects(
      createDeviceRequest(s, { userId: '11', rawToken: null, reason: 'preciso acessar' }),
      (e: DeviceAccessError) => e.code === 'NOT_ENFORCED',
    );
  });

  it('instructor/admin/super_admin/editor nunca são limitados, mesmo com a feature ON e limite 1', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    for (const id of ['22', '30', '1', '2', '3']) {
      for (let i = 0; i < 3; i++) {
        const ev = await evaluateDeviceAccess(s, { userId: id, rawToken: null });
        assert.equal(ev.state, 'NOT_ENFORCED');
        assert.equal((await reg(s, id)).state, 'NOT_ENFORCED');
      }
    }
    assert.equal(w.devices.length, 0);
  });
});

describe('FEATURE ON — registro, limite N, request, approve/deny/revoke/replace', () => {
  for (const limit of [1, 2, 3]) {
    it(`limite ${limit}: ${limit} registro(s) automático(s); o seguinte bloqueia e entra no fluxo de solicitação`, async () => {
      const w = makeWorld();
      on(w, limit);
      const s = memStore(w);
      const tokens: string[] = [];
      for (let i = 0; i < limit; i++) {
        const r = await reg(s, '11');
        assert.equal(r.state, 'ALLOWED');
        assert.ok(r.issuedToken);
        tokens.push(r.issuedToken!);
      }
      for (const t of tokens)
        assert.equal(
          (await evaluateDeviceAccess(s, { userId: '11', rawToken: t })).state,
          'ALLOWED',
        );
      const blocked = await reg(s, '11');
      assert.equal(blocked.state, 'BLOCKED_LIMIT');
      assert.ok(blocked.issuedToken, 'candidato recebe identificador para poder solicitar');
      assert.equal(w.devices.filter((d) => d.status === 'AUTHORIZED').length, limit);
      assert.equal(w.devices.filter((d) => d.status === 'PENDING').length, 1);
      const { request, created } = await createDeviceRequest(s, {
        userId: '11',
        rawToken: blocked.issuedToken,
        reason: 'Troquei de celular',
      });
      assert.equal(created, true);
      assert.equal(request.status, 'PENDING');
      const again = await createDeviceRequest(s, {
        userId: '11',
        rawToken: blocked.issuedToken,
        reason: 'de novo',
      });
      assert.equal(again.created, false, 'idempotente: uma solicitação aberta por device');
      assert.equal(
        (await evaluateDeviceAccess(s, { userId: '11', rawToken: blocked.issuedToken })).state,
        'PENDING_APPROVAL',
      );
      const view = await studentDeviceView(s, { userId: '11', rawToken: blocked.issuedToken });
      assert.ok(!JSON.stringify(view).includes('tokenHash'));
      assert.equal(view.state, 'PENDING_APPROVAL');
      await approveDeviceRequest(s, ADMIN, { requestId: request.id });
      const after = await evaluateDeviceAccess(s, { userId: '11', rawToken: blocked.issuedToken });
      assert.equal(after.state, 'ALLOWED');
      assert.equal(
        after.enforced && after.overLimit,
        true,
        'aprovação administrativa pode exceder o limite',
      );
      const actions = w.audit.map((a) => a.action);
      for (const a of [
        'DEVICE_REGISTERED',
        'DEVICE_LOGIN_BLOCKED',
        'DEVICE_REQUEST_CREATED',
        'DEVICE_REQUEST_APPROVED',
      ])
        assert.ok(actions.includes(a as never), a);
    });
  }

  it('DENY: candidato fica negado, não auto-registra mesmo com vaga; pode solicitar de novo', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    await reg(s, '11');
    const b = await reg(s, '11');
    const { request } = await createDeviceRequest(s, {
      userId: '11',
      rawToken: b.issuedToken,
      reason: 'Computador novo',
    });
    await denyDeviceRequest(s, SUPER, { requestId: request.id, note: 'não' });
    assert.equal(w.requests[0]!.status, 'DENIED');
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: b.issuedToken })).state,
      'DEVICE_REVOKED',
    );
    on(w, 5);
    assert.equal(
      (await reg(s, '11', b.issuedToken)).state,
      'DEVICE_REVOKED',
      'negado não se re-registra sozinho',
    );
    const second = await createDeviceRequest(s, {
      userId: '11',
      rawToken: b.issuedToken,
      reason: 'reconsiderar',
    });
    assert.equal(second.created, true);
    await assert.rejects(
      denyDeviceRequest(s, SUPER, { requestId: request.id }),
      (e: DeviceAccessError) => e.code === 'INVALID_STATE',
    );
    assert.ok(w.audit.some((a) => a.action === 'DEVICE_REQUEST_DENIED'));
  });

  it('REVOKE: token revogado bloqueia (sem auto re-registro); vaga liberada para outro navegador', async () => {
    const w = makeWorld();
    on(w, 2);
    const s = memStore(w);
    const a = await reg(s, '11');
    const b = await reg(s, '11');
    const devA = w.devices.find((d) => d.tokenHash === hashDeviceToken(a.issuedToken!))!;
    await revokeDevice(s, ADMIN, { deviceId: devA.id });
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: a.issuedToken })).state,
      'DEVICE_REVOKED',
    );
    assert.equal((await reg(s, '11', a.issuedToken)).state, 'DEVICE_REVOKED');
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: b.issuedToken })).state,
      'ALLOWED',
    );
    assert.equal((await reg(s, '11')).state, 'ALLOWED', 'novo navegador ocupa a vaga liberada');
    await assert.rejects(
      revokeDevice(s, ADMIN, { deviceId: devA.id }),
      (e: DeviceAccessError) => e.code === 'INVALID_STATE',
    );
    assert.ok(w.audit.some((x) => x.action === 'DEVICE_REVOKED'));
  });

  it('REPLACE: via aprovação com replaceDeviceId e via ação direta; respeita o aluno dono', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    const a = await reg(s, '11');
    const b = await reg(s, '11');
    const { request } = await createDeviceRequest(s, {
      userId: '11',
      rawToken: b.issuedToken,
      reason: 'Celular novo',
    });
    const devA = w.devices.find((d) => d.tokenHash === hashDeviceToken(a.issuedToken!))!;
    const r = await approveDeviceRequest(s, SUPER, {
      requestId: request.id,
      replaceDeviceId: devA.id,
    });
    assert.equal(r.replaced?.status, 'REPLACED');
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: a.issuedToken })).state,
      'DEVICE_REVOKED',
    );
    const ev = await evaluateDeviceAccess(s, { userId: '11', rawToken: b.issuedToken });
    assert.equal(ev.state, 'ALLOWED');
    assert.equal(ev.enforced && ev.overLimit, false);
    // ação direta: candidato novo substitui o device B
    const c = await reg(s, '11');
    assert.equal(c.state, 'BLOCKED_LIMIT');
    const devB = w.devices.find((d) => d.tokenHash === hashDeviceToken(b.issuedToken!))!;
    await replaceDevice(s, ADMIN, { oldDeviceId: devB.id, newDeviceId: c.deviceId! });
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: c.issuedToken })).state,
      'ALLOWED',
    );
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: b.issuedToken })).state,
      'DEVICE_REVOKED',
    );
    // cross-student: device de outro aluno não pode ser usado no replace
    const cte = await reg(s, '21');
    await assert.rejects(
      replaceDevice(s, ADMIN, { oldDeviceId: c.deviceId!, newDeviceId: cte.deviceId! }),
      (e: DeviceAccessError) => e.code === 'NOT_FOUND',
    );
    assert.equal(w.audit.filter((x) => x.action === 'DEVICE_REPLACED').length, 2);
  });

  it('somente Master/Admin executa ações; instructor/aluno recebem FORBIDDEN', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    await reg(s, '11');
    const b = await reg(s, '11');
    const { request } = await createDeviceRequest(s, {
      userId: '11',
      rawToken: b.issuedToken,
      reason: 'Preciso deste',
    });
    for (const actor of [INSTRUCTOR, { id: '11', role: 'student' }, { id: '3', role: 'editor' }]) {
      await assert.rejects(
        approveDeviceRequest(s, actor, { requestId: request.id }),
        (e: DeviceAccessError) => e.code === 'FORBIDDEN',
      );
      await assert.rejects(
        denyDeviceRequest(s, actor, { requestId: request.id }),
        (e: DeviceAccessError) => e.code === 'FORBIDDEN',
      );
      await assert.rejects(
        revokeDevice(s, actor, { deviceId: w.devices[0]!.id }),
        (e: DeviceAccessError) => e.code === 'FORBIDDEN',
      );
      await assert.rejects(
        adminStudentDeviceView(s, actor, '11'),
        (e: DeviceAccessError) => e.code === 'FORBIDDEN',
      );
    }
    assert.equal(w.requests[0]!.status, 'PENDING');
  });

  it('justificativa validada (5..500) e sanitizada; spam de candidatos contido', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    await reg(s, '11');
    const b = await reg(s, '11');
    await assert.rejects(
      createDeviceRequest(s, { userId: '11', rawToken: b.issuedToken, reason: 'oi' }),
      (e: DeviceAccessError) => e.code === 'INVALID_INPUT',
    );
    await assert.rejects(
      createDeviceRequest(s, { userId: '11', rawToken: b.issuedToken, reason: 'x'.repeat(501) }),
      (e: DeviceAccessError) => e.code === 'INVALID_INPUT',
    );
    for (let i = 0; i < MAX_PENDING_CANDIDATES + 3; i++) await reg(s, '11');
    assert.ok(w.devices.filter((d) => d.status === 'PENDING').length <= MAX_PENDING_CANDIDATES);
    assert.equal(w.devices.filter((d) => d.status === 'AUTHORIZED').length, 1);
  });
});

describe('Mudanças de limite', () => {
  it('1→2: aumento imediato; candidato do mesmo navegador é promovido e a solicitação cancelada', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    await reg(s, '11');
    const b = await reg(s, '11');
    await createDeviceRequest(s, {
      userId: '11',
      rawToken: b.issuedToken,
      reason: 'Notebook novo',
    });
    on(w, 2);
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: b.issuedToken })).state,
      'REGISTRATION_AVAILABLE',
    );
    const r = await reg(s, '11', b.issuedToken);
    assert.equal(r.state, 'ALLOWED');
    assert.equal(r.issuedToken, null, 'mantém o token já emitido');
    assert.equal(w.requests[0]!.status, 'CANCELLED');
  });

  it('2→3: terceiro dispositivo passa a registrar', async () => {
    const w = makeWorld();
    on(w, 2);
    const s = memStore(w);
    await reg(s, '11');
    await reg(s, '11');
    assert.equal((await reg(s, '11')).state, 'BLOCKED_LIMIT');
    on(w, 3);
    assert.equal((await reg(s, '11')).state, 'ALLOWED');
    assert.equal(w.devices.filter((d) => d.status === 'AUTHORIZED').length, 3);
  });

  it('2→1: ninguém é expulso (over-limit), nada é apagado; novos registros bloqueados até regularizar', async () => {
    const w = makeWorld();
    on(w, 2);
    const s = memStore(w);
    const a = await reg(s, '11');
    const b = await reg(s, '11');
    on(w, 1);
    for (const t of [a.issuedToken, b.issuedToken]) {
      const ev = await evaluateDeviceAccess(s, { userId: '11', rawToken: t });
      assert.equal(ev.state, 'ALLOWED');
      assert.equal(ev.enforced && ev.overLimit, true);
    }
    assert.equal((await reg(s, '11')).state, 'BLOCKED_LIMIT');
    assert.equal(w.devices.filter((d) => d.status === 'AUTHORIZED').length, 2);
    const devA = w.devices.find((d) => d.tokenHash === hashDeviceToken(a.issuedToken!))!;
    await revokeDevice(s, ADMIN, { deviceId: devA.id });
    assert.equal((await reg(s, '11')).state, 'BLOCKED_LIMIT', '1 de 1: ainda sem vaga');
    const view = await adminStudentDeviceView(s, ADMIN, '11');
    assert.equal(view.overLimit, false);
    assert.equal(view.limit, 1);
  });

  it('override por aluno (global=2, aluno=3) e remoção do override', async () => {
    const w = makeWorld();
    on(w, 2);
    w.users.get('11')!.maxDevicesOverride = 3;
    const s = memStore(w);
    for (let i = 0; i < 3; i++) assert.equal((await reg(s, '11')).state, 'ALLOWED');
    assert.equal((await reg(s, '11')).state, 'BLOCKED_LIMIT');
    assert.equal((await reg(s, '12')).state, 'ALLOWED');
    assert.equal((await reg(s, '12')).state, 'ALLOWED');
    assert.equal((await reg(s, '12')).state, 'BLOCKED_LIMIT', 'outro aluno segue o global');
    w.users.get('11')!.maxDevicesOverride = null;
    const any = w.devices.find((d) => d.student === '11' && d.status === 'AUTHORIZED')!;
    const ev = await evaluateDeviceAccess(s, { userId: '11', rawToken: null });
    assert.equal(ev.enforced && ev.overLimit, true);
    assert.ok(any);
  });

  it('eventos de auditoria de política: ENABLED / DISABLED / LIMIT_CHANGED', () => {
    const on1 = settingsChangeEvents(
      { enabled: false, defaultMaxDevices: 2 },
      { enabled: true, defaultMaxDevices: 2 },
      '1',
    );
    assert.deepEqual(
      on1.map((e) => e.action),
      ['DEVICE_CONTROL_ENABLED'],
    );
    const off = settingsChangeEvents(
      { enabled: true, defaultMaxDevices: 2 },
      { enabled: false, defaultMaxDevices: 1 },
      '1',
    );
    assert.deepEqual(
      off.map((e) => e.action),
      ['DEVICE_CONTROL_DISABLED', 'DEVICE_LIMIT_CHANGED'],
    );
    assert.equal(DEVICE_AUDIT_ACTIONS.length, 11);
  });
});

describe('Emergency OFF, sessões e identidade', () => {
  it('Emergency OFF libera imediatamente, preserva registros; reativação restaura o estado', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    const a = await reg(s, '11');
    const b = await reg(s, '11');
    assert.equal(b.state, 'BLOCKED_LIMIT');
    const snapshot = JSON.stringify(w.devices);
    w.settings = { enabled: false, defaultMaxDevices: 1 };
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: b.issuedToken })).state,
      'NOT_ENFORCED',
    );
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: null })).state,
      'NOT_ENFORCED',
    );
    assert.equal(JSON.stringify(w.devices), snapshot, 'nenhum registro alterado/apagado');
    on(w, 1);
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: a.issuedToken })).state,
      'ALLOWED',
    );
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: b.issuedToken })).state,
      'BLOCKED_LIMIT',
    );
  });

  it('cache de política: TTL curto e invalidação imediata no save (sem restart)', async () => {
    invalidateDeviceSettingsCache();
    let loads = 0;
    const load = async () => ({ enabled: ++loads === 1 });
    const t0 = 1_000_000;
    assert.deepEqual(await getCachedDeviceSettings(load, t0), { enabled: true });
    assert.deepEqual(await getCachedDeviceSettings(load, t0 + 100), { enabled: true });
    invalidateDeviceSettingsCache();
    assert.deepEqual(await getCachedDeviceSettings(load, t0 + 200), { enabled: false });
    assert.deepEqual(await getCachedDeviceSettings(load, t0 + 6000), { enabled: false });
    assert.equal(loads, 3);
    invalidateDeviceSettingsCache();
  });

  it('ativação não derruba sessões: aluno com sessão existente registra no primeiro acesso', async () => {
    const w = makeWorld();
    const s = memStore(w);
    // sessão existente (sem cookie de device) enquanto OFF
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: null })).state,
      'NOT_ENFORCED',
    );
    on(w, 2);
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: null })).state,
      'REGISTRATION_AVAILABLE',
    );
    const r = await reg(s, '11');
    assert.equal(r.state, 'ALLOWED');
  });

  it('logout/login no mesmo dispositivo e nova sessão: reconhecido, sem novo registro', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    const a = await reg(s, '11');
    for (let i = 0; i < 3; i++) {
      const again = await reg(s, '11', a.issuedToken);
      assert.equal(again.state, 'ALLOWED');
      assert.equal(again.issuedToken, null);
    }
    assert.equal(w.devices.length, 1);
    assert.ok(w.audit.some((x) => x.action === 'DEVICE_LOGIN_ALLOWED'));
  });

  it('cookie ausente / token malformado / token desconhecido / token de outro aluno ⇒ dispositivo novo', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    const a = await reg(s, '11');
    const cte = await reg(s, '21');
    for (const t of [null, '', 'curto', 'A'.repeat(43), cte.issuedToken]) {
      const ev = await evaluateDeviceAccess(s, { userId: '11', rawToken: t });
      assert.equal(ev.state, 'BLOCKED_LIMIT', String(t));
      assert.equal(ev.enforced && ev.device, null);
    }
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '11', rawToken: a.issuedToken })).state,
      'ALLOWED',
    );
    assert.equal(
      (await evaluateDeviceAccess(s, { userId: '21', rawToken: a.issuedToken })).state,
      'BLOCKED_LIMIT',
      'token Fred não vale para CTE',
    );
  });

  it('concorrência: dois dispositivos novos disputando a última vaga ⇒ exatamente um vence', async () => {
    for (const limit of [1, 2, 3]) {
      const w = makeWorld();
      on(w, limit);
      const s = memStore(w);
      for (let i = 0; i < limit - 1; i++) await reg(s, '11');
      const results = await Promise.all([reg(s, '11'), reg(s, '11'), reg(s, '11')]);
      assert.equal(results.filter((r) => r.state === 'ALLOWED').length, 1, `limit=${limit}`);
      assert.equal(results.filter((r) => r.state === 'BLOCKED_LIMIT').length, 2);
      assert.equal(w.devices.filter((d) => d.status === 'AUTHORIZED').length, limit);
      assert.equal(w.maxConcurrentInLock, 1, 'operações do mesmo aluno serializadas');
    }
  });
});

describe('Escolas (Fred/CTE) e isolamento', () => {
  it('registros carregam company do aluno; visões nunca misturam alunos/escolas', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    await reg(s, '11');
    const fb = await reg(s, '11');
    await reg(s, '21');
    const cb = await reg(s, '21');
    await createDeviceRequest(s, {
      userId: '11',
      rawToken: fb.issuedToken,
      reason: 'Fred precisa',
    });
    await createDeviceRequest(s, { userId: '21', rawToken: cb.issuedToken, reason: 'CTE precisa' });
    assert.ok(w.devices.filter((d) => d.student === '11').every((d) => d.company === '4'));
    assert.ok(w.devices.filter((d) => d.student === '21').every((d) => d.company === '5'));
    assert.ok(w.requests.every((r) => r.company === w.users.get(r.student)!.company));
    const fredView = await studentDeviceView(s, { userId: '11', rawToken: fb.issuedToken });
    const fredJson = JSON.stringify(fredView);
    for (const d of w.devices.filter((x) => x.student === '21'))
      assert.ok(!fredJson.includes(`"id":"${d.id}"`));
    const adminFred = await adminStudentDeviceView(s, SUPER, '11');
    assert.ok(
      adminFred.devices.every((d) => w.devices.find((x) => x.id === d.id)!.student === '11'),
    );
    assert.ok(
      adminFred.requests.every((r) => w.requests.find((x) => x.id === r.id)!.student === '11'),
    );
    // aluno CTE não consegue criar request usando device Fred
    await assert.rejects(
      createDeviceRequest(s, { userId: '21', rawToken: fb.issuedToken, reason: 'tentativa' }),
      (e: DeviceAccessError) => ['INVALID_STATE'].includes(e.code),
    );
  });
});

// ---------------------------------------------------------------------------------------------
// Gate canônico (Admin REST / endpoints / S2S)
// ---------------------------------------------------------------------------------------------

function gateDeps(w: World, sessionUserId: string | null): GateDeps {
  return {
    payload: { config: { cookiePrefix: 'payload' } } as never,
    store: memStore(w),
    authenticate: async () => (sessionUserId ? { id: sessionUserId, collection: 'users' } : null),
    internalKeyValid: (h) => h.get('x-omnia-internal-key') === 'k',
  };
}

function rq(pathname: string, headers: Record<string, string> = {}, method = 'GET') {
  return new Request(`http://admin.local${pathname}`, { method, headers });
}

const PROTECTED_API = [
  '/api/omnia/academic/ils/onboarding', // onboarding incompleto
  '/api/omnia/academic/ils/context', // onboarding completo / contexto acadêmico
  '/api/omnia/academic/courses/fred-curso/lessons/aula-1', // LMS lição
  '/api/omnia/lms/courses', // LMS connector
  '/api/omnia/tutor/chat', // Tutor
  '/api/omnia/academic/assessments/1/submit', // Assessment
  '/api/retrieval/search', // Retrieval
  '/api/omnia/sip/profile',
];

describe('Gate canônico — enforcement server-side e API direta', () => {
  it('feature OFF: nenhuma rota protegida é afetada (sessão, S2S, com ou sem cookie)', async () => {
    const w = makeWorld();
    for (const p of PROTECTED_API) {
      assert.equal(
        (await decideDeviceGate(rq(p, { cookie: 'payload-token=jwt' }), gateDeps(w, '11'))).kind,
        'pass',
      );
      assert.equal(
        (
          await decideDeviceGate(
            rq(p, { 'x-omnia-internal-key': 'k', 'x-omnia-user-id': '11' }),
            gateDeps(w, null),
          )
        ).kind,
        'pass',
      );
    }
  });

  it('feature ON: aluno sem device autorizado é negado em TODA rota acadêmica (JSON 403) — sessão Payload e S2S', async () => {
    const w = makeWorld();
    on(w, 1);
    const s = memStore(w);
    const a = await reg(s, '11');
    for (const p of PROTECTED_API) {
      const viaCookie = await decideDeviceGate(
        rq(p, { cookie: 'payload-token=jwt' }),
        gateDeps(w, '11'),
      );
      assert.equal(viaCookie.kind, 'deny', p);
      const viaJwt = await decideDeviceGate(
        rq(p, { authorization: 'JWT abc' }, 'POST'),
        gateDeps(w, '11'),
      );
      assert.equal(viaJwt.kind, 'deny', p);
      const viaS2S = await decideDeviceGate(
        rq(p, { 'x-omnia-internal-key': 'k', 'x-omnia-user-id': '11' }),
        gateDeps(w, null),
      );
      assert.equal(viaS2S.kind, 'deny', p);
      const okHeader = await decideDeviceGate(
        rq(p, {
          'x-omnia-internal-key': 'k',
          'x-omnia-user-id': '11',
          [DEVICE_TOKEN_HEADER]: a.issuedToken!,
        }),
        gateDeps(w, null),
      );
      assert.equal(okHeader.kind, 'pass', p);
      const okCookie = await decideDeviceGate(
        rq(p, { cookie: `payload-token=jwt; ${deviceCookieConfig().name}=${a.issuedToken}` }),
        gateDeps(w, '11'),
      );
      assert.equal(okCookie.kind, 'pass', p);
    }
  });

  it('REST Payload de coleções: aluno bloqueado vira anônimo (downgrade); público continua público', async () => {
    const w = makeWorld();
    on(w, 1);
    await reg(memStore(w), '11');
    const d = await decideDeviceGate(
      rq('/api/lms-enrollments?limit=1', { cookie: 'payload-token=jwt' }),
      gateDeps(w, '11'),
    );
    assert.equal(d.kind, 'downgrade');
    const stripped = stripCredentials(
      rq('/api/media/file/x.png', {
        cookie: `payload-token=jwt; other=1; ${deviceCookieConfig().name}=t`,
        authorization: 'JWT abc',
        'x-omnia-internal-key': 'k',
        'x-omnia-user-id': '11',
        [DEVICE_TOKEN_HEADER]: 't',
      }),
      'payload',
    );
    assert.equal(stripped.headers.get('authorization'), null);
    assert.equal(stripped.headers.get('x-omnia-internal-key'), null);
    assert.equal(stripped.headers.get('x-omnia-user-id'), null);
    assert.equal(stripped.headers.get(DEVICE_TOKEN_HEADER), null);
    assert.ok(!stripped.headers.get('cookie')!.includes('payload-token'));
    assert.ok(stripped.headers.get('cookie')!.includes('other=1'));
  });

  it('isenções: login/logout/me/users, fluxo de dispositivo e endpoints públicos; sem credencial passa', async () => {
    const w = makeWorld();
    on(w, 1);
    await reg(memStore(w), '11');
    for (const p of [
      '/api/users/login',
      '/api/users/logout',
      '/api/users/me',
      '/api/users/11',
      '/api/omnia/devices/status',
      '/api/omnia/devices/request',
      '/api/omnia/public-courses',
      '/api/omnia/lms/sessions/logout',
      '/api/access',
    ]) {
      assert.equal(isDeviceGateExemptPath(p), true, p);
      assert.equal(
        (await decideDeviceGate(rq(p, { cookie: 'payload-token=jwt' }), gateDeps(w, '11'))).kind,
        'pass',
        p,
      );
    }
    for (const p of ['/api/usersx', '/api/omnia/devicesx', '/api/omnia/academic/ils/onboarding'])
      assert.equal(isDeviceGateExemptPath(p), false, p);
    assert.equal(
      (await decideDeviceGate(rq('/api/omnia/academic/courses'), gateDeps(w, null))).kind,
      'pass',
    );
    assert.equal(
      (await decideDeviceGate(rq('/api/omnia/tutor/chat', {}, 'OPTIONS'), gateDeps(w, '11'))).kind,
      'pass',
    );
  });

  it('feature ON: instructor/admin/super_admin e chamadas de serviço S2S sem usuário passam', async () => {
    const w = makeWorld();
    on(w, 1);
    for (const id of ['22', '30', '1', '2']) {
      assert.equal(
        (
          await decideDeviceGate(
            rq('/api/omnia/academic/teaching/courses', { cookie: 'payload-token=jwt' }),
            gateDeps(w, id),
          )
        ).kind,
        'pass',
      );
      assert.equal(
        (
          await decideDeviceGate(
            rq('/api/omnia/lms/courses', { 'x-omnia-internal-key': 'k', 'x-omnia-user-id': id }),
            gateDeps(w, null),
          )
        ).kind,
        'pass',
      );
    }
    assert.equal(
      (
        await decideDeviceGate(
          rq(
            '/api/omnia/lms/internal/provision/worker/tick',
            { 'x-omnia-internal-key': 'k' },
            'POST',
          ),
          gateDeps(w, null),
        )
      ).kind,
      'pass',
    );
    // header de chave interna inválida não concede identidade S2S
    assert.equal(
      (
        await decideDeviceGate(
          rq('/api/omnia/lms/courses', {
            'x-omnia-internal-key': 'errada',
            'x-omnia-user-id': '11',
          }),
          gateDeps(w, null),
        )
      ).kind,
      'pass',
    );
  });

  it('gate fail-open quando a política não carrega; Emergency OFF passa sem restart', async () => {
    const w = makeWorld();
    on(w, 1);
    await reg(memStore(w), '11');
    w.settingsError = true;
    assert.equal(
      (
        await decideDeviceGate(
          rq('/api/omnia/tutor/chat', { cookie: 'payload-token=jwt' }, 'POST'),
          gateDeps(w, '11'),
        )
      ).kind,
      'pass',
    );
    w.settingsError = false;
    assert.equal(
      (
        await decideDeviceGate(
          rq('/api/omnia/tutor/chat', { cookie: 'payload-token=jwt' }, 'POST'),
          gateDeps(w, '11'),
        )
      ).kind,
      'deny',
    );
    w.settings = { enabled: false, defaultMaxDevices: 1 };
    assert.equal(
      (
        await decideDeviceGate(
          rq('/api/omnia/tutor/chat', { cookie: 'payload-token=jwt' }, 'POST'),
          gateDeps(w, '11'),
        )
      ).kind,
      'pass',
    );
  });

  it('gate não altera estado acadêmico: decisão é somente leitura (exceto lastSeenAt do device autorizado)', async () => {
    const w = makeWorld();
    on(w, 1);
    const a = await reg(memStore(w), '11');
    const before = JSON.stringify({ req: w.requests, n: w.devices.length });
    await decideDeviceGate(
      rq('/api/omnia/academic/assessments/1/submit', { cookie: 'payload-token=jwt' }, 'POST'),
      gateDeps(w, '11'),
    );
    await decideDeviceGate(
      rq(
        '/api/omnia/academic/assessments/1/submit',
        { cookie: `payload-token=jwt; ${deviceCookieConfig().name}=${a.issuedToken}` },
        'POST',
      ),
      gateDeps(w, '11'),
    );
    assert.equal(JSON.stringify({ req: w.requests, n: w.devices.length }), before);
  });
});
