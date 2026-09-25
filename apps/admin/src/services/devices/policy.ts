/**
 * Device Access Control — núcleo de política (puro, sem Payload/DB).
 *
 * Regras de produto:
 * - aplica SOMENTE a `role=student`; demais papéis e chamadas de serviço nunca são limitados;
 * - `enabled=false` (default persistido) ⇒ nenhum enforcement, nenhum registro criado;
 * - configuração ausente/inválida/erro ao carregar ⇒ fail-open (auth normal continua valendo);
 * - identidade = token opaco emitido pelo servidor; o store só conhece `sha256(token)`;
 * - redução de limite NÃO expulsa: devices já autorizados continuam válidos (over-limit) e
 *   apenas NOVOS registros ficam bloqueados até o total cair abaixo do limite;
 * - aprovação administrativa pode exceder o limite (decisão explícita da autoridade);
 * - toda mutação de um aluno roda sob `withStudentLock` (serializa a disputa pela última vaga).
 */
import { createHash, randomBytes } from 'node:crypto';

import { isWellFormedDeviceToken, type DeviceAccessState, type DeviceType } from '@omnia/shared';

export type DeviceStatus = 'AUTHORIZED' | 'PENDING' | 'REVOKED' | 'REPLACED' | 'DENIED' | 'EXPIRED';
export type DeviceRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
export type DeviceApprovalSource = 'AUTO' | 'REQUEST' | 'ADMIN';

export const DEVICE_AUDIT_ACTIONS = [
  'DEVICE_REGISTERED',
  'DEVICE_LOGIN_ALLOWED',
  'DEVICE_LOGIN_BLOCKED',
  'DEVICE_REQUEST_CREATED',
  'DEVICE_REQUEST_APPROVED',
  'DEVICE_REQUEST_DENIED',
  'DEVICE_REVOKED',
  'DEVICE_REPLACED',
  'DEVICE_LIMIT_CHANGED',
  'DEVICE_CONTROL_ENABLED',
  'DEVICE_CONTROL_DISABLED',
] as const;
export type DeviceAuditAction = (typeof DEVICE_AUDIT_ACTIONS)[number];

/** Máximo de dispositivos candidatos (PENDING) simultâneos por aluno — contém spam de registros. */
export const MAX_PENDING_CANDIDATES = 5;
/** Throttle de escrita de lastSeenAt. */
export const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
export const REQUEST_REASON_MIN = 5;
export const REQUEST_REASON_MAX = 500;

export type DeviceSettings = { enabled: boolean; defaultMaxDevices: number };

export type StudentRef = {
  id: string;
  role: string | null;
  maxDevicesOverride: number | null;
  company: string | null;
  tenant: string | null;
};

