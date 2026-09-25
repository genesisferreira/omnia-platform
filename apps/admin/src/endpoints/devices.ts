import type { Endpoint, PayloadRequest } from 'payload';

import { describeDevice, type DeviceType } from '@omnia/shared';

import { readDeviceToken } from '../services/devices/gate';
import { createPayloadDeviceStore } from '../services/devices/payload-store';
import {
  adminStudentDeviceView,
  approveDeviceRequest,
  canChangeDevicePolicy,
  canManageDevices,
  createDeviceRequest,
  DeviceAccessError,
  denyDeviceRequest,
  isValidMaxDevices,
  registerDevice,
  replaceDevice,
  revokeDevice,
  studentDeviceView,
  toSafeRequest,
} from '../services/devices/policy';

/**
 * Device Access Control — endpoints (isentos do gate; cada um valida a própria autorização).
 * Aluno: status / register / request (somente o próprio usuário, sessão Payload).
 * Master/Admin (super_admin|admin): listar, aprovar, negar, revogar, substituir, override.
 * Política global (enabled / defaultMaxDevices): somente super_admin.
 * Respostas nunca incluem tokenHash; o token bruto só é devolvido ao próprio aluno no registro.
 */

const noStore = { 'Cache-Control': 'no-store' };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: noStore });
}

function fail(err: unknown): Response {
  if (err instanceof DeviceAccessError) {
    return json({ ok: false, error: { code: err.code } }, err.status);
  }
  return json({ ok: false, error: { code: 'INTERNAL_ERROR' } }, 500);
}

