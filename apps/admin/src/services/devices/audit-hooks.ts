import type { FieldHook } from 'payload';

/** DEVICE_LIMIT_CHANGED (escopo aluno) quando o override muda. */
export const auditMaxDevicesOverrideChange: FieldHook = async ({
  value,
  previousValue,
  originalDoc,
  req,
  operation,
}) => {
  if (operation !== 'update') return value;
  const prev = previousValue ?? null;
  const next = value ?? null;
  if (Number(prev) === Number(next) && (prev === null) === (next === null)) return value;
  try {
    await req.payload.create({
      collection: 'lms-audit-events',
      data: {
        action: 'DEVICE_LIMIT_CHANGED',
        actorId: req.user ? String(req.user.id) : 'system',
        targetUserId: originalDoc?.id != null ? String(originalDoc.id) : null,
        previousValue: { maxDevicesOverride: prev } as never,
        newValue: { maxDevicesOverride: next } as never,
        metadata: { scope: 'STUDENT' } as never,
      },
      overrideAccess: true,
      req,
    });
  } catch (err) {
    req.payload.logger.warn({
      msg: 'device.override.audit_failed',
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
  return value;
};