export type DeviceRecord = {
  id: string;
  student: string;
  tokenHash: string;
  label: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  approvedVia: DeviceApprovalSource | null;
  approvedBy: string | null;
  company: string | null;
  tenant: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export type DeviceRequestRecord = {
  id: string;
  student: string;
  device: string;
  reason: string;
  status: DeviceRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  company: string | null;
  tenant: string | null;
  createdAt: string;
};

export type DeviceAuditEvent = {
  action: DeviceAuditAction;
  actorId: string;
  targetUserId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
};

export type NewDevice = Omit<DeviceRecord, 'id' | 'createdAt'>;
export type NewDeviceRequest = Omit<DeviceRequestRecord, 'id' | 'createdAt'>;

export interface DeviceStore {
  /** Documento bruto do global; lança em erro de carga (tratado como fail-open). */
  loadSettings(): Promise<unknown>;
  getStudent(id: string): Promise<StudentRef | null>;
  findDeviceByTokenHash(tokenHash: string): Promise<DeviceRecord | null>;
  getDevice(id: string): Promise<DeviceRecord | null>;
  listDevices(studentId: string): Promise<DeviceRecord[]>;
  createDevice(input: NewDevice): Promise<DeviceRecord>;
  updateDevice(id: string, patch: Partial<NewDevice>): Promise<DeviceRecord>;
  getRequest(id: string): Promise<DeviceRequestRecord | null>;
  listRequests(filter: {
    studentId?: string;
    deviceId?: string;
    status?: DeviceRequestStatus;
  }): Promise<DeviceRequestRecord[]>;
  createRequest(input: NewDeviceRequest): Promise<DeviceRequestRecord>;
  updateRequest(
    id: string,
    patch: Partial<Omit<NewDeviceRequest, 'student' | 'device'>>,
  ): Promise<DeviceRequestRecord>;
  audit(event: DeviceAuditEvent): Promise<void>;
  /** Serializa operações de um mesmo aluno (advisory lock transacional no Postgres). */
  withStudentLock<T>(studentId: string, fn: (store: DeviceStore) => Promise<T>): Promise<T>;
  now(): Date;
}

export class DeviceAccessError extends Error {
  constructor(
    public readonly code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'INVALID_INPUT'
      | 'NOT_ENFORCED'
      | 'NOT_NEEDED'
      | 'CANDIDATE_LIMIT',
    public readonly status: number,
  ) {
    super(code);
  }
}

// ---------------------------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------------------------

export function generateDeviceToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

export function isValidMaxDevices(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 100;
}

export type SettingsResolution =
  | { ok: true; settings: DeviceSettings }
  | { ok: false; reason: 'CONFIG_UNAVAILABLE' | 'CONFIG_INVALID' };

/** Normaliza o global. `enabled` só é true com boolean true explícito. */
export function normalizeDeviceSettings(raw: unknown): SettingsResolution {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'CONFIG_UNAVAILABLE' };
  const doc = raw as { enabled?: unknown; defaultMaxDevices?: unknown };
  const enabled = doc.enabled === true;
  const max =
    typeof doc.defaultMaxDevices === 'string'
      ? Number(doc.defaultMaxDevices)
      : doc.defaultMaxDevices;
  if (!isValidMaxDevices(max)) {
    return enabled
      ? { ok: false, reason: 'CONFIG_INVALID' }
      : { ok: true, settings: { enabled: false, defaultMaxDevices: 1 } };
  }
  return { ok: true, settings: { enabled, defaultMaxDevices: max } };
}

export function effectiveLimit(settings: DeviceSettings, student: StudentRef): number {
  const override =
    typeof student.maxDevicesOverride === 'string'
      ? Number(student.maxDevicesOverride)
      : student.maxDevicesOverride;
  return isValidMaxDevices(override) ? override : settings.defaultMaxDevices;
}

// ---------------------------------------------------------------------------------------------
// Avaliação
// ---------------------------------------------------------------------------------------------

export type NotEnforcedReason =
  'DISABLED' | 'NOT_STUDENT' | 'CONFIG_UNAVAILABLE' | 'CONFIG_INVALID' | 'NO_USER';

export type DeviceEvaluation =
  | { enforced: false; state: 'NOT_ENFORCED'; reason: NotEnforcedReason }
  | {
      enforced: true;
      state: Exclude<DeviceAccessState, 'NOT_ENFORCED'>;
      student: StudentRef;
      limit: number;
      authorizedCount: number;
      overLimit: boolean;
      /** Device do próprio aluno apresentado pelo token (qualquer status), se houver. */
      device: DeviceRecord | null;
      openRequest: DeviceRequestRecord | null;
    };

async function loadSettingsSafe(store: DeviceStore): Promise<SettingsResolution> {
  try {
    return normalizeDeviceSettings(await store.loadSettings());
  } catch {
    return { ok: false, reason: 'CONFIG_UNAVAILABLE' };
  }
}

/**
 * Avalia (sem registrar) o acesso de um usuário autenticado com o token apresentado.
 * Não lança por configuração: qualquer falha de config ⇒ NOT_ENFORCED.
 */