async function body(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const data = req.json ? await req.json() : null;
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function sessionUser(req: PayloadRequest) {
  const u = req.user as { id?: unknown; role?: unknown; collection?: string } | null | undefined;
  if (!u || u.id == null || (u.collection && u.collection !== 'users')) {
    throw new DeviceAccessError('UNAUTHORIZED', 401);
  }
  return { id: String(u.id), role: typeof u.role === 'string' ? u.role : null };
}

function adminActor(req: PayloadRequest) {
  const u = sessionUser(req);
  if (!canManageDevices(u)) throw new DeviceAccessError('FORBIDDEN', 403);
  return u;
}

function param(req: PayloadRequest, key: string): string {
  const v = (req.routeParams as Record<string, unknown> | undefined)?.[key];
  if (typeof v !== 'string' || !/^[1-9][0-9]*$/.test(v))
    throw new DeviceAccessError('NOT_FOUND', 404);
  return v;
}

const DEVICE_TYPES = new Set<DeviceType>(['desktop', 'mobile', 'tablet', 'unknown']);

export const deviceEndpoints: Endpoint[] = [
  {
    path: '/omnia/devices/status',
    method: 'get',
    handler: async (req) => {
      try {
        const u = sessionUser(req);
        const store = createPayloadDeviceStore(req.payload);
        const view = await studentDeviceView(store, {
          userId: u.id,
          rawToken: readDeviceToken(req.headers),
        });
        return json({ ok: true, ...view });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/register',
    method: 'post',
    handler: async (req) => {
      try {
        const u = sessionUser(req);
        const b = await body(req);
        const described = describeDevice(req.headers.get('user-agent'));
        const label = typeof b.label === 'string' && b.label.trim() ? b.label : described.label;
        const deviceType =
          typeof b.deviceType === 'string' && DEVICE_TYPES.has(b.deviceType as DeviceType)
            ? (b.deviceType as DeviceType)
            : described.deviceType;
        const store = createPayloadDeviceStore(req.payload);
        const result = await registerDevice(store, {
          userId: u.id,
          rawToken: readDeviceToken(req.headers),
          label,
          deviceType,
        });
        return json({
          ok: true,
          state: result.state,
          deviceToken: result.issuedToken,
          limit: result.limit,
          authorizedCount: result.authorizedCount,
        });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/request',
    method: 'post',
    handler: async (req) => {
      try {
        const u = sessionUser(req);
        const b = await body(req);
        const store = createPayloadDeviceStore(req.payload);
        const { request, created } = await createDeviceRequest(store, {
          userId: u.id,
          rawToken: readDeviceToken(req.headers),
          reason: b.reason,
        });
        return json({ ok: true, created, request: toSafeRequest(request) }, created ? 201 : 200);
      } catch (err) {
        return fail(err);
      }
    },
  },
  // ------------------------------------------------------------------ Master / Admin
  {
    path: '/omnia/devices/admin/settings',
    method: 'get',
    handler: async (req) => {
      try {
        adminActor(req);
        const doc = (await req.payload.findGlobal({
          slug: 'device-access-settings',
          overrideAccess: true,
          depth: 0,
          req,
        })) as Record<string, unknown>;
        return json({
          ok: true,
          settings: {
            enabled: doc.enabled === true,
            defaultMaxDevices: doc.defaultMaxDevices ?? null,
            updatedAt: doc.updatedAt ?? null,
            updatedBy: doc.updatedBy ?? null,
          },
          canChangePolicy: canChangeDevicePolicy(req.user),
        });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/settings',
    method: 'post',
    handler: async (req) => {
      try {
        const u = sessionUser(req);
        if (!canChangeDevicePolicy(u)) throw new DeviceAccessError('FORBIDDEN', 403);
        const b = await body(req);
        const data: Record<string, unknown> = {};
        if ('enabled' in b) {
          if (typeof b.enabled !== 'boolean') throw new DeviceAccessError('INVALID_INPUT', 400);
          data.enabled = b.enabled;
        }
        if ('defaultMaxDevices' in b) {
          if (!isValidMaxDevices(b.defaultMaxDevices))
            throw new DeviceAccessError('INVALID_INPUT', 400);
          data.defaultMaxDevices = b.defaultMaxDevices;
        }
        if (!Object.keys(data).length) throw new DeviceAccessError('INVALID_INPUT', 400);
        const doc = (await req.payload.updateGlobal({
          slug: 'device-access-settings',
          data: data as never,
          overrideAccess: false,
          depth: 0,
          req,
        })) as Record<string, unknown>;
        return json({
          ok: true,
          settings: { enabled: doc.enabled === true, defaultMaxDevices: doc.defaultMaxDevices },
        });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/requests',
    method: 'get',
    handler: async (req) => {
      try {
        adminActor(req);
        const status = new URL(req.url || 'http://x/').searchParams.get('status') || 'PENDING';
        if (!['PENDING', 'APPROVED', 'DENIED', 'CANCELLED'].includes(status)) {
          throw new DeviceAccessError('INVALID_INPUT', 400);
        }
        const store = createPayloadDeviceStore(req.payload);
        const list = await store.listRequests({ status: status as 'PENDING' });
        const out = [];
        for (const r of list.slice(0, 200)) {
          const student = (await req.payload
            .findByID({ collection: 'users', id: r.student, depth: 0, overrideAccess: true, req })
            .catch(() => null)) as Record<string, unknown> | null;
          const device = await store.getDevice(r.device);
          out.push({
            ...toSafeRequest(r),
            student: student
              ? { id: String(student.id), name: student.name ?? null, email: student.email ?? null }
              : { id: r.student },
            deviceLabel: device?.label ?? null,
            deviceType: device?.deviceType ?? null,
            company: r.company,
          });
        }
        return json({ ok: true, requests: out });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/students/:id',
    method: 'get',
    handler: async (req) => {
      try {
        const actor = adminActor(req);
        const view = await adminStudentDeviceView(
          createPayloadDeviceStore(req.payload),
          actor,
          param(req, 'id'),
        );
        return json({ ok: true, ...view });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/students/:id/limit',
    method: 'post',
    handler: async (req) => {
      try {
        adminActor(req);
        const id = param(req, 'id');
        const b = await body(req);
        const value = b.maxDevicesOverride;
        if (value !== null && !isValidMaxDevices(value))
          throw new DeviceAccessError('INVALID_INPUT', 400);
        const store = createPayloadDeviceStore(req.payload);
        const student = await store.getStudent(id);
        if (!student || student.role !== 'student') throw new DeviceAccessError('NOT_FOUND', 404);
        await req.payload.update({
          collection: 'users',
          id,
          data: { maxDevicesOverride: value } as never,
          overrideAccess: false,
          depth: 0,
          req,
        });
        return json({ ok: true, maxDevicesOverride: value });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/requests/:id/approve',
    method: 'post',
    handler: async (req) => {
      try {
        const actor = adminActor(req);
        const b = await body(req);
        const r = await approveDeviceRequest(createPayloadDeviceStore(req.payload), actor, {
          requestId: param(req, 'id'),
          replaceDeviceId:
            typeof b.replaceDeviceId === 'string' || typeof b.replaceDeviceId === 'number'
              ? String(b.replaceDeviceId)
              : null,
          note: typeof b.note === 'string' ? b.note : null,
        });
        return json({
          ok: true,
          request: toSafeRequest(r.request),
          deviceId: r.device.id,
          replacedDeviceId: r.replaced?.id ?? null,
        });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/requests/:id/deny',
    method: 'post',
    handler: async (req) => {
      try {
        const actor = adminActor(req);
        const b = await body(req);
        const r = await denyDeviceRequest(createPayloadDeviceStore(req.payload), actor, {
          requestId: param(req, 'id'),
          note: typeof b.note === 'string' ? b.note : null,
        });
        return json({ ok: true, request: toSafeRequest(r) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/devices/:id/revoke',
    method: 'post',
    handler: async (req) => {
      try {
        const actor = adminActor(req);
        const d = await revokeDevice(createPayloadDeviceStore(req.payload), actor, {
          deviceId: param(req, 'id'),
        });
        return json({ ok: true, deviceId: d.id, status: d.status });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/devices/admin/devices/:id/replace',
    method: 'post',
    handler: async (req) => {
      try {
        const actor = adminActor(req);
        const b = await body(req);
        const newId =
          typeof b.newDeviceId === 'string' || typeof b.newDeviceId === 'number'
            ? String(b.newDeviceId)
            : '';
        if (!/^[1-9][0-9]*$/.test(newId)) throw new DeviceAccessError('INVALID_INPUT', 400);
        const r = await replaceDevice(createPayloadDeviceStore(req.payload), actor, {
          oldDeviceId: param(req, 'id'),
          newDeviceId: newId,
        });
        return json({ ok: true, oldDeviceId: r.old.id, deviceId: r.device.id });
      } catch (err) {
        return fail(err);
      }
    },
  },
];
