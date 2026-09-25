import { sql } from '@payloadcms/db-postgres';
import type { Payload, PayloadRequest, Where } from 'payload';
import { createLocalReq } from 'payload';

import type { DeviceType } from '@omnia/shared';

import type {
  DeviceAuditEvent,
  DeviceRecord,
  DeviceRequestRecord,
  DeviceStore,
  StudentRef,
} from './policy';
import { getCachedDeviceSettings } from './settings-cache';

const DEVICES = 'student-devices' as const;
const REQUESTS = 'device-access-requests' as const;

function relId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'id' in (value as object)) {
    const id = (value as { id?: unknown }).id;
    return id == null ? null : String(id);
  }
  return null;
}

function relOut(value: string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function iso(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function toDevice(doc: Record<string, unknown>): DeviceRecord {
  return {
    id: String(doc.id),
    student: relId(doc.student) ?? '',
    tokenHash: String(doc.tokenHash ?? ''),
    label: String(doc.label ?? ''),
    deviceType: (doc.deviceType as DeviceType) ?? 'unknown',
    status: doc.status as DeviceRecord['status'],
    approvedVia: (doc.approvedVia as DeviceRecord['approvedVia']) ?? null,
    approvedBy: relId(doc.approvedBy),
    company: relId(doc.company),
    tenant: relId(doc.tenant),
    createdAt: String(doc.createdAt ?? ''),
    lastSeenAt: iso(doc.lastSeenAt),
    revokedAt: iso(doc.revokedAt),
  };
}

function toRequest(doc: Record<string, unknown>): DeviceRequestRecord {
  return {
    id: String(doc.id),
    student: relId(doc.student) ?? '',
    device: relId(doc.device) ?? '',
    reason: String(doc.reason ?? ''),
    status: doc.status as DeviceRequestRecord['status'],
    reviewedBy: relId(doc.reviewedBy),
    reviewedAt: iso(doc.reviewedAt),
    reviewNote: typeof doc.reviewNote === 'string' ? doc.reviewNote : null,
    company: relId(doc.company),
    tenant: relId(doc.tenant),
    createdAt: String(doc.createdAt ?? ''),
  };
}

function devicePatch(patch: Partial<DeviceRecord>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };
  for (const k of ['student', 'approvedBy', 'company', 'tenant'] as const) {
    if (k in patch) out[k] = relOut(patch[k] as string | null);
  }
  return out;
}

function requestPatch(patch: Partial<DeviceRequestRecord>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };
  for (const k of ['student', 'device', 'reviewedBy', 'company', 'tenant'] as const) {
    if (k in patch) out[k] = relOut(patch[k] as string | null);
  }
  return out;
}

type Options = { cachedSettings?: boolean };

/**
 * DeviceStore sobre a Local API do Payload (overrideAccess: o controle de acesso é feito pelo
 * serviço/endpoint). `withStudentLock` abre uma transação e toma
 * `pg_advisory_xact_lock(hashtext('omnia-device:<id>'))` — serializa registros concorrentes.
 */