export async function evaluateDeviceAccess(
  store: DeviceStore,
  input: {
    userId: string | null | undefined;
    rawToken: string | null | undefined;
    touch?: boolean;
  },
): Promise<DeviceEvaluation> {
  if (!input.userId) return { enforced: false, state: 'NOT_ENFORCED', reason: 'NO_USER' };
  const cfg = await loadSettingsSafe(store);
  if (!cfg.ok) return { enforced: false, state: 'NOT_ENFORCED', reason: cfg.reason };
  if (!cfg.settings.enabled) return { enforced: false, state: 'NOT_ENFORCED', reason: 'DISABLED' };

  const student = await store.getStudent(String(input.userId));
  if (!student) return { enforced: false, state: 'NOT_ENFORCED', reason: 'NO_USER' };
  if (student.role !== 'student') {
    return { enforced: false, state: 'NOT_ENFORCED', reason: 'NOT_STUDENT' };
  }

  const limit = effectiveLimit(cfg.settings, student);
  const devices = await store.listDevices(student.id);
  const authorizedCount = devices.filter((d) => d.status === 'AUTHORIZED').length;
  const overLimit = authorizedCount > limit;

  let device: DeviceRecord | null = null;
  if (isWellFormedDeviceToken(input.rawToken)) {
    const found = await store.findDeviceByTokenHash(hashDeviceToken(input.rawToken));
    // Token de outro aluno é tratado como ausente (não revela nada).
    if (found && found.student === student.id) device = found;
  }

  const base = { enforced: true as const, student, limit, authorizedCount, overLimit, device };
  const openRequestFor = async (d: DeviceRecord | null) => {
    if (!d) return null;
    const open = await store.listRequests({ deviceId: d.id, status: 'PENDING' });
    return open[0] ?? null;
  };

  if (device?.status === 'AUTHORIZED') {
    if (input.touch !== false) {
      const last = device.lastSeenAt ? Date.parse(device.lastSeenAt) : 0;
      const now = store.now();
      if (!last || now.getTime() - last > LAST_SEEN_THROTTLE_MS) {
        try {
          device = await store.updateDevice(device.id, { lastSeenAt: now.toISOString() });
        } catch {
          /* lastSeen é best-effort */
        }
      }
    }
    return { ...base, device, state: 'ALLOWED', openRequest: null };
  }

  const openRequest = await openRequestFor(device);
  if (
    device?.status === 'REVOKED' ||
    device?.status === 'REPLACED' ||
    device?.status === 'DENIED'
  ) {
    // Decisão administrativa explícita sobre ESTE navegador: não re-registra sozinho.
    return { ...base, state: openRequest ? 'PENDING_APPROVAL' : 'DEVICE_REVOKED', openRequest };
  }
  if (authorizedCount < limit) {
    return { ...base, state: 'REGISTRATION_AVAILABLE', openRequest };
  }
  return { ...base, state: openRequest ? 'PENDING_APPROVAL' : 'BLOCKED_LIMIT', openRequest };
}

export function isAccessAllowed(evaluation: DeviceEvaluation): boolean {
  return !evaluation.enforced || evaluation.state === 'ALLOWED';
}

// ---------------------------------------------------------------------------------------------
// Registro (após autenticação válida)
// ---------------------------------------------------------------------------------------------

export type RegisterResult = {
  state: DeviceAccessState;
  /** Token bruto recém-emitido (apenas quando um novo device foi criado). Nunca logar. */
  issuedToken: string | null;
  deviceId: string | null;
  limit: number | null;
  authorizedCount: number | null;
};

function scopeOf(student: StudentRef) {
  return { company: student.company, tenant: student.tenant };
}

export async function registerDevice(
  store: DeviceStore,
  input: {
    userId: string;
    rawToken: string | null | undefined;
    label: string;
    deviceType: DeviceType;
  },
): Promise<RegisterResult> {
  return store.withStudentLock(String(input.userId), async (tx) => {
    const ev = await evaluateDeviceAccess(tx, { ...input, touch: true });
    if (!ev.enforced) {
      return {
        state: 'NOT_ENFORCED',
        issuedToken: null,
        deviceId: null,
        limit: null,
        authorizedCount: null,
      };
    }
    const now = tx.now().toISOString();
    const meta = { limit: ev.limit, authorizedCount: ev.authorizedCount, ...scopeOf(ev.student) };

    if (ev.state === 'ALLOWED') {
      await tx.audit({
        action: 'DEVICE_LOGIN_ALLOWED',
        actorId: ev.student.id,
        targetUserId: ev.student.id,
        metadata: { ...meta, deviceId: ev.device?.id ?? null },
      });
      return {
        state: 'ALLOWED',
        issuedToken: null,
        deviceId: ev.device?.id ?? null,
        limit: ev.limit,
        authorizedCount: ev.authorizedCount,
      };
    }

    const label = sanitizeLabel(input.label);
    if (ev.state === 'REGISTRATION_AVAILABLE') {
      let deviceId: string;
      let issuedToken: string | null = null;
      if (ev.device && (ev.device.status === 'PENDING' || ev.device.status === 'EXPIRED')) {
        // Candidato do mesmo navegador: promove (mantém o token já emitido).
        const updated = await tx.updateDevice(ev.device.id, {
          status: 'AUTHORIZED',
          approvedVia: 'AUTO',
          approvedBy: null,
          lastSeenAt: now,
          revokedAt: null,
        });
        deviceId = updated.id;
        if (ev.openRequest) {
          await tx.updateRequest(ev.openRequest.id, {
            status: 'CANCELLED',
            reviewedAt: now,
            reviewNote: 'AUTO_REGISTERED_WITHIN_LIMIT',
          });
        }
      } else {
        issuedToken = generateDeviceToken();
        const created = await tx.createDevice({
          student: ev.student.id,
          tokenHash: hashDeviceToken(issuedToken),
          label,
          deviceType: input.deviceType,
          status: 'AUTHORIZED',
          approvedVia: 'AUTO',
          approvedBy: null,
          lastSeenAt: now,
          revokedAt: null,
          ...scopeOf(ev.student),
        });
        deviceId = created.id;
      }
      await tx.audit({
        action: 'DEVICE_REGISTERED',
        actorId: ev.student.id,
        targetUserId: ev.student.id,
        metadata: { ...meta, deviceId, authorizedCount: ev.authorizedCount + 1 },
      });
      return {
        state: 'ALLOWED',
        issuedToken,
        deviceId,
        limit: ev.limit,
        authorizedCount: ev.authorizedCount + 1,
      };
    }

    // Bloqueado: garante um candidato (PENDING) ligado a este navegador para o fluxo de solicitação.
    let deviceId = ev.device?.id ?? null;
    let issuedToken: string | null = null;
    if (!ev.device) {
      const devices = await tx.listDevices(ev.student.id);
      const pending = devices
        .filter((d) => d.status === 'PENDING')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const openReqs = await tx.listRequests({ studentId: ev.student.id, status: 'PENDING' });
      const withRequest = new Set(openReqs.map((r) => r.device));
      if (pending.length >= MAX_PENDING_CANDIDATES) {
        const expirable = pending.find((d) => !withRequest.has(d.id));
        if (!expirable) throw new DeviceAccessError('CANDIDATE_LIMIT', 429);
        await tx.updateDevice(expirable.id, { status: 'EXPIRED' });
      }
      issuedToken = generateDeviceToken();
      const created = await tx.createDevice({
        student: ev.student.id,
        tokenHash: hashDeviceToken(issuedToken),
        label,
        deviceType: input.deviceType,
        status: 'PENDING',
        approvedVia: null,
        approvedBy: null,
        lastSeenAt: now,
        revokedAt: null,
        ...scopeOf(ev.student),
      });
      deviceId = created.id;
    }
    await tx.audit({
      action: 'DEVICE_LOGIN_BLOCKED',
      actorId: ev.student.id,
      targetUserId: ev.student.id,
      metadata: { ...meta, deviceId, state: ev.state },
    });
    return {
      state: ev.state,
      issuedToken,
      deviceId,
      limit: ev.limit,
      authorizedCount: ev.authorizedCount,
    };
  });
}

/** Remove caracteres de controle (mantém \n e \t quando `keepNewlines`). */
function stripControlChars(value: string, keepNewlines: boolean): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = code < 0x20 || code === 0x7f;
    if (isControl && !(keepNewlines && (code === 0x0a || code === 0x09))) continue;
    out += ch;
  }
  return out;
}

function sanitizeLabel(label: string): string {
  const clean = stripControlChars(String(label || ''), false)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 80);
  return clean || 'Dispositivo';
}

export function sanitizeReason(reason: unknown): string {
  if (typeof reason !== 'string') throw new DeviceAccessError('INVALID_INPUT', 400);
  const clean = stripControlChars(reason, true).trim();
  if (clean.length < REQUEST_REASON_MIN || clean.length > REQUEST_REASON_MAX) {
    throw new DeviceAccessError('INVALID_INPUT', 400);
  }
  return clean;
}

// ---------------------------------------------------------------------------------------------
// Solicitação do aluno
// ---------------------------------------------------------------------------------------------