export function createPayloadDeviceStore(
  payload: Payload,
  req?: PayloadRequest,
  options: Options = {},
): DeviceStore {
  const base = { overrideAccess: true, depth: 0, req } as const;

  const store: DeviceStore = {
    now: () => new Date(),
    async loadSettings() {
      const load = () =>
        payload.findGlobal({ slug: 'device-access-settings', overrideAccess: true, depth: 0, req });
      return options.cachedSettings ? getCachedDeviceSettings(load) : load();
    },
    async getStudent(id) {
      try {
        const u = (await payload.findByID({
          collection: 'users',
          id,
          ...base,
        })) as unknown as Record<string, unknown>;
        if (!u) return null;
        const ref: StudentRef = {
          id: String(u.id),
          role: typeof u.role === 'string' ? u.role : null,
          maxDevicesOverride:
            u.maxDevicesOverride == null ? null : Number(u.maxDevicesOverride as number),
          company: relId(u.company),
          tenant: relId(u.tenant),
        };
        return ref;
      } catch {
        return null;
      }
    },
    async findDeviceByTokenHash(tokenHash) {
      const r = await payload.find({
        collection: DEVICES,
        where: { tokenHash: { equals: tokenHash } },
        limit: 1,
        pagination: false,
        ...base,
      });
      return r.docs[0] ? toDevice(r.docs[0] as never) : null;
    },
    async getDevice(id) {
      try {
        return toDevice((await payload.findByID({ collection: DEVICES, id, ...base })) as never);
      } catch {
        return null;
      }
    },
    async listDevices(studentId) {
      const r = await payload.find({
        collection: DEVICES,
        where: { student: { equals: relOut(studentId) } },
        sort: 'createdAt',
        pagination: false,
        limit: 0,
        ...base,
      });
      return r.docs.map((d) => toDevice(d as never));
    },
    async createDevice(input) {
      const doc = await payload.create({
        collection: DEVICES,
        data: devicePatch(input) as never,
        ...base,
      });
      return toDevice(doc as never);
    },
    async updateDevice(id, patch) {
      const doc = await payload.update({
        collection: DEVICES,
        id,
        data: devicePatch(patch) as never,
        ...base,
      });
      return toDevice(doc as never);
    },
    async getRequest(id) {
      try {
        return toRequest((await payload.findByID({ collection: REQUESTS, id, ...base })) as never);
      } catch {
        return null;
      }
    },
    async listRequests(filter) {
      const and: Where[] = [];
      if (filter.studentId) and.push({ student: { equals: relOut(filter.studentId) } });
      if (filter.deviceId) and.push({ device: { equals: relOut(filter.deviceId) } });
      if (filter.status) and.push({ status: { equals: filter.status } });
      const r = await payload.find({
        collection: REQUESTS,
        where: and.length ? { and } : {},
        sort: '-createdAt',
        pagination: false,
        limit: 0,
        ...base,
      });
      return r.docs.map((d) => toRequest(d as never));
    },
    async createRequest(input) {
      const doc = await payload.create({
        collection: REQUESTS,
        data: requestPatch(input) as never,
        ...base,
      });
      return toRequest(doc as never);
    },
    async updateRequest(id, patch) {
      const doc = await payload.update({
        collection: REQUESTS,
        id,
        data: requestPatch(patch) as never,
        ...base,
      });
      return toRequest(doc as never);
    },
    async audit(event: DeviceAuditEvent) {
      try {
        await payload.create({
          collection: 'lms-audit-events',
          data: {
            action: event.action,
            actorId: event.actorId,
            targetUserId: event.targetUserId ?? null,
            previousValue: (event.previousValue ?? null) as never,
            newValue: (event.newValue ?? null) as never,
            metadata: (event.metadata ?? null) as never,
          },
          ...base,
        });
      } catch (err) {
        payload.logger.warn({
          msg: 'device.audit_failed',
          action: event.action,
          error: err instanceof Error ? err.message : 'unknown',
        });
      }
    },
    async withStudentLock(studentId, fn) {
      const txReq = await createLocalReq({}, payload);
      const txId = await payload.db.beginTransaction();
      if (!txId) throw new Error('DEVICE_TX_UNAVAILABLE');
      txReq.transactionID = txId;
      try {
        const session = (
          payload.db as unknown as {
            sessions?: Record<string, { db: { execute: (q: unknown) => Promise<unknown> } }>;
          }
        ).sessions?.[String(txId)];
        if (!session) throw new Error('DEVICE_TX_SESSION_MISSING');
        await session.db.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${`omnia-device:${studentId}`}))`,
        );
        const result = await fn(createPayloadDeviceStore(payload, txReq, options));
        await payload.db.commitTransaction(txId);
        return result;
      } catch (err) {
        await payload.db.rollbackTransaction(txId).catch(() => undefined);
        throw err;
      }
    },
  };
  return store;
}