export async function createDeviceRequest(
  store: DeviceStore,
  input: { userId: string; rawToken: string | null | undefined; reason: unknown },
): Promise<{ request: DeviceRequestRecord; created: boolean }> {
  const reason = sanitizeReason(input.reason);
  return store.withStudentLock(String(input.userId), async (tx) => {
    const ev = await evaluateDeviceAccess(tx, { ...input, touch: false });
    if (!ev.enforced) throw new DeviceAccessError('NOT_ENFORCED', 409);
    if (ev.state === 'ALLOWED' || ev.state === 'REGISTRATION_AVAILABLE') {
      throw new DeviceAccessError('NOT_NEEDED', 409);
    }
    if (!ev.device) throw new DeviceAccessError('INVALID_STATE', 409);
    if (ev.openRequest) return { request: ev.openRequest, created: false };
    const request = await tx.createRequest({
      student: ev.student.id,
      device: ev.device.id,
      reason,
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      ...scopeOf(ev.student),
    });
    await tx.audit({
      action: 'DEVICE_REQUEST_CREATED',
      actorId: ev.student.id,
      targetUserId: ev.student.id,
      metadata: {
        requestId: request.id,
        deviceId: ev.device.id,
        limit: ev.limit,
        authorizedCount: ev.authorizedCount,
        ...scopeOf(ev.student),
      },
    });
    return { request, created: true };
  });
}

// ---------------------------------------------------------------------------------------------
// Ações administrativas (Master Admin)
// ---------------------------------------------------------------------------------------------

export type AdminActor = { id: string; role: string | null };

const DEVICE_ADMIN_ROLES = new Set(['super_admin', 'admin']);
const DEVICE_POLICY_ROLES = new Set(['super_admin']);

function roleOf(actor: unknown): string | null {
  if (!actor || typeof actor !== 'object') return null;
  const role = (actor as { role?: unknown }).role;
  return typeof role === 'string' ? role : null;
}

export function canManageDevices(actor: unknown): boolean {
  const role = roleOf(actor);
  return role != null && DEVICE_ADMIN_ROLES.has(role);
}

export function canChangeDevicePolicy(actor: unknown): boolean {
  const role = roleOf(actor);
  return role != null && DEVICE_POLICY_ROLES.has(role);
}

function assertAdmin(actor: AdminActor) {
  if (!canManageDevices(actor)) throw new DeviceAccessError('FORBIDDEN', 403);
}

async function loadStudentDevice(tx: DeviceStore, deviceId: string, studentId?: string) {
  const device = await tx.getDevice(String(deviceId));
  if (!device || (studentId && device.student !== studentId)) {
    throw new DeviceAccessError('NOT_FOUND', 404);
  }
  return device;
}

export async function approveDeviceRequest(
  store: DeviceStore,
  actor: AdminActor,
  input: { requestId: string; replaceDeviceId?: string | null; note?: string | null },
): Promise<{ request: DeviceRequestRecord; device: DeviceRecord; replaced: DeviceRecord | null }> {
  assertAdmin(actor);
  const req0 = await store.getRequest(String(input.requestId));
  if (!req0) throw new DeviceAccessError('NOT_FOUND', 404);
  return store.withStudentLock(req0.student, async (tx) => {
    const request = await tx.getRequest(req0.id);
    if (!request || request.status !== 'PENDING') throw new DeviceAccessError('INVALID_STATE', 409);
    const candidate = await loadStudentDevice(tx, request.device, request.student);
    if (candidate.status === 'AUTHORIZED') throw new DeviceAccessError('INVALID_STATE', 409);
    const now = tx.now().toISOString();
    let replaced: DeviceRecord | null = null;
    if (input.replaceDeviceId) {
      const old = await loadStudentDevice(tx, input.replaceDeviceId, request.student);
      if (old.status !== 'AUTHORIZED' || old.id === candidate.id) {
        throw new DeviceAccessError('INVALID_STATE', 409);
      }
      replaced = await tx.updateDevice(old.id, { status: 'REPLACED', revokedAt: now });
    }
    const device = await tx.updateDevice(candidate.id, {
      status: 'AUTHORIZED',
      approvedVia: 'REQUEST',
      approvedBy: actor.id,
      revokedAt: null,
    });
    const updated = await tx.updateRequest(request.id, {
      status: 'APPROVED',
      reviewedBy: actor.id,
      reviewedAt: now,
      reviewNote: input.note ? String(input.note).slice(0, 500) : null,
    });
    if (replaced) {
      await tx.audit({
        action: 'DEVICE_REPLACED',
        actorId: actor.id,
        targetUserId: request.student,
        metadata: {
          oldDeviceId: replaced.id,
          newDeviceId: device.id,
          requestId: request.id,
          company: request.company,
        },
      });
    }
    await tx.audit({
      action: 'DEVICE_REQUEST_APPROVED',
      actorId: actor.id,
      targetUserId: request.student,
      metadata: { requestId: request.id, deviceId: device.id, company: request.company },
    });
    return { request: updated, device, replaced };
  });
}

export async function denyDeviceRequest(
  store: DeviceStore,
  actor: AdminActor,
  input: { requestId: string; note?: string | null },
): Promise<DeviceRequestRecord> {
  assertAdmin(actor);
  const req0 = await store.getRequest(String(input.requestId));
  if (!req0) throw new DeviceAccessError('NOT_FOUND', 404);
  return store.withStudentLock(req0.student, async (tx) => {
    const request = await tx.getRequest(req0.id);
    if (!request || request.status !== 'PENDING') throw new DeviceAccessError('INVALID_STATE', 409);
    const now = tx.now().toISOString();
    const device = await tx.getDevice(request.device);
    if (device && device.status === 'PENDING') {
      await tx.updateDevice(device.id, { status: 'DENIED' });
    }
    const updated = await tx.updateRequest(request.id, {
      status: 'DENIED',
      reviewedBy: actor.id,
      reviewedAt: now,
      reviewNote: input.note ? String(input.note).slice(0, 500) : null,
    });
    await tx.audit({
      action: 'DEVICE_REQUEST_DENIED',
      actorId: actor.id,
      targetUserId: request.student,
      metadata: { requestId: request.id, deviceId: request.device, company: request.company },
    });
    return updated;
  });
}

export async function revokeDevice(
  store: DeviceStore,
  actor: AdminActor,
  input: { deviceId: string },
): Promise<DeviceRecord> {
  assertAdmin(actor);
  const d0 = await store.getDevice(String(input.deviceId));
  if (!d0) throw new DeviceAccessError('NOT_FOUND', 404);
  return store.withStudentLock(d0.student, async (tx) => {
    const device = await loadStudentDevice(tx, d0.id, d0.student);
    if (device.status !== 'AUTHORIZED') throw new DeviceAccessError('INVALID_STATE', 409);
    const updated = await tx.updateDevice(device.id, {
      status: 'REVOKED',
      revokedAt: tx.now().toISOString(),
    });
    await tx.audit({
      action: 'DEVICE_REVOKED',
      actorId: actor.id,
      targetUserId: device.student,
      metadata: { deviceId: device.id, company: device.company },
    });
    return updated;
  });
}

/** REPLACE: autoriza um device candidato/revogado do aluno e aposenta um device autorizado. */
export async function replaceDevice(
  store: DeviceStore,
  actor: AdminActor,
  input: { oldDeviceId: string; newDeviceId: string },
): Promise<{ old: DeviceRecord; device: DeviceRecord }> {
  assertAdmin(actor);
  const n0 = await store.getDevice(String(input.newDeviceId));
  if (!n0) throw new DeviceAccessError('NOT_FOUND', 404);
  return store.withStudentLock(n0.student, async (tx) => {
    const candidate = await loadStudentDevice(tx, n0.id, n0.student);
    const old = await loadStudentDevice(tx, input.oldDeviceId, n0.student);
    if (
      old.id === candidate.id ||
      old.status !== 'AUTHORIZED' ||
      candidate.status === 'AUTHORIZED'
    ) {
      throw new DeviceAccessError('INVALID_STATE', 409);
    }
    const now = tx.now().toISOString();
    const oldUpdated = await tx.updateDevice(old.id, { status: 'REPLACED', revokedAt: now });
    const device = await tx.updateDevice(candidate.id, {
      status: 'AUTHORIZED',
      approvedVia: 'ADMIN',
      approvedBy: actor.id,
      revokedAt: null,
    });
    for (const r of await tx.listRequests({ deviceId: candidate.id, status: 'PENDING' })) {
      await tx.updateRequest(r.id, {
        status: 'APPROVED',
        reviewedBy: actor.id,
        reviewedAt: now,
        reviewNote: 'REPLACE',
      });
    }
    await tx.audit({
      action: 'DEVICE_REPLACED',
      actorId: actor.id,
      targetUserId: candidate.student,
      metadata: { oldDeviceId: old.id, newDeviceId: device.id, company: candidate.company },
    });
    return { old: oldUpdated, device };
  });
}

// ---------------------------------------------------------------------------------------------
// Views seguras (sem tokenHash)
// ---------------------------------------------------------------------------------------------

export type SafeDevice = {
  id: string;
  label: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  current?: boolean;
};

export function toSafeDevice(d: DeviceRecord, currentId?: string | null): SafeDevice {
  return {
    id: d.id,
    label: d.label,
    deviceType: d.deviceType,
    status: d.status,
    createdAt: d.createdAt,
    lastSeenAt: d.lastSeenAt,
    revokedAt: d.revokedAt,
    ...(currentId !== undefined ? { current: d.id === currentId } : {}),
  };
}

export type SafeRequest = {
  id: string;
  device: string;
  status: DeviceRequestStatus;
  reason: string;
  createdAt: string;
  reviewedAt: string | null;
};

export function toSafeRequest(r: DeviceRequestRecord): SafeRequest {
  return {
    id: r.id,
    device: r.device,
    status: r.status,
    reason: r.reason,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
  };
}

/** Visão do aluno sobre o próprio estado (UX). */
export async function studentDeviceView(
  store: DeviceStore,
  input: { userId: string; rawToken: string | null | undefined },
) {
  const ev = await evaluateDeviceAccess(store, { ...input, touch: true });
  if (!ev.enforced) return { state: 'NOT_ENFORCED' as const };
  const devices = await store.listDevices(ev.student.id);
  return {
    state: ev.state,
    limit: ev.limit,
    authorizedCount: ev.authorizedCount,
    overLimit: ev.overLimit,
    currentDevice: ev.device ? toSafeDevice(ev.device, ev.device.id) : null,
    authorizedDevices: devices
      .filter((d) => d.status === 'AUTHORIZED')
      .map((d) => toSafeDevice(d, ev.device?.id ?? null)),
    openRequest: ev.openRequest ? toSafeRequest(ev.openRequest) : null,
  };
}

/** Visão administrativa de um aluno. */
export async function adminStudentDeviceView(
  store: DeviceStore,
  actor: AdminActor,
  studentId: string,
) {
  assertAdmin(actor);
  const student = await store.getStudent(String(studentId));
  if (!student) throw new DeviceAccessError('NOT_FOUND', 404);
  let limit: number | null = null;
  try {
    const cfg = normalizeDeviceSettings(await store.loadSettings());
    if (cfg.ok) limit = effectiveLimit(cfg.settings, student);
  } catch {
    limit = null;
  }
  const devices = await store.listDevices(student.id);
  const requests = await store.listRequests({ studentId: student.id });
  const authorizedCount = devices.filter((d) => d.status === 'AUTHORIZED').length;
  return {
    student: { id: student.id, role: student.role, maxDevicesOverride: student.maxDevicesOverride },
    limit,
    authorizedCount,
    overLimit: limit != null && authorizedCount > limit,
    devices: devices.map((d) => ({
      ...toSafeDevice(d),
      approvedVia: d.approvedVia,
      approvedBy: d.approvedBy,
    })),
    requests: requests.map((r) => ({
      ...toSafeRequest(r),
      reviewedBy: r.reviewedBy,
      reviewNote: r.reviewNote,
    })),
  };
}

/** Eventos de auditoria de mudança de política (usados pelos hooks do global/users). */
export function settingsChangeEvents(
  previous: unknown,
  next: unknown,
  actorId: string,
): DeviceAuditEvent[] {
  const prev = (previous && typeof previous === 'object' ? previous : {}) as Record<
    string,
    unknown
  >;
  const nxt = (next && typeof next === 'object' ? next : {}) as Record<string, unknown>;
  const events: DeviceAuditEvent[] = [];
  const wasOn = prev.enabled === true;
  const isOn = nxt.enabled === true;
  if (!wasOn && isOn)
    events.push({
      action: 'DEVICE_CONTROL_ENABLED',
      actorId,
      previousValue: { enabled: false },
      newValue: { enabled: true },
    });
  if (wasOn && !isOn)
    events.push({
      action: 'DEVICE_CONTROL_DISABLED',
      actorId,
      previousValue: { enabled: true },
      newValue: { enabled: false },
    });
  if (
    'defaultMaxDevices' in nxt &&
    Number(prev.defaultMaxDevices) !== Number(nxt.defaultMaxDevices)
  ) {
    events.push({
      action: 'DEVICE_LIMIT_CHANGED',
      actorId,
      previousValue: { defaultMaxDevices: prev.defaultMaxDevices ?? null },
      newValue: { defaultMaxDevices: nxt.defaultMaxDevices },
      metadata: { scope: 'GLOBAL' },
    });
  }
  return events;
}
